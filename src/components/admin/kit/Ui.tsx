import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  ImagePlus,
  Inbox,
  Info,
  RefreshCw,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ───────────── PageHeader ───────────── */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#EAE4DA] pb-5", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#5E93B8]">
            {eyebrow}
          </p>
        )}
        <h1 className="font-header mt-1 text-2xl leading-tight text-[#232528] sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#656B73]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────────── AdminHelpBanner ───────────── */

export function AdminHelpBanner({
  title,
  children,
  link,
  storageKey,
  tone = "sky",
  className,
}: {
  title?: string;
  children: ReactNode;
  link?: { label: string; to: string; external?: boolean };
  /** Jika diisi, admin bisa menyembunyikan banner panduan ini dan tersimpan di browser. */
  storageKey?: string;
  tone?: "sky" | "amber";
  className?: string;
}) {
  const [hidden, setHidden] = useState<boolean>(() => {
    if (!storageKey) return false;
    try {
      return localStorage.getItem(`livora.help.${storageKey}`) === "1";
    } catch {
      return false;
    }
  });

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    if (storageKey) {
      try {
        localStorage.setItem(`livora.help.${storageKey}`, "1");
      } catch {
        /* abaikan */
      }
    }
  };

  const styles =
    tone === "amber"
      ? "border-amber-200/80 bg-amber-50/70 text-amber-950"
      : "border-[#5E93B8]/25 bg-[#EDF4F8]/80 text-[#232528]";
  const iconColor = tone === "amber" ? "text-amber-700" : "text-[#5E93B8]";

  return (
    <div
      className={cn(
        "mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed",
        styles,
        className,
      )}
    >
      <Info className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor)} />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-medium text-[#232528]">{title}</p>}
        <div className="text-[13px] text-[#4C5259]">{children}</div>
        {link && (
          <div className="pt-0.5">
            {link.external ? (
              <a
                href={link.to}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#467A9E] hover:underline"
              >
                {link.label}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ) : (
              <Link
                to={link.to}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#467A9E] hover:underline"
              >
                {link.label}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}
      </div>
      {storageKey && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Sembunyikan panduan"
          title="Sembunyikan panduan"
          className="rounded-md p-1 text-[#656B73] transition-colors hover:bg-black/5 hover:text-[#232528]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ───────────── ImageUploadField ───────────── */

export function ImageUploadField({
  label,
  hint = "Format JPG, PNG, atau WebP (maks. 5 MB)",
  previewUrl,
  onSelectFile,
  onRemove,
  disabled,
  aspectClass = "h-36 w-full",
  accept = "image/jpeg,image/png,image/webp",
}: {
  label?: string;
  hint?: string;
  previewUrl?: string | null;
  onSelectFile: (file: File) => void;
  onRemove?: () => void;
  disabled?: boolean;
  aspectClass?: string;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      {label && <span className="block text-xs font-medium text-[#232528]">{label}</span>}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-dashed border-[#D8D1C6] bg-[#FAF8F4] transition-colors",
          !disabled && "hover:border-[#5E93B8]",
          aspectClass,
        )}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt={label ?? "Pratinjau gambar"} className="h-full w-full object-cover" />
            {!disabled && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 bg-gradient-to-t from-black/65 via-black/25 to-transparent p-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-md bg-white/95 px-2.5 py-1 text-xs font-medium text-[#232528] shadow-sm hover:bg-white"
                >
                  Ganti foto
                </button>
                {onRemove && (
                  <button
                    type="button"
                    onClick={onRemove}
                    aria-label="Hapus foto"
                    className="rounded-md bg-red-600/90 p-1.5 text-white shadow-sm hover:bg-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-4 text-center text-[#656B73] transition-colors hover:text-[#232528] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImagePlus className="h-5 w-5 text-[#5E93B8]" />
            <span className="text-xs font-medium text-[#232528]">Pilih foto dari komputer</span>
            <span className="text-[11px] text-[#656B73]">{hint}</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelectFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {previewUrl && hint && <p className="text-[11px] text-[#656B73]">{hint}</p>}
    </div>
  );
}

/* ───────────── StatusBadge ───────────── */

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "bg-[#F3F0EA] text-[#555B63] border-[#E4DDD2]",
  info: "bg-[#EDF4F8] text-[#35678B] border-[#5E93B8]/30",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  accent: "bg-[#EDF4F8] text-[#3B7096] border-[#5E93B8]/35",
};

export function StatusBadge({
  tone = "neutral",
  children,
  dot = true,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

/** Peta status umum (Indonesia/Inggris) → nada warna, agar seluruh admin konsisten. */
const STATUS_TONE: Record<string, Tone> = {
  // sukses
  selesai: "success", lunas: "success", paid: "success", completed: "success", aktif: "success", active: "success",
  disetujui: "success", approved: "success", terkirim: "success", sent: "success", diterima: "success",
  // proses
  diproses: "info", proses: "info", processing: "info", produksi: "info", dikirim: "info", shipped: "info", baru: "info", new: "info",
  new_inquiry: "info", in_progress: "info",
  // menunggu
  menunggu: "warning", pending: "warning", draft: "warning", review: "warning", menunggu_pembayaran: "warning",
  menunggu_verifikasi: "warning", menunggu_harga: "warning", "perlu tindakan": "warning", open: "warning", pending_cs: "warning",
  // gagal
  ditolak: "danger", rejected: "danger", batal: "danger", dibatalkan: "danger", cancelled: "danger", gagal: "danger", failed: "danger", refund: "danger",
};

export function toneOf(status?: string | null): Tone {
  return STATUS_TONE[String(status ?? "").toLowerCase().trim()] ?? "neutral";
}

/** Badge yang menentukan warna dari teks status. */
export function AutoStatusBadge({ status, label }: { status?: string | null; label?: string }) {
  return <StatusBadge tone={toneOf(status)}>{label ?? String(status ?? "—").replace(/_/g, " ")}</StatusBadge>;
}

/* ───────────── MetricCard ───────────── */

export function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  index = 0,
  onClick,
  children,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: LucideIcon;
  /** urutan muncul (stagger) */
  index?: number;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-[#EAE4DA] bg-white p-5 text-left transition-all duration-300",
        onClick &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-[#5E93B8]/55 hover:shadow-[0_16px_38px_-24px_rgba(35,37,40,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E93B8]/40",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#5E93B8]/60 to-transparent opacity-70" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase leading-tight tracking-[0.14em] text-[#656B73]">{label}</p>
        {Icon && (
          <Icon
            size={16}
            className={cn(
              "shrink-0 text-[#5E93B8]/80",
              onClick && "transition-transform duration-300 group-hover:scale-110",
            )}
          />
        )}
      </div>
      <p className="font-header mt-3 text-3xl leading-none text-[#232528] sm:text-4xl">{value}</p>
      {note && <p className="mt-2 text-xs leading-snug text-[#656B73]">{note}</p>}
      {children}
    </Tag>
  );
}

/* ───────────── Empty / Error / Skeleton ───────────── */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-[#DED7CC] bg-white/70 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-[#EDF4F8] text-[#5E93B8]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-header mt-4 text-xl text-[#232528]">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-[#656B73]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function ErrorState({
  title = "Data belum bisa dimuat",
  description = "Terjadi gangguan saat mengambil data. Coba lagi sebentar.",
  onRetry,
  className,
}: {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <AlertCircle className="h-6 w-6 text-destructive" />
      <p className="font-header mt-3 text-xl text-[#232528]">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-[#656B73]">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#DED7CC] bg-white px-4 py-2 text-sm text-[#232528] transition-colors hover:bg-[#FAF8F4]"
        >
          <RefreshCw size={14} /> Coba lagi
        </button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#EAE4DA] bg-white" aria-busy="true" aria-label="Memuat data">
      <div className="flex gap-4 border-b border-[#EAE4DA] bg-[#FAF8F4] px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-[#F1ECE4] px-4 py-4 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "max-w-[40%]")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}
