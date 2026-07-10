import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import {
  getAllBanners, getBanners, addBanner, removeBannerAt,
  subscribeBanners, compressImage,
} from "@/lib/themeBanners";
import {
  getAllThumbnails, getThumbnail, saveThumbnail, deleteThumbnail,
  subscribeThumbnails,
} from "@/lib/themeThumbnails";

const TABS = [
  { key: "scopes", label: "Scopes (Project)" },
  { key: "furniture-types", label: "Furniture Types" },
  { key: "themes", label: "Themes" },
  { key: "categories", label: "Categories" },
];

export default function AdminTaxonomies() {
  const [tab, setTab] = useState("scopes");
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [banners, setBanners] = useState(() => getAllBanners());
  const [thumbnails, setThumbnails] = useState<Record<string, any>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = () =>
    api.get(`/taxonomies/${tab}`).then((r) => setRows(r.data));

  useEffect(() => { load(); }, [tab]);
  useEffect(() => subscribeBanners(() => setBanners(getAllBanners())), []);
  
  // Load thumbnails awal
  useEffect(() => {
    getAllThumbnails().then(setThumbnails);
  }, []);

  // Subscribe thumbnails
  useEffect(() => {
    const unsub = subscribeThumbnails(() => {
      getAllThumbnails().then(setThumbnails);
    });
    return unsub;
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post(`/admin/taxonomies/${tab}`, { name });
    setName(""); load();
  };

  const rename = async (row: any) => {
    const n = prompt("Nama baru:", row.name);
    if (!n) return;
    await api.put(`/admin/taxonomies/${tab}/${row.id}`, { name: n });
    load();
  };

  const del = async (row: any) => {
    if (!confirm(`Hapus "${row.name}"?`)) return;
    await api.delete(`/admin/taxonomies/${tab}/${row.id}`);
    load();
  };

  // Upload thumbnail (kartu depan)
  const handleThumbnailUpload = async (key: string, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    
    try {
      const dataUrl = await fileToDataUrl(file);
      await saveThumbnail(key, { image: dataUrl, updatedAt: Date.now() });
      getAllThumbnails().then(setThumbnails);
      toast.success(`Thumbnail ${key} disimpan`);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Gagal membaca file: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Upload banner (dalam kategori)
  const handleBannerUpload = async (key: string, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    
    try {
      const dataUrl = await fileToDataUrl(file);
      await addBanner(key, { image: dataUrl, title: "", updatedAt: Date.now() });
      setBanners(getAllBanners());
      toast.success(`Banner ${key} ditambahkan`);
    } catch {
      toast.error("Gagal membaca file");
    }
  };

  const handleThumbnailDelete = async (key: string) => {
    if (!confirm(`Hapus thumbnail ${key}?`)) return;
    await deleteThumbnail(key);
    getAllThumbnails().then(setThumbnails);
    toast.success(`Thumbnail ${key} dihapus`);
  };

  const handleBannerDelete = async (key: string, index: number) => {
    if (!confirm(`Hapus banner #${index + 1} pada ${key}?`)) return;
    await removeBannerAt(key, index);
    setBanners(getAllBanners());
    toast.success(`Banner ${key} #${index + 1} dihapus`);
  };

  const FurnitureRow = ({ bannerKey }: { bannerKey: string }) => {
    const thumb = thumbnails[bannerKey];
    const bannerList = getBanners(bannerKey);

    return (
      <div className="mt-3 grid grid-cols-2 gap-4">
        {/* Thumbnail — kartu depan */}
        <div className="border border-border rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-foreground">
            Thumbnail Kartu
          </p>
          <p className="text-[11px] text-muted-foreground">
            Gambar yang tampil di grid kategori furniture
          </p>
          {thumb && (
            <img
              src={thumb.image}
              alt="thumbnail"
              className="w-full rounded border border-border"
              style={{ aspectRatio: "31/20", objectFit: "cover", objectPosition: "center" }}
            />
          )}
          <div className="flex gap-2">
            <label className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 border border-border rounded cursor-pointer hover:bg-muted transition-colors">
              <ImagePlus className="w-3.5 h-3.5" />
              {thumb ? "Ganti" : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  handleThumbnailUpload(bannerKey, e.target.files?.[0] ?? null)
                }
              />
            </label>
            {thumb && (
              <button
                onClick={() => handleThumbnailDelete(bannerKey)}
                className="px-2 text-destructive border border-destructive/30 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Banner — dalam kategori (multi, unlimited) */}
        <div className="border border-border rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-foreground">
            Banner Dalam Kategori
          </p>
          <p className="text-[11px] text-muted-foreground">
            Tambah banner tanpa batas. Pola: #1 kiri, #2 kanan, #3 kiri (selisih 3 baris furniture).
          </p>

          <div className="space-y-2">
            {bannerList.map((b, i) => {
              const side = i % 2 === 0 ? "Kiri" : "Kanan";
              return (
                <div key={i} className="relative border border-border rounded overflow-hidden">
                  <img
                    src={b.image}
                    alt={`banner-${i + 1}`}
                    className="w-full"
                    style={{ aspectRatio: "2/1", objectFit: "cover", objectPosition: "center" }}
                  />
                  <div className="absolute top-1 left-1 text-[10px] bg-background/85 px-1.5 py-0.5 rounded">
                    #{i + 1} · {side}
                  </div>
                  <button
                    onClick={() => handleBannerDelete(bannerKey, i)}
                    className="absolute top-1 right-1 p-1 bg-background/85 text-destructive border border-destructive/30 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          <label className="flex items-center justify-center gap-1.5 text-xs py-1.5 border border-border rounded cursor-pointer hover:bg-muted transition-colors">
            <ImagePlus className="w-3.5 h-3.5" />
            {bannerList.length === 0 ? "Upload Banner Pertama" : `Tambah Banner #${bannerList.length + 1}`}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleBannerUpload(bannerKey, e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    );
  };


  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Manage</p>
      <h1 className="serif text-4xl mb-8">Taxonomies</h1>

      <div className="flex gap-2 mb-6 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 ${
              tab === t.key ? "border-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={add} className="flex gap-2 mb-6">
        <input
          className="ui-input flex-1"
          placeholder={`Nama ${tab}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="flex items-center gap-2 bg-foreground text-background px-4 rounded text-sm">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {rows.map((r) => {
          const isFurnitureTab = tab === "furniture-types";
          return (
            <div key={r.id} className="p-4">
              <div className="flex items-center">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.slug}</p>
                </div>
                <div className="ml-auto flex gap-2 items-center">
                  <button
                    onClick={() => rename(r)}
                    className="text-xs px-3 py-1.5 border border-border rounded"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => del(r)}
                    className="p-2 hover:bg-destructive hover:text-destructive-foreground rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {isFurnitureTab && <FurnitureRow bannerKey={r.name} />}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Kosong.</p>
        )}
      </div>

      {/* "All" — selalu tampil di tab furniture-types */}
      {tab === "furniture-types" && (
        <div className="mt-6 p-4 border border-border rounded-lg bg-card">
          <div className="mb-3">
            <p className="font-medium">All</p>
            <p className="text-xs text-muted-foreground">Kategori "All" — semua furniture</p>
          </div>
          <FurnitureRow bannerKey="All" />
        </div>
      )}
    </div>
  );
}