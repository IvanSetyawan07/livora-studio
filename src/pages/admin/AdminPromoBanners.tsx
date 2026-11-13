import React, { useEffect, useState, useRef } from "react";
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
  Loader2,
  Sparkles,
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

export default function AdminPromoBanners() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PromoBanner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [previewBanner, setPreviewBanner] = useState<PromoBanner | null>(null);
  const [justSavedBanner, setJustSavedBanner] = useState<PromoBanner | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAdminPromoBanners();
      setBanners(data);
    } catch {
      toast.error("Gagal memuat data banner promo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (b: PromoBanner) => {
    try {
      const res = await togglePromoBanner(b.id);
      setBanners((prev) =>
        prev.map((item) => (item.id === b.id ? { ...item, is_active: res.is_active } : item))
      );
      toast.success(
        res.is_active ? `Banner "${b.title}" diaktifkan` : `Banner "${b.title}" dinonaktifkan`
      );
    } catch {
      toast.error("Gagal mengubah status aktif banner");
    }
  };

  const handleDelete = async (b: PromoBanner) => {
    if (!confirm(`Hapus banner "${b.title}"? Tindakan ini tidak dapat dibatalkan.`)) return;
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
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D7B483]" />
            Manajemen Promosi
          </div>
          <h1 className="serif text-3xl sm:text-4xl font-light">Pop-up Promo Homepage</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Upload banner promosi visual untuk pop-up homepage. Pop-up menampilkan <strong>pure image banner</strong> beresolusi tinggi tanpa tulisan HTML yang menutupi gambar.
          </p>
        </div>

        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-foreground text-background text-xs uppercase tracking-[0.2em] font-medium hover:opacity-90 transition-opacity self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Banner
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-[0.14em] text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left p-3.5">Gambar Banner</th>
                <th className="text-left p-3.5">Nama Banner Promo</th>
                <th className="text-left p-3.5">Urutan Slide</th>
                <th className="text-left p-3.5">Status Tayang</th>
                <th className="text-left p-3.5">Jadwal Tayang</th>
                <th className="text-right p-3.5">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Memuat data banner promo…
                  </td>
                </tr>
              ) : banners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Belum ada banner promo. Klik <strong>Tambah Banner</strong> untuk mengunggah banner visual baru.
                  </td>
                </tr>
              ) : (
                banners.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    {/* Thumbnail */}
                    <td className="p-3.5 w-40">
                      <div
                        onClick={() => setPreviewBanner(b)}
                        className="relative h-20 w-36 rounded-md overflow-hidden bg-black border border-border cursor-pointer group shadow-sm flex items-center justify-center"
                        title="Klik untuk pratinjau penuh"
                      >
                        <img
                          src={imgUrl(b.image_url)}
                          alt={b.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                    </td>

                    {/* Judul & Link */}
                    <td className="p-3.5">
                      <div className="font-medium text-foreground">{b.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 font-mono">
                        <ExternalLink className="w-3 h-3 text-[#A88247]" />
                        <span>Link: {b.cta_link || "/promo"}</span>
                      </div>
                    </td>

                    {/* Urutan */}
                    <td className="p-3.5 font-mono text-xs">
                      Slide ke-{b.order_index ?? 0}
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggle(b)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          b.is_active
                            ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        title="Klik untuk mengubah status aktif"
                      >
                        {b.is_active ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aktif di Homepage</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Nonaktif</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Jadwal Tayang */}
                    <td className="p-3.5 text-xs text-muted-foreground">
                      {b.start_date || b.end_date ? (
                        <div className="space-y-0.5">
                          <div>Mulai: {formatDate(b.start_date)}</div>
                          <div>Selesai: {formatDate(b.end_date)}</div>
                        </div>
                      ) : (
                        <span>Tayang terus menerus</span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Pilih Item Promo */}
                        <Link
                          to={`/admin/items?mode=promo&banner_title=${encodeURIComponent(b.title)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#D7B483]/15 hover:bg-[#D7B483]/25 text-[#A88247] text-xs font-medium transition-colors border border-[#D7B483]/30"
                          title="Pilih item furnitur yang masuk ke promo ini"
                        >
                          <Tag className="w-3 h-3" />
                          <span>Pilih Item Promo</span>
                        </Link>

                        <button
                          onClick={() => setPreviewBanner(b)}
                          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="Pratinjau Pop-up"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditing(b);
                            setShowForm(true);
                          }}
                          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit Banner"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b)}
                          className="p-1.5 hover:bg-destructive/15 text-destructive rounded transition-colors"
                          title="Hapus Banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Tambah/Edit Modal dengan Image Cropper & Proportional Preview */}
      {showForm && (
        <PromoBannerFormModal
          banner={editing}
          onClose={() => setShowForm(false)}
          onSaved={(savedBanner) => {
            setShowForm(false);
            load();
            setJustSavedBanner(savedBanner);
          }}
        />
      )}

      {/* Post-save action prompt: Tanya apakah mau pilih item promo sekarang */}
      {justSavedBanner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="serif text-2xl font-light">Banner Promo Tersimpan!</h3>
              <p className="text-xs text-muted-foreground mt-2">
                Banner promo <strong>"{justSavedBanner.title}"</strong> sudah aktif. Apakah Anda ingin langsung memilih item furnitur yang masuk ke promo ini?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setJustSavedBanner(null)}
                className="flex-1 py-2 rounded border border-border text-xs uppercase tracking-wider hover:bg-muted"
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
                className="flex-1 py-2 rounded bg-foreground text-background text-xs uppercase tracking-wider font-medium hover:opacity-90 inline-flex items-center justify-center gap-1.5"
              >
                Pilih Item Sekarang <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Live Preview Modal */}
      {previewBanner && (
        <PromoBannerPreviewModal
          banner={previewBanner}
          onClose={() => setPreviewBanner(null)}
        />
      )}
    </div>
  );
}

// ── Form Tambah / Edit Banner dengan Interactive Image Sizing & Pure Image Live Preview ──
interface FormModalProps {
  banner: PromoBanner | null;
  onClose: () => void;
  onSaved: (savedBanner: PromoBanner) => void;
}

function PromoBannerFormModal({ banner, onClose, onSaved }: FormModalProps) {
  // Hanya nama banner untuk internal admin (tidak dirender di atas banner homepage)
  const [title, setTitle] = useState(banner?.title || "Promo Diskon LIVORA");
  const [ctaLink, setCtaLink] = useState(banner?.cta_link || "/promo");
  const [orderIndex, setOrderIndex] = useState(banner?.order_index?.toString() || "0");
  const [isActive, setIsActive] = useState(banner ? banner.is_active : true);
  const [startDate, setStartDate] = useState(
    banner?.start_date ? banner.start_date.slice(0, 16) : ""
  );
  const [endDate, setEndDate] = useState(
    banner?.end_date ? banner.end_date.slice(0, 16) : ""
  );

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    banner?.image_url ? imgUrl(banner.image_url) : ""
  );

  // Image Adjustment States
  const [zoom, setZoom] = useState<number>(1);
  const [posX, setPosX] = useState<number>(50); // 0% - 100% horizontal center
  const [posY, setPosY] = useState<number>(50); // 0% - 100% vertical center
  const [aspectRatio, setAspectRatio] = useState<"original" | "16/10" | "16/9" | "4/3" | "1/1">("16/10");
  const [devicePreview, setDevicePreview] = useState<"desktop" | "mobile">("desktop");
  const [showAdjuster, setShowAdjuster] = useState<boolean>(false);

  const [saving, setSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setShowAdjuster(true);
      setZoom(1);
      setPosX(50);
      setPosY(50);
    }
  };

  // Canvas helper to apply crop/zoom into a new file before upload if adjusted
  const generateCroppedFile = async (sourceUrl: string, originalFile: File | null): Promise<File | null> => {
    if (aspectRatio === "original" && zoom === 1 && posX === 50 && posY === 50 && originalFile) {
      return originalFile; // No adjustments, keep original file
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = sourceUrl;
      img.onload = () => {
        let targetW = 1920;
        let targetH = 1200; // default 16/10

        if (aspectRatio === "original") {
          targetW = img.width;
          targetH = img.height;
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
          resolve(originalFile);
          return;
        }

        const imgRatio = img.width / img.height;
        const targetRatio = targetW / targetH;
        let drawW: number;
        let drawH: number;

        if (imgRatio > targetRatio) {
          drawH = targetH * zoom;
          drawW = drawH * imgRatio;
        } else {
          drawW = targetW * zoom;
          drawH = drawW / imgRatio;
        }

        const offsetX = (targetW - drawW) * (posX / 100);
        const offsetY = (targetH - drawH) * (posY / 100);

        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(originalFile);
              return;
            }
            const processed = new File([blob], originalFile ? originalFile.name : "promo-adjusted.webp", {
              type: "image/webp",
            });
            resolve(processed);
          },
          "image/webp",
          0.92
        );
      };
      img.onerror = () => resolve(originalFile);
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

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("subtitle", ""); // Pure image, no subtitle wording
      fd.append("label", "");    // Pure image, no label wording
      fd.append("description", ""); // Pure image, no description wording
      fd.append("cta_link", ctaLink || "/promo");
      fd.append("order_index", orderIndex || "0");
      fd.append("is_active", isActive ? "1" : "0");
      if (startDate) fd.append("start_date", startDate);
      if (endDate) fd.append("end_date", endDate);

      // Export cropped file if user uploaded or adjusted
      if (previewUrl && (file || zoom !== 1 || posX !== 50 || posY !== 50 || aspectRatio !== "original")) {
        const processedFile = await generateCroppedFile(previewUrl, file);
        if (processedFile) {
          fd.append("image", processedFile);
        }
      }

      let resData: PromoBanner;
      if (banner) {
        resData = await updatePromoBanner(banner.id, fd);
        toast.success("Banner promo berhasil diperbarui");
      } else {
        resData = await createPromoBanner(fd);
        toast.success("Banner promo baru berhasil dibuat");
      }
      onSaved(resData);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan banner");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm grid place-items-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-xl w-full max-w-6xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[94vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div>
            <h2 className="serif text-2xl font-light">
              {banner ? "Edit Banner Promo" : "Upload Banner Promo Baru"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unggah file gambar promosi Anda (pure visual), atur ukuran/posisi, dan lihat pratinjau asli di sisi kanan.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns (Form Left, Live Preview Right) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Column 1: Input Fields (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block col-span-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
                  Nama Banner Promo (Label Admin) *
                </span>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="misal: Promo Akhir Tahun 40% OFF"
                  className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  *Nama ini hanya sebagai tanda pengenal di dashboard admin, tidak akan menutupi gambar di homepage.
                </span>
              </label>

              <label className="block col-span-2 sm:col-span-1">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
                  Link Tujuan Saat Banner Diklik
                </span>
                <input
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                  placeholder="default: /promo"
                  className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </label>

              <label className="block col-span-2 sm:col-span-1">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
                  Urutan Slide
                </span>
                <input
                  type="number"
                  min="0"
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </label>
            </div>

            {/* Upload Gambar & Adjuster */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
                  Upload Gambar Banner Visual *
                </span>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => setShowAdjuster(!showAdjuster)}
                    className="text-xs inline-flex items-center gap-1 text-[#A88247] hover:underline"
                  >
                    <Sliders className="w-3 h-3" />
                    {showAdjuster ? "Sembunyikan Pengatur Ukuran" : "Atur Ukuran / Zoom / Posisi"}
                  </button>
                )}
              </div>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 hover:bg-muted/30 cursor-pointer transition-colors bg-muted/10">
                <Upload className="w-6 h-6 text-muted-foreground mb-1.5" />
                <span className="text-xs text-foreground font-medium text-center">
                  {file ? file.name : "Pilih gambar desain promo (WebP, JPG, PNG)"}
                </span>
                <span className="text-[11px] text-muted-foreground text-center mt-0.5">
                  Gunakan gambar beresolusi tajam. Semua teks dan desain langsung menyatu dalam gambar.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Adjuster Tools (Zoom, Pos X, Pos Y, Ratio) */}
              {(showAdjuster || (previewUrl && !banner)) && (
                <div className="p-3.5 rounded-lg bg-muted/50 border border-border space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1">
                      <Move className="w-3.5 h-3.5 text-[#A88247]" />
                      Pengatur Zoom & Posisi Fokus Gambar
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setZoom(1);
                        setPosX(50);
                        setPosY(50);
                        setAspectRatio("16/10");
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                  </div>

                  {/* Zoom Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Perbesar / Zoom:</span>
                      <span className="font-mono">{Math.round(zoom * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-foreground cursor-pointer"
                    />
                  </div>

                  {/* Pos Y (Vertikal Focus) Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Posisi Vertikal (Atas ↔ Bawah):</span>
                      <span className="font-mono">{posY}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={posY}
                      onChange={(e) => setPosY(parseInt(e.target.value))}
                      className="w-full accent-foreground cursor-pointer"
                    />
                  </div>

                  {/* Pos X (Horizontal Focus) Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Posisi Horizontal (Kiri ↔ Kanan):</span>
                      <span className="font-mono">{posX}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={posX}
                      onChange={(e) => setPosX(parseInt(e.target.value))}
                      className="w-full accent-foreground cursor-pointer"
                    />
                  </div>

                  {/* Ratio Selector */}
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-1.5">
                      Rasio Pemotongan / Ukuran:
                    </span>
                    <div className="grid grid-cols-5 gap-1.5 text-xs">
                      {(["16/10", "16/9", "4/3", "1/1", "original"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setAspectRatio(r)}
                          className={`py-1 rounded border text-[10px] transition-colors ${
                            aspectRatio === r
                              ? "bg-foreground text-background border-foreground font-medium"
                              : "border-border hover:bg-muted text-muted-foreground"
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

            {/* Jadwal & Status */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
                  Mulai Tayang (Opsional)
                </span>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-xs sm:text-sm focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
                  Selesai Tayang (Opsional)
                </span>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-xs sm:text-sm focus:outline-none"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-border cursor-pointer"
              />
              <span className="text-sm font-medium">Tayangkan langsung di homepage</span>
            </label>
          </div>

          {/* Column 2: Live Preview Proporsional (Pure Gambar Sesuai Tampilan Asli) */}
          <div className="lg:col-span-6 flex flex-col justify-start">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#D7B483]" /> Pratinjau Asli Pop-up
              </span>

              {/* Device Toggle (Desktop vs Mobile) */}
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setDevicePreview("desktop")}
                  className={`px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                    devicePreview === "desktop"
                      ? "bg-card text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Tampilan Desktop Luas"
                >
                  <Monitor className="w-3 h-3" /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setDevicePreview("mobile")}
                  className={`px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                    devicePreview === "mobile"
                      ? "bg-card text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Tampilan Layar Ponsel"
                >
                  <Smartphone className="w-3 h-3" /> Ponsel
                </button>
              </div>
            </div>

            {/* Container Pratinjau dengan rasio proporsional */}
            <div className="w-full flex-1 flex items-center justify-center bg-black/10 p-4 rounded-xl border border-dashed border-border min-h-[380px]">
              <div
                className={`relative rounded-xl overflow-hidden border border-white/20 shadow-2xl flex flex-col justify-center items-center text-center bg-black select-none transition-all duration-300 ${
                  devicePreview === "desktop"
                    ? "w-full max-w-lg aspect-[16/10]"
                    : "w-56 aspect-[9/16]"
                }`}
              >
                {/* Pure Image with applied zoom & position (Tanpa Wording Apapun) */}
                {previewUrl ? (
                  <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-black">
                    <img
                      src={previewUrl}
                      alt="Preview Banner"
                      className="w-full h-full object-cover transition-transform duration-150"
                      style={{
                        transform: `scale(${zoom})`,
                        objectPosition: `${posX}% ${posY}%`,
                      }}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-[#161616] flex flex-col items-center justify-center text-muted-foreground text-xs p-6">
                    <ImageIcon className="w-8 h-8 opacity-40 mb-2" />
                    <span>Unggah gambar banner untuk melihat pratinjau</span>
                  </div>
                )}

                {/* Close Button Preview in Frosted Glass */}
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/45 text-white/85 border border-white/25 flex items-center justify-center pointer-events-none">
                  <X className="w-3.5 h-3.5" />
                </div>

                {/* Notice link tujuan di pojok bawah */}
                <div className="absolute bottom-2 left-0 right-0 text-[10px] text-white/70 font-mono tracking-wider bg-black/50 py-1 pointer-events-none">
                  Klik banner mengarah ke: {ctaLink || "/promo"}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="lg:col-span-12 flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded border border-border text-xs uppercase tracking-[0.2em] hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded bg-foreground text-background text-xs uppercase tracking-[0.2em] font-medium hover:opacity-90 disabled:opacity-50 shadow-sm"
            >
              {saving ? "Menyimpan…" : "Simpan Banner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Full Live Preview Modal (Pure Image) ──
function PromoBannerPreviewModal({ banner, onClose }: { banner: PromoBanner; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[6px] grid place-items-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[85vh] rounded-2xl md:rounded-[24px] overflow-hidden shadow-2xl border border-white/20 flex items-center justify-center bg-black select-none"
      >
        <img
          src={imgUrl(banner.image_url)}
          alt={banner.title}
          className="w-full h-auto max-h-[85vh] object-contain"
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/45 text-white/85 border border-white/25 flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-xs text-white/90">
          Target link: <strong>{banner.cta_link || "/promo"}</strong>
        </div>
      </div>
    </div>
  );
}
