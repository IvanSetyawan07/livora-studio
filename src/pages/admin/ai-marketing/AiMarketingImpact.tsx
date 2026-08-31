import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Panel, Pill } from "@/components/ai/primitives";
import { usePageContext } from "@/context/AiMarketingContext";
import { aiServices } from "@/lib/ai/services";
import { useAiAgents } from "@/hooks/useAiDashboard";
import type { ImpactPeriod, ImpactRecord, ImpactResult } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const periods: ImpactPeriod[] = [7, 14, 30];

const resultTone: Record<ImpactResult, "success" | "danger" | "neutral" | "warning"> = {
  positive: "success",
  negative: "danger",
  neutral: "neutral",
  monitoring: "warning",
};

const resultLabel: Record<ImpactResult, string> = {
  positive: "Positive",
  negative: "Negative",
  neutral: "No change",
  monitoring: "Monitoring",
};

export default function AiMarketingImpact() {
  usePageContext("impact");
  const [records, setRecords] = useState<ImpactRecord[] | null>(null);
  const [period, setPeriod] = useState<ImpactPeriod>(14);
  const { data: agents } = useAiAgents();

  useEffect(() => {
    aiServices.impact.list().then(setRecords);
  }, []);

  function agentName(key: string) {
    return agents?.find((a) => a.id === key)?.name ?? key;
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Impact"
        description="Recommendations are only as good as the results they produce. This is where that gets checked."
      />

      <div className="mb-6 flex items-center gap-2">
        <span className="label-eyebrow mr-1">Period</span>
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "rounded-sm border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors",
              period === p ? "border-ai/40 bg-ai/12 text-ai" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {p} days
          </button>
        ))}
      </div>

      {!records ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton-shimmer h-40 rounded-lg" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <Panel className="p-10 text-center text-sm text-muted-foreground">
          No approved recommendations to measure yet — approve one in Actions to start tracking impact.
        </Panel>
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const after = r.after[period];
            const changePct = r.changePct[period];
            const effectiveResult: ImpactResult = after ? r.result : "monitoring";

            return (
              <Panel key={r.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="label-eyebrow">{agentName(r.agent)}</span>
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.metricLabel}</p>
                  </div>
                  <Pill tone={resultTone[effectiveResult]}>{resultLabel[effectiveResult]}</Pill>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
                  <div>
                    <p className="label-eyebrow">Before</p>
                    <p className="num mt-1 text-sm text-foreground/80">{r.before}</p>
                  </div>
                  <div>
                    <p className="label-eyebrow">After {period} days</p>
                    <p className={cn("num mt-1 text-sm", after ? "text-foreground" : "text-muted-foreground italic")}>
                      {after ?? "Still monitoring"}
                    </p>
                  </div>
                  {typeof changePct === "number" ? (
                    <div>
                      <p className="label-eyebrow">Impact</p>
                      <p className={cn("num mt-1 text-sm font-semibold", changePct >= 0 ? "text-success" : "text-destructive")}>
                        {changePct >= 0 ? "+" : ""}
                        {changePct}%
                      </p>
                    </div>
                  ) : null}
                </div>

                <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-foreground/70">
                  <span className="text-ai">AI conclusion — </span>
                  {after ? r.aiConclusion : "Not enough time has passed for a conclusion yet."}
                </p>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}