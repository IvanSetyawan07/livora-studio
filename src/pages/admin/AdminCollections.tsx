import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { Pencil, Trash2, Plus, X, Upload } from "lucide-react";

interface Collection {
  id: number;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  hero_banner?: string;
  card_banner?: string;
  featured_image?: string;
  display_order?: number;
  status?: string;
  seo_title?: string;
  seo_description?: string;
  cta_text?: string;
  cta_link?: string;
  story?: {
    id: number;
    story_banner?: string;
    story_description?: string;
    cta_text?: string;
    cta_link?: string;
  } | null;
  packages?: {
    id: number;
    name: string;
    description?: string;
    banner?: string;
    sort_order: number;
    items?: { id: number; title: string }[];
  }[];
}

interface ItemRef {
  id: number;
  title: string;
  slug: string;
  type?: { name: string; slug: string } | null;
}

type Tab = "details" | "story" | "packages";

export default function AdminCollections() {
  const [list, setList] = useState<Collection[]>([]);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("details");
  const [allItems, setAllItems] = useState<ItemRef[]>([]);

  const load = () =>
    api.get<Collection[]>("/collections").then((r) => setList(r.data));

  useEffect(() => {
    load();
    api.get<ItemRef[]>("/items").then((r) => setAllItems(r.data)).catch(() => {});
  }, []);

  const openNew = () => {
    setEditing(null);
    setTab("details");
    setOpen(true);
  };

  const openEdit = async (c: Collection) => {
    const r = await api.get<Collection>(`/collections/${c.slug}`);
    setEditing(r.data);
    setTab("details");
    setOpen(true);
  };

  const del = async (c: Collection) => {
    if (!confirm(`Delete collection "${c.name}"?`)) return;
    await api.delete(`/admin/collections/${c.id}`);
    load();
  };

  const refreshEditing = async (slug: string) => {
    const r = await api.get<Collection>(`/collections/${slug}`);
    setEditing(r.data);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Manage</p>
          <h1 className="serif text-4xl">Collections</h1>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em]"
        >
          <Plus className="w-4 h-4" /> New Collection
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="w-full overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-[0.15em]">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Order</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted-foreground">{c.slug}</td>
                <td className="p-3 text-xs text-muted-foreground">{c.status ?? "published"}</td>
                <td className="p-3 text-xs text-muted-foreground">{c.display_order ?? 0}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-muted rounded">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => del(c)}
                    className="p-1.5 hover:bg-destructive hover:text-destructive-foreground rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No collections yet.
                </td>
              </tr>
            )}
          </tbody>
        </table></div>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-lg w-full max-w-4xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="serif text-2xl">
                {editing ? `Edit: ${editing.name}` : "New Collection"}
              </h2>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-muted rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {editing && (
              <div className="flex gap-1 px-6 pt-4 border-b border-border">
                {(["details", "story", "packages"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2 text-xs uppercase tracking-[0.2em] rounded-t ${
                      tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="p-6">
              {(!editing || tab === "details") && (
                <DetailsForm
                  collection={editing}
                  onSaved={async (c) => {
                    await load();
                    setEditing(c);
                  }}
                />
              )}
              {editing && tab === "story" && (
                <StoryForm
                  collection={editing}
                  onSaved={() => refreshEditing(editing.slug)}
                />
              )}
              {editing && tab === "packages" && (
                <PackagesTab
                  collection={editing}
                  allItems={allItems}
                  onChanged={() => refreshEditing(editing.slug)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── DETAILS ─── */
function DetailsForm({
  collection,
  onSaved,
}: {
  collection: Collection | null;
  onSaved: (c: Collection) => void;
}) {
  const [f, setF] = useState({
    name: collection?.name ?? "",
    short_description: collection?.short_description ?? "",
    description: collection?.description ?? "",
    display_order: collection?.display_order ?? 0,
    status: collection?.status ?? "published",
    seo_title: collection?.seo_title ?? "",
    seo_description: collection?.seo_description ?? "",
    cta_text: collection?.cta_text ?? "",
    cta_link: collection?.cta_link ?? "",
  });
  const [hero, setHero] = useState<File | null>(null);
  const [card, setCard] = useState<File | null>(null);
  const [featured, setFeatured] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, String(v)));
      if (hero) fd.append("hero_banner", hero);
      if (card) fd.append("card_banner", card);
      if (featured) fd.append("featured_image", featured);

      let r;
      if (collection) {
        fd.append("_method", "PUT");
        r = await api.post<Collection>(`/admin/collections/${collection.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        r = await api.post<Collection>("/admin/collections", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      onSaved(r.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Name">
          <input
            required
            className="ui-input w-full"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </Field>
        <Field label="Display Order">
          <input
            type="number"
            className="ui-input w-full"
            value={f.display_order}
            onChange={(e) => setF({ ...f, display_order: Number(e.target.value) })}
          />
        </Field>
      </div>

      <Field label="Short Description">
        <textarea
          className="ui-input w-full min-h-[60px]"
          value={f.short_description}
          onChange={(e) => setF({ ...f, short_description: e.target.value })}
        />
      </Field>
      <Field label="Description">
        <textarea
          className="ui-input w-full min-h-[100px]"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ImageUpload
          label="Hero Banner"
          existing={collection?.hero_banner ? imgUrl(collection.hero_banner) : ""}
          file={hero}
          setFile={setHero}
        />
        <ImageUpload
          label="Card Banner"
          existing={collection?.card_banner ? imgUrl(collection.card_banner) : ""}
          file={card}
          setFile={setCard}
        />
        <ImageUpload
          label="Featured Image"
          existing={collection?.featured_image ? imgUrl(collection.featured_image) : ""}
          file={featured}
          setFile={setFeatured}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="CTA Text">
          <input
            className="ui-input w-full"
            value={f.cta_text}
            onChange={(e) => setF({ ...f, cta_text: e.target.value })}
          />
        </Field>
        <Field label="CTA Link">
          <input
            className="ui-input w-full"
            value={f.cta_link}
            onChange={(e) => setF({ ...f, cta_link: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Status">
          <select
            className="ui-input w-full"
            value={f.status}
            onChange={(e) => setF({ ...f, status: e.target.value })}
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </Field>
        <Field label="SEO Title">
          <input
            className="ui-input w-full"
            value={f.seo_title}
            onChange={(e) => setF({ ...f, seo_title: e.target.value })}
          />
        </Field>
      </div>

      <Field label="SEO Description">
        <textarea
          className="ui-input w-full min-h-[60px]"
          value={f.seo_description}
          onChange={(e) => setF({ ...f, seo_description: e.target.value })}
        />
      </Field>

      <div className="flex justify-end pt-2">
        <button
          disabled={saving}
          className="px-6 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

/* ─── STORY ─── */
function StoryForm({
  collection,
  onSaved,
}: {
  collection: Collection;
  onSaved: () => void;
}) {
  const [desc, setDesc] = useState(collection.story?.story_description ?? "");
  const [ctaText, setCtaText] = useState(collection.story?.cta_text ?? "");
  const [ctaLink, setCtaLink] = useState(collection.story?.cta_link ?? "");
  const [banner, setBanner] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("story_description", desc);
      fd.append("cta_text", ctaText);
      fd.append("cta_link", ctaLink);
      if (banner) fd.append("story_banner", banner);
      await api.post(`/admin/collections/${collection.id}/story`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ImageUpload
        label="Story Banner"
        existing={collection.story?.story_banner ? imgUrl(collection.story.story_banner) : ""}
        file={banner}
        setFile={setBanner}
      />
      <Field label="Story Description">
        <textarea
          className="ui-input w-full min-h-[120px]"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="CTA Text">
          <input className="ui-input w-full" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
        </Field>
        <Field label="CTA Link">
          <input className="ui-input w-full" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end">
        <button
          disabled={saving}
          className="px-6 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Story"}
        </button>
      </div>
    </form>
  );
}

/* ─── PACKAGES ─── */
function PackagesTab({
  collection,
  allItems,
  onChanged,
}: {
  collection: Collection;
  allItems: ItemRef[];
  onChanged: () => void;
}) {
  const [editingPkg, setEditingPkg] = useState<any | null>(null);
  const packages = collection.packages ?? [];

  const openNew = () => setEditingPkg({ name: "", description: "", sort_order: packages.length, item_ids: [] });
  const openEdit = (p: any) =>
    setEditingPkg({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      sort_order: p.sort_order,
      item_ids: (p.items ?? []).map((it: any) => it.id),
      existingBanner: p.banner,
    });

  const del = async (p: any) => {
    if (!confirm(`Delete package "${p.name}"?`)) return;
    await api.delete(`/admin/collection-packages/${p.id}`);
    onChanged();
  };

  if (editingPkg) {
    return (
      <PackageForm
        collection={collection}
        pkg={editingPkg}
        allItems={allItems}
        onDone={() => {
          setEditingPkg(null);
          onChanged();
        }}
        onCancel={() => setEditingPkg(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage packages for this collection.</p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-xs uppercase tracking-[0.2em]"
        >
          <Plus className="w-3.5 h-3.5" /> New Package
        </button>
      </div>

      {packages.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No packages yet.</p>
      )}

      <div className="space-y-2">
        {packages.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-4 p-3 border border-border rounded-lg bg-background"
          >
            <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
              {p.banner && <img src={imgUrl(p.banner)} className="w-full h-full object-cover" alt="" />}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {(p.items?.length ?? 0)} items · order {p.sort_order}
              </p>
            </div>
            <button onClick={() => openEdit(p)} className="p-2 hover:bg-muted rounded">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => del(p)}
              className="p-2 hover:bg-destructive hover:text-destructive-foreground rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackageForm({
  collection,
  pkg,
  allItems,
  onDone,
  onCancel,
}: {
  collection: Collection;
  pkg: any;
  allItems: ItemRef[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(pkg.name ?? "");
  const [desc, setDesc] = useState(pkg.description ?? "");
  const [order, setOrder] = useState(pkg.sort_order ?? 0);
  const [banner, setBanner] = useState<File | null>(null);
  const [itemIds, setItemIds] = useState<number[]>(pkg.item_ids ?? []);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (id: number) =>
    setItemIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const filtered = allItems.filter((it) =>
    it.title.toLowerCase().includes(q.toLowerCase())
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", desc);
      fd.append("sort_order", String(order));
      itemIds.forEach((id) => fd.append("item_ids[]", String(id)));
      if (banner) fd.append("banner", banner);

      if (pkg.id) {
        fd.append("_method", "PUT");
        await api.post(`/admin/collection-packages/${pkg.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post(`/admin/collections/${collection.id}/packages`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      onDone();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Package Name">
          <input
            required
            className="ui-input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Sort Order">
          <input
            type="number"
            className="ui-input w-full"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
          />
        </Field>
      </div>
      <Field label="Description">
        <textarea
          className="ui-input w-full min-h-[80px]"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </Field>
      <ImageUpload
        label="Package Banner"
        existing={pkg.existingBanner ? imgUrl(pkg.existingBanner) : ""}
        file={banner}
        setFile={setBanner}
      />

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Items ({itemIds.length} selected)
        </label>
        <input
          className="ui-input w-full mb-2"
          placeholder="Search items…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="max-h-64 overflow-y-auto border border-border rounded p-2 space-y-1">
          {filtered.map((it) => (
            <label
              key={it.id}
              className="flex items-center gap-3 p-2 hover:bg-muted/60 rounded cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={itemIds.includes(it.id)}
                onChange={() => toggle(it.id)}
              />
              <span className="flex-1">{it.title}</span>
              <span className="text-xs text-muted-foreground">{it.type?.name ?? "—"}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="p-3 text-xs text-muted-foreground text-center">No items match.</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-border rounded text-sm">
          Cancel
        </button>
        <button
          disabled={saving}
          className="px-6 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Package"}
        </button>
      </div>
    </form>
  );
}

/* ─── SHARED ─── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function ImageUpload({
  label,
  existing,
  file,
  setFile,
}: {
  label: string;
  existing: string;
  file: File | null;
  setFile: (f: File | null) => void;
}) {
  const preview = file ? URL.createObjectURL(file) : existing;
  return (
    <div>
      <span className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
        {label}
      </span>
      <label className="relative block aspect-[4/3] rounded-lg border-2 border-dashed border-border bg-muted/30 overflow-hidden cursor-pointer hover:border-foreground/40 transition">
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-xs gap-1">
            <Upload className="w-4 h-4" />
            Upload
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}
