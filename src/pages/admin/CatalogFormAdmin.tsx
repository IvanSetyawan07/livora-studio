import TranslationPanel from "@/components/admin/TranslationPanel";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Image as ImageIcon,
  Plus,
  Save,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { toast } from "sonner";
import { HotspotVisualEditor } from "./HotspotVisualEditor";
import { ItemsGridEditor } from "./ItemsGridEditor";
import {
  getCatalogScenes,
  createCatalogScene,
  updateCatalogScene,
  deleteCatalogScene,
  reorderCatalogScenes,
} from "@/lib/catalogApi";
import {
  CATALOG_CATEGORIES,
  CATALOG_TAXONOMIES,
  CatalogCategory,
  CatalogScene,
} from "@/types/catalog";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import {
  AdminHelpBanner,
  ErrorState,
  PageHeader,
  TableSkeleton,
  useAdminDialog,
} from "@/components/admin/kit";

interface HotspotItem {
  id?: string | number;
  scene_number: string;
  label: string;
  x: number;
  y: number;
  item_slug?: string;
  description?: string;
  image?: string;
}

interface FormDataState {
  title: string;
  slug: string;
  category: CatalogCategory;
  taxonomy: string;
  tagline: string;
  aboutTitle: string;
  description: string;
  featured: boolean;
  coverImage: File | null;
  coverImageUrl?: string;
}

const VALID_STYLES = CATALOG_TAXONOMIES.filter((t) => t !== "All");

