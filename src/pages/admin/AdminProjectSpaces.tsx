import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { Plus, Trash2, Pencil, MapPin, X } from "lucide-react";
import type { ProjectLayout, ProjectRoom, RoomHotspot, RoomSpec } from "@/lib/projectSpaces";

const img = (p?: string | null) => (p ? imgUrl(p) : "");

export default function AdminProjectSpaces({ project, onClose }: any) {
  const [layouts, setLayouts] = useState<ProjectLayout[]>([]);
  const [idx, setIdx] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [layoutForm, setLayoutForm] = useState<ProjectLayout | null | undefined>(undefined);
  const [roomForm, setRoomForm] = useState<ProjectRoom | null | undefined>(undefined);
  const [pinRoom, setPinRoom] = useState<ProjectRoom | null>(null);

  const load = () =>
    api.get(`/admin/projects/${project.id}/layouts`).then((r) => setLayouts(r.data ?? []));

  useEffect(() => {
    load();
    api.get("/items").then((r) => setItems(r.data ?? [])).catch(() => {});
  }, [project.id]);

  const layout = layouts[idx];

  const delLayout = async (l: ProjectLayout) => {
    if (!confirm(`Hapus layout "${l.title}" beserta semua ruangannya?`)) return;
    await api.delete(`/admin/layouts/${l.id}`);
    setIdx(0);
    load();
  };
  const delRoom = async (r: ProjectRoom) => {
    if (!confirm(`Hapus ruangan "${r.title}"?`)) return;
    await api.delete(`/admin/rooms/${r.id}`);
    load();
  };

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-lg w-full max-w-6xl p-6 md:p-8 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Spaces for</p>
            <h2 className="serif text-2xl">{project.title}</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLayoutForm(null)}
              className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-sm"
            >
              <Plus className="w-4 h-4" /> Layout
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm">
              Close
            </button>
          </div>
        </div>

        {/* Layout tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {layouts.map((l, i) => (
            <button
              key={l.id}
              onClick={() => setIdx(i)}
              className={`text-xs uppercase tracking-[0.2em] px-4 py-2 rounded-full border ${
                i === idx ? "bg-foreground text-background border-foreground" : "border-border"
              }`}
            >
              {l.title}
            </button>
          ))}
          {layouts.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada layout. Buat layout pertama (mis. “Ground Floor”).</p>
          )}
        </div>

        {layout && (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="md:col-span-2 border border-border rounded overflow-hidden bg-muted/40 p-4">
                {layout.image ? (
                  <img src={img(layout.image)} alt={layout.title} className="w-full object-contain max-h-[340px]" />
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada gambar layout.</p>
                )}
              </div>
              <div className="text-sm space-y-2">
                <p className="font-medium">{layout.title}</p>
                <p className="text-muted-foreground">{layout.subtitle}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{layout.description}</p>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setLayoutForm(layout)} className="text-xs px-3 py-1.5 border border-border rounded flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => delLayout(layout)} className="text-xs px-3 py-1.5 border border-border rounded text-destructive flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="serif text-xl">Rooms in {layout.title}</h3>
              <button onClick={() => setRoomForm(null)} className="flex items-center gap-2 border border-border px-3 py-1.5 rounded text-sm">
                <Plus className="w-4 h-4" /> Add Room
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {(layout.rooms ?? []).map((r) => (
                <div key={r.id} className="border border-border rounded overflow-hidden">
                  <img src={img(r.image)} alt={r.title} className="w-full aspect-[4/3] object-cover bg-muted" />
                  <div className="p-3 text-sm space-y-1">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.area}</p>
                    <p className="text-xs text-muted-foreground">Hotspots: {r.hotspots?.length ?? 0}</p>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => setRoomForm(r)} className="text-xs px-2 py-1 border border-border rounded">Edit</button>
                      <button onClick={() => setPinRoom(r)} className="text-xs px-2 py-1 border border-border rounded flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Points
                      </button>
                      <button onClick={() => delRoom(r)} className="text-xs px-2 py-1 border border-border rounded text-destructive ml-auto">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(layout.rooms ?? []).length === 0 && (
                <p className="col-span-3 text-sm text-muted-foreground">Belum ada ruangan pada layout ini.</p>
              )}
            </div>
          </>
        )}

        {layoutForm !== undefined && (
          <LayoutForm
            projectId={project.id}
            layout={layoutForm}
            onClose={() => setLayoutForm(undefined)}
            onSaved={() => { setLayoutForm(undefined); load(); }}
          />
        )}
        {roomForm !== undefined && layout && (
          <RoomForm
            layoutId={layout.id!}
            room={roomForm}
            onClose={() => setRoomForm(undefined)}
            onSaved={() => { setRoomForm(undefined); load(); }}
          />
        )}
        {pinRoom && (
          <HotspotEditor
            room={pinRoom}
            items={items}
            onClose={() => setPinRoom(null)}
            onSaved={() => { setPinRoom(null); load(); }}
          />
        )}
      </div>
    </div>
  );
}

/* ── Layout form ─────────────────────────────────────────── */
function LayoutForm({ projectId, layout, onClose, onSaved }: any) {
  const [title, setTitle] = useState(layout?.title || "");
  const [subtitle, setSubtitle] = useState(layout?.subtitle || "");
  const [description, setDescription] = useState(layout?.description || "");
  const [sortOrder, setSortOrder] = useState(layout?.sort_order ?? 0);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("subtitle", subtitle);
      fd.append("description", description);
      fd.append("sort_order", String(sortOrder));
      if (file) fd.append("image", file);
      const url = layout ? `/admin/layouts/${layout.id}` : `/admin/projects/${projectId}/layouts`;
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSaved();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <h3 className="serif text-xl">{layout ? "Edit Layout" : "New Layout"}</h3>
        <input className="ui-input" placeholder="Title (mis. Ground Floor)" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="ui-input" placeholder="Subtitle (mis. Planta Baja)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        <textarea className="ui-input" placeholder="Deskripsi layout" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="ui-input" type="number" placeholder="Urutan" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Gambar Layout / Denah</p>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {layout?.image && !file && <img src={img(layout.image)} className="mt-2 w-40 rounded" alt="" />}
        </div>
        <FormActions onClose={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

/* ── Room form ───────────────────────────────────────────── */
function RoomForm({ layoutId, room, onClose, onSaved }: any) {
  const [title, setTitle] = useState(room?.title || "");
  const [area, setArea] = useState(room?.area || "");
  const [description, setDescription] = useState(room?.description || "");
  const [sortOrder, setSortOrder] = useState(room?.sort_order ?? 0);
  const [specs, setSpecs] = useState<RoomSpec[]>(room?.specs ?? []);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("area", area);
      fd.append("description", description);
      fd.append("sort_order", String(sortOrder));
      fd.append("specs", JSON.stringify(specs.filter((s) => s.label || s.value)));
      if (file) fd.append("image", file);
      const url = room ? `/admin/rooms/${room.id}` : `/admin/layouts/${layoutId}/rooms`;
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSaved();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <h3 className="serif text-xl">{room ? "Edit Room" : "New Room"}</h3>
        <input className="ui-input" placeholder="Nama ruangan (mis. Living Room)" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="ui-input" placeholder="Luas (mis. 32 M²)" value={area} onChange={(e) => setArea(e.target.value)} />
        <textarea className="ui-input min-h-[110px]" placeholder="Deskripsi ruangan" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="ui-input" type="number" placeholder="Urutan" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Detail (mis. Chairs — 6 pcs)</p>
            <button type="button" onClick={() => setSpecs([...specs, { label: "", value: "" }])} className="text-xs px-2 py-1 border border-border rounded">+ Add</button>
          </div>
          <div className="space-y-2">
            {specs.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input className="ui-input flex-1" placeholder="Label" value={s.label}
                  onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input className="ui-input flex-1" placeholder="Value" value={s.value}
                  onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                <button type="button" onClick={() => setSpecs(specs.filter((_, j) => j !== i))} className="px-2 border border-border rounded text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Foto Ruangan</p>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {room?.image && !file && <img src={img(room.image)} className="mt-2 w-40 rounded" alt="" />}
        </div>
        <FormActions onClose={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

/* ── Hotspot editor ──────────────────────────────────────── */
function HotspotEditor({ room, items, onClose, onSaved }: any) {
  const [spots, setSpots] = useState<RoomHotspot[]>(room.hotspots ?? []);
  const [active, setActive] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<number | null>(null);

  const addAt = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const r = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setSpots([...spots, { label: "New point", x: +x.toFixed(2), y: +y.toFixed(2) }]);
    setActive(spots.length);
  };

  const onMove = (e: React.MouseEvent) => {
    if (dragRef.current === null || !imgRef.current) return;
    const r = imgRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
    const i = dragRef.current;
    setSpots((prev) => prev.map((s, j) => (j === i ? { ...s, x: +x.toFixed(2), y: +y.toFixed(2) } : s)));
  };

  const patch = (i: number, p: Partial<RoomHotspot>) =>
    setSpots((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)));

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/rooms/${room.id}/hotspots`, { hotspots: spots });
      onSaved();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} wide>
      <div className="space-y-4">
        <h3 className="serif text-xl">Points — {room.title}</h3>
        <p className="text-xs text-muted-foreground">Klik pada gambar untuk menambah titik. Drag titik untuk memindahkan.</p>

        <div className="grid md:grid-cols-5 gap-5">
          <div
            ref={imgRef}
            onClick={addAt}
            onMouseMove={onMove}
            onMouseUp={() => (dragRef.current = null)}
            onMouseLeave={() => (dragRef.current = null)}
            className="md:col-span-3 relative select-none cursor-crosshair bg-muted rounded overflow-hidden"
          >
            <img src={img(room.image)} alt={room.title} className="w-full object-contain pointer-events-none" />
            {spots.map((s, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setActive(i); }}
                onMouseDown={(e) => { e.stopPropagation(); dragRef.current = i; setActive(i); }}
                className="absolute w-6 h-6 rounded-full grid place-items-center text-[10px]"
                style={{
                  left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%,-50%)",
                  background: active === i ? "#C9A97A" : "#fff",
                  color: active === i ? "#fff" : "#1A1A1A",
                  border: "1px solid rgba(0,0,0,.2)",
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="md:col-span-2 space-y-3 max-h-[55vh] overflow-y-auto">
            {spots.map((s, i) => (
              <div key={i} className={`border rounded p-3 space-y-2 ${active === i ? "border-foreground" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Point {i + 1}</span>
                  <button onClick={() => setSpots(spots.filter((_, j) => j !== i))} className="text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <input className="ui-input" placeholder="Label" value={s.label} onChange={(e) => patch(i, { label: e.target.value })} />
                <select
                  className="ui-input"
                  value={s.item_slug ?? ""}
                  onChange={(e) => {
                    const it = items.find((x: any) => x.slug === e.target.value);
                    patch(i, {
                      item_slug: e.target.value || null,
                      label: it?.title || s.label,
                      image: it?.image ?? s.image ?? null,
                    });
                  }}
                >
                  <option value="">— Tanpa item —</option>
                  {items.map((it: any) => (
                    <option key={it.id} value={it.slug}>{it.title}</option>
                  ))}
                </select>
                <textarea className="ui-input" placeholder="Deskripsi singkat" value={s.description ?? ""} onChange={(e) => patch(i, { description: e.target.value })} />
              </div>
            ))}
            {spots.length === 0 && <p className="text-sm text-muted-foreground">Belum ada titik.</p>}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="ml-auto px-5 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em] disabled:opacity-60">
            {saving ? "Saving..." : "Save Points"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── shared ──────────────────────────────────────────────── */
function Modal({ children, onClose, wide }: any) {
  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-[60]" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-card border border-border rounded-lg w-full ${wide ? "max-w-5xl" : "max-w-xl"} p-6 max-h-[92vh] overflow-y-auto`}
      >
        {children}
      </div>
    </div>
  );
}

function FormActions({ onClose, saving }: any) {
  return (
    <div className="flex gap-2 pt-2">
      <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
      <button disabled={saving} className="ml-auto px-5 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em] disabled:opacity-60">
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
