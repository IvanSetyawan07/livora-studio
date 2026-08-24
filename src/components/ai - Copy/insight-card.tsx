import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronDown, ExternalLink } from "lucide-react";
import type { AIInsight, AIInsightType } from "@/lib/ai/types";
import { recommendationById } from "@/lib/ai/data";
import { ConfidenceBar, Panel, Pill, StatusDot } from "./primitives";
import { cn } from "@/lib/utils";

export const typeMeta: Record<AIInsightType, { label: string; tone: "brass" | "warning" | "info" | "danger" | "success" | "neutral" }> = {
  opportunity: { label: "Opportunity", tone: "brass" },
  warning: { label: "Warning", tone: "warning" },
  trend: { label: "Trend", tone: "info" },
  anomaly: { label: "Anomaly", tone: "danger" },
  recommendation: { label: "Recommendation", tone: "success" },
  lead_intelligence: { label: "Lead Intelligence", tone: "neutral" },
};

export function InsightCard({
  insight,
  defaultOpen = false,
  onDismiss,
}: {
  insight: AIInsight;
  defaultOpen?: boolean;
  onDismiss?: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = typeMeta[insight.type];
  const rec = insight.recommendationId ? recommendationById(insight.recommendationId) : undefined;

  return (
    <Panel hover className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 p-5 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={meta.tone}>
              <StatusDot tone={meta.tone} pulse={insight.severity === "critical"} />
              {meta.label}
            </Pill>
            <span className="label-eyebrow">
              {insight.severity} priority · {insight.source.join(" + ")}
            </span>
          </div>
          <h3 className="text-display mt-3 text-lg leading-snug">{insight.title}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{insight.description}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <span className="num text-sm text-brass">{insight.confidence}%</span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-300",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-5 border-t border-border p-5">
            {insight.metrics?.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {insight.metrics.map((m) => (
                  <div key={m.label} className="rounded-sm border border-border bg-background/40 p-3">
                    <p className="label-eyebrow">{m.label}</p>
                    <p className="num mt-1 text-lg">{m.value}</p>
                    {m.delta ? <p className="text-xs text-success">{m.delta}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}

            <Field label="What happened" value={insight.whatHappened} />
            <Field label="Why it matters" value={insight.whyItMatters} />
            <Field label="AI reasoning" value={insight.reasoning} />
            <Field label="Expected impact" value={insight.expectedImpact} />

            <ConfidenceBar value={insight.confidence} />

            {rec ? (
              <div className="rounded-sm border border-brass/25 bg-brass/[0.04] p-4">
                <p className="label-eyebrow text-brass">Recommended action</p>
                <p className="mt-1.5 text-sm font-medium">{rec.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{rec.description}</p>
                <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  {rec.actionType} · {rec.risk} risk · Requires human approval
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {rec ? (
                <Link
                  to="/admin/ai-marketing/approvals"
                  className="inline-flex items-center gap-1.5 rounded-sm bg-brass px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Review recommendation <ArrowUpRight className="size-3.5" />
                </Link>
              ) : null}
              {insight.analyticsHref ? (
                <Link
                  to="/admin/analytics"
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-1.5 text-xs transition-colors hover:bg-accent"
                >
                  View source analytics <ExternalLink className="size-3.5" />
                </Link>
              ) : null}
              {onDismiss ? (
                <button
                  onClick={() => onDismiss(insight.id)}
                  className="rounded-sm px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Dismiss
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-eyebrow">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-foreground/85">{value}</p>
    </div>
  );
}
