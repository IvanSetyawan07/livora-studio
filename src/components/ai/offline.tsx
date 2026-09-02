/**
 * Blok UI "kaya tapi jujur" untuk permukaan yang sumber datanya belum tersambung.
 *
 * Prinsip: struktur dashboard (kartu KPI, panel chart, tabel, baris platform)
 * SELALU tampil sesuai desain — yang tidak boleh tampil adalah ANGKA contoh.
 * Selama kredensial platform belum dipasang, isi diganti penanda
 * "Not connected" di dalam kerangka yang sama.
 */
import { KeyRound, type LucideIcon } from "lucide-react";
import { Panel, StatusDot } from "./primitives";
import { cn } from "@/lib/utils";

/** Kartu KPI terkunci — bentuk sama seperti KpiCard, nilai "—". */
export function LockedKpiCard({
  label,
  provider,
  index = 0,
}: {
  label: string;
  provider: string;
  index?: number;
}) {
  return (
    <Panel className="border-dashed p-5 opacity-80">
      <div
        className="animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
        style={{ animationDelay: `${index * 70}ms` }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="label-eyebrow">{label}</p>
          <StatusDot tone="neutral" />
        </div>
        <p className="text-display num mt-3 text-4xl leading-none text-muted-foreground">—</p>
        <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <KeyRound className="size-3" /> Not connected
        </p>
        <p className="mt-3 border-t border-border pt-3 text-[11px] tracking-wide text-muted-foreground">
          Butuh {provider}
        </p>
      </div>
    </Panel>
  );
}

/** Panel dengan chrome lengkap (judul, aksi, legend) tapi area isi "belum tersambung". */
export function OfflinePanel({
  title,
  action,
  provider,
  message,
  height = "h-56",
  legend,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  provider: string;
  message: string;
  height?: string;
  legend?: { label: string; className: string }[];
  className?: string;
}) {
  return (
    <Panel className={cn("flex h-full flex-col p-5 sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-display rule-accent text-lg">{title}</h3>
        {action}
      </div>
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border-strong bg-muted/20 px-6 text-center",
          height,
        )}
      >
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-border-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <KeyRound className="size-3" /> Not connected
        </span>
        <p className="text-sm font-medium">{provider}</p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{message}</p>
      </div>
      {legend ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={cn("h-0.5 w-4 rounded-full", l.className)} />
              {l.label}
            </span>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

/** Kerangka tabel lengkap dengan header — body menunjukkan status honest. */
export function TableShell({
  title,
  action,
  columns,
  emptyTitle,
  emptyDescription,
  rows = 4,
}: {
  title: string;
  action?: React.ReactNode;
  columns: string[];
  emptyTitle: string;
  emptyDescription: string;
  rows?: number;
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4 sm:px-6">
        <h3 className="text-display rule-accent text-lg">{title}</h3>
        {action}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-y border-border/60 text-left">
              {columns.map((c) => (
                <th key={c} className="label-eyebrow px-5 py-3 first:pl-6">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-border/30 last:border-0">
                {columns.map((c, j) => (
                  <td key={c} className="px-5 py-3.5 first:pl-6">
                    <span
                      className="block h-3 rounded-full bg-muted/50"
                      style={{ width: `${[62, 44, 52, 36, 48][(i + j) % 5]}%`, opacity: 1 - i * 0.18 }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-center gap-1.5 border-t border-border/60 bg-muted/15 px-6 py-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-border-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <KeyRound className="size-3" /> Belum ada data
        </span>
        <p className="text-sm font-medium">{emptyTitle}</p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{emptyDescription}</p>
      </div>
    </Panel>
  );
}

/** Baris platform (Instagram, TikTok, dst) dengan status koneksi honest. */
export function PlatformRow({
  icon: Icon,
  label,
  note,
}: {
  icon: LucideIcon;
  label: string;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-sm border border-dashed border-border-strong px-3.5 py-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">{label}</p>
        {note ? <p className="truncate text-[11px] text-muted-foreground">{note}</p> : null}
      </div>
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Not connected
      </span>
    </div>
  );
}
