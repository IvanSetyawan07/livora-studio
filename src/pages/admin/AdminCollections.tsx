import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Pencil, Trash2, Plus } from "lucide-react";

interface Collection { id: number; name: string; slug: string; description?: string }

export default function AdminCollections() {
  const [list, setList] = useState<Collection[]>([]);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);

  const load = () => api.get<Collection[]>("/collections").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setName(""); setDescription(""); setOpen(true); };
  const openEdit = (c: Collection) => { setEditing(c); setName(c.name); setDescription(c.description ?? ""); setOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/admin/collections/${editing.id}`, { name, description });
      else await api.post("/admin/collections", { name, description });
      setOpen(false); load();
    } catch (err: any) { alert(err?.response?.data?.message || "Save failed"); }
  };

  const del = async (c: Collection) => {
    if (!confirm(`Delete collection "${c.name}"?`)) return;
    await api.delete(`/admin/collections/${c.id}`); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Manage</p>
          <h1 className="serif text-4xl">Collections</h1>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em]">
          <Plus className="w-4 h-4" /> New Collection
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-[0.15em]">
            <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Slug</th><th className="text-left p-3">Description</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted-foreground">{c.slug}</td>
                <td className="p-3 text-xs text-muted-foreground">{c.description}</td>
                <td className="p-3 text-right">
                  <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-muted rounded"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => del(c)} className="p-1.5 hover:bg-destructive hover:text-destructive-foreground rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No collections yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-6 z-50" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="bg-card border border-border rounded-lg w-full max-w-lg p-8 space-y-4">
            <h2 className="serif text-2xl">{editing ? "Edit Collection" : "New Collection"}</h2>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Name</span>
              <input required className="ui-input mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Description</span>
              <textarea className="ui-input mt-1 w-full min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
              <button className="ml-auto px-5 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em]">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
