import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Panel, useInView } from "./primitives";
import { cn } from "@/lib/utils";

const axisTick = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };

const tooltipProps = {
  cursor: { stroke: "hsl(var(--border-strong))", fill: "hsl(var(--muted) / 0.35)" },
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border-strong))",
    borderRadius: "4px",
    fontSize: 12,
    color: "hsl(var(--foreground))",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))", fontSize: 11 },
} as const;

/* ------------------------------------------------------------------ */
/* Compact KPI card (mono eyebrow + big number + delta)                */
/* ------------------------------------------------------------------ */

export type StatKpi = {
  label: string;
  value: string;
  delta?: string;
  direction?: "up" | "down";
};

export function StatCard({ kpi, index = 0 }: { kpi: StatKpi; index?: number }) {
  const Icon = kpi.direction === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <Panel
      hover
      className="p-5 animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <p className="label-eyebrow">{kpi.label}</p>
      <p className="text-display num mt-3 text-3xl leading-none sm:text-4xl">{kpi.value}</p>
      {kpi.delta ? (
        <p
          className={cn(
            "mt-3 flex items-center gap-1 text-xs",
            kpi.direction === "down" ? "text-info" : "text-success",
          )}
        >
          <Icon className="size-3" />
          {kpi.delta}
        </p>
      ) : null}
    </Panel>
  );
}

export function StatGrid({ kpis }: { kpis: StatKpi[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k, i) => (
        <StatCard key={k.label} kpi={k} index={i} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chart shell                                                         */
/* ------------------------------------------------------------------ */

function ChartPanel({
  title,
  action,
  height = 280,
  children,
}: {
  title: string;
  action?: ReactNode;
  height?: number;
  children: ReactNode;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Panel className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-display rule-accent text-lg">{title}</h3>
        {action}
      </div>
      <div ref={ref} style={{ height }} className="w-full">
        {inView ? (
          <ResponsiveContainer width="100%" height="100%">
            {children as never}
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full animate-pulse rounded-sm bg-muted/40" />
        )}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Multi-series line chart                                             */
/* ------------------------------------------------------------------ */

export type SeriesConfig = { key: string; label: string; color: string };

export function MultiLineChart({
  title,
  data,
  series,
  height = 300,
  action,
}: {
  title: string;
  data: Record<string, unknown>[];
  series: SeriesConfig[];
  height?: number;
  action?: ReactNode;
}) {
  return (
    <ChartPanel title={title} height={height} action={action}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={axisTick} />
        <YAxis tickLine={false} axisLine={false} width={48} tick={axisTick} />
        <Tooltip {...tooltipProps} />
        <Legend
          verticalAlign="bottom"
          height={28}
          iconType="plainline"
          wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            animationDuration={900}
          />
        ))}
      </LineChart>
    </ChartPanel>
  );
}

/* ------------------------------------------------------------------ */
/* Coloured bar chart                                                  */
/* ------------------------------------------------------------------ */

export function CategoryBarChart({
  title,
  data,
  height = 300,
  action,
}: {
  title: string;
  data: { label: string; value: number; color: string }[];
  height?: number;
  action?: ReactNode;
}) {
  return (
    <ChartPanel title={title} height={height} action={action}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
        <YAxis tickLine={false} axisLine={false} width={48} tick={axisTick} />
        <Tooltip {...tooltipProps} />
        <Bar dataKey="value" radius={[3, 3, 0, 0]} animationDuration={800}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartPanel>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal funnel bars                                              */
/* ------------------------------------------------------------------ */

const toneColor: Record<string, string> = {
  info: "hsl(var(--info))",
  brass: "hsl(var(--brass))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
};

export function FunnelBars({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number; tone?: keyof typeof toneColor }[];
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Panel className="p-5 sm:p-6">
      <h3 className="text-display rule-accent mb-5 text-lg">{title}</h3>
      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-4">
            <span className="w-28 shrink-0 text-xs text-muted-foreground">{r.label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${Math.max(4, (r.value / max) * 100)}%`,
                  background: toneColor[r.tone ?? "info"],
                }}
              />
            </div>
            <span className="num w-16 shrink-0 text-right text-sm">
              {r.value.toLocaleString("en-US")}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Small stat strip                                                    */
/* ------------------------------------------------------------------ */

export function StatStrip({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      {items.map((s) => (
        <div key={s.label} className="rounded-sm border border-border bg-muted/25 p-3 text-center">
          <p className="text-display num text-xl">{s.value}</p>
          <p className="label-eyebrow mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
