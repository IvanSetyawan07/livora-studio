import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { ChannelPerformanceItem } from "@/lib/ai/types";
import { Panel, useInView } from "./primitives";

const toneVar: Record<ChannelPerformanceItem["tone"], string> = {
  ai: "hsl(var(--ai))",
  insight: "hsl(var(--insight))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  info: "hsl(var(--info))",
};

const toneDot: Record<ChannelPerformanceItem["tone"], string> = {
  ai: "bg-ai",
  insight: "bg-insight",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
};

export function ChannelPerformanceCard({ channels }: { channels: ChannelPerformanceItem[] }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const total = channels.reduce((sum, c) => sum + c.value, 0);

  return (
    <Panel className="p-5 sm:p-6">
      <div className="rule-accent">
        <h3 className="text-display text-lg">Channel Performance</h3>
        <p className="mt-1 text-sm text-muted-foreground">Attributed revenue by acquisition channel, last 30 days.</p>
      </div>

      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
        <div ref={ref} className="relative size-[168px] shrink-0">
          {inView ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channels}
                  dataKey="value"
                  nameKey="channel"
                  innerRadius={58}
                  outerRadius={80}
                  paddingAngle={3}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive
                  animationDuration={900}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                >
                  {channels.map((c) => (
                    <Cell key={c.channel} fill={toneVar[c.tone]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="size-full animate-pulse rounded-full bg-muted/40" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="label-eyebrow">Total</span>
            <span className="num text-display text-xl">${(total / 1000).toFixed(1)}K</span>
          </div>
        </div>

        <div className="w-full flex-1 space-y-2.5">
          {channels.map((c) => (
            <div key={c.channel} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-2 text-foreground/80">
                <span className={`size-1.5 shrink-0 rounded-full ${toneDot[c.tone]}`} />
                <span className="truncate">{c.channel}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="num text-muted-foreground">${(c.value / 1000).toFixed(1)}K</span>
                <span className="num w-9 text-right text-foreground/70">{c.share}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
