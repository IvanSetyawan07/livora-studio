import { useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActivityStream } from "@/components/ai/activity-stream";
import { DemoBadge } from "@/components/ai/primitives";
import { activity as allActivity } from "@/lib/ai/data";
import type { AIAgentId } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const agentFilters: (AIAgentId | "all")[] = ["all", "seo", "content", "ads", "leads", "cro"];

export default function ActivityPage() {
  const [filter, setFilter] = useState<AIAgentId | "all">("all");

  const visible = useMemo(
    () => allActivity.filter((a) => filter === "all" || a.agent === filter),
    [filter],
  );

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Activity"
        description="Every analysis, insight, recommendation, approval and execution is logged here — the full trail behind each AI decision."
        action={<DemoBadge />}
      />

      <div className="scroll-rail mb-6 flex gap-2 pb-2">
        {agentFilters.map((f) => (
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
            {f === "all" ? "All agents" : f}
          </button>
        ))}
      </div>

      <ActivityStream items={visible} />

      {visible.length === 0 ? (
        <p className="mt-4 rounded-sm border border-dashed border-border-strong p-8 text-center text-sm text-muted-foreground">
          No activity logged for this agent yet.
        </p>
      ) : null}
    </>
  );
}
