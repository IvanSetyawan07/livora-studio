import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { AIKpi } from "@/lib/ai/types";
import { CountUp, Panel, Sparkline, StatusDot } from "./primitives";
import { cn } from "@/lib/utils";

export function KpiCard({ kpi, index = 0 }: { kpi: AIKpi; index?: number }) {
  const Icon =
    kpi.deltaDirection === "up" ? ArrowUpRight : kpi.deltaDirection === "down" ? ArrowDownRight : Minus;

  return (
    <Panel
      hover
      className="group relative overflow-hidden p-5"
      // staggered entrance
    >
      <div
        className="animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
        style={{ animationDelay: `${index * 70}ms` }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="label-eyebrow">{kpi.label}</p>
          {kpi.live ? <StatusDot tone="success" pulse /> : <StatusDot tone="neutral" />}
        </div>

        <div className="mt-3 flex items-baseline gap-1">
          <CountUp value={kpi.value} className="text-display text-4xl leading-none" />
          {kpi.suffix ? (
            <span className="num text-lg text-muted-foreground">{kpi.suffix}</span>
          ) : null}
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
            <Icon className="size-3" />
            {kpi.deltaLabel}
          </p>
        ) : null}

        <div className="mt-4 opacity-70 transition-opacity duration-300 group-hover:opacity-100">
          <Sparkline points={kpi.spark} tone={kpi.live ? "brass" : "muted"} />
        </div>

        <p className="mt-3 border-t border-border pt-3 text-[11px] tracking-wide text-muted-foreground">
          {kpi.footnote}
        </p>
      </div>
    </Panel>
  );
}
