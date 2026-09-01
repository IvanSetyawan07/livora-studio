import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import type { AIRecommendation } from "@/lib/ai/types";
import { agentMeta } from "@/lib/ai/agent-catalog";
import { AnimatedBar, Panel, Pill, priorityTone, riskTone } from "./primitives";
import { cn } from "@/lib/utils";

const impactLabel: Record<NonNullable<AIRecommendation["priority"]>, string> = {
  high: "High Impact",
  medium: "Medium Impact",
  low: "Low Impact",
};

export function RecommendationCard({
  rec,
  variant = "compact",
  onApprove,
  onReject,
  pending,
}: {
  rec: AIRecommendation;
  variant?: "compact" | "full";
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  pending?: boolean;
}) {
  const agent = agentMeta(rec.agent);
  const priority = rec.priority ?? "medium";

  return (
    <Panel hover className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", `bg-${priorityTone[priority]}`)} />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={cn("text-[11px] font-semibold tracking-wide uppercase", `text-${priorityTone[priority]}`)}>
              {impactLabel[priority]}
            </span>
            {rec.status !== "pending" ? (
              <Pill tone={rec.status === "rejected" ? "danger" : "success"} className="capitalize">
                {rec.status}
              </Pill>
            ) : null}
          </div>

          <p className="text-sm font-medium text-foreground">{rec.title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{rec.why ?? rec.description}</p>

          {rec.change ? (
            <div className="flex items-center gap-2 font-mono text-xs text-foreground/80">
              <span className="rounded-sm bg-muted px-1.5 py-0.5">{rec.change.from}</span>
              <span className="text-muted-foreground">→</span>
              <span className="rounded-sm bg-ai/12 px-1.5 py-0.5 text-ai">{rec.change.to}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-3">
            <div>
              <p className="label-eyebrow">Expected impact</p>
              <p className="mt-1 text-xs text-foreground/80">{rec.expectedImpact}</p>
            </div>
            <AnimatedBar label="AI confidence" value={rec.confidence} tone="ai" />
            <Pill tone={riskTone[rec.risk]} className="h-fit w-fit">
              {rec.risk} risk
            </Pill>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-muted-foreground">{agent?.name ?? rec.agent}</span>
            {variant === "compact" ? (
              <Link
                to="/admin/ai-marketing/ai-center/recommendations"
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:bg-accent"
              >
                Review
              </Link>
            ) : rec.status === "pending" ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onReject?.(rec.id)}
                  disabled={pending}
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
                >
                  <X className="size-3.5" />
                  Reject
                </button>
                <button
                  onClick={() => onApprove?.(rec.id)}
                  disabled={pending}
                  className="flex items-center gap-1 rounded-md bg-ai px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="size-3.5" />
                  Approve
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Panel>
  );
}
