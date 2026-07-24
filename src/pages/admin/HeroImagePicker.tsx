import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Search, Upload, X, ImageOff } from "lucide-react";

export type CatalogImage = {
  id: number;
  url: string;
  thumbnailUrl?: string;
  label: string; // e.g. "Serenade Orange — Main Room"
  category: string; // e.g. "room" | "product" | "detail"
  roomName?: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (image: { url: string; alt: string }) => void;
}

/**
 * NOTE ON BACKEND ENDPOINTS (assumed — please confirm/adjust):
 *  - GET  /admin/catalog/images?search=&category=   -> { images: CatalogImage[] }
 *  - POST /admin/marketing/upload-image  (multipart/form-data, field "file")
 *         -> { url: string }
 * These should reuse whatever storage system already serves catalog images today.
 */
export default function HeroImagePicker({ open, onClose, onSelect }: Props) {
  const [tab, setTab] = useState<"catalog" | "upload">("catalog");
  const [images, setImages] = useState<CatalogImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || tab !== "catalog") return;
    setLoading(true);
    api
      .get("/admin/catalog/images", {
        params: { search: search || undefined, category: category !== "all" ? category : undefined },
      })
      .then((r) => setImages(r.data.images || []))
      .finally(() => setLoading(false));
  }, [open, tab, search, category]);

  const categories = useMemo(() => {
    const set = new Set(images.map((i) => i.category));
    return ["all", ...Array.from(set)];
  }, [images]);

  if (!open) return null;

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/admin/marketing/upload-image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSelect({ url: data.url, alt: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") });
      onClose();
    } catch (e: any) {
      setUploadError(e?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="serif text-xl">Select Hero Image</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1 px-5 pt-4 text-xs uppercase tracking-[0.2em]">
          <button
            onClick={() => setTab("catalog")}
            className={`px-4 py-2 border-b-2 ${tab === "catalog" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            Catalog
          </button>
          <button
            onClick={() => setTab("upload")}
            className={`px-4 py-2 border-b-2 ${tab === "upload" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            Upload New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "catalog" ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search catalog images"
                    className="w-full pl-9 pr-3 py-2 border border-border rounded bg-background text-sm"
                  />
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="border border-border rounded bg-background text-sm px-3 py-2 capitalize"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground">Loading catalog images...</p>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                  <ImageOff size={22} />
                  <p className="text-sm">No catalog images found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {images.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => onSelect({ url: img.url, alt: img.label })}
                      className="group text-left"
                    >
                      <div className="aspect-[4/3] overflow-hidden rounded border border-border bg-background">
                        <img
                          src={img.thumbnailUrl || img.url}
                          alt={img.label}
                          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground truncate">{img.label}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <label className="flex flex-col items-center justify-center gap-3 border border-dashed border-border rounded-lg py-16 cursor-pointer hover:border-foreground/40 transition-colors">
              <Upload size={22} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {uploading ? "Uploading..." : "Click to upload a campaign image"}
              </span>
              {uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}