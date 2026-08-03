// components/admin/CatalogFormAdmin.tsx
// UPDATED: Dynamic scenes (CRUD) replacing fixed scene-1/scene-2

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Upload, Plus, Trash2, GripVertical } from "lucide-react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { toast } from "sonner";
import { HotspotVisualEditor } from "./HotspotVisualEditor";
import {
  getCatalogScenes,
  createCatalogScene,
  updateCatalogScene,
  deleteCatalogScene,
  reorderCatalogScenes,
} from "@/lib/catalogApi";
import { CatalogScene } from "@/types/catalog";
import {
  CATALOG_CATEGORIES,
  CATALOG_TAXONOMIES,
  CatalogCategory,
} from "@/types/catalog";

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

interface FormData {
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

export default function CatalogFormAdmin() {
  const { id: catalogId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    title: "",
    slug: "",
    category: "living-rooms",
    taxonomy: "Modern",
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
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "gallery" | "hotspots">("basic");

  const coverImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!catalogId) {
      setLoading(false);
      return;
    }

    const fetchCatalog = async () => {
      try {
        const { data: raw } = await api.get<any>(`/admin/catalogs/${catalogId}`);

        const BASE = (import.meta.env.VITE_API_URL as string | undefined)
          ?.replace(/\/api\/?$/, "") ?? "http://127.0.0.1:8000";

        const coverImageUrl = raw.cover_image
          ? `${BASE}/storage/${raw.cover_image}`
          : (raw.coverImage ?? "");

        setForm({
          title: raw.title,
          slug: raw.slug,
          category: raw.category,
          taxonomy: raw.taxonomy,
          tagline: raw.tagline ?? "",
          aboutTitle: raw.about_title ?? "",
          description: raw.description,
          featured: raw.featured || false,
          coverImage: null,
          coverImageUrl,
        });

        try {
          const { data: hotspotsData } = await api.get<HotspotItem[]>(
            `/admin/catalogs/${catalogId}/hotspots`
          );
          setHotspots(hotspotsData);
        } catch (err) {
          console.warn("Failed to fetch hotspots:", err);
          setHotspots([]);
        }
      } catch (err) {
        setError(`Failed to load catalog: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [catalogId]);

  const loadScenes = async () => {
    if (!catalogId) return;
    setScenesLoading(true);
    try {
      const data = await getCatalogScenes(catalogId);
      const sorted = data.sort((a, b) => a.order - b.order);
      setScenes(sorted);
      setCurrentScene((prev) =>
        sorted.find((s) => s.scene_key === prev) ? prev : (sorted[0]?.scene_key ?? "")
      );
    } catch (err) {
      console.warn("Failed to fetch scenes:", err);
      setScenes([]);
    } finally {
      setScenesLoading(false);
    }
  };

  useEffect(() => {
    if (catalogId) loadScenes();
  }, [catalogId]);

  const handleAddScene = async (file: File) => {
    if (!catalogId) return;
    setSceneUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      await createCatalogScene(catalogId, fd);
      toast.success("Scene added");
      await loadScenes();
    } catch (err) {
      toast.error("Failed to add scene");
    } finally {
      setSceneUploading(false);
      if (sceneAddInputRef.current) sceneAddInputRef.current.value = "";
    }
  };

  const handleReplaceSceneImage = async (scene: CatalogScene, file: File) => {
    if (!catalogId) return;
    const fd = new FormData();
    fd.append("image", file);
    try {
      await updateCatalogScene(catalogId, scene.id, fd);
      toast.success("Scene image updated");
      await loadScenes();
    } catch {
      toast.error("Failed to update scene");
    }
  };

  const handleDeleteScene = async (scene: CatalogScene) => {
    if (!catalogId) return;
    if (!confirm(`Delete this scene? Hotspots placed on it will also be removed.`)) return;
    try {
      await deleteCatalogScene(catalogId, scene.id);
      toast.success("Scene deleted");
      setHotspots((prev) => prev.filter((h) => h.scene_number !== scene.scene_key));
      await loadScenes();
    } catch {
      toast.error("Failed to delete scene");
    }
  };

  const moveScene = async (index: number, dir: -1 | 1) => {
    if (!catalogId) return;
    const next = [...scenes];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setScenes(next);
    try {
      await reorderCatalogScenes(
        catalogId,
        next.map((s, i) => ({ id: s.id, order: i + 1 }))
      );
    } catch {
      toast.error("Failed to reorder scenes");
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
        : title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""),
    }));
  };

  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) setForm((prev) => ({ ...prev, coverImage: file }));
  };

  const handleHotspotAdd = (hotspot: HotspotItem) => {
    setHotspots((prev) => [...prev, hotspot]);
  };

  const handleHotspotUpdate = (id: string | number, hotspot: HotspotItem) =>
    setHotspots((prev) => prev.map((h) => (h.id === id ? { ...hotspot, id } : h)));

  const handleHotspotDelete = (id: string | number) =>
    setHotspots((prev) => prev.filter((h) => h.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("slug", form.slug);
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
        setSuccess(true);
        setTimeout(() => navigate("/admin/catalogs"), 1500);
      } else {
        const { data } = await api.post("/admin/catalogs", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setSuccess(true);
        setTimeout(() => navigate(`/admin/catalogs/${data.id}/edit`), 1500);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? `Error: ${err}`;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const activeSceneImage = scenes.find((s) => s.scene_key === currentScene)?.image;
  const activeSceneImageUrl = activeSceneImage ? imgUrl(activeSceneImage) : "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <h1 className="serif text-4xl">
            {catalogId ? "Edit Catalog" : "Create Catalog"}
          </h1>
          <button type="button" onClick={() => navigate("/admin/catalogs")} className="p-2 hover:bg-secondary rounded">
            <X size={20} />
          </button>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 text-green-700 rounded text-sm">
            ✅ Berhasil! Redirecting...
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-700 rounded text-sm">
            ❌ {error}
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b border-border">
          {(["basic", "gallery", "hotspots"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-foreground border-b-2 border-foreground -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "basic" && "📋 Basic Info"}
              {tab === "gallery" && "🖼️ Gallery & Scenes"}
              {tab === "hotspots" && "🎯 Hotspots"}
            </button>
          ))}
        </div>

        {activeTab === "basic" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={handleTitleChange}
                  placeholder="e.g., Serenity"
                  required
                  className="w-full border border-border bg-card text-foreground p-3 rounded focus:ring-2 focus:ring-foreground/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Slug (auto-generated)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""),
                    }))
                  }
                  placeholder="serenity"
                  className="w-full border border-border bg-card text-foreground p-3 rounded focus:ring-2 focus:ring-foreground/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as CatalogCategory }))}
                  className="w-full border border-border bg-card text-foreground p-3 rounded focus:ring-2 focus:ring-foreground/50 outline-none"
                >
                  {CATALOG_CATEGORIES.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Taxonomy (Style) *</label>
                <select
                  value={form.taxonomy}
                  onChange={(e) => setForm((prev) => ({ ...prev, taxonomy: e.target.value }))}
                  className="w-full border border-border bg-card text-foreground p-3 rounded focus:ring-2 focus:ring-foreground/50 outline-none"
                >
                  {CATALOG_TAXONOMIES.map((tax) => (
                    <option key={tax} value={tax}>{tax}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tagline (Hero Subline)</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))}
                placeholder="e.g., The Quite of Silences"
                className="w-full border border-border bg-card text-foreground p-3 rounded focus:ring-2 focus:ring-foreground/50 outline-none"
              />
              <p className="text-xs text-muted-foreground mt-1">Short line displayed below the title in hero section</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">About Section Title</label>
              <input
                type="text"
                value={form.aboutTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, aboutTitle: e.target.value }))}
                placeholder="e.g., A space of calm"
                className="w-full border border-border bg-card text-foreground p-3 rounded focus:ring-2 focus:ring-foreground/50 outline-none"
              />
              <p className="text-xs text-muted-foreground mt-1">Short title displayed on the left in About section</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Description (Long Text) *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of this catalog..."
                required
                className="w-full border border-border bg-card text-foreground p-3 rounded focus:ring-2 focus:ring-foreground/50 outline-none h-28 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">Full text displayed on the right in About section</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="featured"
                checked={form.featured}
                onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="featured" className="text-sm text-muted-foreground cursor-pointer">
                Featured in homepage
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Cover Image</label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-foreground/50 transition-colors">
                {form.coverImageUrl && !form.coverImage && (
                  <div className="mb-4">
                    <img src={form.coverImageUrl} alt="Cover" className="max-h-32 mx-auto rounded" />
                  </div>
                )}
                {form.coverImage && (
                  <div className="mb-4">
                    <img src={URL.createObjectURL(form.coverImage)} alt="Cover preview" className="max-h-32 mx-auto rounded" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => coverImageInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 mx-auto text-sm text-foreground hover:text-foreground/80"
                >
                  <Upload size={16} /> Select Image
                </button>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG • Max 5MB</p>
                <input
                  ref={coverImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "gallery" && (
          <div className="space-y-6">
            {!catalogId ? (
              <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
                Simpan info dasar catalog terlebih dahulu (tab "Basic Info") sebelum
                menambahkan scene. Scene tersimpan langsung ke server per gambar,
                jadi butuh catalog yang sudah punya ID.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Scenes ({scenes.length})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scene dipakai untuk hotspot positioning di halaman publik & PDF.
                      Tambah, ganti, hapus, atau urutkan bebas — jumlahnya tidak dibatasi.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] border border-border px-3 py-2 cursor-pointer hover:bg-secondary transition-colors shrink-0">
                    {sceneUploading ? "Uploading…" : (<><Plus size={14} /> Add Scene</>)}
                    <input
                      ref={sceneAddInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={sceneUploading}
                      onChange={(e) => e.target.files?.[0] && handleAddScene(e.target.files[0])}
                    />
                  </label>
                </div>

                {scenesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading scenes…</p>
                ) : scenes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada scene — tambahkan lewat tombol "Add Scene" di atas.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {scenes.map((scene, i) => (
                      <div key={scene.id} className="flex items-center gap-4 border border-border rounded-lg p-3">
                        <div className="flex flex-col gap-1 text-muted-foreground">
                          <button type="button" onClick={() => moveScene(i, -1)} disabled={i === 0} className="disabled:opacity-30" title="Move up">
                            <GripVertical size={14} />
                          </button>
                        </div>
                        <div className="w-28 h-20 bg-secondary overflow-hidden rounded shrink-0">
                          {scene.image && (
                            <img src={imgUrl(scene.image)} alt={scene.scene_key} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Scene {i + 1}</p>
                          <p className="text-xs text-muted-foreground">{scene.scene_key}</p>
                        </div>
                        <label className="text-xs uppercase tracking-[0.15em] border border-border px-3 py-2 cursor-pointer hover:bg-secondary transition-colors inline-flex items-center gap-1.5 shrink-0">
                          <Upload size={12} /> Replace
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleReplaceSceneImage(scene, e.target.files[0])}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteScene(scene)}
                          className="text-destructive hover:text-destructive/70 p-2 shrink-0"
                          title="Delete scene"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "hotspots" && (
          <div className="space-y-6">
            {!catalogId ? (
              <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
                Simpan info dasar catalog dan tambahkan minimal satu scene
                terlebih dahulu sebelum menempatkan hotspot.
              </div>
            ) : scenes.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
                Belum ada scene. Tambahkan scene di tab "Gallery & Scenes" dulu
                sebelum menempatkan hotspot.
              </div>
            ) : (
              <>
                <div className="flex gap-2 border-b border-border pb-4 flex-wrap">
                  {scenes.map((scene, i) => (
                    <button
                      key={scene.scene_key}
                      type="button"
                      onClick={() => setCurrentScene(scene.scene_key)}
                      className={`px-4 py-2 text-sm transition-all ${
                        currentScene === scene.scene_key
                          ? "bg-foreground text-background rounded"
                          : "border border-border text-muted-foreground hover:border-foreground"
                      }`}
                    >
                      Scene {i + 1}
                    </button>
                  ))}
                </div>

                <HotspotVisualEditor
                  catalogId={catalogId}
                  sceneNumber={currentScene}
                  sceneImage={activeSceneImageUrl}
                  hotspots={hotspots.filter((h) => h.scene_number === currentScene)}
                  onHotspotAdd={handleHotspotAdd}
                  onHotspotUpdate={handleHotspotUpdate}
                  onHotspotDelete={handleHotspotDelete}
                />
              </>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-12 pt-6 border-t border-border">
          <button
            type="submit"
            disabled={submitting}
            className={`px-8 py-3 text-sm font-medium rounded text-background ${
              submitting ? "bg-foreground/50 cursor-not-allowed" : "bg-foreground hover:bg-foreground/90"
            } transition-colors`}
          >
            {submitting ? "Saving..." : catalogId ? "💾 Update Catalog" : "✨ Create Catalog"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/catalogs")}
            className="px-8 py-3 text-sm border border-border rounded hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </form>
  );
}