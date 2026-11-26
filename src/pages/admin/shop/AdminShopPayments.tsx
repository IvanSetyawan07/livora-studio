import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Eye,
  Link2,
  Loader2,
  Receipt,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { adminShop, openPrivate, rupiah } from "@/lib/shop";
import { API_BASE_URL, authStorage } from "@/lib/api";
import {
  PageHeader,
  AdminHelpBanner,
  EmptyState,
  ErrorState,
  StatusBadge,
  useAdminDialog,
} from "@/components/admin/kit";

/** Antrean verifikasi bukti transfer (peran Keuangan). */
export default function AdminShopPayments() {
  const dialog = useAdminDialog();
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [previewProof, setPreviewProof] = useState<any | null>(null);
  const [assignProof, setAssignProof] = useState<any | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await adminShop.proofs();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Gagal memuat bukti pembayaran";
      setError(msg);
      toast.error(msg);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (p: any, accept: boolean) => {
    let reason: string | undefined;
    if (accept) {
      const ok = await dialog.confirm({
        title: `Terima Pembayaran untuk ${p.order?.code ?? "Pesanan"}?`,
        description: `Pastikan dana sebesar ${rupiah(p.expected ?? p.amount)} sudah benar-benar masuk di mutasi rekening. Invoice LUNAS akan otomatis terbit, dikirim ke pelanggan, dan stok dikurangi.`,
        confirmText: "Ya, Dana Sudah Masuk",
        cancelText: "Periksa Lagi",
      });
      if (!ok) return;
    } else {
      const r = await dialog.prompt({
        title: "Tolak Bukti Transfer?",
        description: "Alasan penolakan akan dikirim ke pelanggan agar dapat mengunggah ulang bukti yang benar.",
        label: "Alasan Penolakan",
        placeholder: "mis. Nominal tidak sesuai atau gambar buram",
        confirmText: "Tolak Bukti",
        cancelText: "Batal",
        tone: "danger",
        required: true,
      });
      if (typeof r !== "string" || !r.trim()) return;
      reason = r.trim();
    }
    setBusy(p.id);
    try {
      await adminShop.reviewProof(p.id, accept, reason);
      toast.success(accept ? "Pembayaran diterima. Invoice LUNAS diterbitkan." : "Bukti transfer ditolak.");
      if (previewProof?.id === p.id) setPreviewProof(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Gagal memproses bukti");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Keuangan & Pembayaran"
        title="Verifikasi Bukti Transfer"
        description="Periksa bukti transfer pelanggan, cocokkan nominal beserta kode unik dengan mutasi rekening, lalu terima atau tolak."
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

      <AdminHelpBanner title="Panduan Pemeriksaan Bukti Transfer" storageKey="admin-shop-payments-help">
        Klik <b>Pratinjau & Verifikasi</b> untuk melihat foto bukti transfer secara langsung berdampingan dengan nominal tagihan.
        Jika bukti belum tertaut ke pesanan tertentu, klik <b>Tautkan Pesanan</b> terlebih dahulu.
      </AdminHelpBanner>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows === null ? (
        <div className="flex items-center gap-2 py-16 text-sm text-[#656B73]">
          <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" /> Memuat antrean bukti transfer…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Semua bukti transfer sudah diverifikasi"
          description="Tidak ada bukti transfer pelanggan yang sedang menunggu pemeriksaan saat ini."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const mismatch = !!p.amount && !!p.expected && p.amount !== p.expected;
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.order ? (
                      <Link
                        to={`/admin/shop/orders/${p.order.code}`}
                        className="font-mono text-sm font-semibold text-[#35678B] hover:underline"
                      >
                        {p.order.code}
                      </Link>
                    ) : (
                      <StatusBadge tone="danger">Belum Tertaut ke Pesanan</StatusBadge>
                    )}
                    {p.document_number && (
                      <span className="font-mono text-[11px] text-[#656B73]">{p.document_number}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#232528]">
                    {p.order?.customer_name ?? "Pengirim"} ·{" "}
                    <span className="font-normal text-[#656B73]">
                      {p.order?.customer_phone ?? `+${p.phone ?? "?"}`}
                    </span>
                  </p>
                  <p className="text-xs text-[#4C5259]">
                    Harus transfer: <b className="text-[#232528]">{p.expected ? rupiah(p.expected) : "—"}</b>
                    {p.order?.unique_code ? ` (termasuk kode unik +${p.order.unique_code})` : ""} · Diunggah{" "}
                    {new Date(p.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                  {p.ai_read?.nominal ? (
                    <p className="text-xs text-[#656B73]">
                      Terbaca otomatis: <b>{rupiah(p.ai_read.nominal)}</b>
                      {p.ai_read.bank ? ` · ${p.ai_read.bank}` : ""}
                      {p.ai_read.nama_pengirim ? ` · ${p.ai_read.nama_pengirim}` : ""}
                    </p>
                  ) : null}
                  {mismatch && (
                    <p className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Nominal di bukti ({rupiah(p.amount)}) berbeda dari total transfer {rupiah(p.expected)}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewProof(p)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-xs font-medium text-[#232528] hover:border-[#5E93B8] hover:bg-[#EDF4F8]"
                  >
                    <Eye className="h-3.5 w-3.5 text-[#5E93B8]" /> Pratinjau Bukti
                  </button>
                  {!p.order && (
                    <button
                      type="button"
                      disabled={busy === p.id}
                      onClick={() => setAssignProof(p)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#5E93B8]/40 bg-[#EDF4F8] px-3 text-xs font-medium text-[#35678B]"
                    >
                      <Link2 className="h-3.5 w-3.5" /> Tautkan Pesanan
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => review(p, false)}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Tolak
                  </button>
                  <button
                    type="button"
                    disabled={busy === p.id || !p.order}
                    onClick={() => review(p, true)}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#232528] px-3.5 text-xs font-medium text-white hover:bg-[#35383d] disabled:opacity-40"
                  >
                    {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Terima
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {previewProof && (
        <ProofPreviewModal
          proof={previewProof}
          busy={busy === previewProof.id}
          onClose={() => setPreviewProof(null)}
          onAccept={() => review(previewProof, true)}
          onReject={() => review(previewProof, false)}
        />
      )}

      {assignProof && (
        <AssignOrderModal
          proof={assignProof}
          onClose={() => setAssignProof(null)}
          onAssigned={() => {
            setAssignProof(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProofPreviewModal({
  proof,
  busy,
  onClose,
  onAccept,
  onReject,
}: {
  proof: any;
  busy: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mime, setMime] = useState<string>("");
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    fetch(`${API_BASE_URL}/admin/shop/proofs/${proof.id}/file`, {
      headers: { Authorization: `Bearer ${authStorage.getToken()}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Bukti tidak dapat dimuat");
        const blob = await res.blob();
        if (!alive) return;
        setMime(blob.type || "");
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      })
      .catch((e) => {
        if (alive) setLoadErr(e.message || "Gagal memuat file bukti");
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [proof.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mismatch = !!proof.amount && !!proof.expected && proof.amount !== proof.expected;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="grid max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white shadow-2xl md:grid-cols-[1.2fr_1fr]"
      >
        {/* Kiri: File Bukti */}
        <div className="flex min-h-[300px] items-center justify-center overflow-auto bg-[#232528] p-4">
          {loadErr ? (
            <p className="text-xs text-rose-300">{loadErr}</p>
          ) : !blobUrl ? (
            <Loader2 className="h-6 w-6 animate-spin text-white/70" />
          ) : mime.includes("pdf") ? (
            <iframe title="Bukti transfer PDF" src={blobUrl} className="h-[65vh] w-full rounded bg-white" />
          ) : (
            <img src={blobUrl} alt="Bukti transfer" className="max-h-[72vh] w-auto rounded-lg object-contain" />
          )}
        </div>

        {/* Kanan: Rincian & Keputusan */}
        <div className="flex flex-col justify-between overflow-y-auto p-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-[#EAE4DA] pb-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#5E93B8]">
                  Pratinjau Bukti #{proof.id}
                </p>
                <h2 className="font-header text-lg text-[#232528]">
                  {proof.order?.code ?? "Belum Tertaut Pesanan"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={onClose}
                className="rounded-lg p-1 text-[#656B73] hover:bg-[#FAF8F4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#656B73]">Pelanggan</span>
                <span className="font-medium text-[#232528]">{proof.order?.customer_name ?? "Pengirim"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#656B73]">Nomor HP</span>
                <span className="text-[#232528]">{proof.order?.customer_phone ?? `+${proof.phone ?? "?"}`}</span>
              </div>
              <div className="flex justify-between border-t border-[#EAE4DA] pt-2">
                <span className="text-[#656B73]">Harus Ditransfer</span>
                <span className="text-sm font-semibold text-[#232528]">
                  {proof.expected ? rupiah(proof.expected) : "—"}
                </span>
              </div>
              {proof.amount ? (
                <div className="flex justify-between">
                  <span className="text-[#656B73]">Nominal Terbaca</span>
                  <span className={mismatch ? "font-semibold text-rose-600" : "font-semibold text-emerald-700"}>
                    {rupiah(proof.amount)}
                  </span>
                </div>
              ) : null}
              {proof.ai_read?.nama_pengirim && (
                <div className="flex justify-between">
                  <span className="text-[#656B73]">Pengirim (AI)</span>
                  <span className="text-[#232528]">
                    {proof.ai_read.nama_pengirim} {proof.ai_read.bank ? `(${proof.ai_read.bank})` : ""}
                  </span>
                </div>
              )}
            </div>

            {mismatch && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <b>Perhatian:</b> Nominal yang terbaca berbeda dari total tagihan + kode unik. Pastikan kembali di mutasi rekening sebelum menerima.
              </div>
            )}

            <button
              type="button"
              onClick={() => openPrivate(`/admin/shop/proofs/${proof.id}/file`).catch((e) => toast.error(e.message))}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#35678B] hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Buka file ukuran penuh di tab baru
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-[#EAE4DA] pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Tolak Bukti
            </button>
            <button
              type="button"
              disabled={busy || !proof.order}
              onClick={onAccept}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#232528] text-xs font-medium text-white hover:bg-[#35383d] disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Terima & Terbitkan Lunas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignOrderModal({
  proof,
  onClose,
  onAssigned,
}: {
  proof: any;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminShop
      .orders({ status: "menunggu_bayar,menunggu_verifikasi,penawaran", per_page: 50 })
      .then((r: any) => setOrders(r.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!code.trim()) return void toast.error("Pilih atau ketik kode pesanan terlebih dahulu.");
    setBusy(true);
    try {
      await adminShop.assignProof(proof.id, code.trim().toUpperCase());
      toast.success(`Bukti #${proof.id} ditautkan ke pesanan ${code.trim().toUpperCase()}.`);
      onAssigned();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Gagal menautkan bukti");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[#EAE4DA] bg-white p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between border-b border-[#EAE4DA] pb-3">
          <h2 className="font-header text-lg text-[#232528]">Tautkan Bukti ke Pesanan</h2>
          <button type="button" aria-label="Tutup" onClick={onClose}>
            <X className="h-4 w-4 text-[#656B73]" />
          </button>
        </div>

        <label className="block text-xs font-medium text-[#232528]">
          Pilih Pesanan yang Menunggu Pembayaran
          {loading ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-[#656B73]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat pesanan...
            </div>
          ) : (
            <select
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-xs text-[#232528]"
            >
              <option value="">— Pilih dari daftar pesanan —</option>
              {orders.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.code} · {o.customer_name} ({o.grand_total ? rupiah(o.grand_total) : "—"})
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="mt-3 block text-xs font-medium text-[#232528]">
          Atau ketik kode pesanan secara manual
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="mis. LVR-AB12CD"
            className="mt-1 h-10 w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 font-mono text-sm uppercase text-[#232528]"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-9 rounded-lg border border-[#EAE4DA] px-4 text-xs text-[#656B73]"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={busy || !code.trim()}
            onClick={submit}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#232528] px-4 text-xs font-medium text-white disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Tautkan Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
