import { motion } from "framer-motion";
import { AlertCircle, Inbox, RefreshCw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
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
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>}
        <h1 className="serif mt-1 text-3xl leading-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────────── StatusBadge ───────────── */

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-300",
  success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
  danger: "bg-red-500/10 text-red-700 border-red-500/25 dark:text-red-300",
  accent: "bg-[hsl(var(--livora-bronze)/0.12)] text-[hsl(var(--livora-bronze))] border-[hsl(var(--livora-bronze)/0.3)]",
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
  new_inquiry: "info",
  // menunggu
  menunggu: "warning", pending: "warning", draft: "warning", review: "warning", menunggu_pembayaran: "warning", "perlu tindakan": "warning",
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-5 text-left transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-[hsl(var(--livora-bronze)/0.5)] hover:shadow-[0_20px_45px_-28px_rgba(0,0,0,0.45)]",
        onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--livora-bronze))] to-transparent opacity-60" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase leading-tight tracking-[0.16em] text-muted-foreground">{label}</p>
        {Icon && <Icon size={16} className="shrink-0 text-muted-foreground/70 transition-transform duration-300 group-hover:scale-110" />}
      </div>
      <p className="serif mt-3 text-4xl leading-none">{value}</p>
      {note && <p className="mt-2 text-xs leading-snug text-muted-foreground">{note}</p>}
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
      className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-14 text-center", className)}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="serif mt-4 text-xl">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
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
      className={cn("flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center", className)}
    >
      <AlertCircle className="h-6 w-6 text-destructive" />
      <p className="serif mt-3 text-xl">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-muted"
        >
          <RefreshCw size={14} /> Coba lagi
        </button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card" aria-busy="true" aria-label="Memuat data">
      <div className="flex gap-4 border-b border-border bg-muted/40 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-border/60 px-4 py-4 last:border-0">
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
