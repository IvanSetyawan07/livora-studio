import { useCallback, useEffect, useState } from "react";
import TranslationPanel from "@/components/admin/TranslationPanel";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X, Upload, Star, BookOpen } from "lucide-react";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import {
  AdminHelpBanner,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusBadge,
  TableSkeleton,
  useAdminDialog,
} from "@/components/admin/kit";

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
  is_featured?: boolean;
  items_count?: number;
  packages_count?: number;
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
  const dialog = useAdminDialog();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("catalog");

  const [list, setList] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("details");
  const [allItems, setAllItems] = useState<ItemRef[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return api
      .get<Collection[]>("/collections")
      .then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch((e: any) => setError(e?.message || "Gagal memuat daftar koleksi."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
    api
      .get<ItemRef[]>("/items")
      .then((r) => setAllItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setTab("details");
    setOpen(true);
  };

  const openEdit = async (c: Collection) => {
    try {
      const r = await api.get<Collection>(`/collections/${c.slug}`);
      setEditing(r.data);
      setTab("details");
      setOpen(true);
    } catch {
      toast.error("Gagal membuka detail koleksi");
    }
  };

  const del = async (c: Collection) => {
    if (!editable) return;
    const ok = await dialog.confirm({
      title: `Hapus koleksi "${c.name}"?`,
      text: "Koleksi beserta cerita dan paket di dalamnya akan dihapus permanen.",
      confirmLabel: "Ya, hapus koleksi",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/collections/${c.id}`);
      toast.success(`Koleksi "${c.name}" dihapus`);
      void load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menghapus koleksi");
    }
  };

  const toggleFeatured = async (c: Collection) => {
    if (!editable) return;
    try {
      const r = await api.patch<{ ok: boolean; is_featured: boolean }>(
        `/admin/collections/${c.id}/toggle-featured`,
      );
      setList((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, is_featured: r.data.is_featured } : x)),
      );
      toast.success(
        r.data.is_featured
          ? `"${c.name}" ditampilkan di Featured Collections Halaman Depan.`
          : `"${c.name}" dihapus dari Featured Collections.`,
      );
    } catch {
      toast.error("Gagal mengubah status koleksi unggulan");
    }
  };

  const refreshEditing = async (slug: string) => {
    const r = await api.get<Collection>(`/collections/${slug}`);
    setEditing(r.data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Katalog & Portofolio"
        title="Koleksi Furnitur"
        description="Kelola seri koleksi produk, cerita editorial (Story), paket ruangan, dan koleksi unggulan Halaman Depan."
        actions={
          editable ? (
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-full bg-[#232528] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#34383D]"
            >
              <Plus className="h-4 w-4" /> Tambah Koleksi
            </button>
          ) : null
        }
      />

      <AdminHelpBanner storageKey="collections-help" link={{ label: "Atur Halaman Depan", to: "/admin/landing" }}>
        Gunakan <strong>Koleksi Furnitur</strong> untuk mengelompokkan produk berdasarkan seri desain (mis. Sora Living,
        Milano). Klik tombol <strong>Unggulan</strong> untuk langsung memajang koleksi di Halaman Depan.
      </AdminHelpBanner>

      {error ? (
        <ErrorState title="Koleksi gagal dimuat" description={error} onRetry={load} />
      ) : loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Belum ada koleksi"
          description="Buat koleksi furnitur pertama untuk ditampilkan di halaman Collection."
          action={
            editable ? (
              <button
                type="button"
                onClick={openNew}
                className="inline-flex items-center gap-2 rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white"
              >
                <Plus className="h-4 w-4" /> Tambah Koleksi Pertama
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#EAE4DA] bg-[#FAF8F4] text-xs uppercase tracking-[0.14em] text-[#656B73]">
                <tr>
                  <th className="p-3.5 text-left">Nama Koleksi</th>
                  <th className="p-3.5 text-left">Slug URL</th>
                  <th className="p-3.5 text-left">Tampil di Halaman Depan</th>
                  <th className="p-3.5 text-left">Status</th>
                  <th className="p-3.5 text-left">Urutan</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1ECE4]">
                {list.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[#FAF8F4]/60">
                    <td className="p-3.5 font-medium text-[#232528]">{c.name}</td>
                    <td className="p-3.5 text-xs text-[#656B73]">/{c.slug}</td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        disabled={!editable}
                        onClick={() => void toggleFeatured(c)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-default ${
                          c.is_featured
                            ? "border-[#5E93B8] bg-[#5E93B8] text-white"
                            : "border-[#E2DACF] bg-white text-[#656B73] hover:border-[#5E93B8] hover:text-[#232528]"
                        }`}
                      >
                        <Star className={`h-3 w-3 ${c.is_featured ? "fill-white" : ""}`} />
                        <span>{c.is_featured ? "Unggulan" : "Jadikan Unggulan"}</span>
                      </button>
                    </td>
                    <td className="p-3.5">
                      <StatusBadge tone={(c.status ?? "published") === "published" ? "success" : "warning"}>
                        {(c.status ?? "published") === "published" ? "Tayang" : "Draf"}
                      </StatusBadge>
                    </td>
                    <td className="p-3.5 text-xs tabular-nums text-[#656B73]">{c.display_order ?? 0}</td>
                    <td className="whitespace-nowrap p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void openEdit(c)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E2DACF] bg-white px-2.5 py-1.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
                        >
                          <Pencil className="h-3 w-3 text-[#5E93B8]" />
                          {editable ? "Edit" : "Lihat"}
                        </button>
                        {editable && (
                          <button
                            type="button"
                            onClick={() => void del(c)}
                            aria-label={`Hapus ${c.name}`}
                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="my-8 w-full max-w-4xl overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#EAE4DA] bg-[#FAF8F4] px-6 py-4">
              <h2 className="font-header text-2xl text-[#232528]">
                {editing ? `Edit Koleksi: ${editing.name}` : "Tambah Koleksi Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-[#656B73] hover:bg-black/5 hover:text-[#232528]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editing && (
              <div className="flex gap-2 border-b border-[#EAE4DA] px-6 pt-3">
                {(
                  [
                    ["details", "Detail & Foto"],
                    ["story", "Cerita Koleksi (Story)"],
                    ["packages", `Paket Ruangan (${editing.packages?.length ?? 0})`],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`rounded-t-lg border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
                      tab === key
                        ? "border-[#5E93B8] text-[#232528]"
                        : "border-transparent text-[#656B73] hover:text-[#232528]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="p-6">
              {(!editing || tab === "details") && (
                <DetailsForm
                  collection={editing}
                  editable={editable}
                  onSaved={async (c) => {
                    await load();
                    setEditing(c);
                  }}
                />
              )}
              {editing && tab === "details" && (
                <TranslationPanel type="collection" id={editing.id} className="mt-6" />
              )}
              {editing && tab === "story" && (
                <StoryForm
                  collection={editing}
                  editable={editable}
                  onSaved={() => void refreshEditing(editing.slug)}
                />
              )}
              {editing && tab === "packages" && (
                <PackagesTab
                  collection={editing}
                  allItems={allItems}
                  editable={editable}
                  onChanged={() => void refreshEditing(editing.slug)}
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
  editable,
  onSaved,
}: {
  collection: Collection | null;
  editable: boolean;
  onSaved: (c: Collection) => void;
}) {
  const [f, setF] = useState({
    name: collection?.name ?? "",
    short_description: collection?.short_description ?? "",
    description: collection?.description ?? "",
    display_order: collection?.display_order ?? 0,
    status: collection?.status ?? "published",
    is_featured: Boolean(collection?.is_featured),
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
    if (!editable) return;
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => {
        if (k === "is_featured") fd.append(k, v ? "1" : "0");
        else fd.append(k, String(v));
      });
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
      toast.success("Detail koleksi berhasil disimpan");
      onSaved(r.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan koleksi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nama Koleksi *">
          <input
            required
            disabled={!editable}
            className="ui-input w-full"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </Field>
        <Field label="Urutan Tampil">
          <input
            type="number"
            disabled={!editable}
            className="ui-input w-full"
            value={f.display_order}
            onChange={(e) => setF({ ...f, display_order: Number(e.target.value) })}
          />
        </Field>
      </div>

      <Field label="Deskripsi Singkat (tampil di kartu koleksi)">
        <textarea
          disabled={!editable}
          className="ui-input min-h-[60px] w-full"
          value={f.short_description}
          onChange={(e) => setF({ ...f, short_description: e.target.value })}
        />
      </Field>
      <Field label="Deskripsi Lengkap">
        <textarea
          disabled={!editable}
          className="ui-input min-h-[100px] w-full"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ImageUpload
          label="Hero Banner"
          existing={collection?.hero_banner ? imgUrl(collection.hero_banner) : ""}
          file={hero}
          setFile={setHero}
          disabled={!editable}
        />
        <ImageUpload
          label="Banner Kartu"
          existing={collection?.card_banner ? imgUrl(collection.card_banner) : ""}
          file={card}
          setFile={setCard}
          disabled={!editable}
        />
        <ImageUpload
          label="Foto Featured (Halaman Depan)"
          existing={collection?.featured_image ? imgUrl(collection.featured_image) : ""}
          file={featured}
          setFile={setFeatured}
          disabled={!editable}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Teks Tombol CTA (Opsional)">
          <input
            disabled={!editable}
            className="ui-input w-full"
            value={f.cta_text}
            onChange={(e) => setF({ ...f, cta_text: e.target.value })}
          />
        </Field>
        <Field label="Link Tombol CTA (Opsional)">
          <input
            disabled={!editable}
            className="ui-input w-full"
            value={f.cta_link}
            onChange={(e) => setF({ ...f, cta_link: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
        <Field label="Status Tayang">
          <select
            disabled={!editable}
            className="ui-input w-full"
            value={f.status}
            onChange={(e) => setF({ ...f, status: e.target.value })}
          >
            <option value="published">Tayang (Published)</option>
            <option value="draft">Draf (Disembunyikan)</option>
          </select>
        </Field>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] px-3.5 py-2.5">
          <input
            type="checkbox"
            disabled={!editable}
            checked={f.is_featured}
            onChange={(e) => setF({ ...f, is_featured: e.target.checked })}
            className="h-4 w-4 accent-[#5E93B8]"
          />
          <div>
            <p className="text-xs font-medium text-[#232528]">Koleksi Unggulan (Halaman Depan)</p>
            <p className="text-[11px] text-[#656B73]">Tampilkan di section Featured Collections halaman utama</p>
          </div>
        </label>
      </div>

      <details className="rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/50 p-4">
        <summary className="cursor-pointer text-xs font-medium text-[#4C5259]">
          Pengaturan SEO (Opsional untuk mesin pencari Google)
        </summary>
        <div className="mt-3 space-y-3">
          <Field label="Judul SEO">
            <input
              disabled={!editable}
              className="ui-input w-full"
              value={f.seo_title}
              onChange={(e) => setF({ ...f, seo_title: e.target.value })}
            />
          </Field>
          <Field label="Deskripsi SEO">
            <textarea
              disabled={!editable}
              className="ui-input min-h-[60px] w-full"
              value={f.seo_description}
              onChange={(e) => setF({ ...f, seo_description: e.target.value })}
            />
          </Field>
        </div>
      </details>

      {editable && (
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#232528] px-6 py-2.5 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan Detail Koleksi"}
          </button>
        </div>
      )}
    </form>
  );
}

/* ─── STORY ─── */
function StoryForm({
  collection,
  editable,
  onSaved,
}: {
  collection: Collection;
  editable: boolean;
  onSaved: () => void;
}) {
  const [desc, setDesc] = useState(collection.story?.story_description ?? "");
  const [ctaText, setCtaText] = useState(collection.story?.cta_text ?? "");
  const [ctaLink, setCtaLink] = useState(collection.story?.cta_link ?? "");
  const [banner, setBanner] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editable) return;
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
      toast.success("Cerita koleksi disimpan");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan cerita koleksi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ImageUpload
        label="Banner Cerita Koleksi"
        existing={collection.story?.story_banner ? imgUrl(collection.story.story_banner) : ""}
        file={banner}
        setFile={setBanner}
        disabled={!editable}
      />
      <Field label="Narasi Cerita Koleksi">
        <textarea
          disabled={!editable}
          className="ui-input min-h-[120px] w-full"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Teks Tombol CTA">
          <input disabled={!editable} className="ui-input w-full" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
        </Field>
        <Field label="Link Tombol CTA">
          <input disabled={!editable} className="ui-input w-full" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} />
        </Field>
      </div>
      {editable && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#232528] px-6 py-2.5 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan Cerita"}
          </button>
        </div>
      )}
    </form>
  );
}

/* ─── PACKAGES ─── */
function PackagesTab({
  collection,
  allItems,
  editable,
  onChanged,
}: {
  collection: Collection;
  allItems: ItemRef[];
  editable: boolean;
  onChanged: () => void;
}) {
  const dialog = useAdminDialog();
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
    if (!editable) return;
    const ok = await dialog.confirm({
      title: `Hapus paket "${p.name}"?`,
      confirmLabel: "Ya, hapus",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/collection-packages/${p.id}`);
      toast.success("Paket dihapus");
      onChanged();
    } catch {
      toast.error("Gagal menghapus paket");
    }
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
        <p className="text-sm text-[#656B73]">Kelola paket produk dalam koleksi ini.</p>
        {editable && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white hover:bg-[#34383D]"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Paket
          </button>
        )}
      </div>

      {packages.length === 0 && <p className="py-8 text-center text-sm text-[#656B73]">Belum ada paket pada koleksi ini.</p>}

      <div className="space-y-2">
        {packages.map((p) => (
          <div key={p.id} className="flex items-center gap-4 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/50 p-3">
            <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-white">
              {p.banner && <img src={imgUrl(p.banner)} className="h-full w-full object-cover" alt="" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#232528]">{p.name}</p>
              <p className="text-xs text-[#656B73]">
                {p.items?.length ?? 0} produk · urutan {p.sort_order}
              </p>
            </div>
            {editable && (
              <>
                <button type="button" onClick={() => openEdit(p)} className="rounded-lg p-2 text-[#232528] hover:bg-white">
                  <Pencil className="h-3.5 w-3.5 text-[#5E93B8]" />
                </button>
                <button type="button" onClick={() => void del(p)} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
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

  const filtered = allItems.filter((it) => it.title.toLowerCase().includes(q.toLowerCase()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
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
      toast.success("Paket disimpan");
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan paket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nama Paket *">
          <input required className="ui-input w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Urutan Tampil">
          <input type="number" className="ui-input w-full" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Deskripsi Paket">
        <textarea className="ui-input min-h-[80px] w-full" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      <ImageUpload
        label="Banner Paket"
        existing={pkg.existingBanner ? imgUrl(pkg.existingBanner) : ""}
        file={banner}
        setFile={setBanner}
      />

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#232528]">
          Pilih Produk dalam Paket ({itemIds.length} dipilih)
        </label>
        <input className="ui-input mb-2 w-full" placeholder="Cari produk…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-[#EAE4DA] p-2">
          {filtered.map((it) => (
            <label key={it.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 text-sm hover:bg-[#FAF8F4]">
              <input
                type="checkbox"
                checked={itemIds.includes(it.id)}
                onChange={() => toggle(it.id)}
                className="accent-[#5E93B8]"
              />
              <span className="flex-1 text-[#232528]">{it.title}</span>
              <span className="text-xs text-[#656B73]">{it.type?.name ?? "—"}</span>
            </label>
          ))}
          {filtered.length === 0 && <p className="p-3 text-center text-xs text-[#656B73]">Produk tidak ditemukan.</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[#E2DACF] px-4 py-2 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4]"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#232528] px-6 py-2 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
        >
          {saving ? "Menyimpan…" : "Simpan Paket"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#232528]">{label}</span>
      {children}
    </label>
  );
}

function ImageUpload({
  label,
  existing,
  file,
  setFile,
  disabled,
}: {
  label: string;
  existing: string;
  file: File | null;
  setFile: (f: File | null) => void;
  disabled?: boolean;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setBlobUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const preview = blobUrl ?? existing;
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-[#232528]">{label}</span>
      <label
        className={`relative block aspect-[4/3] overflow-hidden rounded-xl border-2 border-dashed border-[#DCD5CA] bg-[#FAF8F4] transition ${
          disabled ? "opacity-70" : "cursor-pointer hover:border-[#5E93B8]"
        }`}
      >
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-[#656B73]">
            <Upload className="h-4 w-4 text-[#5E93B8]" />
            Unggah Foto
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          disabled={disabled}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}