export default function CatalogFormAdmin() {
  const { id: catalogId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const dialog = useAdminDialog();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("catalog");

  const [form, setForm] = useState<FormDataState>({
    title: "",
    slug: "",
    category: "living-rooms",
    taxonomy: VALID_STYLES[0] ?? "Modern",
    tagline: "",
    aboutTitle: "",
    description: "",
    featured: false,
    coverImage: null,
  });

  const [scenes, setScenes] = useState<CatalogScene[]>([]);
  const [scenesLoading, setScenesLoading] = useState(false);
  const [sceneUploading, setSceneUploading] = useState(false);
  const sceneAddInputRef = useRef<HTMLInputElement>(null);

  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  const [currentScene, setCurrentScene] = useState<string>("");

  const [loading, setLoading] = useState(!!catalogId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "gallery" | "hotspots">("basic");

  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!form.coverImage) {
      setCoverPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(form.coverImage);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.coverImage]);

  useEffect(() => {
    if (!catalogId) {
      setLoading(false);
      return;
    }

    const fetchCatalog = async () => {
      try {
        setError(null);
        const { data: raw } = await api.get<any>(`/admin/catalogs/${catalogId}`);
        const coverPath = raw.cover_image || raw.coverImage || "";
        const coverImageUrl = coverPath ? imgUrl(coverPath) : "";

        setForm({
          title: raw.title ?? "",
          slug: raw.slug ?? "",
          category: raw.category ?? "living-rooms",
          taxonomy: VALID_STYLES.includes(raw.taxonomy) ? raw.taxonomy : VALID_STYLES[0] ?? "Modern",
          tagline: raw.tagline ?? "",
          aboutTitle: raw.about_title ?? "",
          description: raw.description ?? "",
          featured: Boolean(raw.featured),
          coverImage: null,
          coverImageUrl,
        });

        try {
          const { data: hotspotsData } = await api.get<HotspotItem[]>(
            `/admin/catalogs/${catalogId}/hotspots`,
          );
          setHotspots(Array.isArray(hotspotsData) ? hotspotsData : []);
        } catch {
          setHotspots([]);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || "Gagal memuat data lookbook.");
      } finally {
        setLoading(false);
      }
    };

    void fetchCatalog();
  }, [catalogId]);

  const loadScenes = async () => {
    if (!catalogId) return;
    setScenesLoading(true);
    try {
      const data = await getCatalogScenes(catalogId);
      const sorted = [...data].sort((a, b) => a.order - b.order);
      setScenes(sorted);
      setCurrentScene((prev) =>
        sorted.find((s) => s.scene_key === prev) ? prev : sorted[0]?.scene_key ?? "",
      );
    } catch {
      setScenes([]);
    } finally {
      setScenesLoading(false);
    }
  };

  useEffect(() => {
    if (catalogId) void loadScenes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogId]);

  const handleAddScene = async (file: File) => {
    if (!catalogId || !editable) return;
    setSceneUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      await createCatalogScene(catalogId, fd);
      toast.success("Foto scene baru berhasil ditambahkan");
      await loadScenes();
    } catch {
      toast.error("Gagal menambahkan foto scene");
    } finally {
      setSceneUploading(false);
      if (sceneAddInputRef.current) sceneAddInputRef.current.value = "";
    }
  };

  const handleReplaceSceneImage = async (scene: CatalogScene, file: File) => {
    if (!catalogId || !editable) return;
    const fd = new FormData();
    fd.append("image", file);
    try {
      await updateCatalogScene(catalogId, scene.id, fd);
      toast.success("Foto scene diperbarui");
      await loadScenes();
    } catch {
      toast.error("Gagal mengganti foto scene");
    }
  };

  const handleDeleteScene = async (scene: CatalogScene) => {
    if (!catalogId || !editable) return;
    const ok = await dialog.confirm({
      title: "Hapus foto scene ini?",
      text: "Seluruh titik hotspot yang berada di foto scene ini juga akan ikut dihapus.",
      confirmLabel: "Ya, hapus scene",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteCatalogScene(catalogId, scene.id);
      toast.success("Scene dihapus");
      setHotspots((prev) => prev.filter((h) => h.scene_number !== scene.scene_key));
      await loadScenes();
    } catch {
      toast.error("Gagal menghapus scene");
    }
  };

  const moveScene = async (index: number, dir: -1 | 1) => {
    if (!catalogId || !editable) return;
    const next = [...scenes];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setScenes(next);
    try {
      await reorderCatalogScenes(
        catalogId,
        next.map((s, i) => ({ id: s.id, order: i + 1 })),
      );
      toast.success("Urutan scene diperbarui");
    } catch {
      toast.error("Gagal menyimpan urutan scene");
      await loadScenes();
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setForm((prev) => ({
      ...prev,
      title,
      slug: catalogId
        ? prev.slug
        : title
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\w-]/g, ""),
    }));
  };

  const handleSubmitBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editable) return;
    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("slug", form.slug.trim());
      fd.append("category", form.category);
      fd.append("taxonomy", form.taxonomy);
      fd.append("tagline", form.tagline);
      fd.append("about_title", form.aboutTitle);
      fd.append("description", form.description);
      fd.append("featured", form.featured ? "1" : "0");
      if (form.coverImage) fd.append("cover_image", form.coverImage);

      if (catalogId) {
        fd.append("_method", "PUT");
        await api.post(`/admin/catalogs/${catalogId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Info dasar lookbook berhasil disimpan");
      } else {
        const { data } = await api.post("/admin/catalogs", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Lookbook dibuat! Sekarang tambahkan foto scene & hotspot.");
        navigate(`/admin/catalogs/${data.id}/edit`, { replace: true });
        setActiveTab("gallery");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? "Gagal menyimpan lookbook";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const activeSceneImage = scenes.find((s) => s.scene_key === currentScene)?.image;
  const activeSceneImageUrl = activeSceneImage ? imgUrl(activeSceneImage) : "";

  if (loading) return <TableSkeleton rows={6} cols={2} />;
  if (error && !form.title && catalogId) {
    return <ErrorState title="Lookbook tidak dapat dimuat" description={error} onRetry={() => navigate(0)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lookbook Hotspot"
        title={catalogId ? form.title || "Edit Lookbook" : "Buat Lookbook Baru"}
        description="Ikuti 3 langkah: 1) Isi info dasar & cover, 2) Unggah foto ruangan (scene), 3) Pasang titik hotspot produk."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/catalogs"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DACF] bg-white px-4 py-2 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
            >
              <ArrowLeft size={14} /> Kembali ke Daftar
            </Link>
            {catalogId && form.slug && (
              <a
                href={`/catalog/${form.category}/${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#5E93B8]/35 bg-[#EDF4F8] px-4 py-2 text-xs font-medium text-[#35678B] hover:bg-[#DFECF4]"
              >
                Lihat Halaman Publik <ExternalLink size={13} />
              </a>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#EAE4DA] pb-3">
        {(
          [
            { key: "basic", label: "1. Info Dasar & Cover" },
            { key: "gallery", label: `2. Foto Ruangan / Scene (${scenes.length})` },
            { key: "hotspots", label: `3. Titik Hotspot & Susunan Produk (${hotspots.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === t.key
                ? "border-[#232528] bg-[#232528] text-white"
                : "border-[#E2DACF] bg-white text-[#656B73] hover:border-[#5E93B8] hover:text-[#232528]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: BASIC INFO (HANYA tab ini yang punya <form> agar hotspot tidak pernah memicu submit!) */}
      {activeTab === "basic" && (
        <form onSubmit={handleSubmitBasic} className="space-y-6 rounded-2xl border border-[#EAE4DA] bg-white p-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-[#232528]">Judul Lookbook *</span>
              <input
                type="text"
                value={form.title}
                onChange={handleTitleChange}
                placeholder="mis. Serenity Living"
                required
                disabled={!editable}
                className="mt-1.5 h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#232528]">Slug URL (otomatis dari judul)</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^\w-]/g, ""),
                  }))
                }
                placeholder="serenity-living"
                disabled={!editable}
                className="mt-1.5 h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#232528]">Kategori Ruangan *</span>
              <select
                value={form.category}
                disabled={!editable}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as CatalogCategory }))}
                className="mt-1.5 h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
              >
                {CATALOG_CATEGORIES.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#232528]">Gaya Desain (Style) *</span>
              <select
                value={form.taxonomy}
                disabled={!editable}
                onChange={(e) => setForm((prev) => ({ ...prev, taxonomy: e.target.value }))}
                className="mt-1.5 h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
              >
                {VALID_STYLES.map((tax) => (
                  <option key={tax} value={tax}>
                    {tax}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-[#232528]">Tagline (Subjudul Hero)</span>
              <input
                type="text"
                value={form.tagline}
                disabled={!editable}
                onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))}
                placeholder="mis. Ketenangan ruang modern"
                className="mt-1.5 h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#232528]">Judul Bagian Cerita (About)</span>
              <input
                type="text"
                value={form.aboutTitle}
                disabled={!editable}
                onChange={(e) => setForm((prev) => ({ ...prev, aboutTitle: e.target.value }))}
                placeholder="mis. Ruang tenang untuk berkumpul"
                className="mt-1.5 h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-[#232528]">Deskripsi Lengkap *</span>
            <textarea
              value={form.description}
              disabled={!editable}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ceritakan konsep ruangan, material, dan nuansa lookbook ini…"
              required
              rows={4}
              className="mt-1.5 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] p-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
            />
          </label>

          {/* Cover Image */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-[#232528]">Foto Cover Lookbook</span>
            <div className="rounded-xl border-2 border-dashed border-[#DCD5CA] bg-[#FAF8F4]/70 p-6 text-center transition-colors hover:border-[#5E93B8]">
              {(coverPreviewUrl || form.coverImageUrl) && (
                <img
                  src={coverPreviewUrl || form.coverImageUrl}
                  alt="Cover lookbook"
                  className="mx-auto mb-4 max-h-44 rounded-lg border border-[#EAE4DA] object-cover"
                />
              )}
              {editable && (
                <button
                  type="button"
                  onClick={() => coverImageInputRef.current?.click()}
                  className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#DCD5CA] bg-white px-4 py-2 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
                >
                  <Upload size={14} className="text-[#5E93B8]" />
                  {coverPreviewUrl || form.coverImageUrl ? "Ganti Foto Cover" : "Pilih Foto Cover"}
                </button>
              )}
              <p className="mt-2 text-[11px] text-[#656B73]">Format JPG, PNG, atau WebP • Maks. 5 MB</p>
              <input
                ref={coverImageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  if (f) setForm((prev) => ({ ...prev, coverImage: f }));
                }}
                className="hidden"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.featured}
              disabled={!editable}
              onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))}
              className="h-4 w-4 accent-[#5E93B8]"
            />
            <span className="text-sm text-[#4C5259]">Tandai sebagai Lookbook Unggulan di halaman Katalog</span>
          </label>

          {catalogId ? (
            <div className="border-t border-[#F0EAE0] pt-4">
              <TranslationPanel type="catalog" id={catalogId} />
            </div>
          ) : null}

          {editable && (
            <div className="flex flex-wrap items-center gap-3 border-t border-[#EAE4DA] pt-5">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#232528] px-6 py-2.5 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
              >
                <Save size={14} />
                {submitting ? "Menyimpan…" : catalogId ? "Simpan Info Dasar" : "Buat Lookbook & Lanjut"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/catalogs")}
                className="rounded-full border border-[#E2DACF] px-5 py-2.5 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4]"
              >
                Kembali
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 2: GALLERY & SCENES (Auto-save per aksi) */}
      {activeTab === "gallery" && (
        <div className="space-y-5 rounded-2xl border border-[#EAE4DA] bg-white p-6">
          {!catalogId ? (
            <AdminHelpBanner tone="amber" title="Simpan Info Dasar Terlebih Dahulu">
              Silakan lengkapi dan simpan tab <strong>1. Info Dasar &amp; Cover</strong> dulu sebelum mengunggah foto
              ruangan (scene).
            </AdminHelpBanner>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-header text-xl text-[#232528]">Foto Ruangan / Scene ({scenes.length})</h2>
                  <p className="mt-0.5 text-xs text-[#656B73]">
                    Setiap foto scene langsung tersimpan ke server dan dapat dipasangi titik hotspot produk serta tampil
                    di PDF lookbook.
                  </p>
                </div>
                {editable && (
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white hover:bg-[#34383D]">
                    <Plus size={14} />
                    {sceneUploading ? "Mengunggah…" : "Tambah Foto Scene"}
                    <input
                      ref={sceneAddInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={sceneUploading}
                      onChange={(e) => e.target.files?.[0] && void handleAddScene(e.target.files[0])}
                    />
                  </label>
                )}
              </div>

              {scenesLoading ? (
                <TableSkeleton rows={3} cols={3} />
              ) : scenes.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D8D1C6] py-12 text-center">
                  <ImageIcon className="h-7 w-7 text-[#5E93B8]/60" />
                  <p className="mt-2 text-sm font-medium text-[#232528]">Belum ada foto ruangan</p>
                  <p className="mt-1 text-xs text-[#656B73]">
                    Klik <strong>Tambah Foto Scene</strong> di atas untuk mulai mengunggah.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scenes.map((scene, i) => (
                    <div
                      key={scene.id}
                      className="flex flex-wrap items-center gap-4 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/50 p-3"
                    >
                      {editable && (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => void moveScene(i, -1)}
                            disabled={i === 0}
                            aria-label="Naikkan urutan"
                            className="rounded border border-[#E2DACF] bg-white p-1 text-[#232528] hover:border-[#5E93B8] disabled:opacity-30"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void moveScene(i, 1)}
                            disabled={i === scenes.length - 1}
                            aria-label="Turunkan urutan"
                            className="rounded border border-[#E2DACF] bg-white p-1 text-[#232528] hover:border-[#5E93B8] disabled:opacity-30"
                          >
                            <ArrowDown size={13} />
                          </button>
                        </div>
                      )}

                      <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-[#E6DFD4] bg-white">
                        {scene.image && (
                          <img src={imgUrl(scene.image)} alt={scene.scene_key} className="h-full w-full object-cover" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#232528]">Scene {i + 1}</p>
                        <p className="text-xs text-[#656B73]">
                          {hotspots.filter((h) => h.scene_number === scene.scene_key).length} titik hotspot terpasang
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentScene(scene.scene_key);
                            setActiveTab("hotspots");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#5E93B8]/35 bg-[#EDF4F8] px-3 py-1.5 text-xs font-medium text-[#35678B] hover:bg-[#DFECF4]"
                        >
                          <Target size={13} /> Atur Hotspot
                        </button>
                        {editable && (
                          <>
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E2DACF] bg-white px-3 py-1.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8]">
                              <Upload size={12} /> Ganti Foto
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && void handleReplaceSceneImage(scene, e.target.files[0])}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => void handleDeleteScene(scene)}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                              title="Hapus scene"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 3: HOTSPOTS & ITEMS GRID (Auto-save per aksi, di luar <form>!) */}
      {activeTab === "hotspots" && (
        <div className="space-y-6">
          {!catalogId ? (
            <AdminHelpBanner tone="amber" title="Simpan Info Dasar Terlebih Dahulu">
              Simpan info dasar lookbook dan unggah minimal satu foto scene sebelum memasang titik hotspot.
            </AdminHelpBanner>
          ) : scenes.length === 0 ? (
            <AdminHelpBanner tone="amber" title="Belum Ada Foto Scene">
              Unggah minimal satu foto ruangan di tab <strong>2. Foto Ruangan / Scene</strong> sebelum memasang hotspot.
            </AdminHelpBanner>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {scenes.map((scene, i) => {
                  const count = hotspots.filter((h) => h.scene_number === scene.scene_key).length;
                  return (
                    <button
                      key={scene.scene_key}
                      type="button"
                      onClick={() => setCurrentScene(scene.scene_key)}
                      className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                        currentScene === scene.scene_key
                          ? "border-[#232528] bg-[#232528] text-white"
                          : "border-[#E2DACF] bg-white text-[#656B73] hover:border-[#5E93B8]"
                      }`}
                    >
                      Scene {i + 1} ({count})
                    </button>
                  );
                })}
              </div>

              <HotspotVisualEditor
                catalogId={catalogId}
                sceneNumber={currentScene}
                sceneImage={activeSceneImageUrl}
                hotspots={hotspots.filter((h) => h.scene_number === currentScene)}
                onHotspotAdd={(h) => setHotspots((prev) => [...prev, h])}
                onHotspotUpdate={(id, h) => setHotspots((prev) => prev.map((x) => (x.id === id ? { ...h, id } : x)))}
                onHotspotDelete={(id) => setHotspots((prev) => prev.filter((x) => x.id !== id))}
              />

              <div className="rounded-2xl border border-[#EAE4DA] bg-white p-6">
                <ItemsGridEditor catalogId={catalogId} hotspots={hotspots} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
