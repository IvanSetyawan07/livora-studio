import { useEffect, useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { ThemeTokens } from "./useThemeTokens";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const compactNumber = (value: number) => {
  const n = Number.isFinite(value) ? value : 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(n)}`;
};

export const formatDay = (iso: string, long = false) => {
  try {
    const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return iso;
    return long
      ? date.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
};

const niceMax = (value: number) => {
  if (value <= 5) return 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
};

const smoothPath = (points: [number, number][]) => {
  if (points.length === 0) return "";
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  }
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
  }
  return d;
};

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

function useProgress(dep: unknown, duration = 800) {
  const [progress, setProgress] = useState(() => (reducedMotion() ? 1 : 0));

  useEffect(() => {
    if (reducedMotion()) {
      setProgress(1);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const ratio = Math.min(1, (now - start) / duration);
      setProgress(easeOutCubic(ratio));
      if (ratio < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dep, duration]);

  return progress;
}

/* ------------------------------------------------------------------ */
/* panel + counters                                                    */
/* ------------------------------------------------------------------ */

export function Panel({
  title,
  subtitle,
  right,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-xl border border-border bg-card ${className}`}
    >
      <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="min-w-0">
          <h2 className="serif text-lg leading-tight">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </header>
      <div className={`px-5 pb-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));

  useEffect(() => {
    if (reducedMotion()) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const ratio = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * easeOutCubic(ratio)));
      if (ratio < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className={className}>{shown.toLocaleString("id-ID")}</span>;
}

/* ------------------------------------------------------------------ */
/* sparkline                                                           */
/* ------------------------------------------------------------------ */

export function Sparkline({
  values,
  color,
  height = 34,
}: {
  values: number[];
  color: string;
  height?: number;
}) {
  const gradientId = useId().replace(/:/g, "");

  if (!values || values.length < 2) return null;

  const width = 120;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const points = values.map(
    (value, index) =>
      [
        (index / (values.length - 1)) * width,
        height - 4 - ((value - min) / span) * (height - 10),
      ] as [number, number],
  );
  const line = smoothPath(points);
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden
      className="block"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* traffic chart (hover crosshair, pin, series toggle)                 */
/* ------------------------------------------------------------------ */

export type ChartSeries = { key: string; label: string; color: string };

export function TrafficChart({
  data,
  series,
  height = 320,
}: {
  data: Array<Record<string, number | string>>;
  series: ChartSeries[];
  height?: number;
}) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const gradientPrefix = useId().replace(/:/g, "");
  const progress = useProgress(data, 800);

  const pad = { top: 16, right: 14, bottom: 28, left: 46 };
  const plotWidth = Math.max(24, width - pad.left - pad.right);
  const plotHeight = Math.max(24, height - pad.top - pad.bottom);

  const maxValue = niceMax(
    Math.max(1, ...data.flatMap((row) => series.map((s) => Number(row[s.key] ?? 0)))),
  );

  const xAt = (index: number) =>
    pad.left + (plotWidth * index) / Math.max(1, data.length - 1);
  const yAt = (value: number) =>
    pad.top + plotHeight - (Math.max(0, value) / maxValue) * plotHeight;

  const activeIndex = hover ?? pinned;
  const activeRow = activeIndex !== null ? data[activeIndex] : undefined;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => maxValue * fraction);
  const tickEvery = Math.max(1, Math.ceil(data.length / 6));

  const totalOf = (key: string) =>
    data.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);

  const handleMove = (event: ReactPointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / Math.max(1, rect.width);
    setHover(
      Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1)))),
    );
  };

  const legend = (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      {series.map((item) => {
        const isHidden = Boolean(hidden[item.key]);
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setHidden((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              isHidden
                ? "border-border/70 text-muted-foreground/60"
                : "border-border bg-muted/60 text-foreground"
            }`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full transition-opacity"
              style={{ background: item.color, opacity: isHidden ? 0.35 : 1 }}
            />
            {item.label}
            <span className="tabular-nums text-muted-foreground">
              {compactNumber(totalOf(item.key))}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (!data.length) {
    return (
      <div>
        {legend}
        <div
          className="flex items-center justify-center rounded-lg border border-dashed border-border/70 text-xs text-muted-foreground"
          style={{ height }}
        >
          Belum ada data pada periode ini.
        </div>
      </div>
    );
  }

  return (
    <div>
      {legend}
      <div ref={wrapRef} className="relative w-full" style={{ height }}>
        {width > 0 ? (
          <svg width={width} height={height} className="block overflow-visible">
            <defs>
              {series.map((item) => (
                <linearGradient
                  key={item.key}
                  id={`${gradientPrefix}-${item.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={item.color} stopOpacity="0.34" />
                  <stop offset="100%" stopColor={item.color} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>

            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={pad.left}
                  x2={pad.left + plotWidth}
                  y1={yAt(tick)}
                  y2={yAt(tick)}
                  stroke="currentColor"
                  className="text-border"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 ? undefined : "3 5"}
                />
                <text
                  x={pad.left - 10}
                  y={yAt(tick) + 3}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  style={{ fontSize: 10 }}
                >
                  {compactNumber(tick)}
                </text>
              </g>
            ))}

            {data.map((row, index) =>
              index % tickEvery === 0 || index === data.length - 1 ? (
                <text
                  key={`x-${index}`}
                  x={xAt(index)}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: 10 }}
                >
                  {formatDay(String(row.date ?? ""))}
                </text>
              ) : null,
            )}

            {series.map((item) => {
              if (hidden[item.key]) return null;
              const points = data.map(
                (row, index) =>
                  [
                    xAt(index),
                    yAt(Number(row[item.key] ?? 0) * progress),
                  ] as [number, number],
              );
              const line = smoothPath(points);
              const area = `${line} L ${xAt(data.length - 1)} ${
                pad.top + plotHeight
              } L ${pad.left} ${pad.top + plotHeight} Z`;
              return (
                <g key={item.key}>
                  <path d={area} fill={`url(#${gradientPrefix}-${item.key})`} />
                  <path
                    d={line}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {activeRow ? (
              <g pointerEvents="none">
                <line
                  x1={xAt(activeIndex as number)}
                  x2={xAt(activeIndex as number)}
                  y1={pad.top}
                  y2={pad.top + plotHeight}
                  stroke="currentColor"
                  className="text-foreground/25"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
                {series
                  .filter((item) => !hidden[item.key])
                  .map((item) => (
                    <circle
                      key={item.key}
                      cx={xAt(activeIndex as number)}
                      cy={yAt(Number(activeRow[item.key] ?? 0))}
                      r={4}
                      fill={item.color}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    />
                  ))}
              </g>
            ) : null}

            <rect
              x={pad.left}
              y={pad.top}
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              style={{ cursor: "crosshair" }}
              onPointerMove={handleMove}
              onPointerLeave={() => setHover(null)}
              onClick={() =>
                setPinned((current) => (current === hover ? null : hover))
              }
            />
          </svg>
        ) : null}

        {activeRow ? (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-[230px] rounded-lg border border-border bg-popover/95 px-3 py-2 shadow-lg backdrop-blur"
            style={{
              left: Math.min(Math.max(xAt(activeIndex as number), 78), Math.max(78, width - 78)),
              top: 2,
              transform: "translateX(-50%)",
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {formatDay(String(activeRow.date ?? ""), true)}
            </p>
            <div className="mt-1.5 space-y-1">
              {series.map((item) => (
                <div
                  key={item.key}
                  className={`flex items-center justify-between gap-4 ${
                    hidden[item.key] ? "opacity-40" : ""
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: item.color }}
                    />
                    {item.label}
                  </span>
                  <span className="text-[11px] font-medium tabular-nums">
                    {Number(activeRow[item.key] ?? 0).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              {pinned === activeIndex ? "Tersemat · klik untuk lepas" : "Klik untuk menyematkan"}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* donut                                                               */
/* ------------------------------------------------------------------ */

const arcPath = (
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
) => {
  const x1 = cx + radius * Math.cos(start);
  const y1 = cy + radius * Math.sin(start);
  const x2 = cx + radius * Math.cos(end);
  const y2 = cy + radius * Math.sin(end);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
};

export function DonutChart({
  data,
  palette,
  size = 200,
}: {
  data: Array<{ label: string; value: number }>;
  palette: ThemeTokens;
  size?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const progress = useProgress(data, 900);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = [palette.ink, palette.bronze, palette.accent, palette.muted];
  const center = size / 2;
  const thickness = size * 0.14;
  const radius = center - thickness / 2 - 3;
  const gap = 0.035;

  let cursor = -Math.PI / 2;
  const segments = data.map((item, index) => {
    const fraction = total > 0 ? item.value / total : 0;
    const start = cursor;
    const end = cursor + fraction * Math.PI * 2 * progress;
    cursor += fraction * Math.PI * 2;
    return { ...item, fraction, start, end, color: colors[index % colors.length] };
  });

  if (!data.length || total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-border/70 text-xs text-muted-foreground">
        Belum ada klik tercatat pada periode ini.
      </div>
    );
  }

  const focused = active !== null ? segments[active] : undefined;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} className="shrink-0">
        {segments.map((segment, index) => {
          if (segment.end - segment.start < 0.001) return null;
          const mid = (segment.start + segment.end) / 2;
          const isActive = active === index;
          const offset = isActive ? 5 : 0;
          const dash = Math.max(0, segment.end - segment.start - gap);
          return (
            <path
              key={segment.label}
              d={arcPath(center, center, radius, segment.start + gap / 2, segment.start + gap / 2 + dash)}
              fill="none"
              stroke={segment.color}
              strokeWidth={isActive ? thickness + 4 : thickness}
              strokeLinecap="round"
              style={{
                transform: `translate(${Math.cos(mid) * offset}px, ${Math.sin(mid) * offset}px)`,
                transition: "transform 220ms ease, stroke-width 220ms ease, opacity 220ms ease",
                opacity: active === null || isActive ? 1 : 0.45,
                cursor: "pointer",
              }}
              onPointerEnter={() => setActive(index)}
              onPointerLeave={() => setActive(null)}
            />
          );
        })}
        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}
        >
          {focused ? focused.label.toUpperCase() : "TOTAL"}
        </text>
        <text
          x={center}
          y={center + 16}
          textAnchor="middle"
          className="fill-foreground serif"
          style={{ fontSize: 24 }}
        >
          {(focused ? focused.value : total).toLocaleString("id-ID")}
        </text>
      </svg>

      <div className="min-w-[130px] flex-1 space-y-2">
        {segments.map((segment, index) => (
          <button
            key={segment.label}
            type="button"
            onPointerEnter={() => setActive(index)}
            onPointerLeave={() => setActive(null)}
            className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-1 text-left transition-colors ${
              active === index ? "bg-muted/70" : ""
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: segment.color }}
              />
              <span className="truncate text-xs text-foreground/85">{segment.label}</span>
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {Math.round(segment.fraction * 100)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* rank bars                                                           */
/* ------------------------------------------------------------------ */

export function RankBars({
  data,
  color,
  max = 6,
  onSelect,
  emptyLabel = "Belum ada data pada periode ini.",
}: {
  data: Array<{ label: string; value: number }>;
  color: string;
  max?: number;
  onSelect?: () => void;
  emptyLabel?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const progress = useProgress(data, 800);
  const rows = [...data].sort((a, b) => b.value - a.value).slice(0, max);
  const top = Math.max(1, ...rows.map((row) => row.value));

  if (!rows.length) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const percentage = (row.value / top) * 100;
        const isActive = active === index;
        return (
          <button
            key={`${row.label}-${index}`}
            type="button"
            onClick={onSelect}
            onPointerEnter={() => setActive(index)}
            onPointerLeave={() => setActive(null)}
            className="group block w-full text-left"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`text-[10px] tabular-nums ${
                    isActive ? "text-foreground" : "text-muted-foreground/60"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={`truncate text-xs ${
                    isActive ? "text-foreground" : "text-foreground/80"
                  }`}
                  title={row.label}
                >
                  {row.label}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {row.value.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${percentage * progress}%`,
                  background: color,
                  opacity: isActive ? 1 : 0.72,
                  transition: "opacity 200ms ease",
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
