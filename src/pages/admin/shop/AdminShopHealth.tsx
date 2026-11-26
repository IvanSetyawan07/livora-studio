import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Info, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { adminShop } from "@/lib/shop";
import { PageHeader, AdminHelpBanner, ErrorState, useAdminDialog } from "@/components/admin/kit";

const ago = (d?: string | null) =>
  d ? new Date(d).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "belum pernah";

const HANDOFF_LABELS: Record<string, string> = {
  tim: "Minta bicara tim",
  admin: "Minta admin",
  nego: "Negosiasi harga",
  komplain: "Komplain",
  keluhan: "Keluhan",
  rusak: "Barang rusak",
  custom: "Permintaan custom",
  gagal_paham: "Bot kurang paham",
  ai_eskalasi: "Butuh bantuan CS",
  dokumen_masuk: "Kirim dokumen",
  foto_masuk: "Kirim foto",
  minta_tim_saat_data: "Minta tim saat isi data",
};

/** Kesehatan sistem + funnel penjualan (Owner). */
export default function AdminShopHealth() {
  const dialog = useAdminDialog();
  const [h, setH] = useState<Record<string, any> | null>(null);
  const [f, setF] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await adminShop.health();
      setH(data);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Gagal memuat status sistem";
      setError(msg);
      toast.error(msg);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminShop
      .funnel(days)
      .then(setF)
      .catch(() => {});
  }, [days]);

  const retry = async (id: number) => {
    setBusyId(id);
    try {
      const r = await adminShop.retryFailed(id).catch((e) => ({ ok: false, error: e.message }));
      r.ok ? toast.success("Pesan berhasil dikirim ulang.") : toast.error(r.error || "Masih gagal terkirim");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async (id: number) => {
    const ok = await dialog.confirm({
      title: "Abaikan Pesan Gagal Ini?",
      description: "Pesan akan dikeluarkan dari daftar antrean gagal tanpa dikirim ulang ke pelanggan.",
      confirmText: "Ya, Abaikan",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(id);
    try {
      await adminShop.dismissFailed(id);
      toast.success("Pesan dihapus dari antrean gagal.");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Gagal mengabaikan pesan");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pemantauan Sistem"
        title="Kesehatan Sistem & Funnel"
        description="Pantau kelancaran pengiriman WhatsApp, pesan gagal yang perlu dikirim ulang, serta alur konversi pesanan."
        actions={
          <button
            type="button"
            onClick={load}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-white px-3.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#5E93B8]" /> Muat Ulang
          </button>
        }
      />

      <AdminHelpBanner title="Cara Membaca Status Kesehatan" storageKey="admin-shop-health-help">
        Fokus utama harian ada pada kartu <b>Pesan WA Gagal</b> dan <b>Chat Menunggu Tim</b>. Jika Midtrans belum menampilkan transaksi baru selama beberapa hari karena pelanggan memakai transfer bank BCA manual, itu hal yang normal.
      </AdminHelpBanner>

      {error && !h ? (
        <ErrorState message={error} onRetry={load} />
      ) : !h ? (
        <div className="flex items-center gap-2 py-12 text-sm text-[#656B73]">
          <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" /> Memeriksa kesehatan sistem…
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Chat Menunggu Tim" value={h.sessions_waiting} warn={h.sessions_waiting > 0} />
            <Stat label="Tinjauan Lewat Target" value={h.sla_overdue} warn={h.sla_overdue > 0} />
            <Stat label="Pesan WA Gagal" value={h.failed_messages?.length ?? 0} warn={(h.failed_messages?.length ?? 0) > 0} />
            <Stat label="Bayar Setelah Kedaluwarsa (30 hr)" value={h.unpaid_after_expiry} />
          </div>

          {/* Koneksi Layanan */}
          <section className="grid gap-3 md:grid-cols-2">
            {Object.entries(h.webhooks ?? {}).map(([k, w]: [string, any]) => {
              const isMidtrans = k.toLowerCase() === "midtrans";
              const hasErrors = (w.errors_24h ?? 0) > 0;
              const stale = !w.last_ok || Date.now() - new Date(w.last_ok).getTime() > 3 * 864e5;
              const isAlarm = hasErrors || (stale && !isMidtrans);

              return (
                <div key={k} className="rounded-2xl border border-[#EAE4DA] bg-white p-4 text-sm shadow-sm">
                  <p className="flex items-center gap-2 font-semibold capitalize text-[#232528]">
                    {isAlarm ? (
                      <XCircle className="h-4 w-4 text-rose-600" />
                    ) : isMidtrans && stale ? (
                      <Info className="h-4 w-4 text-[#5E93B8]" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                    Koneksi {isMidtrans ? "Midtrans (QRIS)" : k === "whatsapp" || k === "meta" ? "WhatsApp (Meta)" : k}
                  </p>
                  <p className="mt-2 text-xs text-[#656B73]">Terakhir menerima data: {ago(w.last_ok)}</p>
                  <p className="text-xs text-[#656B73]">Gangguan dalam 24 jam: {w.errors_24h ?? 0}</p>
                  {isMidtrans && stale && !hasErrors && (
                    <p className="mt-1.5 text-xs text-[#5E93B8]">
                      Belum ada transaksi QRIS/Midtrans dalam 3 hari terakhir (normal jika pelanggan membayar lewat transfer BCA manual).
                    </p>
                  )}
                  {isAlarm && (
                    <p className="mt-1.5 text-xs text-rose-600">
                      {hasErrors
                        ? "Terdeteksi gangguan penerimaan data. Informasikan ke Tim IT untuk memeriksa koneksi."
                        : "Belum ada pesan masuk selama 3 hari terakhir. Pastikan nomor WhatsApp Meta aktif."}
                    </p>
                  )}
                </div>
              );
            })}
          </section>

          {/* Antrean Pesan Gagal */}
          <section className="rounded-2xl border border-[#EAE4DA] bg-white p-5 text-sm shadow-sm">
            <h2 className="font-header text-base text-[#232528]">Antrean Pesan WA Gagal Terkirim</h2>
            {!h.failed_messages?.length ? (
              <p className="mt-2 text-xs text-[#656B73]">Semua pesan WhatsApp terkirim lancar. Tidak ada antrean gagal.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[#EAE4DA]">
                {h.failed_messages.map((m: any) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-2.5 py-2.5 text-xs">
                    <span className="font-mono font-medium text-[#232528]">+{m.phone}</span>
                    <span className="min-w-0 flex-1 truncate text-[#4C5259]">{m.body}</span>
                    <span className="text-rose-600">
                      {m.error} ({m.attempts}x)
                    </span>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => retry(m.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#EAE4DA] bg-white px-3 text-xs font-medium text-[#232528] hover:border-[#5E93B8] disabled:opacity-50"
                    >
                      {busyId === m.id && <Loader2 className="h-3 w-3 animate-spin" />} Coba Lagi
                    </button>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => dismiss(m.id)}
                      className="h-8 rounded-lg px-2.5 text-xs text-[#656B73] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      Abaikan
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Funnel Pesanan */}
          <section className="rounded-2xl border border-[#EAE4DA] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-header text-base text-[#232528]">Alur Konversi Pesanan (Funnel)</h2>
              <select
                value={days}
                onChange={(e) => setDays(+e.target.value)}
                aria-label="Periode"
                className="h-9 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-xs text-[#232528]"
              >
                <option value={7}>7 hari terakhir</option>
                <option value={30}>30 hari terakhir</option>
                <option value={90}>90 hari terakhir</option>
              </select>
            </div>
            {f ? (
              <>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={f.steps}>
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#656B73" }} interval={0} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#656B73" }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#5E93B8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid gap-3 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-3.5 text-xs sm:grid-cols-3">
                  <p className="text-[#4C5259]">
                    Dialihkan ke Tim CS: <b className="text-[#232528]">{f.handoffs}</b> percakapan
                  </p>
                  <p className="text-[#4C5259]">
                    Pesanan Custom ditinjau: <b className="text-[#232528]">{f.mto_reviewed}</b> · direvisi:{" "}
                    <b className="text-[#232528]">{f.mto_revised}</b>
                    {f.mto_reviewed ? ` (${Math.round((f.mto_revised / f.mto_reviewed) * 100)}%)` : ""}
                  </p>
                  <p className="text-[#656B73]">
                    Pemicu alih ke CS:{" "}
                    {Object.entries(f.handoff_triggers ?? {})
                      .map(([k, v]) => `${HANDOFF_LABELS[k] ?? k} (${v})`)
                      .join(", ") || "—"}
                  </p>
                </div>
              </>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-xs text-[#656B73]">
                <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" /> Memuat grafik funnel…
              </div>
            )}
          </section>

          {/* Detail Teknis untuk Tim IT */}
          <details className="rounded-2xl border border-[#EAE4DA] bg-white p-5 text-sm shadow-sm">
            <summary className="cursor-pointer font-header text-base text-[#232528]">
              Detail Teknis untuk Tim IT (Konfigurasi Server & Log Webhook)
            </summary>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-3.5 text-xs">
                <p className="mb-2 font-semibold text-[#232528]">Ringkasan Konfigurasi Server</p>
                <ul className="grid gap-1.5 text-[#4C5259] sm:grid-cols-2">
                  <li>
                    Penyedia WhatsApp: <b className="text-[#232528]">{h.config?.whatsapp_provider || "belum diatur"}</b>
                  </li>
                  <li>
                    Midtrans: <b className="text-[#232528]">{h.config?.midtrans ? "terpasang" : "belum aktif"}</b>
                  </li>
                  <li>
                    Layanan Email: <b className="text-[#232528]">{h.config?.mail}</b>
                  </li>
                  <li>
                    Masa berlaku Token Meta:{" "}
                    <b className="text-[#232528]">{h.config?.meta_token_expires_at || "belum dicatat di server"}</b>
                  </li>
                </ul>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-[#232528]">Log Webhook Terbaru</p>
                <ul className="max-h-72 divide-y divide-[#EAE4DA] overflow-y-auto rounded-xl border border-[#EAE4DA] px-3">
                  {h.recent?.length ? (
                    h.recent.map((l: any) => (
                      <li key={l.id} className="flex gap-3 py-1.5 text-xs">
                        <span className="w-28 shrink-0 text-[#656B73]">{ago(l.created_at)}</span>
                        <span className="w-20 font-medium text-[#232528]">{l.source}</span>
                        <span className={l.status === "ok" ? "text-emerald-700" : "text-rose-600"}>{l.status}</span>
                        <span className="truncate text-[#656B73]">{l.error}</span>
                      </li>
                    ))
                  ) : (
                    <li className="py-4 text-center text-xs text-[#656B73]">Belum ada log webhook.</li>
                  )}
                </ul>
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        warn ? "border-amber-300 bg-amber-50/70" : "border-[#EAE4DA] bg-white"
      }`}
    >
      <p className={`font-header text-2xl ${warn ? "text-amber-900" : "text-[#232528]"}`}>{value ?? 0}</p>
      <p className="mt-0.5 text-xs text-[#656B73]">{label}</p>
    </div>
  );
}
