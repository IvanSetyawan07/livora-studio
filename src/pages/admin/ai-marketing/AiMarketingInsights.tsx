import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { InsightCard, typeMeta } from "@/components/ai/insight-card";
import { Reveal } from "@/components/ai/primitives";
import { useAiInsights } from "@/hooks/useAiDashboard";
import type { AIInsightType } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const filters: (AIInsightType | "all")[] = [
  "all",
  "opportunity",
  "warning",
  "trend",
  "anomaly",
  "recommendation",
  "lead_intelligence",
];

export default function InsightsPage() {
  const [filter, setFilter] = useState<AIInsightType | "all">("all");
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data, isLoading, error } = useAiInsights(filter);
  const visible = (data ?? []).filter((i) => !dismissed.includes(i.id));

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="AI Insights"
        description="Every insight carries its source data, reasoning and confidence. Recommendations are separate objects and always require approval."
      />

      <div className="scroll-rail mb-6 flex gap-2 pb-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 rounded-sm border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors duration-200",
              filter === f
                ? "border-brass/50 bg-brass/10 text-brass"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "all" ? "All" : typeMeta[f].label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-sm border border-border bg-surface/40" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-sm border border-dashed border-border-strong p-8 text-center text-sm text-muted-foreground">
          Insights tidak bisa dimuat dari server.
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {visible.map((i, idx) => (
              <Reveal key={i.id} delay={idx * 70}>
                <InsightCard insight={i} onDismiss={(id) => setDismissed((d) => [...d, id])} />
              </Reveal>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="rounded-sm border border-dashed border-border-strong p-8 text-center text-sm text-muted-foreground">
              Belum ada insight{filter === "all" ? "" : " di kategori ini"}. Agent AI akan mengisi
              halaman ini begitu analisis pertama dijalankan.
            </p>
          ) : null}
        </>
      )}
    </>
  );
}
