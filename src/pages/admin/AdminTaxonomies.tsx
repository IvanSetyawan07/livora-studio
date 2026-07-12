import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getAllBanners, getBanners, addBanner, removeBannerAt, updateBannerAt,
  subscribeBanners,
} from "@/lib/themeBanners";
import {
  getAllThumbnails, saveThumbnail, deleteThumbnail,
  subscribeThumbnails,
} from "@/lib/themeThumbnails";
import {
  uploadTaxonomyImage, uploadTaxonomyBlob, deleteTaxonomyImage,
  validateImageFile, isBase64Image, base64ToBlob,
} from "@/lib/taxonomyStorage";

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
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setBusy = (k: string, v: boolean) =>
    setUploading((prev) => ({ ...prev, [k]: v }));

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

  // Migrasi otomatis: base64 lama -> Supabase Storage.
  // Aman: upload dulu; hanya replace reference kalau upload sukses.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const allThumbs = await getAllThumbnails();
      const allBanners = getAllBanners(); // {key: first banner}
      const fullBanners = (await import("@/lib/themeBanners")).getAllBannersList();

      let migrated = 0;
      const failed: string[] = [];

      // Thumbnails
      for (const [key, t] of Object.entries(allThumbs)) {
        if (cancelled) return;
        if (isBase64Image(t?.image) && !t?.path) {
          try {
            const blob = await base64ToBlob(t.image);
            const ct = blob.type || "image/jpeg";
            const { url, path } = await uploadTaxonomyBlob("thumbnail", key, blob, ct);
            await saveThumbnail(key, { image: url, path, updatedAt: Date.now() });
            migrated++;
          } catch (e) {
            console.error("Migrasi thumbnail gagal:", key, e);
            failed.push(`thumbnail:${key}`);
          }
        }
      }

      // Banners (per key, per index)
      for (const [key, list] of Object.entries(fullBanners)) {
        for (let i = 0; i < list.length; i++) {
          if (cancelled) return;
          const b = list[i];
          if (isBase64Image(b?.image) && !b?.path) {
            try {
              const blob = await base64ToBlob(b.image);
              const ct = blob.type || "image/jpeg";
              const { url, path } = await uploadTaxonomyBlob("banner", key, blob, ct);
              updateBannerAt(key, i, { image: url, path });
              migrated++;
            } catch (e) {
              console.error("Migrasi banner gagal:", key, i, e);
              failed.push(`banner:${key}#${i + 1}`);
            }
          }
        }
      }

      if (!cancelled && migrated > 0) {
        toast.success(`Migrasi selesai: ${migrated} gambar dipindahkan ke storage.`);
        getAllThumbnails().then(setThumbnails);
        setBanners(getAllBanners());
      }
      if (!cancelled && failed.length > 0) {
        toast.error(`Gagal migrasi: ${failed.join(", ")} (data lama TIDAK dihapus).`);
      }
    })();
    return () => { cancelled = true; };
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

  // Upload thumbnail (kartu depan) — upload baru dulu, hapus lama setelah sukses.
  const handleThumbnailUpload = async (key: string, file: File | null) => {
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { toast.error(err); return; }
    const busyKey = `thumb:${key}`;
    setBusy(busyKey, true);
    try {
      const prev = (await getAllThumbnails())[key];
      const { url, path } = await uploadTaxonomyImage("thumbnail", key, file);
      await saveThumbnail(key, { image: url, path, updatedAt: Date.now() });
      if (prev?.path && prev.path !== path) {
        deleteTaxonomyImage(prev.path).catch(() => {});
      }
      getAllThumbnails().then(setThumbnails);
      toast.success(`Thumbnail ${key} disimpan`);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err instanceof Error ? err.message : "Gagal mengupload thumbnail");
    } finally {
      setBusy(busyKey, false);
    }
  };

  // Upload banner (dalam kategori) — tambah baru; tidak perlu hapus yang lama.
  const handleBannerUpload = async (key: string, file: File | null) => {
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { toast.error(err); return; }
    const busyKey = `banner:${key}`;
    setBusy(busyKey, true);
    try {
      const { url, path } = await uploadTaxonomyImage("banner", key, file);
      addBanner(key, { image: url, path, title: "", updatedAt: Date.now() });
      setBanners(getAllBanners());
      toast.success(`Banner ${key} ditambahkan`);
    } catch (err) {
      console.error("Banner upload error:", err);
      toast.error(err instanceof Error ? err.message : "Gagal mengupload banner");
    } finally {
      setBusy(busyKey, false);
    }
  };

  const handleThumbnailDelete = async (key: string) => {
    if (!confirm(`Hapus thumbnail ${key}?`)) return;
    const prev = (await getAllThumbnails())[key];
    await deleteThumbnail(key);
    if (prev?.path) deleteTaxonomyImage(prev.path).catch(() => {});
    getAllThumbnails().then(setThumbnails);
    toast.success(`Thumbnail ${key} dihapus`);
  };

  const handleBannerDelete = async (key: string, index: number) => {
    if (!confirm(`Hapus banner #${index + 1} pada ${key}?`)) return;
    const list = getBanners(key);
    const target = list[index];
    removeBannerAt(key, index);
    if (target?.path) deleteTaxonomyImage(target.path).catch(() => {});
    setBanners(getAllBanners());
    toast.success(`Banner ${key} #${index + 1} dihapus`);
  };

  const FurnitureRow = ({ bannerKey }: { bannerKey: string }) => {
    const thumb = thumbnails[bannerKey];
    const bannerList = getBanners(bannerKey);
    const thumbBusy = !!uploading[`thumb:${bannerKey}`];
    const bannerBusy = !!uploading[`banner:${bannerKey}`];

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
            <label className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 border border-border rounded transition-colors ${thumbBusy ? "opacity-60 cursor-wait" : "cursor-pointer hover:bg-muted"}`}>
              {thumbBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              {thumbBusy ? "Mengupload..." : (thumb ? "Ganti" : "Upload")}
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                disabled={thumbBusy}
                onChange={(e) => {
                  handleThumbnailUpload(bannerKey, e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </label>
            {thumb && !thumbBusy && (
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