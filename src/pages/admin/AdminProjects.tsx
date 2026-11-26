import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TranslationPanel from "@/components/admin/TranslationPanel";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  Plus,
  Image as ImageIcon,
  LayoutGrid,
  Star,
  ArrowUpRight,
  X,
} from "lucide-react";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import {
  AdminHelpBanner,
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
  useAdminDialog,
} from "@/components/admin/kit";
import AdminProjectPhotos from "./AdminProjectPhotos";
import AdminProjectSpaces from "./AdminProjectSpaces";

type Project = any;

export default function AdminProjects() {
  const dialog = useAdminDialog();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("projects");

  const [projects, setProjects] = useState<Project[]>([]);
  const [scopes, setScopes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [managingPhotos, setManagingPhotos] = useState<Project | null>(null);
  const [managingSpaces, setManagingSpaces] = useState<Project | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get("/projects");
      setProjects(Array.isArray(r.data) ? r.data : []);
    } catch (err: any) {
      const msg = err?.message || "Gagal memuat data portofolio proyek.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    api
      .get("/taxonomies/scopes")
      .then((r) => setScopes(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [load]);

  const del = async (p: Project) => {
    if (!editable) return;
    const ok = await dialog.confirm({
      title: `Hapus proyek "${p.title}"?`,
      text: "Seluruh foto galeri, denah, ruangan, dan hotspot di proyek ini akan ikut terhapus.",
      confirmLabel: "Ya, hapus proyek",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/projects/${p.id}`);
      toast.success(`Proyek "${p.title}" berhasil dihapus`);
      void load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menghapus proyek");
    }
  };

  const toggleHighlight = async (p: Project) => {
    if (!editable) return;
    setTogglingId(p.id);
    const currentIds = projects.filter((x) => x.is_highlighted).map((x) => x.id);
    const nextIds = p.is_highlighted
      ? currentIds.filter((id) => id !== p.id)
      : [...currentIds, p.id];
    try {
      await api.put("/admin/landing/highlights", { ids: nextIds });
      setProjects((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, is_highlighted: !p.is_highlighted } : x)),
      );
      toast.success(
        !p.is_highlighted
          ? `"${p.title}" ditambahkan ke Selected Works Halaman Depan.`
          : `"${p.title}" dihapus dari Selected Works Halaman Depan.`,
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal mengubah status Selected Works");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Katalog & Portofolio"
        title="Portofolio Proyek"
        description="Kelola proyek interior & arsitektur, foto galeri, denah ruangan, serta proyek pilihan di Halaman Depan."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/landing"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DACF] bg-white px-4 py-2 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
            >
              Atur Urutan Selected Works <ArrowUpRight className="h-3.5 w-3.5 text-[#5E93B8]" />
            </Link>
            {editable && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white hover:bg-[#34383D]"
              >
                <Plus className="h-4 w-4" /> Tambah Proyek
              </button>
            )}
          </div>
        }
      />

      <AdminHelpBanner storageKey="projects-help">
        Setiap proyek memiliki 3 bagian: <strong>Info &amp; Foto Utama</strong> (tombol Edit),{" "}
        <strong>Galeri Foto</strong> (foto ruangan + tag produk), dan <strong>Denah &amp; Ruangan</strong> (Spaces +
        titik hotspot). Klik ikon bintang untuk langsung menampilkannya di <em>Selected Works</em> Halaman Depan.
      </AdminHelpBanner>

      {error ? (
        <ErrorState title="Portofolio proyek belum bisa dimuat" description={error} onRetry={load} />
      ) : loading ? (
        <CardGridSkeleton count={6} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="Belum ada portofolio proyek"
          description="Tambahkan proyek interior pertama untuk ditampilkan di halaman Projects website."
          action={
            editable ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white"
              >
                <Plus className="h-4 w-4" /> Tambah Proyek Pertama
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[4/3] bg-[#FAF8F4]">
                {p.hero_image ? (
                  <img src={imgUrl(p.hero_image)} alt={p.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[#656B73]/50">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                {editable && (
                  <button
                    type="button"
                    disabled={togglingId === p.id}
                    onClick={() => void toggleHighlight(p)}
                    title={
                      p.is_highlighted
                        ? "Tampil di Selected Works Halaman Depan (klik untuk hapus)"
                        : "Tampilkan di Selected Works Halaman Depan"
                    }
                    className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur-sm transition-colors ${
                      p.is_highlighted
                        ? "bg-[#5E93B8] text-white"
                        : "bg-white/90 text-[#4C5259] hover:bg-white hover:text-[#232528]"
                    }`}
                  >
                    <Star className={`h-3 w-3 ${p.is_highlighted ? "fill-white" : ""}`} />
                    {p.is_highlighted ? "Selected Works" : "Jadikan Pilihan"}
                  </button>
                )}
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#5E93B8]">
                  {p.scope?.name || "Umum"}
                  {p.year ? ` · ${p.year}` : ""}
                </p>
                <h3 className="font-header mt-1 text-xl text-[#232528]">{p.title}</h3>
                {p.subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-[#656B73]">{p.subtitle}</p>}

                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4 text-xs">
                  {editable && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(p);
                        setShowForm(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E2DACF] bg-white px-2.5 py-1.5 font-medium text-[#232528] hover:border-[#5E93B8]"
                    >
                      <Pencil className="h-3 w-3 text-[#5E93B8]" /> Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setManagingPhotos(p)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#E2DACF] bg-white px-2.5 py-1.5 font-medium text-[#232528] hover:border-[#5E93B8]"
                  >
                    <ImageIcon className="h-3 w-3 text-[#5E93B8]" /> Galeri ({p.photos?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setManagingSpaces(p)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#E2DACF] bg-white px-2.5 py-1.5 font-medium text-[#232528] hover:border-[#5E93B8]"
                  >
                    <LayoutGrid className="h-3 w-3 text-[#5E93B8]" /> Denah &amp; Ruang
                  </button>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => void del(p)}
                      aria-label={`Hapus ${p.title}`}
                      className="ml-auto rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ProjectForm
          project={editing}
          scopes={scopes}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            void load();
          }}
        />
      )}
      {managingSpaces && (
        <AdminProjectSpaces
          project={managingSpaces}
          onClose={() => {
            setManagingSpaces(null);
            void load();
          }}
        />
      )}
      {managingPhotos && (
        <AdminProjectPhotos
          project={managingPhotos}
          onClose={() => {
            setManagingPhotos(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function ProjectForm({ project, scopes, onClose, onSaved }: any) {
  const dialog = useAdminDialog();
  const [title, setTitle] = useState(project?.title || "");
  const [subtitle, setSubtitle] = useState(project?.subtitle || "");
  const [description, setDescription] = useState(project?.description || "");
  const [location, setLocation] = useState(project?.location || "");
  const [year, setYear] = useState(project?.year || "");
  const [scopeId, setScopeId] = useState<string>(project?.scope_id?.toString() || "");
  const [file, setFile] = useState<File | null>(null);
  const [focusX, setFocusX] = useState<number>(project?.hero_focus_x ?? 50);
  const [focusY, setFocusY] = useState<number>(project?.hero_focus_y ?? 40);
  const [zoom, setZoom] = useState<number>(project?.hero_zoom ?? 100);
  const [preview, setPreview] = useState<string>("");
  const previewBox = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const isDirty =
    title !== (project?.title || "") ||
    subtitle !== (project?.subtitle || "") ||
    description !== (project?.description || "") ||
    location !== (project?.location || "") ||
    year !== (project?.year || "") ||
    scopeId !== (project?.scope_id?.toString() || "") ||
    !!file ||
    focusX !== (project?.hero_focus_x ?? 50) ||
    focusY !== (project?.hero_focus_y ?? 40) ||
    zoom !== (project?.hero_zoom ?? 100);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const requestClose = async () => {
    if (saving) return;
    if (isDirty) {
      const ok = await dialog.confirm({
        title: "Buang perubahan yang belum disimpan?",
        confirmLabel: "Ya, tutup",
        cancelLabel: "Lanjut edit",
      });
      if (!ok) return;
    }
    onClose();
  };

  const heroSrc = preview || (project?.hero_image ? imgUrl(project.hero_image) : "");

  const pickFocus = (e: React.MouseEvent) => {
    if (!previewBox.current) return;
    const r = previewBox.current.getBoundingClientRect();
    setFocusX(+(((e.clientX - r.left) / r.width) * 100).toFixed(1));
    setFocusY(+(((e.clientY - r.top) / r.height) * 100).toFixed(1));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("subtitle", subtitle);
      fd.append("description", description);
      fd.append("location", location);
      fd.append("year", year);
      if (scopeId) fd.append("scope_id", scopeId);
      if (file) fd.append("hero_image", file);
      fd.append("hero_focus_x", String(focusX));
      fd.append("hero_focus_y", String(focusY));
      fd.append("hero_zoom", String(zoom));
      const url = project ? `/admin/projects/${project.id}` : "/admin/projects";
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(project ? "Proyek diperbarui" : "Proyek baru ditambahkan");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan proyek");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm sm:p-6"
      onClick={() => void requestClose()}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-[#EAE4DA] bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DA] pb-3">
          <h2 className="font-header text-2xl text-[#232528]">
            {project ? "Edit Portofolio Proyek" : "Tambah Proyek Baru"}
          </h2>
          <button
            type="button"
            onClick={() => void requestClose()}
            className="rounded-full p-1.5 text-[#656B73] hover:bg-[#FAF8F4]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Field label="Judul Proyek *">
          <input className="ui-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Subjudul Singkat (mis. Batam Residence)">
          <input className="ui-input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </Field>
        <Field label="Cerita / Deskripsi Proyek">
          <textarea
            className="ui-input min-h-[130px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Lokasi">
            <input className="ui-input" placeholder="mis. Jakarta Selatan" value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
          <Field label="Tahun">
            <input className="ui-input" placeholder="mis. 2026" value={year} onChange={(e) => setYear(e.target.value)} />
          </Field>
          <Field label="Scope Proyek">
            <select className="ui-input" value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
              <option value="">— Pilih Scope —</option>
              {scopes.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Foto Utama (Hero)">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs" />
        </Field>

        {heroSrc && (
          <div className="space-y-3 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-4">
            <p className="text-xs font-medium text-[#232528]">
              Titik Fokus Hero — klik pada gambar di bawah untuk menentukan titik fokus saat tampil di halaman proyek
            </p>
            <div
              ref={previewBox}
              onClick={pickFocus}
              className="relative w-full cursor-crosshair overflow-hidden rounded-lg bg-muted"
              style={{ aspectRatio: "16 / 9" }}
            >
              <img
                src={heroSrc}
                alt="Pratinjau hero"
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  objectPosition: `${focusX}% ${focusY}%`,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: `${focusX}% ${focusY}%`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-black/30" />
              <div
                className="pointer-events-none absolute h-5 w-5 rounded-full border-2 border-white bg-[#5E93B8]/80 shadow"
                style={{ left: `${focusX}%`, top: `${focusY}%`, transform: "translate(-50%,-50%)" }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <label className="block">
                <span className="text-[#656B73]">Fokus X ({focusX}%)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={focusX}
                  onChange={(e) => setFocusX(Number(e.target.value))}
                  className="w-full accent-[#5E93B8]"
                />
              </label>
              <label className="block">
                <span className="text-[#656B73]">Fokus Y ({focusY}%)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={focusY}
                  onChange={(e) => setFocusY(Number(e.target.value))}
                  className="w-full accent-[#5E93B8]"
                />
              </label>
              <label className="block">
                <span className="text-[#656B73]">Zoom ({zoom}%)</span>
                <input
                  type="range"
                  min={100}
                  max={250}
                  step={1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-[#5E93B8]"
                />
              </label>
            </div>
          </div>
        )}

        {project?.id ? <TranslationPanel type="project" id={project.id} /> : null}

        <div className="flex justify-end gap-2 border-t border-[#EAE4DA] pt-4">
          <button
            type="button"
            onClick={() => void requestClose()}
            className="rounded-full border border-[#E2DACF] px-5 py-2 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4]"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#232528] px-6 py-2 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan Proyek"}
          </button>
        </div>
      </form>
    </div>
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
