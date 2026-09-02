/**
 * Renderer bersama untuk `SectionState` (src/lib/ai/section-state.ts).
 *
 * `SectionNotice` menggantikan pola lama `OfflinePanel` / `TableShell` /
 * `NotConnected` yang masing-masing halaman reimplementasi sendiri-sendiri
 * (audit P3 #16) — sembilan status sekarang punya SATU tempat untuk aturan
 * ikon, warna, dan copy-nya. Komponen ini dipasang DI DALAM kerangka
 * komponen asli (lihat prinsip di section-state.ts), bukan menggantikannya.
 */
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  KeyRound,
  ListFilter,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "./primitives";
import { cn } from "@/lib/utils";
import type { NonDataSectionState, SectionStatus } from "@/lib/ai/section-state";

type NonDataStatus = Exclude<SectionStatus, "loading" | "data">;

const NOTICE_META: Record<NonDataStatus, { icon: LucideIcon; pillLabel: string; tone: Tone }> = {
  empty: { icon: ListFilter, pillLabel: "Belum ada data", tone: "neutral" },
  not_connected: { icon: KeyRound, pillLabel: "Not connected", tone: "neutral" },
  permission_required: { icon: ShieldAlert, pillLabel: "Permission required", tone: "warning" },
  selection_required: { icon: ListFilter, pillLabel: "Selection required", tone: "info" },
  rate_limited: { icon: Timer, pillLabel: "Rate limited", tone: "warning" },
  syncing: { icon: Loader2, pillLabel: "Syncing", tone: "info" },
  error: { icon: AlertTriangle, pillLabel: "Error", tone: "danger" },
};

/** Ikon + label pill + tone untuk sebuah status non-data. Dipakai bareng oleh SectionNotice dan konteks ringkas seperti KpiCard. */
export function noticeMeta(status: NonDataStatus) {
  return NOTICE_META[status];
}

/** Kalimat penjelasan default untuk sebuah status — dipakai kalau `message` dari backend kosong. */
export function describeNonDataState(state: NonDataSectionState, opts: { provider?: string } = {}): string | undefined {
  switch (state.status) {
    case "empty":
      return state.message ?? "Belum ada data untuk ditampilkan.";
    case "not_connected": {
      const provider = state.provider ?? opts.provider;
      return state.message ?? (provider ? `Butuh ${provider}.` : "Integrasi ini belum tersambung.");
    }
    case "permission_required": {
      const provider = state.provider ?? opts.provider;
      return (
        state.message ??
        `Akun ini tidak punya izin untuk melihat data${provider ? ` ${provider}` : ""}. Hubungi admin untuk akses.`
      );
    }
    case "selection_required":
      return state.message ?? `Pilih ${state.label} dulu untuk menampilkan data ini.`;
    case "rate_limited":
      return state.retryAfterSeconds
        ? `Terlalu banyak permintaan ke provider. Coba lagi dalam ${state.retryAfterSeconds}s.`
        : "Terlalu banyak permintaan ke provider. Coba lagi sebentar lagi.";
    case "syncing":
      return state.message ?? "Data sedang disinkronkan, coba lagi sebentar.";
    case "error":
      return state.message;
  }
}

/**
 * Placeholder blok — dipasang di dalam Panel/chart/table untuk semua status
 * non-"data" dan non-"loading". Selalu membawa Retry (kalau relevan) dan
 * Connect (kalau `connectHref` tersedia), jadi tidak ada halaman yang perlu
 * mewiring tombol-tombol itu sendiri-sendiri.
 */
export function SectionNotice({
  state,
  title,
  height = "h-56",
  connectHref,
  connectLabel = "Connect",
  provider,
  className,
}: {
  state: NonDataSectionState;
  title?: string;
  height?: string;
  connectHref?: string;
  connectLabel?: string;
  provider?: string;
  className?: string;
}) {
  const meta = NOTICE_META[state.status];
  const Icon = meta.icon;
  const description = describeNonDataState(state, { provider });
  const resolvedConnectHref = state.status === "not_connected" ? state.connectHref ?? connectHref : undefined;
  const canRetry = state.status === "error" ? state.retriable : state.status === "rate_limited";

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border-strong bg-muted/20 px-6 text-center",
        height,
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-border-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className={cn("size-3", state.status === "syncing" && "animate-spin")} /> {meta.pillLabel}
      </span>
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      {description ? <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      {resolvedConnectHref || canRetry ? (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {resolvedConnectHref ? (
            <Link
              to={resolvedConnectHref}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-accent/40"
            >
              {connectLabel}
            </Link>
          ) : null}
          {canRetry ? (
            <button
              type="button"
              onClick={state.retry}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-accent/40"
            >
              <RefreshCcw className="size-3" /> Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Baris kecil untuk header section yang statusnya "data" — timestamp
 * "As of" atau indikator "Refreshing" selagi background refetch jalan.
 * Tidak pernah mengosongkan konten yang sudah ada; ini murni indikator.
 */
export function LastUpdated({
  at,
  refreshing = false,
  className,
}: {
  at: string | null;
  refreshing?: boolean;
  className?: string;
}) {
  if (!at && !refreshing) return null;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground", className)}>
      {refreshing ? <Loader2 className="size-3 animate-spin" /> : <Clock className="size-3" />}
      {refreshing ? "Refreshing…" : `As of ${formatRelative(at as string)}`}
    </span>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "just now";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
