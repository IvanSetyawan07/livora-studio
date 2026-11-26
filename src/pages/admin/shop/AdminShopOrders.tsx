import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Columns3,
  List,
  Loader2,
  PackageSearch,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { adminShop, rupiah } from "@/lib/shop";
import StatusBadge from "@/components/shop/StatusBadge";
import {
  PageHeader,
  AdminHelpBanner,
  DebouncedSearchInput,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/components/admin/kit";

const CARDS: { key: string; label: string; status: string }[] = [
  { key: "chat_menunggu", label: "Chat butuh admin", status: "__inbox" },
  {
    key: "perlu_harga",
    label: "Menunggu harga",
    status: "menunggu_harga,data_lengkap,menunggu_review_admin,menunggu_wa,wa_terhubung,menunggu_data",
  },
  { key: "penawaran", label: "Penawaran terkirim", status: "penawaran" },
  { key: "menunggu_bayar", label: "Menunggu bayar", status: "menunggu_bayar" },
  { key: "verifikasi", label: "Bukti transfer", status: "__proofs" },
  { key: "fulfillment", label: "Diproses & kirim", status: "dibayar,diproses,siap_kirim,dikirim" },
  { key: "bermasalah", label: "Bermasalah", status: "bermasalah,perlu_tindakan" },
];

const BOARD_COLUMNS: { key: string; label: string; statuses: string[]; accent?: string }[] = [
  {
    key: "harga",
    label: "Menunggu Harga",
    statuses: ["menunggu_harga", "menunggu_wa", "wa_terhubung", "menunggu_data", "data_lengkap", "menunggu_review_admin"],
    accent: "bg-amber-500",
  },
  { key: "penawaran", label: "Penawaran", statuses: ["penawaran"], accent: "bg-violet-500" },
  { key: "bayar", label: "Menunggu Bayar", statuses: ["menunggu_bayar"], accent: "bg-orange-500" },
  { key: "verifikasi", label: "Verifikasi Bukti", statuses: ["menunggu_verifikasi"], accent: "bg-[#5E93B8]" },
  { key: "diproses", label: "Diproses / Produksi", statuses: ["dibayar", "diproses"], accent: "bg-emerald-500" },
  { key: "kirim", label: "Siap & Dikirim", statuses: ["siap_kirim", "dikirim"], accent: "bg-teal-600" },
  { key: "selesai", label: "Selesai", statuses: ["diterima", "selesai"], accent: "bg-[#232528]" },
  { key: "masalah", label: "Bermasalah / Perlu Tindakan", statuses: ["bermasalah", "perlu_tindakan"], accent: "bg-rose-600" },
  { key: "batal", label: "Dibatalkan / Kedaluwarsa", statuses: ["dibatalkan", "kedaluwarsa"], accent: "bg-slate-400" },
];

const ageDays = (created: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(created).getTime()) / 86400000));

function isLate(o: any): boolean {
  if (
    o.quote_expires_at &&
    new Date(o.quote_expires_at) < new Date() &&
    ["penawaran", "menunggu_bayar"].includes(o.status)
  ) {
    return true;
  }
  if (o.sla_due_at && new Date(o.sla_due_at) < new Date() && o.status === "menunggu_harga") {
    return true;
  }
  return false;
}

