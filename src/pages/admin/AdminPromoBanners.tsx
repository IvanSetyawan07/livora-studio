import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Eye,
  Upload,
  X,
  Tag,
  Sliders,
  Smartphone,
  Monitor,
  Move,
  RefreshCw,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  getAdminPromoBanners,
  createPromoBanner,
  updatePromoBanner,
  togglePromoBanner,
  deletePromoBanner,
  type PromoBanner,
} from "@/lib/promoApi";
import { imgUrl } from "@/lib/adminApi";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import {
  AdminHelpBanner,
  EmptyState,
  ErrorState,
  PageHeader,
  TableSkeleton,
  useAdminDialog,
} from "@/components/admin/kit";

const LINK_PRESETS = [
  { label: "Halaman Promo (/promo)", value: "/promo" },
  { label: "Katalog Furnitur (/furniture)", value: "/furniture" },
  { label: "Koleksi Furnitur (/collection)", value: "/collection" },
  { label: "Buat Janji Temu (/appointment)", value: "/appointment" },
  { label: "Portofolio Proyek (/projects)", value: "/projects" },
];

export default function AdminPromoBanners() {
  const navigate = useNavigate();
  const dialog = useAdminDialog();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("landing");

  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PromoBanner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [previewBanner, setPreviewBanner] = useState<PromoBanner | null>(null);
  const [justSavedBanner, setJustSavedBanner] = useState<PromoBanner | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminPromoBanners();
      setBanners(data);
    } catch (err: any) {
      setError(err?.message || "Gagal memuat data banner promo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleToggle = async (b: PromoBanner) => {
    if (!editable) return;
    try {
      const res = await togglePromoBanner(b.id);
      setBanners((prev) =>
        prev.map((item) => (item.id === b.id ? { ...item, is_active: res.is_active } : item)),
      );
      toast.success(
        res.is_active ? `Banner "${b.title}" sekarang aktif tayang` : `Banner "${b.title}" dinonaktifkan`,
      );
    } catch {
      toast.error("Gagal mengubah status aktif banner");
    }
  };

  const handleDelete = async (b: PromoBanner) => {
    if (!editable) return;
    const ok = await dialog.confirm({
      title: `Hapus banner "${b.title}"?`,
      text: "Banner akan dihapus permanen dan tidak lagi muncul di halaman depan.",
      confirmLabel: "Ya, hapus banner",
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePromoBanner(b.id);
      setBanners((prev) => prev.filter((item) => item.id !== b.id));
      toast.success("Banner berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus banner");
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Tampilan Website"
        title="Pop-up Promo Halaman Depan"
        description="Unggah poster promo visual yang muncul otomatis saat pengunjung membuka website LIVORA."
        actions={
          editable ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#232528] px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#34383D]"
            >
              <Plus className="h-4 w-4" />
              Tambah Pop-up Promo
            </button>
          ) : null
        }
      />

      <AdminHelpBanner storageKey="promo-banners-help">
        Pop-up menampilkan <strong>gambar poster utuh</strong> tanpa teks tambahan di atasnya. Setelah menyimpan banner,
        Anda bisa langsung memilih produk furnitur mana saja yang mendapat diskon lewat tombol{" "}
        <strong>Pilih Item Promo</strong>.
      </AdminHelpBanner>

      {error ? (
        <ErrorState title="Gagal memuat banner promo" description={error} onRetry={load} />
      ) : loading ? (
        <TableSkeleton rows={4} cols={6} />
      ) : banners.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Belum ada banner promo"
          description="Unggah poster promo pertama untuk ditampilkan sebagai pop-up di halaman depan website."
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
                <Plus className="h-4 w-4" /> Tambah Pop-up Promo
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#EAE4DA] bg-[#FAF8F4] text-xs uppercase tracking-[0.14em] text-[#656B73]">
                <tr>
                  <th className="p-3.5 text-left">Poster</th>
                  <th className="p-3.5 text-left">Nama Promo &amp; Tujuan Klik</th>
                  <th className="p-3.5 text-left">Urutan</th>
                  <th className="p-3.5 text-left">Status Tayang</th>
                  <th className="p-3.5 text-left">Jadwal Tayang</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1ECE4]">
                {banners.map((b) => (
                  <tr key={b.id} className="transition-colors hover:bg-[#FAF8F4]/60">
                    <td className="w-40 p-3.5">
                      <button
                        type="button"
                        onClick={() => setPreviewBanner(b)}
                        className="group relative flex h-20 w-36 items-center justify-center overflow-hidden rounded-lg border border-[#E6DFD4] bg-[#232528] shadow-sm"
                        title="Klik untuk pratinjau penuh"
                      >
                        <img
                          src={imgUrl(b.image_url)}
                          alt={b.title}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <Eye className="h-4 w-4" />
                        </span>
                      </button>
                    </td>

                    <td className="p-3.5">
                      <div className="font-medium text-[#232528]">{b.title}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-[#656B73]">
                        <ExternalLink className="h-3 w-3 text-[#5E93B8]" />
                        <span>Tujuan: {b.cta_link || "/promo"}</span>
                      </div>
                    </td>

                    <td className="p-3.5 text-xs font-medium text-[#4C5259]">
                      Slide ke-{(b.order_index ?? 0) + 1}
                    </td>

                    <td className="p-3.5">
                      <button
                        type="button"
                        disabled={!editable}
                        onClick={() => void handleToggle(b)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-default ${
                          b.is_active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-[#F3F0EA] text-[#656B73] hover:bg-[#EAE4DA]"
                        }`}
                        title={editable ? "Klik untuk mengubah status tayang" : undefined}
                      >
                        {b.is_active ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Aktif di Homepage</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Nonaktif (Draf)</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="p-3.5 text-xs text-[#656B73]">
                      {b.start_date || b.end_date ? (
                        <div className="space-y-0.5">
                          <div>Mulai: {formatDate(b.start_date)}</div>
                          <div>Selesai: {formatDate(b.end_date)}</div>
                        </div>
                      ) : (
                        <span>Tayang terus-menerus</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/admin/items?mode=promo&banner_title=${encodeURIComponent(b.title)}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#5E93B8]/30 bg-[#EDF4F8] px-2.5 py-1.5 text-xs font-medium text-[#35678B] transition-colors hover:bg-[#DFECF4]"
                          title="Pilih produk furnitur yang masuk promo ini"
                        >
                          <Tag className="h-3 w-3" />
                          <span>Pilih Item Promo</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPreviewBanner(b)}
                          className="rounded-lg p-1.5 text-[#656B73] transition-colors hover:bg-[#FAF8F4] hover:text-[#232528]"
                          title="Pratinjau Pop-up"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {editable && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(b);
                                setShowForm(true);
                              }}
                              className="rounded-lg p-1.5 text-[#656B73] transition-colors hover:bg-[#FAF8F4] hover:text-[#232528]"
                              title="Ubah Banner"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(b)}
                              className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50"
                              title="Hapus Banner"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <PromoBannerFormModal
          banner={editing}
          onClose={() => setShowForm(false)}
          onSaved={(savedBanner) => {
            setShowForm(false);
            void load();
            setJustSavedBanner(savedBanner);
          }}
        />
      )}

      {/* Post-save prompt dengan status tayang yang akurat */}
      {justSavedBanner && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-[#EAE4DA] bg-white p-6 shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="text-center">
              <h3 className="font-header text-2xl text-[#232528]">Banner Promo Tersimpan</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#656B73]">
                {justSavedBanner.is_active ? (
                  <>
                    Banner <strong>"{justSavedBanner.title}"</strong> sudah aktif tayang di halaman depan. Ingin
                    langsung memilih produk furnitur yang masuk ke promo ini?
                  </>
                ) : (
                  <>
                    Banner <strong>"{justSavedBanner.title}"</strong> disimpan sebagai{" "}
                    <strong>Nonaktif (Draf)</strong> dan belum tampil di website. Anda tetap bisa memilih produk promo
                    sekarang atau nanti.
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setJustSavedBanner(null)}
                className="flex-1 rounded-full border border-[#E2DACF] py-2.5 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4]"
              >
                Nanti Saja
              </button>
              <button
                type="button"
                onClick={() => {
                  const title = justSavedBanner.title;
                  setJustSavedBanner(null);
                  navigate(`/admin/items?mode=promo&banner_title=${encodeURIComponent(title)}`);
                }}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#232528] py-2.5 text-xs font-medium text-white hover:bg-[#34383D]"
              >
                Pilih Item Promo <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {previewBanner && (
        <PromoBannerPreviewModal banner={previewBanner} onClose={() => setPreviewBanner(null)} />
      )}
    </div>
  );
}

interface FormModalProps {
  banner: PromoBanner | null;
  onClose: () => void;
  onSaved: (savedBanner: PromoBanner) => void;
}

function PromoBannerFormModal({ banner, onClose, onSaved }: FormModalProps) {
  const dialog = useAdminDialog();
  const [title, setTitle] = useState(banner?.title || "Promo Diskon LIVORA");
  const initialLink = banner?.cta_link || "/promo";
  const isPreset = LINK_PRESETS.some((p) => p.value === initialLink);
  const [linkMode, setLinkMode] = useState<string>(isPreset ? initialLink : "__custom__");
  const [ctaLink, setCtaLink] = useState(initialLink);
  const [orderDisplay, setOrderDisplay] = useState(String((banner?.order_index ?? 0) + 1));
  const [isActive, setIsActive] = useState(banner ? banner.is_active : true);
  const [startDate, setStartDate] = useState(banner?.start_date ? banner.start_date.slice(0, 16) : "");
  const [endDate, setEndDate] = useState(banner?.end_date ? banner.end_date.slice(0, 16) : "");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(banner?.image_url ? imgUrl(banner.image_url) : "");

  const [zoom, setZoom] = useState<number>(1);
  const [posX, setPosX] = useState<number>(50);
  const [posY, setPosY] = useState<number>(50);
  const [aspectRatio, setAspectRatio] = useState<"original" | "4/5" | "1/1" | "4/3" | "16/10" | "16/9">("original");
  const [devicePreview, setDevicePreview] = useState<"desktop" | "mobile">("desktop");
  const [showAdjuster, setShowAdjuster] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const isAdjusted = zoom !== 1 || posX !== 50 || posY !== 50 || aspectRatio !== "original";
  const isDirty = useMemo(() => {
    if (file || isAdjusted) return true;
    if (!banner) return title !== "Promo Diskon LIVORA" || ctaLink !== "/promo" || !!startDate || !!endDate;
    return (
      title !== banner.title ||
      ctaLink !== (banner.cta_link || "/promo") ||
      orderDisplay !== String((banner.order_index ?? 0) + 1) ||
      isActive !== banner.is_active ||
      startDate !== (banner.start_date ? banner.start_date.slice(0, 16) : "") ||
      endDate !== (banner.end_date ? banner.end_date.slice(0, 16) : "")
    );
  }, [banner, title, ctaLink, orderDisplay, isActive, startDate, endDate, file, isAdjusted]);

  // Revoke blob URL saat diganti / unmount agar bebas memory leak
  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const requestClose = async () => {
    if (saving) return;
    if (isDirty) {
      const ok = await dialog.confirm({
        title: "Buang perubahan yang belum disimpan?",
        text: "Perubahan pada banner promo ini belum disimpan.",
        confirmLabel: "Ya, tutup",
        cancelLabel: "Lanjut edit",
      });
      if (!ok) return;
    }
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, saving]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5 MB.");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setShowAdjuster(true);
    setZoom(1);
    setPosX(50);
    setPosY(50);
  };

  // Mendukung crop baik untuk file baru maupun gambar existing (dengan fallback aman bila CORS)
  const generateCroppedFile = async (sourceUrl: string, originalFile: File | null): Promise<File | null> => {
    if (!isAdjusted) return originalFile;
    let drawableSrc = sourceUrl;
    let tempBlobUrl: string | null = null;

    if (!sourceUrl.startsWith("blob:") && !sourceUrl.startsWith("data:")) {
      try {
        const res = await fetch(sourceUrl, { mode: "cors" });
        if (res.ok) {
          const blob = await res.blob();
          tempBlobUrl = URL.createObjectURL(blob);
          drawableSrc = tempBlobUrl;
        }
      } catch {
        // lanjut coba via crossOrigin image
      }
    }

    return new Promise((resolve) => {
      const cleanup = () => {
        if (tempBlobUrl) URL.revokeObjectURL(tempBlobUrl);
      };
      const img = new Image();
      if (!drawableSrc.startsWith("blob:") && !drawableSrc.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        try {
          let targetW = 1920;
          let targetH = 1200;
          if (aspectRatio === "original") {
            targetW = img.width || 1920;
            targetH = img.height || 1200;
          } else if (aspectRatio === "4/5") {
            targetW = 1440;
            targetH = 1800;
          } else if (aspectRatio === "16/9") {
            targetH = 1080;
          } else if (aspectRatio === "16/10") {
            targetH = 1200;
          } else if (aspectRatio === "4/3") {
            targetH = 1440;
          } else if (aspectRatio === "1/1") {
            targetH = 1920;
          }

          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            cleanup();
            resolve(originalFile);
            return;
          }

          const imgRatio = (img.width || 1) / (img.height || 1);
          const targetRatio = targetW / targetH;
          const drawH = imgRatio > targetRatio ? targetH * zoom : (targetW * zoom) / imgRatio;
          const drawW = imgRatio > targetRatio ? drawH * imgRatio : targetW * zoom;
          const offsetX = (targetW - drawW) * (posX / 100);
          const offsetY = (targetH - drawH) * (posY / 100);

          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          canvas.toBlob(
            (blob) => {
              cleanup();
              if (!blob) {
                resolve(originalFile);
                return;
              }
              resolve(new File([blob], originalFile?.name || "promo-adjusted.webp", { type: "image/webp" }));
            },
            "image/webp",
            0.92,
          );
        } catch {
          cleanup();
          resolve(originalFile);
        }
      };
      img.onerror = () => {
        cleanup();
        resolve(originalFile);
      };
      img.src = drawableSrc;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Nama banner wajib diisi");
      return;
    }
    if (!banner && !file && !previewUrl) {
      toast.error("Silakan unggah gambar banner promo");
      return;
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      toast.error("Tanggal selesai tayang tidak boleh lebih awal dari tanggal mulai tayang.");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("subtitle", "");
      fd.append("label", "");
      fd.append("description", "");
      fd.append("cta_link", ctaLink.trim() || "/promo");
      const zeroBasedOrder = Math.max(0, (parseInt(orderDisplay, 10) || 1) - 1);
      fd.append("order_index", String(zeroBasedOrder));
      fd.append("is_active", isActive ? "1" : "0");
      if (startDate) fd.append("start_date", startDate);
      if (endDate) fd.append("end_date", endDate);

      if (file) {
        const cropped = isAdjusted ? await generateCroppedFile(previewUrl, file) : file;
        fd.append("image", cropped || file);
      } else if (banner?.image_url) {
        if (isAdjusted) {
          const croppedExisting = await generateCroppedFile(previewUrl, null);
          if (croppedExisting) {
            fd.append("image", croppedExisting);
          } else {
            toast.warning("Zoom/crop gambar lama tidak bisa diproses langsung. Unggah ulang file jika ingin memotong gambar.");
            fd.append("image_url", banner.image_url);
          }
        } else {
          fd.append("image_url", banner.image_url);
        }
      }

      const resData = banner
        ? await updatePromoBanner(banner.id, fd)
        : await createPromoBanner(fd);
      toast.success(banner ? "Banner promo berhasil diperbarui" : "Banner promo baru berhasil dibuat");
      onSaved(resData);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan banner");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/65 p-3 backdrop-blur-sm sm:p-6"
      onClick={() => void requestClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DA] bg-[#FAF8F4] px-6 py-4">
          <div>
            <h2 className="font-header text-2xl text-[#232528]">
              {banner ? "Ubah Banner Promo" : "Unggah Banner Promo Baru"}
            </h2>
            <p className="mt-0.5 text-xs text-[#656B73]">
              Unggah gambar poster promosi, sesuaikan posisi/rasio jika perlu, lalu periksa pratinjau di sebelah kanan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void requestClose()}
            className="rounded-full p-2 text-[#656B73] hover:bg-black/5 hover:text-[#232528]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid flex-1 grid-cols-1 gap-8 overflow-y-auto p-6 lg:grid-cols-12">
          {/* Kolom Kiri: Form */}
          <div className="space-y-4 lg:col-span-6">
            <label className="block">
              <span className="text-xs font-medium text-[#232528]">Nama Banner Promo (Label Internal Admin) *</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="mis. Promo Akhir Tahun 40% OFF"
                className="mt-1.5 h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
              />
              <span className="mt-1 block text-[11px] text-[#656B73]">
                Hanya tampil di daftar admin sebagai pengenal, tidak ditulis di atas gambar pop-up.
              </span>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-[#232528]">Halaman Tujuan Saat Diklik</span>
                <select
                  value={linkMode}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLinkMode(v);
                    if (v !== "__custom__") setCtaLink(v);
                  }}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
                >
                  {LINK_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                  <option value="__custom__">Link Kustom…</option>
                </select>
                {linkMode === "__custom__" && (
                  <input
                    value={ctaLink}
                    onChange={(e) => setCtaLink(e.target.value)}
                    placeholder="mis. /promo atau https://..."
                    className="mt-2 h-9 w-full rounded-lg border border-[#E2DACF] bg-white px-3 text-xs text-[#232528] outline-none focus:border-[#5E93B8]"
                  />
                )}
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#232528]">Urutan Slide</span>
                <input
                  type="number"
                  min={1}
                  value={orderDisplay}
                  onChange={(e) => setOrderDisplay(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
                />
                <span className="mt-1 block text-[11px] text-[#656B73]">Slide 1 tampil paling awal.</span>
              </label>
            </div>

            {/* Upload Gambar & Adjuster */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#232528]">Poster Gambar Promo *</span>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => setShowAdjuster(!showAdjuster)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#467A9E] hover:underline"
                  >
                    <Sliders className="h-3 w-3" />
                    {showAdjuster ? "Sembunyikan Pengatur" : "Atur Zoom / Posisi / Rasio"}
                  </button>
                )}
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#DCD5CA] bg-[#FAF8F4]/70 p-4 transition-colors hover:border-[#5E93B8] hover:bg-[#EDF4F8]/40">
                <Upload className="mb-1.5 h-5 w-5 text-[#5E93B8]" />
                <span className="text-center text-xs font-medium text-[#232528]">
                  {file ? file.name : banner ? "Klik untuk ganti poster (WebP, JPG, PNG maks. 5 MB)" : "Pilih poster desain promo (WebP, JPG, PNG maks. 5 MB)"}
                </span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>

              {(showAdjuster || (previewUrl && !banner)) && (
                <div className="space-y-3 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-4">
                  <div className="flex items-center justify-between text-xs font-medium text-[#232528]">
                    <span className="flex items-center gap-1.5">
                      <Move className="h-3.5 w-3.5 text-[#5E93B8]" />
                      Zoom, Fokus &amp; Rasio Pop-up
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setZoom(1);
                        setPosX(50);
                        setPosY(50);
                        setAspectRatio("original");
                      }}
                      className="flex items-center gap-1 text-[11px] text-[#656B73] hover:text-[#232528]"
                    >
                      <RefreshCw className="h-3 w-3" /> Reset
                    </button>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-[11px] text-[#656B73]">
                      <span>Perbesar / Zoom</span>
                      <span className="font-mono">{Math.round(zoom * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full cursor-pointer accent-[#5E93B8]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1 flex justify-between text-[11px] text-[#656B73]">
                        <span>Geser Atas ↔ Bawah</span>
                        <span className="font-mono">{posY}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={posY}
                        onChange={(e) => setPosY(parseInt(e.target.value, 10))}
                        className="w-full cursor-pointer accent-[#5E93B8]"
                      />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-[11px] text-[#656B73]">
                        <span>Geser Kiri ↔ Kanan</span>
                        <span className="font-mono">{posX}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={posX}
                        onChange={(e) => setPosX(parseInt(e.target.value, 10))}
                        className="w-full cursor-pointer accent-[#5E93B8]"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="mb-1.5 block text-[11px] text-[#656B73]">Rasio Bingkai Pop-up:</span>
                    <div className="grid grid-cols-3 gap-1.5 text-xs sm:grid-cols-6">
                      {(["original", "4/5", "1/1", "4/3", "16/10", "16/9"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setAspectRatio(r)}
                          className={`rounded-lg border py-1.5 text-[11px] font-medium transition-colors ${
                            aspectRatio === r
                              ? "border-[#232528] bg-[#232528] text-white"
                              : "border-[#E2DACF] bg-white text-[#656B73] hover:border-[#5E93B8]"
                          }`}
                        >
                          {r === "original" ? "Asli" : r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Jadwal Tayang */}
            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-[#232528]">Mulai Tayang (Opsional)</span>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-xs text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-[#232528]">Selesai Tayang (Opsional)</span>
                <input
                  type="datetime-local"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-xs text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
                />
              </label>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-[#CFC7BB] accent-[#5E93B8]"
              />
              <span className="text-sm font-medium text-[#232528]">Tayangkan langsung di halaman depan</span>
            </label>
          </div>

          {/* Kolom Kanan: Pratinjau */}
          <div className="flex flex-col justify-start lg:col-span-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#232528]">
                <Eye className="h-3.5 w-3.5 text-[#5E93B8]" /> Pratinjau Pop-up di Website
              </span>
              <div className="flex items-center gap-1 rounded-lg border border-[#E2DACF] bg-[#FAF8F4] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setDevicePreview("desktop")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
                    devicePreview === "desktop" ? "bg-white font-medium text-[#232528] shadow-sm" : "text-[#656B73]"
                  }`}
                >
                  <Monitor className="h-3 w-3" /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setDevicePreview("mobile")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
                    devicePreview === "mobile" ? "bg-white font-medium text-[#232528] shadow-sm" : "text-[#656B73]"
                  }`}
                >
                  <Smartphone className="h-3 w-3" /> Ponsel
                </button>
              </div>
            </div>

            <div className="flex min-h-[380px] w-full flex-1 items-center justify-center rounded-2xl border border-dashed border-[#D8D1C6] bg-[#232528]/10 p-4">
              {previewUrl ? (
                <div
                  className={`relative flex select-none items-center justify-center overflow-hidden rounded-xl border border-white/25 shadow-2xl transition-all duration-300 ${
                    aspectRatio === "original"
                      ? devicePreview === "desktop"
                        ? "w-fit max-w-lg max-h-[360px]"
                        : "w-fit max-w-[220px] max-h-[360px]"
                      : `${devicePreview === "desktop" ? "w-full max-w-lg" : "w-56"} ${
                          aspectRatio === "16/9"
                            ? "aspect-video"
                            : aspectRatio === "16/10"
                              ? "aspect-[16/10]"
                              : aspectRatio === "4/3"
                                ? "aspect-[4/3]"
                                : aspectRatio === "4/5"
                                  ? "aspect-[4/5] max-w-[290px]"
                                  : "aspect-square max-w-[340px]"
                        }`
                  }`}
                >
                  <img
                    src={previewUrl}
                    alt="Pratinjau Banner"
                    className={
                      aspectRatio === "original"
                        ? `block h-auto w-auto max-h-[360px] transition-transform duration-150 ${
                            devicePreview === "desktop" ? "max-w-lg" : "max-w-[220px]"
                          }`
                        : "h-full w-full object-cover transition-transform duration-150"
                    }
                    style={{
                      transform: `scale(${zoom})`,
                      objectPosition: `${posX}% ${posY}%`,
                    }}
                  />
                  <div className="pointer-events-none absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white/85">
                    <X className="h-3.5 w-3.5" />
                  </div>
                  <div className="pointer-events-none absolute bottom-2 left-2 right-2 truncate rounded-md bg-black/55 px-2 py-1 text-center text-[11px] text-white/90 backdrop-blur-sm">
                    Klik → {ctaLink || "/promo"}
                  </div>
                </div>
              ) : (
                <div className="flex aspect-[16/10] w-full max-w-md flex-col items-center justify-center rounded-xl border border-[#EAE4DA] bg-white p-6 text-xs text-[#656B73]">
                  <ImageIcon className="mb-2 h-8 w-8 text-[#5E93B8]/50" />
                  <span>Unggah gambar poster untuk melihat pratinjau</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#EAE4DA] pt-4 lg:col-span-12">
            <button
              type="button"
              onClick={() => void requestClose()}
              className="rounded-full border border-[#E2DACF] px-5 py-2.5 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#232528] px-6 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-[#34383D] disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : "Simpan Banner Promo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PromoBannerPreviewModal({ banner, onClose }: { banner: PromoBanner; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-[6px] sm:p-8"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative inline-flex max-h-[85vh] w-fit max-w-[92vw] select-none items-center justify-center overflow-hidden rounded-2xl border border-white/20 shadow-2xl sm:max-w-[86vw] lg:max-w-4xl"
      >
        <img
          src={imgUrl(banner.image_url)}
          alt={banner.title}
          className="block max-h-[85vh] h-auto w-auto max-w-[92vw] sm:max-w-[86vw] lg:max-w-4xl"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pratinjau"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white/85 transition-colors hover:bg-black/70"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/60 px-4 py-1.5 text-xs text-white/90 backdrop-blur-md">
          Tujuan klik: <strong>{banner.cta_link || "/promo"}</strong>
        </div>
      </div>
    </div>
  );
}
