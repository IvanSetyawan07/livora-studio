import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { Pencil, Trash2, Plus, Settings2, Search, Filter, Download, X, ArrowUpDown, QrCode } from "lucide-react";
import ItemQRCode from "@/components/livora/ItemQRCode";


type SortKey = "name-asc" | "name-desc" | "date-desc" | "date-asc";

export default function AdminItems() {
  const [items, setItems] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [qrItem, setQrItem] = useState<any | null>(null);


  // filter / search / sort
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(""); // type slug or id
  const [sortBy, setSortBy] = useState<SortKey>("date-desc");
  const [showFilter, setShowFilter] = useState(false);

  const load = () => api.get("/items").then((r) => setItems(r.data));
  const loadTypes = () => api.get("/taxonomies/furniture-types").then((r) => setTypes(r.data));

  useEffect(() => {
    load();
    loadTypes();
    api.get("/taxonomies/themes").then((r) => setThemes(r.data));
    api.get("/taxonomies/categories").then((r) => setCats(r.data));
    api.get("/collections").then((r) => setCollections(r.data)).catch(() => {});
  }, []);

  // Refetch furniture types whenever the window regains focus so newly created /
  // deleted types in Taxonomies page reflect immediately in filter dropdown.
  useEffect(() => {
    const onFocus = () => loadTypes();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const del = async (i: any) => {
    if (!confirm(`Hapus item "${i.title}"?`)) return;
    await api.delete(`/admin/items/${i.id}`);
    load();
  };

  const downloadImage = async (i: any) => {
    if (!i.image) {
      alert("Item ini belum punya gambar.");
      return;
    }
    try {
      const url = imgUrl(i.image);
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "jpg").split("+")[0];
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${i.slug || i.code || i.title || "item"}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch {
      alert("Gagal mengunduh gambar.");
    }
  };

  const filtered = useMemo(() => {
    let list = [...items];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.code?.toLowerCase().includes(q),
      );
    }
    if (typeFilter) {
      list = list.filter((i) => String(i.type?.id ?? i.type_id ?? "") === typeFilter);
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":  return (a.title || "").localeCompare(b.title || "");
        case "name-desc": return (b.title || "").localeCompare(a.title || "");
        case "date-asc":  return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "date-desc":
        default:          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });
    return list;
  }, [items, query, typeFilter, sortBy]);

  const activeFilterCount = (typeFilter ? 1 : 0) + (sortBy !== "date-desc" ? 1 : 0);

  const fmtDate = (d?: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Manage</p>
          <h1 className="serif text-4xl">Items / Furniture</h1>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em]">
          <Plus className="w-4 h-4" /> New Item
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau code item..."
            className="w-full pl-9 pr-9 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowFilter((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background text-sm hover:bg-muted"
          >
            <Filter className="w-4 h-4" /> Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 text-[10px] bg-foreground text-background rounded-full px-1.5 py-0.5">{activeFilterCount}</span>
            )}
          </button>
          {showFilter && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowFilter(false)} />
              <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-lg shadow-lg p-4 z-50 space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Furniture Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 rounded border border-border bg-background text-sm"
                  >
                    <option value="">All Types</option>
                    {types.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3" /> Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    className="mt-1 w-full px-2 py-1.5 rounded border border-border bg-background text-sm"
                  >
                    <option value="date-desc">Date Upload (Newest)</option>
                    <option value="date-asc">Date Upload (Oldest)</option>
                    <option value="name-asc">Name (A → Z)</option>
                    <option value="name-desc">Name (Z → A)</option>
                  </select>
                </div>
                <div className="flex justify-between pt-1">
                  <button
                    onClick={() => { setTypeFilter(""); setSortBy("date-desc"); }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Reset
                  </button>
                  <button onClick={() => setShowFilter(false)} className="text-xs px-3 py-1 bg-foreground text-background rounded">Done</button>
                </div>
              </div>
            </>
          )}
        </div>

        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {items.length} items</span>
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
              <th className="text-left p-3">Uploaded</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
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
                <td className="p-3 text-xs whitespace-nowrap">{fmtDate(i.created_at)}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => downloadImage(i)} title="Download image" className="p-1.5 hover:bg-muted rounded" disabled={!i.image}>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <Link to={`/admin/items/${i.id}/experience`} title="Manage Experience" className="p-1.5 hover:bg-muted rounded inline-flex">
                    <Settings2 className="w-3.5 h-3.5" />
                  </Link>
                  <button onClick={() => { setEditing(i); setShowForm(true); }} className="p-1.5 hover:bg-muted rounded" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => del(i)} className="p-1.5 hover:bg-destructive hover:text-destructive-foreground rounded" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">
              {items.length === 0 ? "Belum ada item." : "Tidak ada item yang cocok dengan filter."}
            </td></tr>}
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
