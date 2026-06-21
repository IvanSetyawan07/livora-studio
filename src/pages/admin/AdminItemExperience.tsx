import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { ArrowLeft, Plus, Trash2, Pencil } from "lucide-react";

type Tab = "variants" | "gallery" | "lifestyle" | "story";

export default function AdminItemExperience() {
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("variants");

  const loadItem = () => api.get(`/items/${id}`).catch(() => null);
  useEffect(() => {
    // Items endpoint uses slug — we have id, so fetch list and find. Simpler: GET items, find.
    api.get("/items").then((r) => {
      const found = (r.data as any[]).find((x) => String(x.id) === String(id));
      if (found) api.get(`/items/${found.slug}`).then((rr) => setItem(rr.data));
    });
  }, [id]);

  if (!item) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div>
      <Link to="/admin/items" className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Items
      </Link>
      <h1 className="serif text-4xl mb-2">{item.title}</h1>
      <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-8">{item.code} · Experience Editor</p>

      <div className="border-b border-border mb-8 flex gap-1">
        {(["variants", "gallery", "lifestyle", "story"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm uppercase tracking-[0.15em] transition-colors ${
              tab === t ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "variants" && <VariantsPanel itemId={item.id} initial={item.variants ?? []} />}
      {tab === "gallery" && <GalleryPanel itemId={item.id} initial={item.gallery ?? []} variants={item.variants ?? []} />}
      {tab === "lifestyle" && <LifestylePanel itemId={item.id} initial={item.lifestyle ?? []} />}
      {tab === "story" && <StoryPanel itemId={item.id} initial={item.story ?? null} />}
    </div>
  );
}

/* ─────────────────────── VARIANTS ─────────────────────── */
function VariantsPanel({ itemId, initial }: { itemId: number; initial: any[] }) {
  const [list, setList] = useState<any[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const reload = () => api.get(`/admin/items/${itemId}/variants`).then((r) => setList(r.data));

  const del = async (v: any) => {
    if (!confirm(`Delete variant "${v.variant_name}"?`)) return;
    await api.delete(`/admin/variants/${v.id}`); reload();
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="serif text-2xl">Variants</h2>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em]">
          <Plus className="w-4 h-4" /> New Variant
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {list.map((v) => (
          <div key={v.id} className="bg-card border border-border rounded-lg p-3">
            <div className="aspect-square bg-muted rounded mb-2 overflow-hidden">
              {v.preview_image && <img src={imgUrl(v.preview_image)} className="w-full h-full object-cover" alt="" />}
            </div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{v.category}</p>
            <p className="text-sm font-medium">{v.variant_name}</p>
            <p className="text-xs text-muted-foreground">{v.color_name}</p>
            <div className="flex gap-1 mt-2">
              <button onClick={() => { setEditing(v); setOpen(true); }} className="p-1.5 hover:bg-muted rounded"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => del(v)} className="p-1.5 hover:bg-destructive hover:text-destructive-foreground rounded"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No variants yet.</p>}
      </div>
      {open && <VariantForm itemId={itemId} editing={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
    </div>
  );
}

function VariantForm({ itemId, editing, onClose, onSaved }: any) {
  const [variant_name, setN] = useState(editing?.variant_name || "");
  const [category, setCat] = useState(editing?.category || "fabric");
  const [color_name, setColor] = useState(editing?.color_name || "");
  const [material_name, setMat] = useState(editing?.material_name || "");
  const [description, setDesc] = useState(editing?.description || "");
  const [sort_order, setSort] = useState(editing?.sort_order || 0);
  const [is_active, setActive] = useState(editing?.is_active ?? true);
  const [file, setFile] = useState<File | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("variant_name", variant_name);
    fd.append("category", category);
    fd.append("color_name", color_name);
    fd.append("material_name", material_name);
    fd.append("description", description);
    fd.append("sort_order", String(sort_order));
    fd.append("is_active", is_active ? "1" : "0");
    if (file) fd.append("preview_image", file);
    const url = editing ? `/admin/variants/${editing.id}` : `/admin/items/${itemId}/variants`;
    try {
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSaved();
    } catch (err: any) { alert(err?.response?.data?.message || "Save failed"); }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="serif text-2xl">{editing ? "Edit Variant" : "New Variant"}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Variant Name"><input required className="ui-input" value={variant_name} onChange={(e) => setN(e.target.value)} /></Field>
          <Field label="Category">
            <select className="ui-input" value={category} onChange={(e) => setCat(e.target.value)}>
              {["fabric","leather","wood","metal","marble","other"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Color Name"><input className="ui-input" value={color_name} onChange={(e) => setColor(e.target.value)} /></Field>
          <Field label="Material Name"><input className="ui-input" value={material_name} onChange={(e) => setMat(e.target.value)} /></Field>
          <Field label="Sort Order"><input type="number" className="ui-input" value={sort_order} onChange={(e) => setSort(+e.target.value)} /></Field>
          <Field label="Active"><input type="checkbox" checked={is_active} onChange={(e) => setActive(e.target.checked)} /></Field>
        </div>
        <Field label="Description"><textarea className="ui-input min-h-[80px]" value={description} onChange={(e) => setDesc(e.target.value)} /></Field>
        <Field label="Preview Image"><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
          <button className="ml-auto px-5 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em]">Save</button>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────────── GALLERY ─────────────────────── */
function GalleryPanel({ itemId, initial, variants }: { itemId: number; initial: any[]; variants: any[] }) {
  const [list, setList] = useState<any[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const reload = () => api.get(`/admin/items/${itemId}/gallery`).then((r) => setList(r.data));

  const del = async (g: any) => {
    if (!confirm("Delete this image?")) return;
    await api.delete(`/admin/gallery/${g.id}`); reload();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...list];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setList(next);
    await api.post(`/admin/items/${itemId}/gallery/reorder`, { order: next.map((x) => x.id) });
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="serif text-2xl">Gallery Images</h2>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em]">
          <Plus className="w-4 h-4" /> Add Image
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {list.map((g, idx) => (
          <div key={g.id} className="bg-card border border-border rounded-lg p-3">
            <div className="aspect-square bg-muted rounded mb-2 overflow-hidden">
              <img src={imgUrl(g.image)} className="w-full h-full object-cover" alt={g.alt_text || ""} />
            </div>
            <p className="text-sm font-medium truncate">{g.title || "—"}</p>
            <p className="text-xs text-muted-foreground truncate">{g.alt_text}</p>
            {g.variant_id && <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">Variant #{g.variant_id}</p>}
            <div className="flex gap-1 mt-2">
              <button onClick={() => move(idx, -1)} className="text-xs px-2 py-1 border border-border rounded">↑</button>
              <button onClick={() => move(idx, 1)} className="text-xs px-2 py-1 border border-border rounded">↓</button>
              <button onClick={() => { setEditing(g); setOpen(true); }} className="p-1.5 hover:bg-muted rounded ml-auto"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => del(g)} className="p-1.5 hover:bg-destructive hover:text-destructive-foreground rounded"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No gallery images.</p>}
      </div>
      {open && <GalleryForm itemId={itemId} variants={variants} editing={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
    </div>
  );
}

function GalleryForm({ itemId, variants, editing, onClose, onSaved }: any) {
  const [variant_id, setVid] = useState(editing?.variant_id || "");
  const [title, setTitle] = useState(editing?.title || "");
  const [alt_text, setAlt] = useState(editing?.alt_text || "");
  const [sort_order, setSort] = useState(editing?.sort_order ?? 0);
  const [file, setFile] = useState<File | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    if (variant_id) fd.append("variant_id", String(variant_id));
    fd.append("title", title);
    fd.append("alt_text", alt_text);
    fd.append("sort_order", String(sort_order));
    if (file) fd.append("image", file);
    const url = editing ? `/admin/gallery/${editing.id}` : `/admin/items/${itemId}/gallery`;
    try {
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSaved();
    } catch (err: any) { alert(err?.response?.data?.message || "Save failed"); }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="serif text-2xl">{editing ? "Edit Image" : "Add Image"}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Variant (optional)">
            <select className="ui-input" value={variant_id} onChange={(e) => setVid(e.target.value)}>
              <option value="">— None —</option>
              {variants.map((v: any) => <option key={v.id} value={v.id}>{v.variant_name}</option>)}
            </select>
          </Field>
          <Field label="Sort Order"><input type="number" className="ui-input" value={sort_order} onChange={(e) => setSort(+e.target.value)} /></Field>
          <Field label="Title"><input className="ui-input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Alt Text"><input className="ui-input" value={alt_text} onChange={(e) => setAlt(e.target.value)} /></Field>
        </div>
        <Field label="Image"><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required={!editing} /></Field>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
          <button className="ml-auto px-5 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em]">Save</button>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────────── LIFESTYLE ─────────────────────── */
function LifestylePanel({ itemId, initial }: { itemId: number; initial: any[] }) {
  const [list, setList] = useState<any[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const reload = () => api.get(`/admin/items/${itemId}/lifestyle`).then((r) => setList(r.data));

  const del = async (l: any) => {
    if (!confirm("Delete this lifestyle image?")) return;
    await api.delete(`/admin/lifestyle/${l.id}`); reload();
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="serif text-2xl">Lifestyle / Room Inspiration</h2>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em]">
          <Plus className="w-4 h-4" /> Add Image
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {list.map((l) => (
          <div key={l.id} className="bg-card border border-border rounded-lg p-3">
            <img src={imgUrl(l.image)} className="w-full h-40 object-cover rounded mb-2" alt={l.caption || ""} />
            <p className="text-xs text-muted-foreground uppercase tracking-[0.15em]">{l.layout_type} · {l.width_percentage}%</p>
            <p className="text-sm">{l.caption}</p>
            <div className="flex gap-1 mt-2">
              <button onClick={() => { setEditing(l); setOpen(true); }} className="p-1.5 hover:bg-muted rounded"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => del(l)} className="p-1.5 hover:bg-destructive hover:text-destructive-foreground rounded"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No lifestyle images.</p>}
      </div>
      {open && <LifestyleForm itemId={itemId} editing={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
    </div>
  );
}

function LifestyleForm({ itemId, editing, onClose, onSaved }: any) {
  const [caption, setCaption] = useState(editing?.caption || "");
  const [layout_type, setLT] = useState(editing?.layout_type || "full");
  const [width_percentage, setWp] = useState(editing?.width_percentage || 100);
  const [sort_order, setSort] = useState(editing?.sort_order ?? 0);
  const [file, setFile] = useState<File | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("caption", caption);
    fd.append("layout_type", layout_type);
    fd.append("width_percentage", String(width_percentage));
    fd.append("sort_order", String(sort_order));
    if (file) fd.append("image", file);
    const url = editing ? `/admin/lifestyle/${editing.id}` : `/admin/items/${itemId}/lifestyle`;
    try {
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSaved();
    } catch (err: any) { alert(err?.response?.data?.message || "Save failed"); }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="serif text-2xl">{editing ? "Edit Lifestyle Image" : "Add Lifestyle Image"}</h2>
        <Field label="Caption"><input className="ui-input" value={caption} onChange={(e) => setCaption(e.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Layout">
            <select className="ui-input" value={layout_type} onChange={(e) => setLT(e.target.value)}>
              {["full","half","masonry","custom"].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Width %">
            <select className="ui-input" value={width_percentage} onChange={(e) => setWp(+e.target.value)}>
              {[25,33,50,66,75,100].map((x) => <option key={x} value={x}>{x}%</option>)}
            </select>
          </Field>
          <Field label="Sort"><input type="number" className="ui-input" value={sort_order} onChange={(e) => setSort(+e.target.value)} /></Field>
        </div>
        <Field label="Image"><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required={!editing} /></Field>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
          <button className="ml-auto px-5 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em]">Save</button>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────────── STORY ─────────────────────── */
function StoryPanel({ itemId, initial }: { itemId: number; initial: any }) {
  const [story, setStory] = useState<any>(initial);
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDesc] = useState(initial?.description || "");
  const [file, setFile] = useState<File | null>(null);
  const [cards, setCards] = useState<any[]>(initial?.cards ?? []);
  const [cardOpen, setCardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);

  const reload = () => api.get(`/admin/items/${itemId}/story`).then((r) => {
    setStory(r.data); setCards(r.data?.cards ?? []);
  });

  const saveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description);
    if (file) fd.append("feature_image", file);
    try {
      const { data } = await api.post(`/admin/items/${itemId}/story`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setStory(data); setCards(data?.cards ?? []);
      alert("Story saved");
    } catch (err: any) { alert(err?.response?.data?.message || "Save failed"); }
  };

  const delCard = async (c: any) => {
    if (!confirm("Delete card?")) return;
    await api.delete(`/admin/story-cards/${c.id}`); reload();
  };

  return (
    <div className="space-y-8">
      <form onSubmit={saveStory} className="bg-card border border-border rounded-lg p-6 space-y-3">
        <h2 className="serif text-2xl mb-2">Story</h2>
        <Field label="Story Title"><input className="ui-input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Description"><textarea className="ui-input min-h-[120px]" value={description} onChange={(e) => setDesc(e.target.value)} /></Field>
        <Field label="Feature Image">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {story?.feature_image && !file && <img src={imgUrl(story.feature_image)} className="mt-2 w-48 rounded" alt="" />}
        </Field>
        <button className="px-5 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em]">Save Story</button>
      </form>

      <div>
        <div className="flex justify-between mb-4">
          <h2 className="serif text-2xl">Feature Cards</h2>
          {story && (
            <button onClick={() => { setEditingCard(null); setCardOpen(true); }} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em]">
              <Plus className="w-4 h-4" /> New Card
            </button>
          )}
        </div>
        {!story && <p className="text-muted-foreground">Save the story first to add cards.</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{c.icon || "Detail"}</p>
              <p className="serif text-lg mt-1">{c.title}</p>
              <p className="text-sm text-muted-foreground mt-2">{c.description}</p>
              <div className="flex gap-1 mt-3">
                <button onClick={() => { setEditingCard(c); setCardOpen(true); }} className="p-1.5 hover:bg-muted rounded"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => delCard(c)} className="p-1.5 hover:bg-destructive hover:text-destructive-foreground rounded"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {cardOpen && story && (
        <StoryCardForm storyId={story.id} editing={editingCard} onClose={() => setCardOpen(false)} onSaved={() => { setCardOpen(false); reload(); }} />
      )}
    </div>
  );
}

function StoryCardForm({ storyId, editing, onClose, onSaved }: any) {
  const [title, setTitle] = useState(editing?.title || "");
  const [description, setDesc] = useState(editing?.description || "");
  const [icon, setIcon] = useState(editing?.icon || "");
  const [sort_order, setSort] = useState(editing?.sort_order ?? 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { title, description, icon, sort_order };
    try {
      if (editing) await api.put(`/admin/story-cards/${editing.id}`, payload);
      else await api.post(`/admin/stories/${storyId}/cards`, payload);
      onSaved();
    } catch (err: any) { alert(err?.response?.data?.message || "Save failed"); }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="serif text-2xl">{editing ? "Edit Card" : "New Card"}</h2>
        <Field label="Title"><input required className="ui-input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Description"><textarea className="ui-input min-h-[80px]" value={description} onChange={(e) => setDesc(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Icon Label"><input className="ui-input" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g. Architectural" /></Field>
          <Field label="Sort"><input type="number" className="ui-input" value={sort_order} onChange={(e) => setSort(+e.target.value)} /></Field>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
          <button className="ml-auto px-5 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em]">Save</button>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────────── SHARED ─────────────────────── */
function Field({ label, children }: any) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Modal({ children, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-6 z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
