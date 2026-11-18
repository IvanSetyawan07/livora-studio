import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { AgentFilter, toggleAgent } from "@/components/ai/agent-filter";
import { InsightCard, typeMeta } from "@/components/ai/insight-card";
import { QueryError } from "@/components/ai/query-error";
import { Reveal } from "@/components/ai/primitives";
import { usePageContext } from "@/context/AiMarketingContext";
import { extractApiErrorMessage, useAiInsights, useDismissInsight } from "@/hooks/useAiDashboard";
import type { AIAgentId, AIInsight, AIInsightType } from "@/lib/ai/types";
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
  usePageContext("insights");
  const [filter, setFilter] = useState<AIInsightType | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | AIInsight["severity"]>("all");
  const [search, setSearch] = useState("");
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<Set<AIAgentId>>(new Set());

  const { data, isLoading, error, refetch } = useAiInsights(filter);
  const dismissInsight = useDismissInsight();
  const typeFiltered = data ?? [];

  const agentCounts = useMemo(() => {
    const counts: Partial<Record<AIAgentId, number>> = {};
    for (const i of typeFiltered) counts[i.agent] = (counts[i.agent] ?? 0) + 1;
    return counts;
  }, [typeFiltered]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return typeFiltered.filter((i) => {
      if (selectedAgents.size > 0 && !selectedAgents.has(i.agent)) return false;
      if (severityFilter !== "all" && i.severity !== severityFilter) return false;
      if (q && !`${i.title} ${i.description} ${i.reasoning}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [typeFiltered, selectedAgents, severityFilter, search]);

  function handleDismiss(id: string) {
    setDismissingId(id);
    dismissInsight.mutate(id, {
      onSuccess: () => toast.success("Insight disembunyikan."),
      onError: (e) => toast.error(extractApiErrorMessage(e, "Gagal menyembunyikan insight.")),
      onSettled: () => setDismissingId(null),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="AI Insights"
        description="Every insight carries its source data, reasoning and confidence. Recommendations are separate objects and always require approval."
      />

      <AgentFilter
        className="mb-4"
        selected={selectedAgents}
        onToggle={(id) => setSelectedAgents((prev) => toggleAgent(prev, id))}
        onClear={() => setSelectedAgents(new Set())}
        counts={agentCounts}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="scroll-rail flex gap-2 pb-1">
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari insight..."
              className="h-8 w-44 rounded-sm border border-border bg-secondary/60 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as "all" | AIInsight["severity"])}
            className="h-8 rounded-sm border border-border bg-secondary px-2 text-xs text-foreground focus:border-ai focus:outline-none"
          >
            <option value="all">Semua Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-sm border border-border bg-surface/40" />
          ))}
        </div>
      ) : error ? (
        <QueryError message="Insights tidak bisa dimuat dari server." onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {visible.map((i, idx) => (
              <Reveal key={i.id} delay={idx * 70}>
                <InsightCard
                  insight={i}
                  onDismiss={handleDismiss}
                  dismissing={dismissingId === i.id}
                />
              </Reveal>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="rounded-sm border border-dashed border-border-strong p-8 text-center text-sm text-muted-foreground">
              {selectedAgents.size > 0 || search || severityFilter !== "all"
                ? "Tidak ada insight yang cocok dengan filter aktif."
                : `Belum ada insight${filter === "all" ? "" : " di kategori ini"}. Agent AI akan mengisi halaman ini begitu analisis pertama dijalankan.`}
            </p>
          ) : null}
        </>
      )}
    </>
  );
}