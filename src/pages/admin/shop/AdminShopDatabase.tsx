import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL, authStorage } from "@/lib/api";
import { adminShop } from "@/lib/shop";

const TABS = [
  { key: "documents", label: "Register dokumen" },
  { key: "orders", label: "Pesanan" },
  { key: "customers", label: "Pelanggan" },
  { key: "monthly", label: "Rekap bulanan" },
  { key: "roles", label: "Peran admin" },
  { key: "audit", label: "Catatan aktivitas" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const ROLE_LABEL: Record<string, string> = { owner: "Owner", cs: "Customer Service", finance: "Keuangan", production: "Produksi" };

export default function AdminShopDatabase() {
  const [tab, setTab] = useState<Tab>("documents");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<Record<string, any>[] | null>(null);
  const [docNo, setDocNo] = useState("");

  useEffect(() => {
    setRows(null);
    const p = tab === "roles" ? adminShop.admins() : tab === "audit" ? adminShop.audit().then((r: any) => r.data) : adminShop.grid(tab, { ...(from && { from }), ...(to && { to }) });
    p.then(setRows).catch((e: any) => { toast.error(e.message); setRows([]); });
  }, [tab, from, to]);

  const exportCsv = async () => {
    const qs = new URLSearchParams({ format: "csv", ...(from && { from }), ...(to && { to }) });
    const res = await fetch(`${API_BASE_URL}/admin/shop/database/${tab}?${qs}`, { headers: { Authorization: `Bearer ${authStorage.getToken()}` } });
    if (!res.ok) return toast.error("Ekspor gagal");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a"); a.href = url; a.download = `livora-${tab}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const findDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try { const r = await adminShop.findDocument(docNo.trim()); window.location.assign(`/admin/shop/orders/${r.order_code}`); }
    catch { toast.error("Nomor dokumen tidak ditemukan"); }
  };

  const changeRole = async (id: number, role: string) => {
    try { await adminShop.setRole(id, role); toast.success("Peran diperbarui"); setRows((r) => r?.map((x) => x.id === id ? { ...x, admin_role: role } : x) ?? null); }
    catch (e: any) { toast.error(e.message); }
  };

  const grid = !["roles", "audit"].includes(tab);
  const cols = rows?.[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Database toko</h1><p className="text-sm text-muted-foreground">Data tersusun otomatis dari setiap pesanan dan dokumen.</p></div>
        <form onSubmit={findDoc} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="Cari nomor dokumen / hasil scan QR" aria-label="Nomor dokumen" className="h-10 w-72 rounded-lg border border-border bg-background pl-9 pr-3 text-sm" />
        </form>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === t.key ? "border-foreground font-medium" : "border-transparent text-muted-foreground"}`}>{t.label}</button>
        ))}
      </div>

      {grid && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">Dari <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2" /></label>
          <label className="flex items-center gap-2">Sampai <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2" /></label>
          <button type="button" onClick={exportCsv} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3"><Download className="h-4 w-4" /> Ekspor CSV (Excel/Sheets)</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {rows === null ? <div className="p-8 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
          : rows.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Belum ada data.</p>
          : tab === "roles" ? (
            <table className="w-full text-sm"><tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-border first:border-0">
                  <td className="p-3">{u.name}<p className="text-xs text-muted-foreground">{u.email}</p></td>
                  <td className="p-3 text-right">
                    <select aria-label={`Peran ${u.name}`} value={u.admin_role ?? "owner"} onChange={(e) => changeRole(u.id, e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2">
                      {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody></table>
          ) : tab === "audit" ? (
            <table className="w-full text-sm"><tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-border first:border-0">
                  <td className="w-40 p-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="p-3">{a.action}</td><td className="p-3 text-muted-foreground">{a.user?.name ?? "Sistem"}</td>
                </tr>
              ))}
            </tbody></table>
          ) : (
            <table className="w-full min-w-[900px] text-xs">
              <thead className="bg-muted/50 text-left text-muted-foreground"><tr>{cols.map((c) => <th key={c} className="whitespace-nowrap p-2.5 capitalize">{c.replace(/_/g, " ")}</th>)}</tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {cols.map((c) => (
                      <td key={c} className="max-w-[220px] truncate whitespace-nowrap p-2.5">
                        {c === "kode_order" && r[c] ? <Link to={`/admin/shop/orders/${r[c]}`} className="font-mono underline-offset-2 hover:underline">{r[c]}</Link>
                          : typeof r[c] === "number" && r[c] > 999 ? r[c].toLocaleString("id-ID") : String(r[c] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
