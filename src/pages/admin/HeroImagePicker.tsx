import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Search, Upload, X, ImageOff, Loader2, RefreshCw } from "lucide-react";

export type CatalogImage = {
  id: number;
  url: string;
  thumbnailUrl?: string;
  label: string;
  category: string;
  roomName?: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (image: { url: string; alt: string }) => void;
}

const CATEGORY_OPTIONS = [
  { value: "all", label: "Semua Kategori" },
  { value: "product", label: "Produk Furnitur" },
  { value: "room", label: "Ruangan / Proyek" },
  { value: "promo", label: "Banner Promo" },
  { value: "uploaded", label: "Unggahan Campaign" },
];

export default function HeroImagePicker({ open, onClose, onSelect }: Props) {
  const [tab, setTab] = useState<"catalog" | "upload">("catalog");
  const [images, setImages] = useState<CatalogImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !uploading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, uploading, onClose]);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const r = await api.get("/admin/catalog/images", {
        params: {
          search: debouncedSearch || undefined,
          category: category !== "all" ? category : undefined,
        },
      });
      setImages(Array.isArray(r.data?.images) ? r.data.images : []);
    } catch (e: any) {
      setFetchError(e?.response?.data?.message || "Gagal memuat galeri katalog.");
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category]);

  useEffect(() => {
    if (!open || tab !== "catalog") return;
    loadImages();
  }, [open, tab, loadImages]);

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
      setUploadError(e?.response?.data?.message || "Gagal mengunggah gambar. Silakan coba lagi.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
      onClick={() => !uploading && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-[#EAE4DA] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DA] px-5 py-4">
          <h2 className="font-header text-xl text-[#232528]">Pilih Gambar Utama Email</h2>
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => !uploading && onClose()}
            className="rounded-lg p-1 text-[#656B73] hover:bg-[#FAF8F4] hover:text-[#232528]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-[#EAE4DA] px-5 pt-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab("catalog")}
            className={`border-b-2 px-3 py-2.5 transition-colors ${
              tab === "catalog"
                ? "border-[#5E93B8] text-[#232528]"
                : "border-transparent text-[#656B73] hover:text-[#232528]"
            }`}
          >
            Dari Katalog Livora
          </button>
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={`border-b-2 px-3 py-2.5 transition-colors ${
              tab === "upload"
                ? "border-[#5E93B8] text-[#232528]"
                : "border-transparent text-[#656B73] hover:text-[#232528]"
            }`}
          >
            Unggah Gambar Baru
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "catalog" ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#656B73]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama produk atau proyek..."
                    className="w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] py-2 pl-9 pr-3 text-sm text-[#232528] focus:border-[#5E93B8] focus:bg-white focus:outline-none"
                  />
                </div>
                <select
                  aria-label="Kategori gambar"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 py-2 text-sm text-[#232528] focus:border-[#5E93B8] focus:outline-none"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#656B73]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" /> Memuat gambar katalog...
                </div>
              ) : fetchError ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <p className="text-sm text-rose-600">{fetchError}</p>
                  <button
                    type="button"
                    onClick={loadImages}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAE4DA] px-3 py-1.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Coba Lagi
                  </button>
                </div>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-[#656B73]">
                  <ImageOff size={22} />
                  <p className="text-sm">Tidak ada gambar yang cocok.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {images.map((img) => (
                    <button
                      type="button"
                      key={img.id}
                      onClick={() => {
                        onSelect({ url: img.url, alt: img.label });
                        onClose();
                      }}
                      className="group text-left"
                    >
                      <div className="aspect-[4/3] overflow-hidden rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] transition-all group-hover:border-[#5E93B8]">
                        <img
                          src={img.thumbnailUrl || img.url}
                          alt={img.label}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <p className="mt-1.5 truncate text-xs text-[#232528]">{img.label}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#EAE4DA] bg-[#FAF8F4] py-16 transition-colors hover:border-[#5E93B8]">
              {uploading ? (
                <Loader2 size={22} className="animate-spin text-[#5E93B8]" />
              ) : (
                <Upload size={22} className="text-[#5E93B8]" />
              )}
              <span className="text-sm font-medium text-[#232528]">
                {uploading ? "Mengunggah gambar..." : "Klik untuk memilih gambar dari perangkat"}
              </span>
              <span className="text-xs text-[#656B73]">Format JPG, PNG, atau WEBP (maks. 8 MB)</span>
              {uploadError && <span className="text-xs text-rose-600">{uploadError}</span>}
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
