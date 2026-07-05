import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { Trash2, Plus, Search, X } from "lucide-react";

export default function AdminProjectPhotos({ project, onClose }: any) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = () =>
    api.get(`/admin/projects/${project.id}/photos`).then((r) => setPhotos(r.data));

  useEffect(() => {
    load();
    api.get("/items").then((r) => setItems(r.data));
  }, [project.id]);

  const del = async (p: any) => {
    if (!confirm("Hapus foto ini?")) return;
    await api.delete(`/admin/photos/${p.id}`);
    load();
  };

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-6 z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-lg w-full max-w-5xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Photos for</p>
            <h2 className="serif text-2xl">{project.title}</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-sm">
              <Plus className="w-4 h-4" /> Add Photo
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm">Close</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {photos.map((p) => (
            <div key={p.id} className="border border-border rounded overflow-hidden">
              <img src={imgUrl(p.image)} alt={p.title} className="w-full aspect-square object-cover" />
              <div className="p-3 text-sm">
                <p className="font-medium">{p.title || "Untitled"}</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Items: {p.items?.map((i: any) => i.title).join(", ") || "—"}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(p); setShowForm(true); }} className="text-xs px-2 py-1 border border-border rounded">Edit</button>
                  <button onClick={() => del(p)} className="text-xs px-2 py-1 border border-border rounded text-destructive ml-auto">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {photos.length === 0 && <p className="col-span-3 text-sm text-muted-foreground">Belum ada foto.</p>}
        </div>

        {showForm && (
          <PhotoForm
            projectId={project.id}
            photo={editing}
            items={items}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); load(); }}
          />
        )}
      </div>
    </div>
  );
}

function PhotoForm({ projectId, photo, items, onClose, onSaved }: any) {
  const [title, setTitle] = useState(photo?.title || "");
  const [caption, setCaption] = useState(photo?.caption || "");
  const [file, setFile] = useState<File | null>(null);
  const [itemIds, setItemIds] = useState<number[]>(photo?.items?.map((i: any) => i.id) || []);
  const [saving, setSaving] = useState(false);

  const toggle = (id: number) =>
    setItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo && !file) { alert("Pilih foto"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("caption", caption);
      if (file) fd.append("image", file);
      itemIds.forEach((id) => fd.append("item_ids[]", id.toString()));
      const url = photo ? `/admin/photos/${photo.id}` : `/admin/projects/${projectId}/photos`;
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSaved();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center p-6 z-[60]" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-card border border-border rounded-lg w-full max-w-xl p-6 space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="serif text-xl">{photo ? "Edit Photo" : "Add Photo"}</h3>
        <input className="ui-input" placeholder="Title (e.g. Lobby)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="ui-input" placeholder="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <TagItemsPicker items={items} itemIds={itemIds} toggle={toggle} />

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
          <button disabled={saving} className="ml-auto px-5 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em] disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TagItemsPicker({ items, itemIds, toggle }: { items: any[]; itemIds: number[]; toggle: (id: number) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i: any) =>
        i.title?.toLowerCase().includes(q) ||
        i.code?.toLowerCase().includes(q)
    );
  }, [items, query]);

  const selected = items.filter((i: any) => itemIds.includes(i.id));

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Tag Items in this Photo</p>

      <div ref={wrapRef} className="relative">
        <div className="flex items-center gap-2 border border-border rounded px-3 py-2 bg-background">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            placeholder="Search items..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>

        {open && (
          <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded shadow-lg max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">Tidak ada item.</p>
            )}
            {filtered.map((i: any) => {
              const checked = itemIds.includes(i.id);
              return (
                <button
                  type="button"
                  key={i.id}
                  onClick={() => toggle(i.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/60 transition ${checked ? "bg-muted/40" : ""}`}
                >
                  <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                    {i.image ? (
                      <img src={imgUrl(i.image)} alt={i.title} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{i.code || "—"}</p>
                  </div>
                  <input type="checkbox" readOnly checked={checked} className="pointer-events-none" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selected.map((i: any) => (
            <span
              key={i.id}
              className="inline-flex items-center gap-2 bg-muted border border-border rounded-full pl-1 pr-2 py-1 text-xs"
            >
              <span className="w-6 h-6 rounded-full bg-background overflow-hidden">
                {i.image ? <img src={imgUrl(i.image)} alt={i.title} className="w-full h-full object-cover" /> : null}
              </span>
              <span className="truncate max-w-[120px]">{i.title}</span>
              <button
                type="button"
                onClick={() => toggle(i.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
