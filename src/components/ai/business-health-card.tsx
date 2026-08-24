import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";
import type { BusinessHealth } from "@/lib/ai/types";
import { Panel, Pill, RadialGauge } from "./primitives";
import { cn } from "@/lib/utils";

export function BusinessHealthCard({ health }: { health: BusinessHealth }) {
  const DeltaIcon =
    health.deltaDirection === "up" ? ArrowUpRight : health.deltaDirection === "down" ? ArrowDownRight : Minus;
  const statusTone = health.status === "Healthy" ? "success" : health.status === "At Risk" ? "danger" : "warning";

  return (
    <Panel hover className="animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both] p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <RadialGauge value={health.score} tone="insight" suffix="" size={112} strokeWidth={9} />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="label-eyebrow">Business Health</p>
            <Pill tone={statusTone}>{health.status}</Pill>
          </div>
          <p
            className={cn(
              "flex items-center gap-1 text-xs",
              health.deltaDirection === "up"
                ? "text-success"
                : health.deltaDirection === "down"
                  ? "text-destructive"
                  : "text-muted-foreground",
            )}
          >
            <DeltaIcon className="size-3" />
            {health.deltaLabel}
          </p>
          <div className="flex items-start gap-2 border-t border-border pt-3">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-ai" />
            <p className="text-sm leading-relaxed text-foreground/80">{health.summary}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
