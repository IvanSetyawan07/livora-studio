import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { Pencil, Trash2, Plus, Settings2 } from "lucide-react";

export default function AdminItems() {
  const [items, setItems] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get("/items").then((r) => setItems(r.data));
  useEffect(() => {
    load();
    api.get("/taxonomies/furniture-types").then((r) => setTypes(r.data));
    api.get("/taxonomies/themes").then((r) => setThemes(r.data));
    api.get("/taxonomies/categories").then((r) => setCats(r.data));
    api.get("/collections").then((r) => setCollections(r.data)).catch(() => {});
  }, []);

  const del = async (i: any) => {
    if (!confirm(`Hapus item "${i.title}"?`)) return;
    await api.delete(`/admin/items/${i.id}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Manage</p>
          <h1 className="serif text-4xl">Items / Furniture</h1>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em]">
          <Plus className="w-4 h-4" /> New Item
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-[0.15em]">
            <tr>
              <th className="text-left p-3">Image</th>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Code</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Themes</th>
              <th className="text-left p-3">Categories</th>
              <th className="text-left p-3">Avail</th>
              <th className="text-left p-3">Edit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="p-3">
                  {i.image ? <img src={imgUrl(i.image)} className="w-12 h-12 object-cover rounded" alt="" /> : <div className="w-12 h-12 bg-muted rounded" />}
                </td>
                <td className="p-3 font-medium">{i.title}</td>
                <td className="p-3 text-muted-foreground">{i.code}</td>
                <td className="p-3">{i.type?.name || "—"}</td>
                <td className="p-3 text-xs">{i.themes?.map((t: any) => t.name).join(", ")}</td>
                <td className="p-3 text-xs">{i.categories?.map((c: any) => c.name).join(", ")}</td>
                <td className="p-3 text-xs">{i.availability}</td>
                <td className="p-3 text-right">
                  <Link to={`/admin/items/${i.id}/experience`} title="Manage Experience" className="p-1.5 hover:bg-muted rounded inline-flex">
                    <Settings2 className="w-3.5 h-3.5" />
                  </Link>
                  <button onClick={() => { setEditing(i); setShowForm(true); }} className="p-1.5 hover:bg-muted rounded">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => del(i)} className="p-1.5 hover:bg-destructive hover:text-destructive-foreground rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Belum ada item.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ItemForm item={editing} types={types} themes={themes} cats={cats} collections={collections}
          onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}

function ItemForm({ item, types, themes, cats, collections, onClose, onSaved }: any) {
  const [title, setTitle] = useState(item?.title || "");
  const [code, setCode] = useState(item?.code || "");
  const [texture, setTexture] = useState(item?.texture || "");
  const [finish, setFinish] = useState(item?.finish || "");
  const [availability, setAvailability] = useState(item?.availability || "available");
  const [description, setDescription] = useState(item?.description || "");
  const [typeId, setTypeId] = useState(item?.type_id?.toString() || "");
  const [collectionId, setCollectionId] = useState(item?.collection_id?.toString() || item?.collection?.id?.toString() || "");
  const [themeIds, setThemeIds] = useState<number[]>(item?.themes?.map((t: any) => t.id) || []);
  const [catIds, setCatIds] = useState<number[]>(item?.categories?.map((c: any) => c.id) || []);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const tog = (arr: number[], setArr: any, id: number) =>
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("code", code);
      fd.append("texture", texture);
      fd.append("finish", finish);
      fd.append("availability", availability);
      fd.append("description", description);
      if (typeId) fd.append("type_id", typeId);
      if (collectionId) fd.append("collection_id", collectionId);
      themeIds.forEach((id) => fd.append("theme_ids[]", id.toString()));
      catIds.forEach((id) => fd.append("category_ids[]", id.toString()));
      if (file) fd.append("image", file);
      const url = item ? `/admin/items/${item.id}` : "/admin/items";
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSaved();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-6 z-50" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-card border border-border rounded-lg w-full max-w-3xl p-8 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="serif text-2xl">{item ? "Edit Item" : "New Item"}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title"><input required className="ui-input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Code"><input className="ui-input" value={code} onChange={(e) => setCode(e.target.value)} /></Field>
          <Field label="Type (Jenis Furniture)">
            <select className="ui-input" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              <option value="">—</option>
              {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Collection">
            <select className="ui-input" value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
              <option value="">— None —</option>
              {(collections ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Availability">
            <select className="ui-input" value={availability} onChange={(e) => setAvailability(e.target.value)}>
              <option value="available">Available</option>
              <option value="made_to_order">Made to Order</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </Field>
          <Field label="Texture"><input className="ui-input" value={texture} onChange={(e) => setTexture(e.target.value)} /></Field>
          <Field label="Finish"><input className="ui-input" value={finish} onChange={(e) => setFinish(e.target.value)} /></Field>
        </div>
        <Field label="Description">
          <textarea className="ui-input min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Themes">
            <div className="border border-border rounded p-2 max-h-32 overflow-y-auto space-y-1">
              {themes.map((t: any) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={themeIds.includes(t.id)} onChange={() => tog(themeIds, setThemeIds, t.id)} /> {t.name}
                </label>
              ))}
              {themes.length === 0 && <p className="text-xs text-muted-foreground">Tambah di Taxonomies.</p>}
            </div>
          </Field>
          <Field label="Categories">
            <div className="border border-border rounded p-2 max-h-32 overflow-y-auto space-y-1">
              {cats.map((c: any) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={catIds.includes(c.id)} onChange={() => tog(catIds, setCatIds, c.id)} /> {c.name}
                </label>
              ))}
              {cats.length === 0 && <p className="text-xs text-muted-foreground">Tambah di Taxonomies.</p>}
            </div>
          </Field>
        </div>
        <Field label="Image">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {item?.image && !file && <img src={imgUrl(item.image)} className="mt-2 w-32 rounded" alt="" />}
        </Field>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
          <button disabled={saving} className="ml-auto px-5 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em] disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
