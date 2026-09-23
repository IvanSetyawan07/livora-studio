// path: src/components/ai/agent-filter.tsx
/**
 * Shared multi-select agent filter for Insights, Recommendations and Actions.
 *
 * Behaviour: nothing selected = show everything. Selecting one or more
 * agents (e.g. SEO + CRO + Content) shows the union of those agents' items.
 * "All" always clears the selection back to the unfiltered state.
 */
import { X } from "lucide-react";
import { AGENT_CATALOG } from "@/lib/ai/agent-catalog";
import type { AIAgentId } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

export function AgentFilter({
  selected,
  onToggle,
  onClear,
  counts,
  className,
}: {
  selected: Set<AIAgentId>;
  onToggle: (id: AIAgentId) => void;
  onClear: () => void;
  /** Optional per-agent count shown next to the label, e.g. from the current unfiltered list. */
  counts?: Partial<Record<AIAgentId, number>>;
  className?: string;
}) {
  const agents = Object.values(AGENT_CATALOG);
  const hasSelection = selected.size > 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        onClick={onClear}
        className={cn(
          "shrink-0 rounded-sm border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors duration-200",
          !hasSelection
            ? "border-ai/40 bg-ai/12 text-ai"
            : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        All agents
      </button>

      {agents.map((agent) => {
        const active = selected.has(agent.id);
        const count = counts?.[agent.id];
        return (
          <button
            key={agent.id}
            onClick={() => onToggle(agent.id)}
            aria-pressed={active}
            className={cn(
              "shrink-0 rounded-sm border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors duration-200",
              active
                ? "border-ai/40 bg-ai/12 text-ai"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {agent.name}
            {typeof count === "number" && count > 0 ? (
              <span className="ml-1.5 num text-[10px] opacity-70">{count}</span>
            ) : null}
          </button>
        );
      })}

      {hasSelection ? (
        <button
          onClick={onClear}
          className="flex shrink-0 items-center gap-1 rounded-sm px-2 py-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3" />
          Clear
        </button>
      ) : null}
    </div>
  );
}

/** Small hook-like helper so every page toggles agents the same way. */
export function toggleAgent(current: Set<AIAgentId>, id: AIAgentId): Set<AIAgentId> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}