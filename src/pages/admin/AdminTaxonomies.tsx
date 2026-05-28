import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";

const TABS = [
  { key: "scopes", label: "Scopes (Project)" },
  { key: "furniture-types", label: "Furniture Types" },
  { key: "themes", label: "Themes" },
  { key: "categories", label: "Categories" },
];

export default function AdminTaxonomies() {
  const [tab, setTab] = useState("scopes");
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState("");

  const load = () => api.get(`/taxonomies/${tab}`).then((r) => setRows(r.data));
  useEffect(() => { load(); }, [tab]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post(`/admin/taxonomies/${tab}`, { name });
    setName(""); load();
  };

  const rename = async (row: any) => {
    const n = prompt("Nama baru:", row.name);
    if (!n) return;
    await api.put(`/admin/taxonomies/${tab}/${row.id}`, { name: n });
    load();
  };

  const del = async (row: any) => {
    if (!confirm(`Hapus "${row.name}"?`)) return;
    await api.delete(`/admin/taxonomies/${tab}/${row.id}`);
    load();
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Manage</p>
      <h1 className="serif text-4xl mb-8">Taxonomies</h1>

      <div className="flex gap-2 mb-6 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === t.key ? "border-foreground" : "border-transparent text-muted-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={add} className="flex gap-2 mb-6">
        <input className="ui-input flex-1" placeholder={`Nama ${tab}`} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="flex items-center gap-2 bg-foreground text-background px-4 rounded text-sm">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center p-4">
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.slug}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => rename(r)} className="text-xs px-3 py-1.5 border border-border rounded">Rename</button>
              <button onClick={() => del(r)} className="p-2 hover:bg-destructive hover:text-destructive-foreground rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">Kosong.</p>}
      </div>
    </div>
  );
}
