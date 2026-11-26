import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Plus, Trash2, ImagePlus, X, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  getAllBanners,
  getBanners,
  addBanner,
  removeBannerAt,
  updateBannerAt,
  subscribeBanners,
  ensureBannersLoaded,
} from "@/lib/themeBanners";
import {
  getAllThumbnails,
  saveThumbnail,
  deleteThumbnail,
  subscribeThumbnails,
} from "@/lib/themeThumbnails";
import {
  uploadTaxonomyImage,
  uploadTaxonomyBlob,
  deleteTaxonomyImage,
  validateImageFile,
  isBase64Image,
  base64ToBlob,
} from "@/lib/taxonomyStorage";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import {
  AdminHelpBanner,
  EmptyState,
  ErrorState,
  PageHeader,
  TableSkeleton,
  useAdminDialog,
} from "@/components/admin/kit";

const TABS = [
  {
    key: "furniture-types",
    label: "Jenis Furnitur (Galeri)",
    placeholder: "mis. Sofa, Dining Table, Lounge Chair",
    help: "Atur daftar jenis furnitur sekaligus foto kartu Permanent Gallery di Halaman Depan dan banner di dalam halaman kategori /furniture.",
  },
  {
    key: "scopes",
    label: "Scope Proyek",
    placeholder: "mis. Residential, Hospitality, Office",
    help: "Kategori cakupan proyek yang digunakan untuk mengelompokkan Portofolio Proyek di website.",
  },
  {
    key: "themes",
    label: "Tema Desain",
    placeholder: "mis. Modern European, Japandi, Contemporary",
    help: "Pilihan gaya/tema desain untuk mengelompokkan produk dan inspirasi interior.",
  },
  {
    key: "categories",
    label: "Kategori Produk",
    placeholder: "mis. Living Room, Bedroom, Outdoor",
    help: "Pengelompokan kategori ruangan/produk pada katalog furnitur Livora.",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminTaxonomies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dialog = useAdminDialog();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("catalog");

  const initialTab = (TABS.find((t) => t.key === searchParams.get("tab"))?.key ?? "furniture-types") as TabKey;
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const [, setBannersTick] = useState(() => getAllBanners());
  const [thumbnails, setThumbnails] = useState<Record<string, any>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const setBusy = (k: string, v: boolean) => setUploading((prev) => ({ ...prev, [k]: v }));

  // Sinkron query param ?tab= bila navigasi dari halaman lain
  useEffect(() => {
    const qTab = searchParams.get("tab");
    if (qTab && TABS.some((t) => t.key === qTab) && qTab !== tab) {
      setTab(qTab as TabKey);
    }
  }, [searchParams, tab]);

  const selectTab = (next: TabKey) => {
    setTab(next);
    setSearchParams({ tab: next }, { replace: true });
  };

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/taxonomies/${tab}`)
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch((err: any) => setError(err?.message || "Gagal memuat data kategori."))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void ensureBannersLoaded();
    return subscribeBanners(() => setBannersTick(getAllBanners()));
  }, []);

  useEffect(() => {
    getAllThumbnails().then(setThumbnails);
    return subscribeThumbnails(() => {
      getAllThumbnails().then(setThumbnails);
    });
  }, []);

  // Migrasi otomatis aman untuk gambar base64 lama -> storage server
  useEffect(() => {
    if (!editable) return;
    let cancelled = false;
    (async () => {
      const allThumbs = await getAllThumbnails();
      const fullBanners = (await import("@/lib/themeBanners")).getAllBannersList();
      let migrated = 0;

      for (const [key, t] of Object.entries(allThumbs)) {
        if (cancelled) return;
        if (isBase64Image(t?.image) && !t?.path) {
          try {
            const blob = await base64ToBlob(t.image);
            const ct = blob.type || "image/jpeg";
            const { url, path } = await uploadTaxonomyBlob("thumbnail", key, blob, ct);
            await saveThumbnail(key, { image: url, path, updatedAt: Date.now() });
            migrated++;
          } catch {
            /* biarkan data lama utuh */
          }
        }
      }

      for (const [key, list] of Object.entries(fullBanners)) {
        for (let i = 0; i < list.length; i++) {
          if (cancelled) return;
          const b = list[i];
          if (isBase64Image(b?.image) && !b?.path) {
            try {
              const blob = await base64ToBlob(b.image);
              const ct = blob.type || "image/jpeg";
              const { url, path } = await uploadTaxonomyBlob("banner", key, blob, ct);
              await updateBannerAt(key, i, { image: url, path });
              migrated++;
            } catch {
              /* biarkan data lama utuh */
            }
          }
        }
      }

      if (!cancelled && migrated > 0) {
        toast.success(`Migrasi selesai: ${migrated} gambar dipindahkan ke server.`);
        getAllThumbnails().then(setThumbnails);
        setBannersTick(getAllBanners());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editable]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editable || !name.trim()) return;
    setAdding(true);
    try {
      await api.post(`/admin/taxonomies/${tab}`, { name: name.trim() });
      setName("");
      toast.success("Kategori baru berhasil ditambahkan");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menambahkan kategori");
    } finally {
      setAdding(false);
    }
  };

  const rename = async (row: any) => {
    if (!editable) return;
    const nextName = await dialog.prompt({
      title: "Ubah Nama Kategori",
      label: "Nama baru",
      defaultValue: row.name,
      multiline: false,
      confirmLabel: "Simpan nama",
    });
    if (!nextName || nextName.trim() === row.name) return;
    try {
      await api.put(`/admin/taxonomies/${tab}/${row.id}`, { name: nextName.trim() });
      toast.success("Nama kategori diperbarui");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal mengubah nama");
    }
  };

  const del = async (row: any) => {
    if (!editable) return;
    const ok = await dialog.confirm({
      title: `Hapus "${row.name}"?`,
      text: "Produk atau proyek yang memakai kategori ini mungkin kehilangan label kategorinya.",
      confirmLabel: "Ya, hapus",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/taxonomies/${tab}/${row.id}`);
      toast.success(`"${row.name}" berhasil dihapus`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menghapus kategori");
    }
  };

  // Upload Thumbnail Kartu: simpan ke server DB (furniture_types.image) + sinkron local cache
  const handleThumbnailUpload = async (key: string, rowId: number | null, file: File | null) => {
    if (!editable || !file) return;
    const err = validateImageFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    const busyKey = `thumb:${key}`;
    setBusy(busyKey, true);
    try {
      const prev = (await getAllThumbnails())[key];
      const { url, path } = await uploadTaxonomyImage("thumbnail", key, file);

      // Persist ke database server agar tampil untuk SEMUA pengunjung website di semua perangkat
      if (rowId !== null) {
        await api.put(`/admin/taxonomies/furniture-types/${rowId}`, { image: url });
        setRows((prevRows) => prevRows.map((r) => (r.id === rowId ? { ...r, image: url } : r)));
      }

      await saveThumbnail(key, { image: url, path, updatedAt: Date.now() });
      if (prev?.path && prev.path !== path) {
        deleteTaxonomyImage(prev.path).catch(() => {});
      }
      getAllThumbnails().then(setThumbnails);
      toast.success(`Thumbnail "${key}" berhasil disimpan ke server`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Gagal mengunggah thumbnail");
    } finally {
      setBusy(busyKey, false);
    }
  };

  // Upload Banner Dalam Kategori: WAJIB await agar error server benar-benar muncul
  const handleBannerUpload = async (key: string, file: File | null) => {
    if (!editable || !file) return;
    const err = validateImageFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    const busyKey = `banner:${key}`;
    setBusy(busyKey, true);
    try {
      const { url, path } = await uploadTaxonomyImage("banner", key, file);
      await addBanner(key, { image: url, path, title: "", updatedAt: Date.now() });
      setBannersTick(getAllBanners());
      toast.success(`Banner "${key}" berhasil ditambahkan`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Gagal menyimpan banner ke server");
    } finally {
      setBusy(busyKey, false);
    }
  };

  const handleThumbnailDelete = async (key: string, rowId: number | null) => {
    if (!editable) return;
    const ok = await dialog.confirm({
      title: `Hapus thumbnail "${key}"?`,
      text: "Kartu kategori di website akan kembali ke gambar default sampai foto baru diunggah.",
      confirmLabel: "Ya, hapus",
      danger: true,
    });
    if (!ok) return;
    try {
      const prev = (await getAllThumbnails())[key];
      if (rowId !== null) {
        await api.put(`/admin/taxonomies/furniture-types/${rowId}`, { image: null });
        setRows((prevRows) => prevRows.map((r) => (r.id === rowId ? { ...r, image: null } : r)));
      }
      await deleteThumbnail(key);
      if (prev?.path) deleteTaxonomyImage(prev.path).catch(() => {});
      getAllThumbnails().then(setThumbnails);
      toast.success(`Thumbnail "${key}" dihapus`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menghapus thumbnail");
    }
  };

  const handleBannerDelete = async (key: string, index: number) => {
    if (!editable) return;
    const ok = await dialog.confirm({
      title: `Hapus banner #${index + 1} pada "${key}"?`,
      confirmLabel: "Ya, hapus",
      danger: true,
    });
    if (!ok) return;
    try {
      const list = getBanners(key);
      const target = list[index];
      await removeBannerAt(key, index);
      if (target?.path) deleteTaxonomyImage(target.path).catch(() => {});
      setBannersTick(getAllBanners());
      toast.success(`Banner #${index + 1} pada "${key}" dihapus`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menghapus banner");
    }
  };

  const activeTabMeta = TABS.find((t) => t.key === tab) ?? TABS[0];

  const FurnitureMediaRow = ({ bannerKey, rowId, apiImage }: { bannerKey: string; rowId: number | null; apiImage?: string | null }) => {
    const thumbUrl = apiImage || thumbnails[bannerKey]?.image || null;
    const bannerList = getBanners(bannerKey);
    const thumbBusy = !!uploading[`thumb:${bannerKey}`];
    const bannerBusy = !!uploading[`banner:${bannerKey}`];

    return (
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Thumbnail Kartu */}
        <div className="space-y-2.5 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/60 p-4">
          <div>
            <p className="text-xs font-semibold text-[#232528]">Thumbnail Kartu (Permanent Gallery &amp; Grid Kategori)</p>
            <p className="mt-0.5 text-[11px] text-[#656B73]">
              Tampil di bagian Permanent Gallery Halaman Depan dan kartu pilihan kategori di halaman Furnitur. Rasio disarankan 3:2 (JPG/PNG/WebP maks. 5 MB).
            </p>
          </div>
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={`Thumbnail ${bannerKey}`}
              className="w-full rounded-lg border border-[#E6DFD4] object-cover"
              style={{ aspectRatio: "31/20" }}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-lg border border-dashed border-[#D8D1C6] bg-white text-xs text-[#656B73]"
              style={{ aspectRatio: "31/20" }}
            >
              Belum ada foto thumbnail
            </div>
          )}
          {editable && (
            <div className="flex gap-2">
              <label
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#DCD5CA] bg-white py-2 text-xs font-medium text-[#232528] transition-colors ${
                  thumbBusy ? "cursor-wait opacity-60" : "cursor-pointer hover:border-[#5E93B8] hover:bg-[#EDF4F8]/50"
                }`}
              >
                {thumbBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#5E93B8]" /> : <ImagePlus className="h-3.5 w-3.5 text-[#5E93B8]" />}
                {thumbBusy ? "Mengunggah…" : thumbUrl ? "Ganti Thumbnail" : "Unggah Thumbnail"}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  disabled={thumbBusy}
                  onChange={(e) => {
                    void handleThumbnailUpload(bannerKey, rowId, e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </label>
              {thumbUrl && !thumbBusy && (
                <button
                  type="button"
                  onClick={() => void handleThumbnailDelete(bannerKey, rowId)}
                  aria-label={`Hapus thumbnail ${bannerKey}`}
                  className="rounded-lg border border-red-200 bg-white px-2.5 text-red-600 transition-colors hover:bg-red-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Banner Dalam Kategori */}
        <div className="space-y-2.5 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/60 p-4">
          <div>
            <p className="text-xs font-semibold text-[#232528]">Banner Dalam Halaman Kategori</p>
            <p className="mt-0.5 text-[11px] text-[#656B73]">
              Tampil berselang-seling (Kiri / Kanan setiap 3 baris produk) ketika pengunjung membuka kategori ini. Rasio lanskap 2:1 (maks. 5 MB).
            </p>
          </div>

          <div className="space-y-2">
            {bannerList.map((b, i) => {
              const side = i % 2 === 0 ? "Kiri" : "Kanan";
              return (
                <div key={b.id ?? i} className="relative overflow-hidden rounded-lg border border-[#E6DFD4] bg-white">
                  <img
                    src={b.image}
                    alt={`Banner ${bannerKey} #${i + 1}`}
                    className="w-full object-cover"
                    style={{ aspectRatio: "2/1" }}
                  />
                  <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-[#232528] shadow-sm">
                    Banner #{i + 1} · Posisi {side}
                  </div>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => void handleBannerDelete(bannerKey, i)}
                      aria-label={`Hapus banner #${i + 1}`}
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-red-600 shadow-sm transition-colors hover:bg-red-600 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            {bannerList.length === 0 && (
              <p className="rounded-lg border border-dashed border-[#D8D1C6] bg-white py-5 text-center text-xs text-[#656B73]">
                Belum ada banner sisipan untuk kategori ini.
              </p>
            )}
          </div>

          {editable && (
            <label
              className={`flex items-center justify-center gap-1.5 rounded-lg border border-[#DCD5CA] bg-white py-2 text-xs font-medium text-[#232528] transition-colors ${
                bannerBusy ? "cursor-wait opacity-60" : "cursor-pointer hover:border-[#5E93B8] hover:bg-[#EDF4F8]/50"
              }`}
            >
              {bannerBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#5E93B8]" /> : <ImagePlus className="h-3.5 w-3.5 text-[#5E93B8]" />}
              {bannerBusy
                ? "Mengunggah…"
                : bannerList.length === 0
                  ? "Unggah Banner Pertama"
                  : `Tambah Banner #${bannerList.length + 1}`}
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                disabled={bannerBusy}
                onChange={(e) => {
                  void handleBannerUpload(bannerKey, e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Katalog & Portofolio"
        title="Kategori & Foto Galeri"
        description="Kelola jenis furnitur, foto Permanent Gallery halaman depan, banner halaman kategori, scope proyek, dan tema desain."
      />

      <AdminHelpBanner title="Tampil di mana perubahan ini?" storageKey="taxonomies-help" link={{ label: "Atur bagian Halaman Depan lainnya", to: "/admin/landing" }}>
        {activeTabMeta.help} Semua foto yang diunggah di sini langsung tersimpan di server sehingga tampil konsisten di seluruh perangkat pelanggan.
      </AdminHelpBanner>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-[#EAE4DA] pb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => selectTab(t.key)}
            className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
              tab === t.key
                ? "border-[#232528] bg-[#232528] text-white"
                : "border-[#E2DACF] bg-white text-[#656B73] hover:border-[#5E93B8] hover:text-[#232528]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Add new taxonomy form */}
      {editable && (
        <form onSubmit={add} className="mb-6 flex flex-col gap-2 sm:flex-row">
          <input
            className="h-10 flex-1 rounded-lg border border-[#E2DACF] bg-white px-3.5 text-sm text-[#232528] outline-none placeholder:text-[#656B73]/70 focus:border-[#5E93B8] focus:ring-2 focus:ring-[#5E93B8]/15"
            placeholder={`Tambah ${activeTabMeta.label} baru (${activeTabMeta.placeholder})`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            disabled={adding || !name.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#232528] px-5 text-xs font-medium text-white transition-colors hover:bg-[#34383D] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {adding ? "Menambahkan…" : "Tambah"}
          </button>
        </form>
      )}

      {error ? (
        <ErrorState title="Gagal memuat kategori" description={error} onRetry={load} />
      ) : loading ? (
        <TableSkeleton rows={5} cols={3} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Belum ada data kategori"
          description={`Tambahkan ${activeTabMeta.label} pertama menggunakan kolom di atas.`}
        />
      ) : (
        <div className="divide-y divide-[#EFEAE2] rounded-2xl border border-[#EAE4DA] bg-white">
          {rows.map((r) => {
            const isFurnitureTab = tab === "furniture-types";
            return (
              <div key={r.id} className="p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <p className="font-header text-lg text-[#232528]">{r.name}</p>
                    <p className="text-xs text-[#656B73]">Slug URL: /{r.slug}</p>
                  </div>
                  {editable && (
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void rename(r)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2DACF] bg-white px-3 py-1.5 text-xs font-medium text-[#232528] transition-colors hover:border-[#5E93B8] hover:bg-[#EDF4F8]/50"
                      >
                        <Pencil className="h-3.5 w-3.5 text-[#5E93B8]" />
                        Ubah Nama
                      </button>
                      <button
                        type="button"
                        onClick={() => void del(r)}
                        aria-label={`Hapus ${r.name}`}
                        className="rounded-lg border border-transparent p-2 text-[#656B73] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {isFurnitureTab && <FurnitureMediaRow bannerKey={r.name} rowId={r.id} apiImage={r.image} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Kartu "All" — selalu tampil di tab furniture-types */}
      {tab === "furniture-types" && !loading && (
        <div className="mt-6 rounded-2xl border border-[#EAE4DA] bg-white p-5">
          <div className="mb-1">
            <p className="font-header text-lg text-[#232528]">All (Semua Furnitur)</p>
            <p className="text-xs text-[#656B73]">
              Foto thumbnail dan banner untuk tampilan seluruh produk furnitur tanpa filter kategori.
            </p>
          </div>
          <FurnitureMediaRow bannerKey="All" rowId={null} />
        </div>
      )}
    </div>
  );
}
