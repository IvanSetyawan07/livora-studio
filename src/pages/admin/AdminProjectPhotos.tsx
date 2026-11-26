import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { toast } from "sonner";
import { Trash2, Plus, Search, X, Pencil } from "lucide-react";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import { useAdminDialog } from "@/components/admin/kit";

export default function AdminProjectPhotos({ project, onClose }: any) {
  const dialog = useAdminDialog();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("projects");

  const [photos, setPhotos] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = () =>
    api
      .get(`/admin/projects/${project.id}/photos`)
      .then((r) => setPhotos(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("Gagal memuat galeri foto proyek"));

  useEffect(() => {
    void load();
    api
      .get("/items")
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const del = async (p: any) => {
    if (!editable) return;
    const ok = await dialog.confirm({
      title: `Hapus foto "${p.title || "Tanpa judul"}"?`,
      confirmLabel: "Ya, hapus",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/photos/${p.id}`);
      toast.success("Foto dihapus");
      void load();
    } catch {
      toast.error("Gagal menghapus foto");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#EAE4DA] bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4DA] pb-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#5E93B8]">Galeri Foto Proyek</p>
            <h2 className="font-header text-2xl text-[#232528]">{project.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {editable && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white hover:bg-[#34383D]"
              >
                <Plus className="h-4 w-4" /> Tambah Foto
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#E2DACF] px-4 py-2 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4]"
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/50">
              <img src={imgUrl(p.image)} alt={p.title} className="aspect-square w-full object-cover" />
              <div className="p-3.5 text-sm">
                <p className="font-medium text-[#232528]">{p.title || "Tanpa judul"}</p>
                <p className="mb-2.5 mt-0.5 line-clamp-2 text-xs text-[#656B73]">
                  Produk terkait: {p.items?.map((i: any) => i.title).join(", ") || "—"}
                </p>
                {editable && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(p);
                        setShowForm(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E2DACF] bg-white px-2.5 py-1 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
                    >
                      <Pencil className="h-3 w-3 text-[#5E93B8]" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void del(p)}
                      aria-label="Hapus foto"
                      className="ml-auto rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {photos.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-[#656B73]">
              Belum ada foto di galeri proyek ini.
            </p>
          )}
        </div>

        {showForm && (
          <PhotoForm
            projectId={project.id}
            photo={editing}
            items={items}
            onClose={() => setShowForm(false)}
            onSaved={() => {
              setShowForm(false);
              void load();
            }}
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
  const [preview, setPreview] = useState<string>("");
  const [itemIds, setItemIds] = useState<number[]>(photo?.items?.map((i: any) => i.id) || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const toggle = (id: number) =>
    setItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo && !file) {
      toast.error("Silakan pilih file foto terlebih dahulu");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("caption", caption);
      if (file) fd.append("image", file);
      itemIds.forEach((id) => fd.append("item_ids[]", id.toString()));
      const url = photo ? `/admin/photos/${photo.id}` : `/admin/projects/${projectId}/photos`;
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(photo ? "Foto diperbarui" : "Foto ditambahkan");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan foto");
    } finally {
      setSaving(false);
    }
  };

  const shownImg = preview || (photo?.image ? imgUrl(photo.image) : "");

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm sm:p-6"
      onClick={() => !saving && onClose()}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-[#EAE4DA] bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DA] pb-3">
          <h3 className="font-header text-xl text-[#232528]">{photo ? "Ubah Foto Proyek" : "Tambah Foto Proyek"}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-[#656B73] hover:bg-[#FAF8F4]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-[#232528]">Judul Foto (mis. Ruang Tamu Utama)</span>
          <input className="ui-input mt-1" placeholder="mis. Lobby Utama" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-[#232528]">Keterangan (Opsional)</span>
          <textarea className="ui-input mt-1" rows={2} placeholder="Deskripsi singkat foto…" value={caption} onChange={(e) => setCaption(e.target.value)} />
        </label>

        <div>
          <span className="mb-1 block text-xs font-medium text-[#232528]">File Foto {photo ? "(kosongkan jika tidak diganti)" : "*"}</span>
          {shownImg && (
            <img src={shownImg} alt="Pratinjau" className="mb-2 h-40 w-full rounded-xl border border-[#EAE4DA] object-cover" />
          )}
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs" />
        </div>

        <TagItemsPicker items={items} itemIds={itemIds} toggle={toggle} />

        <div className="flex justify-end gap-2 border-t border-[#EAE4DA] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E2DACF] px-4 py-2 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4]"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan Foto"}
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
      (i: any) => i.title?.toLowerCase().includes(q) || i.code?.toLowerCase().includes(q),
    );
  }, [items, query]);

  const selected = items.filter((i: any) => itemIds.includes(i.id));

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-[#232528]">Tandai Produk Furnitur dalam Foto Ini</p>

      <div ref={wrapRef} className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 py-2">
          <Search className="h-4 w-4 text-[#656B73]" />
          <input
            type="text"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            placeholder="Cari nama atau kode furnitur…"
            className="flex-1 bg-transparent text-sm text-[#232528] outline-none"
          />
        </div>

        {open && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[#E2DACF] bg-white shadow-xl">
            {filtered.length === 0 && <p className="p-3 text-center text-xs text-[#656B73]">Produk tidak ditemukan.</p>}
            {filtered.slice(0, 40).map((i: any) => {
              const checked = itemIds.includes(i.id);
              return (
                <button
                  type="button"
                  key={i.id}
                  onClick={() => toggle(i.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[#FAF8F4] ${
                    checked ? "bg-[#EDF4F8]/60" : ""
                  }`}
                >
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#FAF8F4]">
                    {i.image ? <img src={imgUrl(i.image)} alt={i.title} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[#232528]">{i.title}</p>
                    <p className="truncate text-xs text-[#656B73]">{i.code || "—"}</p>
                  </div>
                  <input type="checkbox" readOnly checked={checked} className="pointer-events-none accent-[#5E93B8]" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((i: any) => (
            <span
              key={i.id}
              className="inline-flex items-center gap-2 rounded-full border border-[#5E93B8]/30 bg-[#EDF4F8] py-1 pl-1 pr-2.5 text-xs text-[#232528]"
            >
              <span className="h-5 w-5 overflow-hidden rounded-full bg-white">
                {i.image ? <img src={imgUrl(i.image)} alt={i.title} className="h-full w-full object-cover" /> : null}
              </span>
              <span className="max-w-[140px] truncate">{i.title}</span>
              <button
                type="button"
                onClick={() => toggle(i.id)}
                className="text-[#656B73] hover:text-[#232528]"
                aria-label="Hapus produk"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
