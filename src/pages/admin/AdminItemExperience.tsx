import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Pencil, ClipboardList, X } from "lucide-react";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import {
  AdminHelpBanner,
  ErrorState,
  PageHeader,
  TableSkeleton,
  useAdminDialog,
} from "@/components/admin/kit";

type Tab = "variants" | "gallery" | "lifestyle" | "story";

const TAB_LABELS: Record<Tab, string> = {
  variants: "Varian Warna & Material",
  gallery: "Galeri Foto",
  lifestyle: "Inspirasi Ruangan",
  story: "Cerita & Keunggulan",
};

export default function AdminItemExperience() {
  const { id } = useParams();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("catalog");

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("variants");

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get("/items")
      .then((r) => {
        const found = (r.data as any[]).find((x) => String(x.id) === String(id));
        if (!found) {
          setError("Produk tidak ditemukan.");
          return null;
        }
        return api.get(`/items/${found.slug}`).then((rr) => setItem(rr.data));
      })
      .catch(() => setError("Gagal memuat data experience produk."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <TableSkeleton rows={5} cols={3} />;
  if (error || !item) {
    return <ErrorState title="Produk tidak bisa dimuat" description={error ?? "Data tidak tersedia."} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Galeri & Experience · ${item.code || "Produk"}`}
        title={item.title}
        description="Kelola foto sudut pandang produk, varian warna/material, foto ruangan (lifestyle), dan cerita produk untuk halaman publik."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/items"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DACF] bg-white px-4 py-2 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Daftar Produk
            </Link>
            {item.slug && (
              <Link
                to={`/admin/items/${item.slug}/detail`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#5E93B8]/35 bg-[#EDF4F8] px-4 py-2 text-xs font-medium text-[#35678B] hover:bg-[#DFECF4]"
              >
                <ClipboardList className="h-3.5 w-3.5" /> Detail Internal (Harga/Stok)
              </Link>
            )}
          </div>
        }
      />

      <AdminHelpBanner storageKey="item-experience-help">
        Semua foto dan cerita yang diatur di sini tampil pada halaman detail produk publik di website LIVORA.
      </AdminHelpBanner>

      <div className="flex flex-wrap gap-2 border-b border-[#EAE4DA] pb-3">
        {(["variants", "gallery", "lifestyle", "story"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
              tab === t
                ? "border-[#232528] bg-[#232528] text-white"
                : "border-[#E2DACF] bg-white text-[#656B73] hover:border-[#5E93B8]"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "variants" && <VariantsPanel itemId={item.id} initial={item.variants ?? []} editable={editable} />}
      {tab === "gallery" && (
        <GalleryPanel itemId={item.id} initial={item.gallery ?? []} variants={item.variants ?? []} editable={editable} />
      )}
      {tab === "lifestyle" && <LifestylePanel itemId={item.id} initial={item.lifestyle ?? []} editable={editable} />}
      {tab === "story" && <StoryPanel itemId={item.id} initial={item.story ?? null} editable={editable} />}
    </div>
  );
}

/* ─────────────────────── VARIANTS ─────────────────────── */
function VariantsPanel({ itemId, initial, editable }: { itemId: number; initial: any[]; editable: boolean }) {
  const dialog = useAdminDialog();
  const [list, setList] = useState<any[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const reload = () => api.get(`/admin/items/${itemId}/variants`).then((r) => setList(r.data));

  const del = async (v: any) => {
    const ok = await dialog.confirm({
      title: `Hapus varian "${v.variant_name}"?`,
      confirmLabel: "Ya, hapus",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/variants/${v.id}`);
      toast.success("Varian dihapus");
      void reload();
    } catch {
      toast.error("Gagal menghapus varian");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-header text-xl text-[#232528]">Daftar Varian ({list.length})</h2>
        {editable && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white hover:bg-[#34383D]"
          >
            <Plus className="h-4 w-4" /> Tambah Varian
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {list.map((v) => (
          <div key={v.id} className="rounded-xl border border-[#EAE4DA] bg-white p-3">
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              <div
                className="relative aspect-square overflow-hidden rounded-lg border border-black/10"
                style={{ backgroundColor: v.color_code || "#F3EFE8" }}
              >
                {v.preview_image && <img src={imgUrl(v.preview_image)} className="h-full w-full object-cover" alt="" />}
                <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1 text-[9px] font-medium text-[#232528]">
                  {v.preview_image ? "Swatch" : v.color_code || "Warna"}
                </span>
              </div>
              <div className="relative aspect-square overflow-hidden rounded-lg bg-[#FAF8F4]">
                {v.furniture_image && <img src={imgUrl(v.furniture_image)} className="h-full w-full object-cover" alt="" />}
                <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1 text-[9px] font-medium text-[#232528]">
                  Produk
                </span>
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#5E93B8]">{v.category}</p>
            <p className="text-sm font-medium text-[#232528]">{v.variant_name}</p>
            <p className="text-xs text-[#656B73]">{v.color_name || "—"}</p>
            {editable && (
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(v);
                    setOpen(true);
                  }}
                  className="rounded-lg p-1.5 text-[#232528] hover:bg-[#FAF8F4]"
                >
                  <Pencil className="h-3.5 w-3.5 text-[#5E93B8]" />
                </button>
                <button
                  type="button"
                  onClick={() => void del(v)}
                  className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-[#656B73]">Belum ada varian warna/material.</p>
        )}
      </div>
      {open && (
        <VariantForm
          itemId={itemId}
          editing={editing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function VariantForm({ itemId, editing, onClose, onSaved }: any) {
  const [variant_name, setN] = useState(editing?.variant_name || "");
  const [category, setCat] = useState(editing?.category || "fabric");
  const [color_name, setColor] = useState(editing?.color_name || "");
  const [color_code, setColorCode] = useState(editing?.color_code || "#5E93B8");
  const [material_name, setMat] = useState(editing?.material_name || "");
  const [description, setDesc] = useState(editing?.description || "");
  const [sort_order, setSort] = useState(editing?.sort_order || 0);
  const [is_active, setActive] = useState(editing?.is_active ?? true);
  const [is_default, setDefault] = useState(editing?.is_default ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [furnitureFile, setFurnitureFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append("variant_name", variant_name);
    fd.append("category", category);
    fd.append("color_name", color_name);
    fd.append("color_code", color_code);
    fd.append("material_name", material_name);
    fd.append("description", description);
    fd.append("sort_order", String(sort_order));
    fd.append("is_active", is_active ? "1" : "0");
    fd.append("is_default", is_default ? "1" : "0");
    if (file) fd.append("preview_image", file);
    if (furnitureFile) fd.append("furniture_image", furnitureFile);
    const url = editing ? `/admin/variants/${editing.id}` : `/admin/items/${itemId}/variants`;
    try {
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Varian disimpan");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan varian");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={editing ? "Ubah Varian" : "Tambah Varian Baru"} disabled={saving}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nama Varian *">
            <input required className="ui-input" value={variant_name} onChange={(e) => setN(e.target.value)} />
          </Field>
          <Field label="Kategori Material">
            <select className="ui-input" value={category} onChange={(e) => setCat(e.target.value)}>
              {["fabric", "leather", "wood", "metal", "marble", "other"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nama Warna">
            <input className="ui-input" value={color_name} onChange={(e) => setColor(e.target.value)} />
          </Field>
          <Field label="Kode Warna (Hex)">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9A-Fa-f]{6}$/.test(color_code) ? color_code : "#5E93B8"}
                onChange={(e) => setColorCode(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-[#E2DACF]"
              />
              <input className="ui-input flex-1" value={color_code} onChange={(e) => setColorCode(e.target.value)} />
            </div>
          </Field>
          <Field label="Nama Material">
            <input className="ui-input" value={material_name} onChange={(e) => setMat(e.target.value)} />
          </Field>
          <Field label="Urutan">
            <input type="number" className="ui-input" value={sort_order} onChange={(e) => setSort(+e.target.value)} />
          </Field>
        </div>

        <div className="flex flex-wrap gap-5 pt-1 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={is_active} onChange={(e) => setActive(e.target.checked)} className="accent-[#5E93B8]" />
            Tampil ke pelanggan
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={is_default} onChange={(e) => setDefault(e.target.checked)} className="accent-[#5E93B8]" />
            Terpilih otomatis (Default)
          </label>
        </div>

        <Field label="Keterangan">
          <textarea className="ui-input min-h-[70px]" value={description} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <Field label="Foto Tekstur / Swatch (kecil)">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs" />
        </Field>
        <Field label="Foto Produk dalam Warna Ini (foto utama)">
          <input type="file" accept="image/*" onChange={(e) => setFurnitureFile(e.target.files?.[0] || null)} className="text-xs" />
        </Field>

        <div className="flex justify-end gap-2 border-t border-[#EAE4DA] pt-3">
          <button type="button" onClick={onClose} className="rounded-full border border-[#E2DACF] px-4 py-2 text-xs font-medium">
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan Varian"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────────── GALLERY ─────────────────────── */
function GalleryPanel({
  itemId,
  initial,
  variants,
  editable,
}: {
  itemId: number;
  initial: any[];
  variants: any[];
  editable: boolean;
}) {
  const dialog = useAdminDialog();
  const [list, setList] = useState<any[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const reload = () => api.get(`/admin/items/${itemId}/gallery`).then((r) => setList(r.data));

  const del = async (g: any) => {
    const ok = await dialog.confirm({ title: "Hapus foto galeri ini?", confirmLabel: "Ya, hapus", danger: true });
    if (!ok) return;
    try {
      await api.delete(`/admin/gallery/${g.id}`);
      toast.success("Foto galeri dihapus");
      void reload();
    } catch {
      toast.error("Gagal menghapus foto");
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...list];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setList(next);
    await api.post(`/admin/items/${itemId}/gallery/reorder`, { order: next.map((x) => x.id) }).catch(() => {
      toast.error("Gagal mengubah urutan");
      void reload();
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-header text-xl text-[#232528]">Galeri Foto Produk ({list.length})</h2>
        {editable && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white hover:bg-[#34383D]"
          >
            <Plus className="h-4 w-4" /> Tambah Foto
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {list.map((g, idx) => (
          <div key={g.id} className="rounded-xl border border-[#EAE4DA] bg-white p-3">
            <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-[#FAF8F4]">
              <img src={imgUrl(g.image)} className="h-full w-full object-cover" alt={g.alt_text || ""} />
            </div>
            <p className="truncate text-sm font-medium text-[#232528]">{g.title || "—"}</p>
            <p className="truncate text-xs text-[#656B73]">{g.alt_text || "—"}</p>
            {editable && (
              <div className="mt-2 flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => void move(idx, -1)}
                  className="rounded border border-[#E2DACF] px-2 py-1 text-xs disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={idx === list.length - 1}
                  onClick={() => void move(idx, 1)}
                  className="rounded border border-[#E2DACF] px-2 py-1 text-xs disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(g);
                    setOpen(true);
                  }}
                  className="ml-auto rounded p-1.5 hover:bg-[#FAF8F4]"
                >
                  <Pencil className="h-3.5 w-3.5 text-[#5E93B8]" />
                </button>
                <button type="button" onClick={() => void del(g)} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-[#656B73]">Belum ada foto galeri.</p>
        )}
      </div>
      {open && (
        <GalleryForm
          itemId={itemId}
          variants={variants}
          editing={editing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function GalleryForm({ itemId, variants, editing, onClose, onSaved }: any) {
  const [variant_id, setVid] = useState(editing?.variant_id || "");
  const [title, setTitle] = useState(editing?.title || "");
  const [alt_text, setAlt] = useState(editing?.alt_text || "");
  const [sort_order, setSort] = useState(editing?.sort_order ?? 0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    if (variant_id) fd.append("variant_id", String(variant_id));
    fd.append("title", title);
    fd.append("alt_text", alt_text);
    fd.append("sort_order", String(sort_order));
    if (file) fd.append("image", file);
    const url = editing ? `/admin/gallery/${editing.id}` : `/admin/items/${itemId}/gallery`;
    try {
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Foto galeri disimpan");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan foto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={editing ? "Ubah Foto Galeri" : "Tambah Foto Galeri"} disabled={saving}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tautkan Varian (Opsional)">
            <select className="ui-input" value={variant_id} onChange={(e) => setVid(e.target.value)}>
              <option value="">— Semua Varian —</option>
              {variants.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.variant_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Urutan">
            <input type="number" className="ui-input" value={sort_order} onChange={(e) => setSort(+e.target.value)} />
          </Field>
          <Field label="Judul Foto">
            <input className="ui-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Teks Alt (Aksesibilitas)">
            <input className="ui-input" value={alt_text} onChange={(e) => setAlt(e.target.value)} />
          </Field>
        </div>
        <Field label={`File Gambar ${editing ? "(opsional)" : "*"}`}>
          {(preview || editing?.image) && (
            <img src={preview || imgUrl(editing.image)} alt="" className="mb-2 max-h-40 rounded-lg border border-[#EAE4DA]" />
          )}
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required={!editing} className="text-xs" />
        </Field>
        <div className="flex justify-end gap-2 border-t border-[#EAE4DA] pt-3">
          <button type="button" onClick={onClose} className="rounded-full border border-[#E2DACF] px-4 py-2 text-xs font-medium">
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan Foto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────────── LIFESTYLE ─────────────────────── */
function LifestylePanel({ itemId, initial, editable }: { itemId: number; initial: any[]; editable: boolean }) {
  const dialog = useAdminDialog();
  const [list, setList] = useState<any[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const reload = () => api.get(`/admin/items/${itemId}/lifestyle`).then((r) => setList(r.data));

  const del = async (l: any) => {
    const ok = await dialog.confirm({ title: "Hapus foto ruangan ini?", confirmLabel: "Ya, hapus", danger: true });
    if (!ok) return;
    try {
      await api.delete(`/admin/lifestyle/${l.id}`);
      toast.success("Foto dihapus");
      void reload();
    } catch {
      toast.error("Gagal menghapus foto");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-header text-xl text-[#232528]">Inspirasi Ruangan / Lifestyle ({list.length})</h2>
        {editable && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white hover:bg-[#34383D]"
          >
            <Plus className="h-4 w-4" /> Tambah Foto Ruangan
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {list.map((l) => (
          <div key={l.id} className="rounded-xl border border-[#EAE4DA] bg-white p-3">
            <img src={imgUrl(l.image)} className="mb-2 h-40 w-full rounded-lg object-cover" alt={l.caption || ""} />
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#5E93B8]">
              {l.layout_type} · Lebar {l.width_percentage}%
            </p>
            <p className="mt-0.5 text-sm text-[#232528]">{l.caption || "—"}</p>
            {editable && (
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(l);
                    setOpen(true);
                  }}
                  className="rounded p-1.5 hover:bg-[#FAF8F4]"
                >
                  <Pencil className="h-3.5 w-3.5 text-[#5E93B8]" />
                </button>
                <button type="button" onClick={() => void del(l)} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-[#656B73]">Belum ada foto inspirasi ruangan.</p>
        )}
      </div>
      {open && (
        <LifestyleForm
          itemId={itemId}
          editing={editing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function LifestyleForm({ itemId, editing, onClose, onSaved }: any) {
  const [caption, setCaption] = useState(editing?.caption || "");
  const [layout_type, setLT] = useState(editing?.layout_type || "full");
  const [width_percentage, setWp] = useState(editing?.width_percentage || 100);
  const [sort_order, setSort] = useState(editing?.sort_order ?? 0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append("caption", caption);
    fd.append("layout_type", layout_type);
    fd.append("width_percentage", String(width_percentage));
    fd.append("sort_order", String(sort_order));
    if (file) fd.append("image", file);
    const url = editing ? `/admin/lifestyle/${editing.id}` : `/admin/items/${itemId}/lifestyle`;
    try {
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Foto ruangan disimpan");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan foto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={editing ? "Ubah Foto Ruangan" : "Tambah Foto Ruangan"} disabled={saving}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Keterangan Foto">
          <input className="ui-input" value={caption} onChange={(e) => setCaption(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tipe Tata Letak">
            <select className="ui-input" value={layout_type} onChange={(e) => setLT(e.target.value)}>
              {["full", "half", "masonry", "custom"].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lebar (%)">
            <select className="ui-input" value={width_percentage} onChange={(e) => setWp(+e.target.value)}>
              {[25, 33, 50, 66, 75, 100].map((x) => (
                <option key={x} value={x}>
                  {x}%
                </option>
              ))}
            </select>
          </Field>
          <Field label="Urutan">
            <input type="number" className="ui-input" value={sort_order} onChange={(e) => setSort(+e.target.value)} />
          </Field>
        </div>
        <Field label={`File Gambar ${editing ? "(opsional)" : "*"}`}>
          {(preview || editing?.image) && (
            <img src={preview || imgUrl(editing.image)} alt="" className="mb-2 max-h-40 rounded-lg border border-[#EAE4DA]" />
          )}
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required={!editing} className="text-xs" />
        </Field>
        <div className="flex justify-end gap-2 border-t border-[#EAE4DA] pt-3">
          <button type="button" onClick={onClose} className="rounded-full border border-[#E2DACF] px-4 py-2 text-xs font-medium">
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────────── STORY ─────────────────────── */
function StoryPanel({ itemId, initial, editable }: { itemId: number; initial: any; editable: boolean }) {
  const dialog = useAdminDialog();
  const [story, setStory] = useState<any>(initial);
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDesc] = useState(initial?.description || "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState<any[]>(initial?.cards ?? []);
  const [cardOpen, setCardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const reload = () =>
    api.get(`/admin/items/${itemId}/story`).then((r) => {
      setStory(r.data);
      setCards(r.data?.cards ?? []);
    });

  const saveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editable) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description);
    if (file) fd.append("feature_image", file);
    try {
      const { data } = await api.post(`/admin/items/${itemId}/story`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStory(data);
      setCards(data?.cards ?? []);
      toast.success("Cerita produk disimpan");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan cerita");
    } finally {
      setSaving(false);
    }
  };

  const delCard = async (c: any) => {
    const ok = await dialog.confirm({ title: `Hapus kartu fitur "${c.title}"?`, confirmLabel: "Ya, hapus", danger: true });
    if (!ok) return;
    try {
      await api.delete(`/admin/story-cards/${c.id}`);
      toast.success("Kartu dihapus");
      void reload();
    } catch {
      toast.error("Gagal menghapus kartu");
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={saveStory} className="space-y-4 rounded-2xl border border-[#EAE4DA] bg-white p-6">
        <h2 className="font-header text-xl text-[#232528]">Cerita Desain Produk</h2>
        <Field label="Judul Cerita">
          <input disabled={!editable} className="ui-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Narasi Cerita">
          <textarea
            disabled={!editable}
            className="ui-input min-h-[120px]"
            value={description}
            onChange={(e) => setDesc(e.target.value)}
          />
        </Field>
        <Field label="Foto Pendukung Cerita">
          {(preview || story?.feature_image) && (
            <img
              src={preview || imgUrl(story.feature_image)}
              className="mb-2 max-h-44 rounded-lg border border-[#EAE4DA]"
              alt=""
            />
          )}
          {editable && (
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs" />
          )}
        </Field>
        {editable && (
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#232528] px-6 py-2.5 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan Cerita Produk"}
          </button>
        )}
      </form>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-header text-xl text-[#232528]">Kartu Keunggulan Produk ({cards.length})</h2>
          {story && editable && (
            <button
              type="button"
              onClick={() => {
                setEditingCard(null);
                setCardOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white hover:bg-[#34383D]"
            >
              <Plus className="h-4 w-4" /> Tambah Kartu
            </button>
          )}
        </div>
        {!story && (
          <p className="text-sm text-[#656B73]">Simpan cerita produk di atas terlebih dahulu sebelum menambahkan kartu keunggulan.</p>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((c) => (
            <div key={c.id} className="rounded-xl border border-[#EAE4DA] bg-white p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#5E93B8]">{c.icon || "Keunggulan"}</p>
              <p className="font-header mt-1 text-lg text-[#232528]">{c.title}</p>
              <p className="mt-1.5 text-sm text-[#656B73]">{c.description}</p>
              {editable && (
                <div className="mt-3 flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCard(c);
                      setCardOpen(true);
                    }}
                    className="rounded p-1.5 hover:bg-[#FAF8F4]"
                  >
                    <Pencil className="h-3.5 w-3.5 text-[#5E93B8]" />
                  </button>
                  <button type="button" onClick={() => void delCard(c)} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {cardOpen && story && (
        <StoryCardForm
          storyId={story.id}
          editing={editingCard}
          onClose={() => setCardOpen(false)}
          onSaved={() => {
            setCardOpen(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function StoryCardForm({ storyId, editing, onClose, onSaved }: any) {
  const [title, setTitle] = useState(editing?.title || "");
  const [description, setDesc] = useState(editing?.description || "");
  const [icon, setIcon] = useState(editing?.icon || "");
  const [sort_order, setSort] = useState(editing?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { title, description, icon, sort_order };
    try {
      if (editing) await api.put(`/admin/story-cards/${editing.id}`, payload);
      else await api.post(`/admin/stories/${storyId}/cards`, payload);
      toast.success("Kartu keunggulan disimpan");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan kartu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={editing ? "Ubah Kartu Keunggulan" : "Tambah Kartu Keunggulan"} disabled={saving}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Judul *">
          <input required className="ui-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Deskripsi">
          <textarea className="ui-input min-h-[80px]" value={description} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Label Kategori (mis. Craftsmanship)">
            <input className="ui-input" value={icon} onChange={(e) => setIcon(e.target.value)} />
          </Field>
          <Field label="Urutan">
            <input type="number" className="ui-input" value={sort_order} onChange={(e) => setSort(+e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#EAE4DA] pt-3">
          <button type="button" onClick={onClose} className="rounded-full border border-[#E2DACF] px-4 py-2 text-xs font-medium">
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[#232528]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Modal({ children, onClose, title, disabled }: any) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !disabled && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#EAE4DA] bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between border-b border-[#EAE4DA] pb-3">
          <h2 className="font-header text-xl text-[#232528]">{title}</h2>
          <button type="button" onClick={() => !disabled && onClose()} className="rounded-full p-1 text-[#656B73] hover:bg-[#FAF8F4]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
