import type { AIActivity } from "@/lib/ai/types";
import { Panel, Reveal, StatusDot } from "./primitives";

const kindTone = {
  analysis: "info",
  insight: "brass",
  recommendation: "success",
  approval: "warning",
  execution: "success",
  system: "neutral",
} as const;

export function ActivityStream({
  items,
  compact = false,
}: {
  items: AIActivity[];
  compact?: boolean;
}) {
  return (
    <Panel className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <p className="label-eyebrow">AI Activity</p>
        <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          <StatusDot tone="success" pulse /> Streaming locally
        </span>
      </div>

      <ol className="mt-4 flex-1 space-y-0 overflow-hidden">
        {items.slice(0, compact ? 6 : items.length).map((a, i) => (
          <Reveal key={a.id} delay={i * 60}>
            <li className="group relative flex gap-4 py-3">
              <span className="num w-10 shrink-0 pt-0.5 text-[11px] text-muted-foreground">
                {a.time}
              </span>
              <span className="relative flex w-3 shrink-0 justify-center">
                <span className="absolute top-1.5 bottom-[-1.25rem] w-px bg-border group-last:hidden" />
                <StatusDot
                  tone={kindTone[a.kind]}
                  pulse={a.kind === "analysis"}
                  className="relative mt-1.5"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm leading-snug">{a.message}</span>
                <span className="mt-0.5 block font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  {a.actor}
                </span>
              </span>
            </li>
          </Reveal>
        ))}
      </ol>
    </Panel>
  );
}
