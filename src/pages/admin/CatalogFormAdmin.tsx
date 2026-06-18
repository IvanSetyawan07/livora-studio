// components/admin/CatalogFormAdmin.tsx

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { HotspotVisualEditor } from "./HotspotVisualEditor";
import {
  CATALOG_CATEGORIES,
  CATALOG_TAXONOMIES,
  CatalogCategory,
  CatalogItem,
} from "@/types/catalog";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface HotspotItem {
  id?: string;
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
  description: string;
  featured: boolean;
  coverImage: File | null;
  coverImageUrl?: string;
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function CatalogFormAdmin() {
  const { id: catalogId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  // ── Form state
  const [form, setForm] = useState<FormData>({
    title: "",
    slug: "",
    category: "living-rooms",
    taxonomy: "Modern",
    description: "",
    featured: false,
    coverImage: null,
  });

  // ── Scene images & hotspots
  const [sceneImages, setSceneImages] = useState<{ [key: string]: File | string }>({
    "scene-1": "",
    "scene-2": "",
  });

  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  const [currentScene, setCurrentScene] = useState<"scene-1" | "scene-2">("scene-1");

  // ── UI state
  const [loading, setLoading] = useState(!!catalogId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "gallery" | "hotspots">("basic");

  // ── Refs
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  // FIX 1: Pisahkan ref per-scene, bukan satu ref untuk dua scene
  const scene1Ref = useRef<HTMLInputElement>(null);
  const scene2Ref = useRef<HTMLInputElement>(null);
  const sceneRefs: Record<string, React.RefObject<HTMLInputElement>> = {
    "scene-1": scene1Ref,
    "scene-2": scene2Ref,
  };

  // ── Fetch existing catalog (mode edit)
  useEffect(() => {
    if (!catalogId) {
      setLoading(false);
      return;
    }

    const fetchCatalog = async () => {
      try {
        const { data } = await api.get<CatalogItem>(`/admin/catalogs/${catalogId}`);
        setForm({
          title: data.title,
          slug: data.slug,
          category: data.category,
          taxonomy: data.taxonomy,
          description: data.description,
          featured: data.featured || false,
          coverImage: null,
          coverImageUrl: data.coverImage,
        });

        const sceneUrls: { [key: string]: string } = {};
        const allHotspots: HotspotItem[] = [];

        for (const scene of ["scene-1", "scene-2"]) {
          try {
            sceneUrls[scene] = `/catalog/${data.slug}/${scene}.jpg`;
            const { data: hotspotsData } = await api.get<HotspotItem[]>(
              `/admin/catalogs/${catalogId}/hotspots/${scene}`
            );
            allHotspots.push(...hotspotsData);
          } catch (err) {
            console.error(`Failed to fetch ${scene}:`, err);
          }
        }

        setSceneImages(sceneUrls);
        setHotspots(allHotspots);
      } catch (err) {
        setError(`Failed to load catalog: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [catalogId]);

  // ── Auto-generate slug
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setForm((prev) => ({
      ...prev,
      title,
      // FIX 2: Mode edit jangan timpa slug yang sudah ada
      slug: catalogId
        ? prev.slug
        : title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""),
    }));
  };

  // ── Handle cover image
  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) setForm((prev) => ({ ...prev, coverImage: file }));
  };

  // ── Handle scene image
  const handleSceneImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    scene: string
  ) => {
    const file = e.currentTarget.files?.[0];
    if (file) setSceneImages((prev) => ({ ...prev, [scene]: file }));
  };

  // ── Hotspot handlers
  const handleHotspotAdd = (hotspot: HotspotItem) => {
    setHotspots((prev) => [...prev, hotspot]);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const handleHotspotUpdate = (id: string, hotspot: HotspotItem) =>
    setHotspots((prev) => prev.map((h) => (h.id === id ? { ...hotspot, id } : h)));

  const handleHotspotDelete = (id: string) =>
    setHotspots((prev) => prev.filter((h) => h.id !== id));

  // ── Submit
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
      fd.append("description", form.description);
      fd.append("featured", form.featured ? "1" : "0");

      if (form.coverImage) fd.append("cover_image", form.coverImage);

      Object.entries(sceneImages).forEach(([scene, image]) => {
        if (image instanceof File) fd.append(`${scene}_image`, image);
      });

      fd.append("hotspots", JSON.stringify(hotspots));

      if (catalogId) {
        await api.put(`/admin/catalogs/${catalogId}`, fd, {
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
      setError(err?.response?.data?.message ?? `Error: ${err}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helper: URL preview untuk scene tertentu
  // FIX 3: Fungsi ini dipanggil per-scene, bukan satu nilai global
  const getSceneUrl = (scene: string): string => {
    const val = sceneImages[scene];
    if (!val) return "";
    if (val instanceof File) return URL.createObjectURL(val);
    return val;
  };

  // sceneImageUrl tetap ada untuk dikirim ke HotspotVisualEditor (pakai currentScene)
  const sceneImageUrl = getSceneUrl(currentScene);

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

        {/* ── Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="serif text-4xl">
            {catalogId ? "Edit Catalog" : "Create Catalog"}
          </h1>
          <button
            type="button"
            onClick={() => navigate("/admin/catalogs")}
            className="p-2 hover:bg-secondary rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Status Messages */}
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

        {/* ── Tabs */}
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

        {/* ════════════════════════════════════════
            TAB 1 — BASIC INFO
        ════════════════════════════════════════ */}
        {activeTab === "basic" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={handleTitleChange}
                  placeholder="e.g., Serenity Suite"
                  required
                  className="w-full border border-border bg-card text-foreground p-3 rounded focus:ring-2 focus:ring-foreground/50 outline-none"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Slug (auto-generated)
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""),
                    }))
                  }
                  placeholder="serenity-suite"
                  className="w-full border border-border bg-card text-foreground p-3 rounded focus:ring-2 focus:ring-foreground/50 outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, category: e.target.value as CatalogCategory }))
                  }
                  className="w-full border border-border bg-card text-foreground p-3 rounded focus:ring-2 focus:ring-foreground/50 outline-none"
                >
                  {CATALOG_CATEGORIES.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Taxonomy */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Taxonomy (Style) *
                </label>
                <select
                  value={form.taxonomy}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, taxonomy: e.target.value }))
                  }
                  className="w-full border border-border bg-card text-foreground p-3 rounded focus:ring-2 focus:ring-foreground/50 outline-none"
                >
                  {CATALOG_TAXONOMIES.map((tax) => (
                    <option key={tax} value={tax}>
                      {tax}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description *
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Detailed description of this catalog..."
                required
                className="w-full border border-border bg-card text-foreground p-3 rounded focus:ring-2 focus:ring-foreground/50 outline-none h-28 resize-none"
              />
            </div>

            {/* Featured toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="featured"
                checked={form.featured}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, featured: e.target.checked }))
                }
                className="w-4 h-4"
              />
              <label htmlFor="featured" className="text-sm text-muted-foreground cursor-pointer">
                Featured in homepage
              </label>
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Cover Image
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-foreground/50 transition-colors">
                {form.coverImageUrl && !form.coverImage && (
                  <div className="mb-4">
                    <img src={form.coverImageUrl} alt="Cover" className="max-h-32 mx-auto rounded" />
                  </div>
                )}
                {form.coverImage && (
                  <div className="mb-4">
                    <img
                      src={URL.createObjectURL(form.coverImage)}
                      alt="Cover preview"
                      className="max-h-32 mx-auto rounded"
                    />
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

        {/* ════════════════════════════════════════
            TAB 2 — GALLERY & SCENES
        ════════════════════════════════════════ */}
        {activeTab === "gallery" && (
          <div className="space-y-8">
            <p className="text-sm text-muted-foreground">
              Upload scene images (scene-1.jpg, scene-2.jpg) yang akan digunakan untuk
              hotspot positioning.
            </p>

            {(["scene-1", "scene-2"] as const).map((scene) => {
              // FIX 3: Hitung URL per-scene di dalam loop, bukan pakai sceneImageUrl global
              const url = getSceneUrl(scene);

              return (
                <div key={scene} className="border border-border rounded-lg p-6 space-y-4">
                  <h3 className="font-semibold capitalize">{scene.replace("-", " ")}</h3>

                  {/* Preview per-scene */}
                  <div className="aspect-video bg-secondary rounded overflow-hidden border border-border">
                    {url ? (
                      <img src={url} alt={scene} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        Belum ada gambar
                      </div>
                    )}
                  </div>

                  {/* FIX 1: Tombol pakai ref per-scene */}
                  <button
                    type="button"
                    onClick={() => sceneRefs[scene].current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded hover:border-foreground/50 transition-colors text-sm text-foreground"
                  >
                    <Upload size={16} /> Upload {scene.replace("-", " ")} Image
                  </button>

                  {/* FIX 1: Input file per-scene dengan ref masing-masing */}
                  <input
                    ref={sceneRefs[scene]}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSceneImageSelect(e, scene)}
                  />

                  {sceneImages[scene] && (
                    <div className="text-xs text-green-600">
                      ✅{" "}
                      {sceneImages[scene] instanceof File
                        ? "Siap diupload"
                        : "Loaded dari server"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 3 — HOTSPOTS
        ════════════════════════════════════════ */}
        {activeTab === "hotspots" && (
          <div className="space-y-6">
            {/* Scene Selector */}
            <div className="flex gap-2 border-b border-border pb-4">
              {(["scene-1", "scene-2"] as const).map((scene) => (
                <button
                  key={scene}
                  type="button"
                  onClick={() => setCurrentScene(scene)}
                  className={`px-4 py-2 text-sm transition-all ${
                    currentScene === scene
                      ? "bg-foreground text-background rounded"
                      : "border border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {scene.replace("scene-", "Scene ")}
                </button>
              ))}
            </div>

            {/* Hotspot Editor — sceneImageUrl sudah benar karena pakai currentScene */}
            <HotspotVisualEditor
              catalogId={catalogId || "new"}
              sceneNumber={currentScene}
              sceneImage={sceneImageUrl}
              hotspots={hotspots.filter((h) => h.scene_number === currentScene)}
              onHotspotAdd={handleHotspotAdd}
              onHotspotUpdate={handleHotspotUpdate}
              onHotspotDelete={handleHotspotDelete}
            />
          </div>
        )}

        {/* ── Submit Buttons */}
        <div className="flex gap-3 mt-12 pt-6 border-t border-border">
          <button
            type="submit"
            disabled={submitting}
            className={`px-8 py-3 text-sm font-medium rounded text-background ${
              submitting
                ? "bg-foreground/50 cursor-not-allowed"
                : "bg-foreground hover:bg-foreground/90"
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