export default function AdminShopOrders() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const view = sp.get("view") === "board" ? "board" : "list";
  const status = sp.get("status") ?? "";
  const urlQ = sp.get("q") ?? "";
  const page = Math.max(1, Number(sp.get("page") || 1));

  const [q, setQ] = useState(urlQ);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<any[] | null>(null);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number }>({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [lateOnly, setLateOnly] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  const loadSummary = useCallback(() => {
    adminShop.summary().then(setSummary).catch(() => {});
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const loadOrders = useCallback(async () => {
    setError(null);
    try {
      if (view === "board") {
        const r: any = await adminShop.orders({ per_page: 200 });
        setRows(r.data ?? (Array.isArray(r) ? r : []));
      } else {
        const r: any = await adminShop.orders({
          status: status || undefined,
          q: urlQ || undefined,
          page,
          per_page: 25,
        });
        setRows(r.data ?? []);
        setMeta({
          current_page: r.current_page ?? 1,
          last_page: r.last_page ?? 1,
          total: r.total ?? (r.data?.length ?? 0),
        });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Gagal memuat pesanan";
      setError(msg);
      toast.error(msg);
      setRows([]);
    }
  }, [view, status, urlQ, page]);

  useEffect(() => {
    setRows(null);
    loadOrders();
    if (view === "board") {
      const t = setInterval(loadOrders, 20000);
      return () => clearInterval(t);
    }
  }, [loadOrders, view]);

  const setView = (next: "list" | "board") => {
    const n = new URLSearchParams(sp);
    if (next === "board") {
      n.set("view", "board");
      n.delete("page");
    } else {
      n.delete("view");
    }
    setSp(n);
  };

  const handleSearchChange = (val: string) => {
    setQ(val);
    const n = new URLSearchParams(sp);
    if (val.trim()) n.set("q", val.trim());
    else n.delete("q");
    n.delete("page");
    setSp(n, { replace: true });
  };

  const pick = (s: string) => {
    if (s === "__proofs") {
      navigate("/admin/shop/payments");
      return;
    }
    if (s === "__inbox") {
      navigate("/admin/shop/inbox");
      return;
    }
    const n = new URLSearchParams(sp);
    n.delete("view");
    n.delete("page");
    if (status === s) n.delete("status");
    else n.set("status", s);
    setSp(n);
  };

  const goPage = (p: number) => {
    const n = new URLSearchParams(sp);
    if (p <= 1) n.delete("page");
    else n.set("page", String(p));
    setSp(n);
  };

  const boardFiltered = useMemo(() => {
    let list = rows ?? [];
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (o) =>
          o.code?.toLowerCase().includes(term) ||
          o.customer_name?.toLowerCase().includes(term) ||
          o.customer_phone?.toLowerCase().includes(term),
      );
    }
    if (lateOnly) list = list.filter((o) => isLate(o));
    return list;
  }, [rows, q, lateOnly]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operasional Penjualan"
        title="Pesanan Furnitur"
        description="Pantau semua pesanan dari chat WhatsApp, website, hingga pengiriman. Klik kartu ringkasan untuk menyaring atau buka mode Papan Proses."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-[#EAE4DA] bg-white p-1">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "list" ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
                }`}
              >
                <List className="h-3.5 w-3.5" /> Daftar
              </button>
              <button
                type="button"
                onClick={() => setView("board")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "board" ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
                }`}
              >
                <Columns3 className="h-3.5 w-3.5" /> Papan Proses
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                loadSummary();
                loadOrders();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-white px-3 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#5E93B8]" /> Muat Ulang
            </button>
            <button
              type="button"
              onClick={() => setManual(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#232528] px-4 text-xs font-medium text-white hover:bg-[#35383d]"
            >
              <Plus className="h-3.5 w-3.5" /> Catat Pesanan Manual
            </button>
          </div>
        }
      />

      <AdminHelpBanner title="Alur Kerja Pesanan Harian" storageKey="admin-shop-orders-help">
        Kerjakan antrean dari kiri ke kanan: <b>Chat butuh admin</b> → <b>Menunggu harga</b> → <b>Bukti transfer</b> → <b>Diproses & kirim</b>.
        Untuk transaksi langsung di showroom dengan cetak nota instan, gunakan menu <b>Kasir Showroom</b>.
      </AdminHelpBanner>

      {/* Kartu Ringkasan Cepat */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {CARDS.map((c) => {
          const active = view === "list" && status === c.status;
          const val = summary[c.key] ?? 0;
          const isAlert = (c.key === "bermasalah" || c.key === "verifikasi" || c.key === "chat_menunggu") && val > 0;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => pick(c.status)}
              className={`rounded-xl border p-3.5 text-left transition-all ${
                active
                  ? "border-[#5E93B8] bg-[#EDF4F8] ring-1 ring-[#5E93B8]/40"
                  : "border-[#EAE4DA] bg-white hover:border-[#5E93B8]/60"
              }`}
            >
              <p className={`font-header text-2xl ${isAlert ? "text-amber-700" : "text-[#232528]"}`}>
                {summary[c.key] ?? "—"}
              </p>
              <p className="mt-0.5 text-xs text-[#656B73]">{c.label}</p>
            </button>
          );
        })}
      </div>

      {/* Bar Pencarian & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DebouncedSearchInput
            value={q}
            onChange={handleSearchChange}
            placeholder="Cari kode pesanan, nama pelanggan, atau no. HP..."
            className="w-full sm:w-80"
          />
          {view === "list" && status && (
            <button
              type="button"
              onClick={() => {
                const n = new URLSearchParams(sp);
                n.delete("status");
                n.delete("page");
                setSp(n);
              }}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-[#5E93B8]/40 bg-[#EDF4F8] px-3 text-xs font-medium text-[#35678B]"
            >
              Hapus filter status <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {view === "board" && (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#EAE4DA] bg-white px-3 py-2 text-xs text-[#232528]">
            <input
              type="checkbox"
              checked={lateOnly}
              onChange={(e) => setLateOnly(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Hanya tampilkan yang melewati batas waktu
          </label>
        )}
      </div>

      {/* Konten Utama */}
      {error ? (
        <ErrorState message={error} onRetry={loadOrders} />
      ) : view === "board" ? (
        rows === null ? (
          <div className="flex items-center gap-2 py-16 text-sm text-[#656B73]">
            <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" /> Memuat papan proses pesanan…
          </div>
        ) : (
          <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-4">
            {BOARD_COLUMNS.map((col) => {
              const cards = boardFiltered.filter((o) => col.statuses.includes(o.status));
              return (
                <section
                  key={col.key}
                  className="flex w-72 shrink-0 flex-col rounded-2xl border border-[#EAE4DA] bg-[#FAF8F4] p-3"
                >
                  <header className="flex items-center justify-between gap-2 px-1 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${col.accent ?? "bg-[#5E93B8]"}`} />
                      <h2 className="truncate text-xs font-semibold uppercase tracking-wider text-[#232528]">
                        {col.label}
                      </h2>
                    </div>
                    <span className="rounded-full border border-[#EAE4DA] bg-white px-2 py-0.5 text-xs font-medium text-[#232528]">
                      {cards.length}
                    </span>
                  </header>
                  <ul className="mt-1 space-y-2.5 overflow-y-auto max-h-[65vh] pr-0.5">
                    {cards.map((o) => (
                      <li key={o.code}>
                        <Link
                          to={`/admin/shop/orders/${o.code}`}
                          className="block rounded-xl border border-[#EAE4DA] bg-white p-3.5 shadow-sm transition-all hover:border-[#5E93B8]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-semibold text-[#35678B]">{o.code}</span>
                            {isLate(o) && (
                              <span
                                title="Melewati batas waktu SLA / penawaran"
                                className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700"
                              >
                                <AlertCircle className="h-3 w-3" /> Terlambat
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 truncate text-sm font-medium text-[#232528]">
                            {o.customer_name || o.customer_phone || "Pelanggan"}
                          </p>
                          {o.items?.length > 0 && (
                            <p className="mt-0.5 truncate text-[11px] text-[#656B73]">
                              {o.items.map((i: any) => `${i.title} ×${i.quantity}`).join(", ")}
                            </p>
                          )}
                          <div className="mt-2.5 flex items-center justify-between border-t border-[#EAE4DA]/60 pt-2 text-xs">
                            <span className="font-medium text-[#232528]">
                              {o.grand_total ? rupiah(o.grand_total) : "Belum diberi harga"}
                            </span>
                            <span className="text-[11px] text-[#656B73]">{ageDays(o.created_at)} hari</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                    {!cards.length && (
                      <li className="rounded-xl border border-dashed border-[#EAE4DA] bg-white/50 px-3 py-6 text-center text-xs text-[#9AA0A6]">
                        Tidak ada pesanan
                      </li>
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        )
      ) : rows === null ? (
        <TableSkeleton rows={6} cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Tidak ada pesanan yang cocok"
          description="Coba bersihkan filter status atau kata kunci pencarian, atau catat pesanan manual baru."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[#EAE4DA] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px] text-sm">
                <thead className="border-b border-[#EAE4DA] bg-[#FAF8F4] text-left text-[11px] font-medium uppercase tracking-wider text-[#656B73]">
                  <tr>
                    <th className="p-3.5">Kode Pesanan</th>
                    <th className="p-3.5">Pelanggan</th>
                    <th className="p-3.5">Barang</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Total</th>
                    <th className="p-3.5">Dibuat</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr
                      key={o.code}
                      className="border-t border-[#EAE4DA]/80 transition-colors hover:bg-[#FAF8F4]/70"
                    >
                      <td className="p-3.5">
                        <Link
                          to={`/admin/shop/orders/${o.code}`}
                          className="font-mono font-semibold text-[#35678B] underline-offset-4 hover:underline"
                        >
                          {o.code}
                        </Link>
                      </td>
                      <td className="p-3.5">
                        <p className="font-medium text-[#232528]">{o.customer_name || "—"}</p>
                        <p className="text-xs text-[#656B73]">{o.customer_phone || "—"}</p>
                      </td>
                      <td className="max-w-[260px] truncate p-3.5 text-xs text-[#656B73]">
                        {o.items?.map((i: any) => `${i.title} ×${i.quantity}`).join(", ") || "—"}
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={o.status} label={o.status_label} />
                      </td>
                      <td className="p-3.5 text-right font-medium text-[#232528]">
                        {o.grand_total ? rupiah(o.grand_total) : "—"}
                      </td>
                      <td className="p-3.5 text-xs text-[#656B73]">
                        {new Date(o.created_at).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {meta.last_page > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#656B73]">
              <span>
                Halaman <b className="text-[#232528]">{meta.current_page}</b> dari {meta.last_page} ({meta.total} total pesanan)
              </span>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  disabled={meta.current_page <= 1}
                  onClick={() => goPage(meta.current_page - 1)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#EAE4DA] bg-white px-3 text-xs font-medium text-[#232528] disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => goPage(meta.current_page + 1)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#EAE4DA] bg-white px-3 text-xs font-medium text-[#232528] disabled:opacity-40"
                >
                  Berikutnya <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {manual && (
        <ManualOrderDialog
          onClose={() => setManual(false)}
          onCreated={(code) => {
            setManual(false);
            navigate(`/admin/shop/orders/${code}`);
          }}
        />
      )}
    </div>
  );
}

function ManualOrderDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (code: string) => void;
}) {
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", customer_email: "", note: "" });
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<any[]>([]);
  const [items, setItems] = useState<{ item_id: number; title: string; quantity: number }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  useEffect(() => {
    const t = setTimeout(() => adminShop.items(term).then(setFound).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [term]);

  const save = async () => {
    if (!form.customer_name.trim() || !form.customer_phone.trim() || !items.length) {
      return void toast.error("Lengkapi nama pelanggan, nomor WhatsApp, dan minimal satu barang.");
    }
    setBusy(true);
    try {
      const { code } = await adminShop.createManual({
        ...form,
        wa_consent: true,
        items: items.map(({ item_id, quantity }) => ({ item_id, quantity })),
      });
      toast.success(`Pesanan ${code} berhasil dicatat.`);
      onCreated(code);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Gagal membuat pesanan");
    } finally {
      setBusy(false);
    }
  };

  const inp =
    "h-10 w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-sm text-[#232528] focus:border-[#5E93B8] focus:bg-white focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-title"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#EAE4DA] bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DA] pb-3">
          <div>
            <h2 id="manual-title" className="font-header text-lg text-[#232528]">
              Catat Pesanan Telepon / IG / DM
            </h2>
            <p className="text-xs text-[#656B73]">
              Untuk pesanan yang masuk di luar website (sebelum diberi harga/penawaran).
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => !busy && onClose()}
            className="rounded-lg p-1 text-[#656B73] hover:bg-[#FAF8F4]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            className={inp}
            placeholder="Nama pelanggan *"
            aria-label="Nama pelanggan"
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
          />
          <input
            className={inp}
            placeholder="No. WhatsApp (08… / 62…) *"
            aria-label="Nomor WhatsApp"
            inputMode="tel"
            value={form.customer_phone}
            onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
          />
          <input
            className={`${inp} sm:col-span-2`}
            placeholder="Email pelanggan (opsional)"
            aria-label="Email"
            value={form.customer_email}
            onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
          />
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#656B73]">Pilih Barang</p>
        <input
          className={`${inp} mt-1.5`}
          placeholder="Cari nama atau kode produk..."
          aria-label="Cari barang"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-[#EAE4DA] bg-[#FAF8F4]/50">
          {found.map((i) => (
            <li key={i.id} className="border-b border-[#EAE4DA]/60 last:border-0">
              <button
                type="button"
                className="flex w-full justify-between px-3 py-2 text-left text-xs hover:bg-[#EDF4F8]/70"
                onClick={() =>
                  setItems((p) =>
                    p.some((x) => x.item_id === i.id)
                      ? p
                      : [...p, { item_id: i.id, title: i.title, quantity: 1 }],
                  )
                }
              >
                <span className="font-medium text-[#232528]">
                  {i.title} <span className="font-mono text-[#656B73]">{i.code}</span>
                </span>
                <span className="text-[#656B73]">stok {i.stock ?? "—"}</span>
              </button>
            </li>
          ))}
          {found.length === 0 && (
            <li className="px-3 py-3 text-center text-xs text-[#656B73]">Ketik untuk mencari produk.</li>
          )}
        </ul>

        {items.length > 0 && (
          <ul className="mt-3 space-y-2">
            {items.map((i) => (
              <li
                key={i.item_id}
                className="flex items-center gap-2 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 py-2 text-xs"
              >
                <span className="flex-1 truncate font-medium text-[#232528]">{i.title}</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={i.quantity}
                  aria-label={`Jumlah ${i.title}`}
                  onChange={(e) =>
                    setItems((p) =>
                      p.map((x) =>
                        x.item_id === i.item_id ? { ...x, quantity: Math.max(1, +e.target.value) } : x,
                      ),
                    )
                  }
                  className="h-8 w-16 rounded border border-[#EAE4DA] bg-white px-2 text-center"
                />
                <button
                  type="button"
                  aria-label="Hapus"
                  onClick={() => setItems((p) => p.filter((x) => x.item_id !== i.item_id))}
                  className="text-rose-600 hover:text-rose-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <textarea
          className="mt-3 w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] p-3 text-sm text-[#232528] focus:border-[#5E93B8] focus:bg-white focus:outline-none"
          rows={2}
          placeholder="Catatan pelanggan (warna, ukuran, permintaan khusus)"
          aria-label="Catatan"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#232528] text-sm font-medium text-white disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Menyimpan…" : "Simpan & Buka Detail Pesanan"}
        </button>
      </div>
    </div>
  );
}
