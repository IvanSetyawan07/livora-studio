import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload, ImagePlus } from "lucide-react";
import {
  ThemeBanner,
  getAllBanners,
  getBanner,
  saveBanner,
  deleteBanner,
  subscribeBanners,
  fileToDataUrl,
} from "@/lib/themeBanners";

export default function AdminBanners() {
  const [banners, setBanners] = useState(getAllBanners());

  useEffect(() => subscribeBanners(() => setBanners(getAllBanners())), []);

  const keys = Object.keys(banners); // ← dinamis dari localStorage

  const handleUpload = async (key: string, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Ukuran gambar maks 10MB"); return; }
    try {
      const dataUrl = await fileToDataUrl(file);
      const existing = getBanner(key);
      saveBanner(key, { image: dataUrl, title: existing?.title ?? "", updatedAt: Date.now() });
      toast.success(`Banner ${key} disimpan`);
    } catch {
      toast.error("Gagal membaca file");
    }
  };

  const handleTitleChange = (key: string, title: string) => {
    const existing = getBanner(key);
    if (!existing) return;
    saveBanner(key, { ...existing, title, updatedAt: Date.now() });
  };

  const handleDelete = (key: string) => {
    if (!confirm(`Hapus banner ${key}?`)) return;
    deleteBanner(key);
    toast.success(`Banner ${key} dihapus`);
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="serif text-3xl font-light">Theme Banners</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Kelola gambar banner besar yang muncul di tengah grid pada halaman
          Furniture. Banner dikelola di halaman Taxonomies → Furniture Types.
        </p>
      </div>

      {keys.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Belum ada banner. Upload banner melalui Taxonomies → Furniture Types.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {keys.map((key) => {
          const b: ThemeBanner | undefined = banners[key];
          return (
            <div key={key} className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <h3 className="font-medium">{key} Collection</h3>
                {b && (
                  <button
                    onClick={() => handleDelete(key)}
                    className="text-xs inline-flex items-center gap-1.5 text-destructive hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                )}
              </div>
              <div className="aspect-[4/3] bg-secondary/40 flex items-center justify-center relative">
                {b ? (
                  <img src={b.image} alt={`${key} banner`} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImagePlus className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Belum ada banner</p>
                  </div>
                )}
              </div>
              <div className="p-5 space-y-3">
                <input
                  type="text"
                  value={b?.title ?? ""}
                  onChange={(e) => handleTitleChange(key, e.target.value)}
                  disabled={!b}
                  placeholder="Judul opsional (mis. New Collection)"
                  className="w-full text-sm px-3 py-2 border border-input rounded bg-background disabled:opacity-50"
                />
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-input rounded cursor-pointer hover:bg-muted text-sm">
                  <Upload className="w-4 h-4" />
                  {b ? "Ganti gambar" : "Upload gambar"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(key, e.target.files?.[0] ?? null)}
                  />
                </label>
                {b?.updatedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Terakhir diubah: {new Date(b.updatedAt).toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}