import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { seriesByRange } from "@/lib/ai/data";
import { DemoBadge, Panel, useInView } from "./primitives";
import { cn } from "@/lib/utils";

const RANGES = ["7D", "30D", "90D", "12M"] as const;

const METRICS = [
  { key: "traffic", label: "Traffic", color: "hsl(var(--chart-1))" },
  { key: "leads", label: "Leads", color: "hsl(var(--chart-2))" },
  { key: "engagement", label: "Engagement", color: "hsl(var(--chart-3))" },
  { key: "conversions", label: "Conversions", color: "hsl(var(--chart-4))" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

export function PerformanceChart() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("30D");
  const [active, setActive] = useState<MetricKey[]>(["traffic", "leads"]);
  const { ref, inView } = useInView<HTMLDivElement>();

  const data = useMemo(() => seriesByRange[range] ?? [], [range]);

  const toggle = (key: MetricKey) =>
    setActive((prev) =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter((k) => k !== key) : prev) : [...prev, key],
    );

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="rule-accent">
          <h3 className="text-display text-lg">Performance</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Signal the agents observe before reasoning about it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DemoBadge />
          <div className="flex rounded-sm border border-border p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-[2px] px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors duration-200",
                  range === r
                    ? "bg-brass text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        {METRICS.map((m) => {
          const on = active.includes(m.key);
          return (
            <button
              key={m.key}
              onClick={() => toggle(m.key)}
              className={cn(
                "flex items-center gap-2 text-xs transition-opacity duration-200",
                on ? "opacity-100" : "opacity-40 hover:opacity-70",
              )}
            >
              <span
                className="inline-block h-[2px] w-5 rounded-full"
                style={{ background: m.color }}
              />
              {m.label}
            </button>
          );
        })}
      </div>

      <div ref={ref} className="mt-5 h-[280px] w-full sm:h-[320px]">
        {inView ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <defs>
                {METRICS.map((m) => (
                  <linearGradient key={m.key} id={`fill-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={m.color} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={m.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                minTickGap={40}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ stroke: "hsl(var(--border-strong))" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border-strong))",
                  borderRadius: "4px",
                  fontSize: 12,
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              {METRICS.filter((m) => active.includes(m.key)).map((m) => (
                <Area
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  stroke={m.color}
                  strokeWidth={1.6}
                  fill={`url(#fill-${m.key})`}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  isAnimationActive
                  animationDuration={900}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full animate-pulse rounded-sm bg-muted/40" />
        )}
      </div>
    </Panel>
  );
}
