import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { AIKpi } from "@/lib/ai/types";
import type { SectionState } from "@/lib/ai/section-state";
import { CountUp, Panel, Sparkline, StatusDot, toneText, type Tone } from "./primitives";
import { LastUpdated, noticeMeta, describeNonDataState } from "./section-state";
import { cn } from "@/lib/utils";

/**
 * KpiCard sekarang menerima `state: SectionState<AIKpi>`, bukan `kpi`
 * mentah — satu komponen untuk semua sembilan kemungkinan status, bukan
 * KpiCard + LockedKpiCard terpisah (audit "Overview → KPI cards → TARGET").
 *
 * `label` selalu dioper terpisah dari `state` karena slot KPI (mis. "Ad
 * ROAS") diketahui halaman SEBELUM data datang — termasuk saat statusnya
 * not_connected dan tidak ada payload sama sekali untuk dibaca label-nya.
 */
export function KpiCard({
  label,
  state,
  index = 0,
  tone,
  href,
  provider,
}: {
  label: string;
  state: SectionState<AIKpi>;
  index?: number;
  tone?: Tone;
  /** Kalau diisi, kartu (hanya saat status "data") jadi klik-tembus ke halaman agent pemilik KPI ini. */
  href?: string;
  /** Nama provider dipakai sebagai fallback kalau state.provider kosong (mis. slot yang di-hardcode halaman, bukan dari query). */
  provider?: string;
}) {
  const sparklineTones = ["ai", "insight", "success", "warning", "info", "brass"] as const;
  const sparkTone =
    tone && (sparklineTones as readonly string[]).includes(tone) ? (tone as (typeof sparklineTones)[number]) : "brass";

  let body: React.ReactNode;

  if (state.status === "loading") {
    body = (
      <div className="animate-pulse" style={{ animationDelay: `${index * 70}ms` }}>
        <div className="flex items-start justify-between gap-3">
          <p className="label-eyebrow">{label}</p>
          <StatusDot tone="neutral" />
        </div>
        <div className="mt-3 h-9 w-2/3 rounded-sm bg-muted/50" />
        <div className="mt-3 h-3 w-1/3 rounded-sm bg-muted/40" />
        <div className="mt-4 h-6 w-full rounded-sm bg-muted/30" />
      </div>
    );
  } else if (state.status === "data") {
    const kpi: AIKpi = state.data;
    const DeltaIcon = kpi.deltaDirection === "up" ? ArrowUpRight : kpi.deltaDirection === "down" ? ArrowDownRight : Minus;
    body = (
      <div className="animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ animationDelay: `${index * 70}ms` }}>
        <div className="flex items-start justify-between gap-3">
          <p className="label-eyebrow">{kpi.label || label}</p>
          {kpi.live ? <StatusDot tone="success" pulse /> : <StatusDot tone="neutral" />}
        </div>

        <div className="mt-3 flex items-baseline gap-1">
          <CountUp
            value={kpi.value}
            decimals={kpi.decimals ?? 0}
            className={cn("text-display text-4xl leading-none", tone ? toneText[tone] : undefined)}
          />
          {kpi.suffix ? <span className="num text-lg text-muted-foreground">{kpi.suffix}</span> : null}
        </div>

        {kpi.deltaLabel ? (
          <p
            className={cn(
              "mt-2 flex items-center gap-1 text-xs",
              kpi.deltaDirection === "up"
                ? "text-success"
                : kpi.deltaDirection === "down"
                  ? "text-destructive"
                  : "text-muted-foreground",
            )}
          >
            <DeltaIcon className="size-3" />
            {kpi.deltaLabel}
          </p>
        ) : null}

        <div className="mt-4 opacity-70 transition-opacity duration-300 group-hover:opacity-100">
          <Sparkline points={kpi.spark} tone={tone ? sparkTone : kpi.live ? "brass" : "muted"} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <p className="truncate text-[11px] tracking-wide text-muted-foreground">{kpi.footnote}</p>
          <LastUpdated at={state.lastUpdatedAt} refreshing={state.isRefreshing} />
        </div>
      </div>
    );
  } else {
    // empty | not_connected | permission_required | selection_required | rate_limited | syncing | error
    const meta = noticeMeta(state.status);
    const Icon = meta.icon;
    const description = describeNonDataState(state, { provider });
    body = (
      <div className="animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ animationDelay: `${index * 70}ms` }}>
        <div className="flex items-start justify-between gap-3">
          <p className="label-eyebrow">{label}</p>
          <StatusDot tone="neutral" />
        </div>
        <p className="text-display num mt-3 text-4xl leading-none text-muted-foreground">—</p>
        <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Icon className={cn("size-3", state.status === "syncing" && "animate-spin")} />
          {meta.pillLabel}
        </p>
        {description ? (
          <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed tracking-wide text-muted-foreground">
            {description}
          </p>
        ) : null}
        {(state.status === "error" && state.retriable) || state.status === "rate_limited" ? (
          <button
            type="button"
            onClick={state.retry}
            className="mt-2 text-[11px] font-medium uppercase tracking-[0.1em] text-foreground underline underline-offset-2 hover:no-underline"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  const clickable = state.status === "data" && Boolean(href);

  return (
    <Panel hover className="group relative overflow-hidden p-5">
      {clickable ? (
        <Link to={href as string} className="block rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {body}
        </Link>
      ) : (
        body
      )}
    </Panel>
  );
}
