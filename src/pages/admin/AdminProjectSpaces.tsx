import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, MapPin, X, Search } from "lucide-react";
import type { ProjectLayout, ProjectRoom, RoomHotspot, RoomSpec } from "@/lib/projectSpaces";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import { useAdminDialog } from "@/components/admin/kit";

const img = (p?: string | null) => (p ? imgUrl(p) : "");

export default function AdminProjectSpaces({ project, onClose }: any) {
  const dialog = useAdminDialog();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("projects");

  const [layouts, setLayouts] = useState<ProjectLayout[]>([]);
  const [idx, setIdx] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [layoutForm, setLayoutForm] = useState<ProjectLayout | null | undefined>(undefined);
  const [roomForm, setRoomForm] = useState<ProjectRoom | null | undefined>(undefined);
  const [pinRoom, setPinRoom] = useState<ProjectRoom | null>(null);

  const load = () =>
    api
      .get(`/admin/projects/${project.id}/layouts`)
      .then((r) => setLayouts(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("Gagal memuat denah & ruangan"));

  useEffect(() => {
    void load();
    api
      .get("/items")
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const layout = layouts[idx];

  const delLayout = async (l: ProjectLayout) => {
    if (!editable) return;
    const ok = await dialog.confirm({
      title: `Hapus denah "${l.title}"?`,
      text: "Semua ruangan dan titik hotspot di dalam denah ini juga akan ikut dihapus.",
      confirmLabel: "Ya, hapus denah",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/layouts/${l.id}`);
      toast.success("Denah dihapus");
      setIdx(0);
      void load();
    } catch {
      toast.error("Gagal menghapus denah");
    }
  };

  const delRoom = async (r: ProjectRoom) => {
    if (!editable) return;
    const ok = await dialog.confirm({
      title: `Hapus ruangan "${r.title}"?`,
      confirmLabel: "Ya, hapus",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/rooms/${r.id}`);
      toast.success("Ruangan dihapus");
      void load();
    } catch {
      toast.error("Gagal menghapus ruangan");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-[#EAE4DA] bg-white p-6 shadow-2xl md:p-8"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#EAE4DA] pb-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#5E93B8]">Denah &amp; Ruangan Proyek</p>
            <h2 className="font-header text-2xl text-[#232528]">{project.title}</h2>
          </div>
          <div className="flex gap-2">
            {editable && (
              <button
                type="button"
                onClick={() => setLayoutForm(null)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white hover:bg-[#34383D]"
              >
                <Plus className="h-4 w-4" /> Tambah Denah / Lantai
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

        {/* Layout Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {layouts.map((l, i) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setIdx(i)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                i === idx
                  ? "border-[#232528] bg-[#232528] text-white"
                  : "border-[#E2DACF] bg-white text-[#656B73] hover:border-[#5E93B8]"
              }`}
            >
              {l.title}
            </button>
          ))}
          {layouts.length === 0 && (
            <p className="text-sm text-[#656B73]">
              Belum ada denah lantai. Klik <strong>Tambah Denah / Lantai</strong> (mis. Lantai 1 / Ground Floor).
            </p>
          )}
        </div>

        {layout && (
          <>
            <div className="mb-8 grid gap-6 md:grid-cols-3">
              <div className="overflow-hidden rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-4 md:col-span-2">
                {layout.image ? (
                  <img src={img(layout.image)} alt={layout.title} className="max-h-[340px] w-full object-contain" />
                ) : (
                  <p className="py-12 text-center text-sm text-[#656B73]">Belum ada gambar denah lantai.</p>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-header text-lg text-[#232528]">{layout.title}</p>
                {layout.subtitle && <p className="text-xs font-medium text-[#5E93B8]">{layout.subtitle}</p>}
                <p className="text-xs leading-relaxed text-[#656B73]">{layout.description || "—"}</p>
                {editable && (
                  <div className="flex gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setLayoutForm(layout)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E2DACF] bg-white px-3 py-1.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
                    >
                      <Pencil className="h-3 w-3 text-[#5E93B8]" /> Edit Denah
                    </button>
                    <button
                      type="button"
                      onClick={() => void delLayout(layout)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" /> Hapus
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-header text-xl text-[#232528]">Ruangan pada {layout.title}</h3>
              {editable && (
                <button
                  type="button"
                  onClick={() => setRoomForm(null)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DACF] bg-white px-4 py-1.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
                >
                  <Plus className="h-3.5 w-3.5 text-[#5E93B8]" /> Tambah Ruangan
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {(layout.rooms ?? []).map((r) => (
                <div key={r.id} className="overflow-hidden rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/50">
                  <img src={img(r.image)} alt={r.title} className="aspect-[4/3] w-full bg-[#F3EFE8] object-cover" />
                  <div className="space-y-1 p-3.5 text-sm">
                    <p className="font-medium text-[#232528]">{r.title}</p>
                    <p className="text-xs text-[#656B73]">
                      {r.area || "—"} · {r.hotspots?.length ?? 0} titik produk
                    </p>
                    {editable && (
                      <div className="flex gap-1.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setRoomForm(r)}
                          className="rounded-lg border border-[#E2DACF] bg-white px-2.5 py-1 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPinRoom(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#5E93B8]/35 bg-[#EDF4F8] px-2.5 py-1 text-xs font-medium text-[#35678B] hover:bg-[#DFECF4]"
                        >
                          <MapPin className="h-3 w-3" /> Titik Hotspot
                        </button>
                        <button
                          type="button"
                          onClick={() => void delRoom(r)}
                          aria-label={`Hapus ${r.title}`}
                          className="ml-auto rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(layout.rooms ?? []).length === 0 && (
                <p className="col-span-3 py-8 text-center text-sm text-[#656B73]">
                  Belum ada ruangan pada denah ini.
                </p>
              )}
            </div>
          </>
        )}

        {layoutForm !== undefined && (
          <LayoutForm
            projectId={project.id}
            layout={layoutForm}
            onClose={() => setLayoutForm(undefined)}
            onSaved={() => {
              setLayoutForm(undefined);
              void load();
            }}
          />
        )}
        {roomForm !== undefined && layout && (
          <RoomForm
            layoutId={layout.id!}
            room={roomForm}
            onClose={() => setRoomForm(undefined)}
            onSaved={() => {
              setRoomForm(undefined);
              void load();
            }}
          />
        )}
        {pinRoom && (
          <HotspotEditor
            room={pinRoom}
            items={items}
            onClose={() => setPinRoom(null)}
            onSaved={() => {
              setPinRoom(null);
              void load();
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ── Layout Form ─────────────────────────────────────────── */
function LayoutForm({ projectId, layout, onClose, onSaved }: any) {
  const [title, setTitle] = useState(layout?.title || "");
  const [subtitle, setSubtitle] = useState(layout?.subtitle || "");
  const [description, setDescription] = useState(layout?.description || "");
  const [sortOrder, setSortOrder] = useState(layout?.sort_order ?? 0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("subtitle", subtitle);
      fd.append("description", description);
      fd.append("sort_order", String(sortOrder));
      if (file) fd.append("image", file);
      const url = layout ? `/admin/layouts/${layout.id}` : `/admin/projects/${projectId}/layouts`;
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Denah tersimpan");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan denah");
    } finally {
      setSaving(false);
    }
  };

  const shownImg = preview || (layout?.image ? img(layout.image) : "");

  return (
    <Modal onClose={onClose} preventBackdropClose={saving}>
      <form onSubmit={submit} className="space-y-3.5">
        <h3 className="font-header text-xl text-[#232528]">{layout ? "Ubah Denah Lantai" : "Tambah Denah Lantai"}</h3>
        <label className="block">
          <span className="text-xs font-medium text-[#232528]">Nama Denah / Lantai *</span>
          <input className="ui-input mt-1" placeholder="mis. Ground Floor" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[#232528]">Subjudul (Opsional)</span>
          <input className="ui-input mt-1" placeholder="mis. Lantai 1" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[#232528]">Deskripsi Denah</span>
          <textarea className="ui-input mt-1" rows={2} placeholder="Ringkasan area pada lantai ini…" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[#232528]">Urutan Tampil</span>
          <input className="ui-input mt-1" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </label>
        <div>
          <span className="mb-1 block text-xs font-medium text-[#232528]">Gambar Denah / Layout</span>
          {shownImg && <img src={shownImg} className="mb-2 max-h-40 rounded-lg border border-[#EAE4DA]" alt="Pratinjau denah" />}
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs" />
        </div>
        <FormActions onClose={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

/* ── Room Form ───────────────────────────────────────────── */
function RoomForm({ layoutId, room, onClose, onSaved }: any) {
  const [title, setTitle] = useState(room?.title || "");
  const [area, setArea] = useState(room?.area || "");
  const [description, setDescription] = useState(room?.description || "");
  const [sortOrder, setSortOrder] = useState(room?.sort_order ?? 0);
  const [specs, setSpecs] = useState<RoomSpec[]>(room?.specs ?? []);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("area", area);
      fd.append("description", description);
      fd.append("sort_order", String(sortOrder));
      fd.append("specs", JSON.stringify(specs.filter((s) => s.label || s.value)));
      if (file) fd.append("image", file);
      const url = room ? `/admin/rooms/${room.id}` : `/admin/layouts/${layoutId}/rooms`;
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Ruangan tersimpan");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan ruangan");
    } finally {
      setSaving(false);
    }
  };

  const shownImg = preview || (room?.image ? img(room.image) : "");

  return (
    <Modal onClose={onClose} preventBackdropClose={saving}>
      <form onSubmit={submit} className="space-y-3.5">
        <h3 className="font-header text-xl text-[#232528]">{room ? "Ubah Ruangan" : "Tambah Ruangan"}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-[#232528]">Nama Ruangan *</span>
            <input className="ui-input mt-1" placeholder="mis. Living Room" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-[#232528]">Luas Area</span>
            <input className="ui-input mt-1" placeholder="mis. 32 m²" value={area} onChange={(e) => setArea(e.target.value)} />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-[#232528]">Deskripsi Ruangan</span>
          <textarea className="ui-input mt-1 min-h-[100px]" placeholder="Ceritakan desain ruangan…" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-[#232528]">Urutan Tampil</span>
          <input className="ui-input mt-1" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-[#232528]">Detail Spesifikasi (mis. Kursi — 6 unit)</span>
            <button
              type="button"
              onClick={() => setSpecs([...specs, { label: "", value: "" }])}
              className="rounded-lg border border-[#E2DACF] bg-white px-2.5 py-1 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
            >
              + Tambah Baris
            </button>
          </div>
          <div className="space-y-2">
            {specs.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="ui-input flex-1"
                  placeholder="Label (mis. Kursi)"
                  value={s.label}
                  onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <input
                  className="ui-input flex-1"
                  placeholder="Nilai (mis. 6 unit)"
                  value={s.value}
                  onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                />
                <button
                  type="button"
                  onClick={() => setSpecs(specs.filter((_, j) => j !== i))}
                  className="rounded-lg border border-red-200 px-2 text-red-600 hover:bg-red-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-[#232528]">Foto Ruangan</span>
          {shownImg && <img src={shownImg} className="mb-2 max-h-40 rounded-lg border border-[#EAE4DA]" alt="Pratinjau ruangan" />}
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs" />
        </div>
        <FormActions onClose={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

/* ── Hotspot Editor (bebas bug drag-spawns-point + searchable item picker) ── */
function HotspotEditor({ room, items, onClose, onSaved }: any) {
  const dialog = useAdminDialog();
  const [spots, setSpots] = useState<RoomHotspot[]>(room.hotspots ?? []);
  const [active, setActive] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<number | null>(null);
  const didDragRef = useRef(false);

  const addAt = (e: React.MouseEvent) => {
    // Jangan pernah tambah titik baru setelah selesai menarik (drag) titik yang sudah ada!
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (!imgRef.current) return;
    const r = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setSpots((prev) => [...prev, { label: `Titik ${prev.length + 1}`, x: +x.toFixed(2), y: +y.toFixed(2) }]);
    setActive(spots.length);
    setDirty(true);
  };

  const onMove = (e: React.MouseEvent) => {
    if (dragRef.current === null || !imgRef.current) return;
    didDragRef.current = true;
    const r = imgRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
    const i = dragRef.current;
    setSpots((prev) => prev.map((s, j) => (j === i ? { ...s, x: +x.toFixed(2), y: +y.toFixed(2) } : s)));
    setDirty(true);
  };

  const patch = (i: number, p: Partial<RoomHotspot>) => {
    setSpots((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)));
    setDirty(true);
  };

  const removeSpot = async (i: number) => {
    const ok = await dialog.confirm({
      title: `Hapus titik "${spots[i]?.label || `Titik ${i + 1}`}"?`,
      confirmLabel: "Ya, hapus",
      danger: true,
    });
    if (!ok) return;
    setSpots((prev) => prev.filter((_, j) => j !== i));
    setActive(null);
    setDirty(true);
  };

  const requestClose = async () => {
    if (saving) return;
    if (dirty) {
      const ok = await dialog.confirm({
        title: "Tutup tanpa menyimpan titik hotspot?",
        text: "Perubahan posisi atau daftar titik belum disimpan ke server.",
        confirmLabel: "Ya, tutup",
        cancelLabel: "Lanjut edit",
      });
      if (!ok) return;
    }
    onClose();
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/rooms/${room.id}/hotspots`, { hotspots: spots });
      toast.success("Titik hotspot ruangan tersimpan");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan titik hotspot");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={() => void requestClose()} wide preventBackdropClose={dirty || saving}>
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAE4DA] pb-3">
          <div>
            <h3 className="font-header text-xl text-[#232528]">Titik Hotspot — {room.title}</h3>
            <p className="text-xs text-[#656B73]">
              Klik pada foto untuk menambah titik produk baru. Tahan dan geser titik bernomor untuk memindahkannya.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void requestClose()}
            className="rounded-full p-1.5 text-[#656B73] hover:bg-[#FAF8F4]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-5">
          <div
            ref={imgRef}
            onClick={addAt}
            onMouseMove={onMove}
            onMouseUp={() => (dragRef.current = null)}
            onMouseLeave={() => (dragRef.current = null)}
            className="relative cursor-crosshair select-none overflow-hidden rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] md:col-span-3"
          >
            <img src={img(room.image)} alt={room.title} className="pointer-events-none w-full object-contain" />
            {spots.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive(i);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  didDragRef.current = false;
                  dragRef.current = i;
                  setActive(i);
                }}
                className="absolute grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold shadow-md transition-transform"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  transform: `translate(-50%,-50%) scale(${active === i ? 1.15 : 1})`,
                  background: active === i ? "#5E93B8" : "#FFFFFF",
                  color: active === i ? "#FFFFFF" : "#232528",
                  border: "2px solid #FFFFFF",
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="max-h-[56vh] space-y-3 overflow-y-auto pr-1 md:col-span-2">
            {spots.map((s, i) => (
              <div
                key={i}
                onClick={() => setActive(i)}
                className={`space-y-2 rounded-xl border p-3.5 transition-colors ${
                  active === i ? "border-[#5E93B8] bg-[#EDF4F8]/40" : "border-[#EAE4DA] bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#232528]">Titik #{i + 1}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeSpot(i);
                    }}
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  className="ui-input"
                  placeholder="Label titik"
                  value={s.label}
                  onChange={(e) => patch(i, { label: e.target.value })}
                />
                <SearchableItemSelect
                  items={items}
                  value={s.item_slug ?? ""}
                  onChange={(slug, it) =>
                    patch(i, {
                      item_slug: slug || null,
                      label: it?.title || s.label,
                      image: it?.image ?? s.image ?? null,
                    })
                  }
                />
                <textarea
                  className="ui-input"
                  rows={2}
                  placeholder="Keterangan singkat (opsional)"
                  value={s.description ?? ""}
                  onChange={(e) => patch(i, { description: e.target.value })}
                />
              </div>
            ))}
            {spots.length === 0 && (
              <p className="py-10 text-center text-sm text-[#656B73]">
                Belum ada titik hotspot. Klik pada foto ruangan di kiri untuk menambahkannya.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#EAE4DA] pt-3">
          <button
            type="button"
            onClick={() => void requestClose()}
            className="rounded-full border border-[#E2DACF] px-5 py-2 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-full bg-[#232528] px-6 py-2 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan Semua Titik"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SearchableItemSelect({
  items,
  value,
  onChange,
}: {
  items: any[];
  value: string;
  onChange: (slug: string, item?: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const current = items.find((x) => x.slug === value);
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return items.slice(0, 35);
    return items
      .filter((x) => x.title?.toLowerCase().includes(k) || x.code?.toLowerCase().includes(k))
      .slice(0, 35);
  }, [items, q]);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={open ? q : current?.title ?? ""}
            onFocus={() => {
              setOpen(true);
              setQ("");
            }}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            placeholder="Cari & tautkan produk furnitur…"
            className="ui-input pr-8"
          />
          <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#656B73]" />
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Lepas tautan"
            className="rounded-lg border border-[#E2DACF] bg-white p-2 text-[#656B73] hover:text-[#232528]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[#E2DACF] bg-white shadow-xl">
          {list.length === 0 ? (
            <p className="p-2.5 text-center text-xs text-[#656B73]">Produk tidak ditemukan.</p>
          ) : (
            list.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => {
                  onChange(it.slug, it);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 border-b border-[#F2EDE5] px-2.5 py-2 text-left text-xs last:border-0 hover:bg-[#FAF8F4]"
              >
                {it.image && <img src={imgUrl(it.image)} alt={it.title} className="h-7 w-7 rounded object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#232528]">{it.title}</p>
                  {it.code && <p className="text-[10px] text-[#656B73]">{it.code}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Shared Modal & Actions ─────────────────────────────── */
function Modal({ children, onClose, wide, preventBackdropClose }: any) {
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => !preventBackdropClose && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[92vh] w-full ${wide ? "max-w-5xl" : "max-w-xl"} overflow-y-auto rounded-2xl border border-[#EAE4DA] bg-white p-6 shadow-2xl`}
      >
        {children}
      </div>
    </div>
  );
}

function FormActions({ onClose, saving }: any) {
  return (
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
        {saving ? "Menyimpan…" : "Simpan"}
      </button>
    </div>
  );
}
