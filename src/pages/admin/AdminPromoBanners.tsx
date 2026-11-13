import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Calendar,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  Sparkles,
  ArrowUpDown,
  Upload,
  X,
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
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PromoBanner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [previewBanner, setPreviewBanner] = useState<PromoBanner | null>(null);

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D7B483]" />
            Manajemen Promosi
          </div>
          <h1 className="serif text-3xl sm:text-4xl font-light">Pop-up Promo Homepage</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Kelola floating banner promosi pop-up yang tampil saat pengunjung membuka website.
            Jika terdapat lebih dari 1 banner aktif, modal akan berganti slide secara carousel otomatis.
          </p>
        </div>

        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-foreground text-background text-xs uppercase tracking-[0.2em] font-medium hover:opacity-90 transition-opacity self-start sm:self-auto"
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
                <th className="text-left p-3.5">Preview</th>
                <th className="text-left p-3.5">Judul & Promo</th>
                <th className="text-left p-3.5">Urutan</th>
                <th className="text-left p-3.5">Status Aktif</th>
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
                    Belum ada banner promo. Klik <strong>Tambah Banner</strong> untuk membuat promosi baru.
                  </td>
                </tr>
              ) : (
                banners.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    {/* Thumbnail */}
                    <td className="p-3.5 w-32">
                      <div className="w-24 h-16 rounded overflow-hidden bg-black/10 border border-border relative group/thumb cursor-pointer"
                        onClick={() => setPreviewBanner(b)}>
                        <img
                          src={imgUrl(b.image_url)}
                          alt={b.title}
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </td>

                    {/* Title & Info */}
                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        {b.label && (
                          <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#A88247] bg-[#A88247]/10 px-2 py-0.5 rounded">
                            {b.label}
                          </span>
                        )}
                        <h3 className="font-medium text-foreground text-base serif mt-1">{b.title}</h3>
                        {b.subtitle && <p className="text-xs text-muted-foreground">{b.subtitle}</p>}
                        {b.cta_link && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 mt-1">
                            <span>Link:</span>
                            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{b.cta_link}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Order index */}
                    <td className="p-3.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-mono">
                        {b.order_index}
                      </span>
                    </td>

                    {/* Active toggle */}
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggle(b)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          b.is_active
                            ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {b.is_active ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Tayang
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Nonaktif
                          </>
                        )}
                      </button>
                    </td>

                    {/* Schedule */}
                    <td className="p-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {!b.start_date && !b.end_date ? (
                        <span className="text-foreground/70">Selalu Aktif</span>
                      ) : (
                        <div className="space-y-0.5">
                          <div>Mulai: {formatDate(b.start_date)}</div>
                          <div>Selesai: {formatDate(b.end_date)}</div>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => setPreviewBanner(b)}
                        className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="Live Preview Pop-up"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditing(b);
                          setShowForm(true);
                        }}
                        className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit Banner"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                        className="p-2 hover:bg-destructive/15 text-destructive rounded transition-colors"
                        title="Hapus Banner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Tambah/Edit Modal */}
      {showForm && (
        <PromoBannerFormModal
          banner={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {/* Quick Live Preview Modal */}
      {previewBanner && (
        <PromoBannerPreviewModal
          banner={previewBanner}
          onClose={() => setPreviewBanner(null)}
        />
      )}
    </div>
  );
}

// ── Form Tambah / Edit Banner dengan Live Preview di Samping ──
interface FormModalProps {
  banner: PromoBanner | null;
  onClose: () => void;
  onSaved: () => void;
}

function PromoBannerFormModal({ banner, onClose, onSaved }: FormModalProps) {
  const [title, setTitle] = useState(banner?.title || "UP TO 40% OFF");
  const [subtitle, setSubtitle] = useState(banner?.subtitle || "Desain Interior & Furniture Custom");
  const [label, setLabel] = useState(banner?.label || "PROMO SPESIAL");
  const [description, setDescription] = useState(
    banner?.description || "Wujudkan rumah impian Anda dengan penawaran terbatas!"
  );
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
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Judul promo wajib diisi");
      return;
    }
    if (!banner && !file && !previewUrl) {
      toast.error("Silakan unggah gambar banner");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("subtitle", subtitle);
      fd.append("label", label);
      fd.append("description", description);
      fd.append("cta_link", ctaLink || "/promo");
      fd.append("order_index", orderIndex || "0");
      fd.append("is_active", isActive ? "1" : "0");
      if (startDate) fd.append("start_date", startDate);
      if (endDate) fd.append("end_date", endDate);
      if (file) fd.append("image", file);

      if (banner) {
        await updatePromoBanner(banner.id, fd);
        toast.success("Banner promo berhasil diperbarui");
      } else {
        await createPromoBanner(fd);
        toast.success("Banner promo baru berhasil dibuat");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan banner");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div>
            <h2 className="serif text-2xl font-light">
              {banner ? "Edit Banner Promo" : "Tambah Banner Promo Baru"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live preview di sebelah kanan akan memperlihatkan tampilan pop-up secara langsung.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Column 1: Input Fields (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block col-span-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
                  Judul Promo (Besar) *
                </span>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="misal: UP TO 40% OFF"
                  className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
                  Label Atas
                </span>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="misal: PROMO SPESIAL"
                  className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </label>

              <label className="block">
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

            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
                Subjudul
              </span>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="misal: Desain Interior & Furniture Custom"
                className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
                Deskripsi Singkat
              </span>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="misal: Wujudkan rumah impian Anda dengan penawaran terbatas!"
                className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
                Link Tujuan Saat Banner Ditekan
              </span>
              <input
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                placeholder="default: /promo"
                className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </label>

            {/* Upload Gambar */}
            <div>
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
                Gambar Full-Bleed *
              </span>
              <label className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 hover:bg-muted/30 cursor-pointer transition-colors">
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">
                  {file ? file.name : "Pilih gambar banner berkualitas tinggi (WebP, JPG, PNG)"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Jadwal & Status */}
            <div className="grid grid-cols-2 gap-3 pt-2">
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
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm font-medium">Tayangkan langsung di homepage</span>
            </label>
          </div>

          {/* Column 2: Live Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Live Preview Pop-up
            </span>

            <div className="relative flex-1 min-h-[300px] rounded-xl overflow-hidden border border-white/20 shadow-xl flex flex-col justify-center items-center text-center p-6 bg-black select-none">
              {/* Background image & gradient */}
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[#252525] flex items-center justify-center text-muted-foreground text-xs">
                  Belum ada gambar
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/35 pointer-events-none" />

              {/* Close button preview */}
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white/80 border border-white/20 flex items-center justify-center pointer-events-none">
                <X className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="relative z-10 max-w-xs">
                {label && (
                  <span className="text-[9px] uppercase tracking-[0.3em] text-[#D7B483] font-medium bg-black/30 border border-[#D7B483]/30 px-2 py-0.5 rounded-full inline-block mb-2">
                    {label}
                  </span>
                )}
                <h3 className="serif text-2xl sm:text-3xl text-white font-light tracking-wide leading-tight">
                  {title || "UP TO 40% OFF"}
                </h3>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-stone-200 font-light mt-1.5">
                    {subtitle}
                  </p>
                )}
                {description && (
                  <p className="text-[11px] text-stone-300/80 font-light mt-1.5 line-clamp-2">
                    {description}
                  </p>
                )}
              </div>

              {/* Notice */}
              <div className="absolute bottom-2 left-0 right-0 text-[10px] text-white/50 tracking-wider uppercase">
                (Klik banner akan langsung ke {ctaLink || "/promo"})
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
              className="px-6 py-2.5 rounded bg-foreground text-background text-xs uppercase tracking-[0.2em] font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : "Simpan Banner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Full Live Preview Modal ──
function PromoBannerPreviewModal({ banner, onClose }: { banner: PromoBanner; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[6px] grid place-items-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl h-[75vh] max-h-[600px] rounded-2xl overflow-hidden shadow-2xl border border-white/20 flex flex-col justify-center items-center text-center p-8 bg-black select-none"
      >
        <img
          src={imgUrl(banner.image_url)}
          alt={banner.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/35 pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 text-white/80 border border-white/20 flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 max-w-xl">
          {banner.label && (
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-[#D7B483] font-medium bg-black/30 border border-[#D7B483]/30 px-3 py-1 rounded-full inline-block mb-3">
              {banner.label}
            </span>
          )}
          <h2 className="serif text-4xl sm:text-5xl md:text-6xl text-white font-light tracking-wide">
            {banner.title}
          </h2>
          {banner.subtitle && (
            <p className="text-lg sm:text-xl text-stone-200 font-light mt-2 sm:mt-3">
              {banner.subtitle}
            </p>
          )}
          {banner.description && (
            <p className="text-xs sm:text-sm text-stone-300/80 font-light mt-2 max-w-md mx-auto">
              {banner.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
