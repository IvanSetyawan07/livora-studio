import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { adminShop, rupiah } from "@/lib/shop";
import StatusBadge from "@/components/shop/StatusBadge";

const CARDS: { key: string; label: string; status: string }[] = [
  { key: "menunggu_wa", label: "Menunggu chat WA", status: "menunggu_wa,wa_terhubung" },
  { key: "menunggu_data", label: "Menunggu data", status: "menunggu_data" },
  { key: "review", label: "Perlu penawaran", status: "data_lengkap,menunggu_review_admin" },
  { key: "penawaran", label: "Penawaran terkirim", status: "penawaran" },
  { key: "menunggu_bayar", label: "Menunggu bayar", status: "menunggu_bayar" },
  { key: "verifikasi", label: "Bukti transfer", status: "__proofs" },
  { key: "fulfillment", label: "Diproses & kirim", status: "dibayar,diproses,siap_kirim,dikirim" },
  { key: "perlu_tindakan", label: "Perlu tindakan", status: "perlu_tindakan" },
];

export default function AdminShopOrders() {
  const [sp, setSp] = useSearchParams();
  const status = sp.get("status") ?? "";
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<any[] | null>(null);
  const [manual, setManual] = useState(false);

  useEffect(() => { adminShop.summary().then(setSummary).catch(() => {}); }, []);
  useEffect(() => {
    setRows(null);
    adminShop.orders({ status: status || undefined, q: sp.get("q") || undefined }).then((r) => setRows(r.data ?? [])).catch((e) => { toast.error(e.message); setRows([]); });
  }, [status, sp]);

  const pick = (s: string) => {
    if (s === "__proofs") { window.location.assign("/admin/shop/payments"); return; }
    const n = new URLSearchParams(sp);
    status === s ? n.delete("status") : n.set("status", s);
    setSp(n);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pesanan furnitur</h1>
          <p className="text-sm text-muted-foreground">Klik kartu untuk memfilter. Kerjakan dari kiri ke kanan.</p>
        </div>
        <button type="button" onClick={() => setManual(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm text-background"><Plus className="h-4 w-4" /> Pesanan manual</button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {CARDS.map((c) => (
          <button key={c.key} type="button" onClick={() => pick(c.status)}
            className={`rounded-xl border p-4 text-left transition ${status === c.status ? "border-foreground bg-muted" : "border-border bg-card hover:border-foreground/30"}`}>
            <p className="text-2xl font-semibold">{summary[c.key] ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); const n = new URLSearchParams(sp); q ? n.set("q", q) : n.delete("q"); setSp(n); }} className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode, nama, atau nomor HP" aria-label="Cari pesanan" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm" />
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Kode</th><th className="p-3">Pelanggan</th><th className="p-3">Barang</th><th className="p-3">Status</th><th className="p-3 text-right">Total</th><th className="p-3">Dibuat</th></tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Tidak ada pesanan.</td></tr>
            ) : rows.map((o) => (
              <tr key={o.code} className="border-t border-border hover:bg-muted/40">
                <td className="p-3"><Link to={`/admin/shop/orders/${o.code}`} className="font-mono font-medium underline-offset-4 hover:underline">{o.code}</Link></td>
                <td className="p-3"><p>{o.customer_name}</p><p className="text-xs text-muted-foreground">{o.customer_phone}</p></td>
                <td className="max-w-[240px] truncate p-3 text-muted-foreground">{o.items?.map((i: any) => `${i.title} ×${i.quantity}`).join(", ")}</td>
                <td className="p-3"><StatusBadge status={o.status} label={o.status_label} /></td>
                <td className="p-3 text-right">{o.grand_total ? rupiah(o.grand_total) : "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {manual && <ManualOrderDialog onClose={() => setManual(false)} />}
    </div>
  );
}

function ManualOrderDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", customer_email: "", note: "" });
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<any[]>([]);
  const [items, setItems] = useState<{ item_id: number; title: string; quantity: number }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => adminShop.items(term).then(setFound).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [term]);

  const save = async () => {
    if (!form.customer_name || !form.customer_phone || !items.length) return toast.error("Lengkapi nama, nomor HP, dan minimal satu barang");
    setBusy(true);
    try {
      const { code } = await adminShop.createManual({ ...form, wa_consent: true, items: items.map(({ item_id, quantity }) => ({ item_id, quantity })) });
      toast.success(`Pesanan ${code} dibuat`);
      window.location.assign(`/admin/shop/orders/${code}`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="manual-title">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-5">
        <div className="flex items-center justify-between"><h2 id="manual-title" className="font-semibold">Pesanan manual (walk-in / telepon / Instagram)</h2><button type="button" aria-label="Tutup" onClick={onClose}><X className="h-4 w-4" /></button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className={inp} placeholder="Nama pelanggan" aria-label="Nama pelanggan" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <input className={inp} placeholder="No. WhatsApp (62…)" aria-label="Nomor WhatsApp" inputMode="tel" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          <input className={`${inp} sm:col-span-2`} placeholder="Email (opsional)" aria-label="Email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
        </div>
        <p className="mt-4 text-sm font-medium">Barang</p>
        <input className={`${inp} mt-2`} placeholder="Cari nama atau kode barang" aria-label="Cari barang" value={term} onChange={(e) => setTerm(e.target.value)} />
        <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border">
          {found.map((i) => (
            <li key={i.id}><button type="button" className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => setItems((p) => p.some((x) => x.item_id === i.id) ? p : [...p, { item_id: i.id, title: i.title, quantity: 1 }])}>
              <span>{i.title} <span className="text-muted-foreground">{i.code}</span></span><span className="text-xs text-muted-foreground">stok {i.stock ?? "—"}</span>
            </button></li>
          ))}
        </ul>
        <ul className="mt-3 space-y-2">
          {items.map((i) => (
            <li key={i.item_id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">{i.title}</span>
              <input type="number" min={1} max={99} value={i.quantity} aria-label={`Jumlah ${i.title}`} onChange={(e) => setItems((p) => p.map((x) => x.item_id === i.item_id ? { ...x, quantity: Math.max(1, +e.target.value) } : x))} className="h-9 w-16 rounded-lg border border-border bg-background px-2" />
              <button type="button" aria-label="Hapus" onClick={() => setItems((p) => p.filter((x) => x.item_id !== i.item_id))}><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <textarea className="mt-3 w-full rounded-lg border border-border bg-background p-3 text-sm" rows={2} placeholder="Catatan" aria-label="Catatan" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <button type="button" disabled={busy} onClick={save} className="mt-4 h-10 w-full rounded-lg bg-foreground text-sm text-background disabled:opacity-50">{busy ? "Menyimpan…" : "Buat pesanan"}</button>
      </div>
    </div>
  );
}
