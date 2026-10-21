import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, AlertCircle } from "lucide-react";
import { adminShop, rupiah } from "@/lib/shop";

/**
 * Pantau Proses — papan 8 kolom semua pesanan. HANYA untuk melihat;
 * semua tindakan tetap di detail pesanan. Diperbarui tiap 20 detik.
 */
const COLUMNS: { key: string; label: string; statuses: string[] }[] = [
  { key: "harga", label: "Menunggu harga", statuses: ["menunggu_harga", "menunggu_wa", "wa_terhubung", "menunggu_data", "data_lengkap", "menunggu_review_admin"] },
  { key: "penawaran", label: "Penawaran", statuses: ["penawaran"] },
  { key: "bayar", label: "Menunggu bayar", statuses: ["menunggu_bayar"] },
  { key: "verifikasi", label: "Menunggu verifikasi", statuses: ["menunggu_verifikasi"] },
  { key: "diproses", label: "Diproses", statuses: ["dibayar", "diproses"] },
  { key: "kirim", label: "Siap & dikirim", statuses: ["siap_kirim", "dikirim"] },
  { key: "selesai", label: "Selesai", statuses: ["diterima", "selesai"] },
  { key: "masalah", label: "Bermasalah", statuses: ["bermasalah", "perlu_tindakan", "kedaluwarsa", "dibatalkan"] },
];

const AGE_DAYS = (created: string) => Math.max(0, Math.floor((Date.now() - new Date(created).getTime()) / 86400000));

export default function AdminShopBoard() {
  const [orders, setOrders] = useState<any[] | null>(null);
  const [query, setQuery] = useState("");
  const [lateOnly, setLateOnly] = useState(false);

  const load = () => adminShop.orders({ per_page: 200 }).then((r: any) => setOrders(r.data ?? r)).catch(() => setOrders([]));
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    let list = orders ?? [];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((o) => o.code?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q));
    }
    if (lateOnly) list = list.filter((o) => isLate(o));
    return list;
  }, [orders, query, lateOnly]);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="serif text-2xl">Pantau Proses</h1>
          <p className="text-sm text-muted-foreground">Semua pesanan dalam satu papan. Klik kartu untuk membuka detail dan bertindak.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari kode / nama"
              className="h-10 w-56 rounded-full border border-border bg-background pl-9 pr-4 text-sm outline-none focus:border-foreground" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={lateOnly} onChange={(e) => setLateOnly(e.target.checked)} className="h-4 w-4 accent-current" />
            Hanya yang terlambat
          </label>
        </div>
      </div>

      {orders === null ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat papan…</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          {COLUMNS.map((col) => {
            const cards = filtered.filter((o) => col.statuses.includes(o.status));
            return (
              <section key={col.key} className="rounded-2xl border border-border bg-muted/30 p-3">
                <header className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{col.label}</h2>
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs">{cards.length}</span>
                </header>
                <ul className="mt-3 space-y-2">
                  {cards.map((o) => (
                    <li key={o.code}>
                      <Link to={`/admin/shop/orders/${o.code}`}
                        className="block rounded-xl border border-border bg-card p-3 transition hover:border-foreground/40">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs">{o.code}</span>
                          {isLate(o) && <AlertCircle className="h-3.5 w-3.5 text-red-600" aria-label="Melewati batas waktu" />}
                        </div>
                        <p className="mt-1 truncate text-sm font-medium">{o.customer_name ?? o.customer_phone ?? "-"}</p>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{o.grand_total ? rupiah(o.grand_total) : "—"}</span>
                          <span>{AGE_DAYS(o.created_at)} hari</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                  {!cards.length && <li className="px-1 py-4 text-center text-xs text-muted-foreground">Kosong</li>}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isLate(o: any): boolean {
  if (o.quote_expires_at && new Date(o.quote_expires_at) < new Date() && ["penawaran", "menunggu_bayar"].includes(o.status)) return true;
  if (o.sla_due_at && new Date(o.sla_due_at) < new Date() && o.status === "menunggu_harga") return true;
  return false;
}
