import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", cs: "Customer Service", finance: "Keuangan", production: "Produksi" };
const EDITABLE = ["cs", "finance", "production"];
const LEVELS = [
  { v: "none", l: "Tidak ada" },
  { v: "view", l: "Lihat saja" },
  { v: "edit", l: "Lihat & edit" },
];

type Admin = { id: number; name: string; email: string; admin_role: string | null };
type Data = { features: Record<string, string>; matrix: Record<string, Record<string, string>>; admins: Admin[] };

const errMsg = (e: any) => e?.response?.data?.message ?? e?.message ?? "Gagal";

export default function AdminRoles() {
  const [data, setData] = useState<Data | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/roles").then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, []);

  const setLevel = (role: string, f: string, v: string) =>
    setData((d) => d && { ...d, matrix: { ...d.matrix, [role]: { ...d.matrix[role], [f]: v } } });

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const { data: r } = await api.post("/admin/roles/permissions", { matrix: data.matrix });
      setData((d) => d && { ...d, matrix: r.matrix });
      toast.success("Hak akses disimpan");
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  const changeRole = async (a: Admin, role: string) => {
    try {
      await api.post(`/admin/shop/admins/${a.id}/role`, { admin_role: role });
      setData((d) => d && { ...d, admins: d.admins.map((x) => (x.id === a.id ? { ...x, admin_role: role } : x)) });
      toast.success(`${a.name} sekarang ${ROLE_LABEL[role]}`);
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (!data) return <div className="p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Peran & hak akses</h1>
        <p className="text-sm text-muted-foreground">Hanya Owner yang bisa membuka halaman ini. Owner selalu punya akses penuh.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Peran tiap admin</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {data.admins.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3 first:border-0">
              <div className="min-w-0"><p className="truncate">{a.name}</p><p className="truncate text-xs text-muted-foreground">{a.email}</p></div>
              <select aria-label={`Peran ${a.name}`} value={a.admin_role ?? "owner"} onChange={(e) => changeRole(a, e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
                {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Untuk menjadikan seseorang admin, ubah dulu jenis akunnya di menu Pengguna.</p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Akses fitur per peran</h2>
          <button type="button" onClick={save} disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm text-background disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr><th className="p-3">Fitur</th>{EDITABLE.map((r) => <th key={r} className="p-3">{ROLE_LABEL[r]}</th>)}</tr>
            </thead>
            <tbody>
              {Object.entries(data.features).map(([f, label]) => (
                <tr key={f} className="border-t border-border">
                  <td className="p-3">{label}</td>
                  {EDITABLE.map((r) => (
                    <td key={r} className="p-2">
                      <select aria-label={`${label} untuk ${ROLE_LABEL[r]}`} value={data.matrix[r]?.[f] ?? "none"} onChange={(e) => setLevel(r, f, e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2">
                        {LEVELS.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
