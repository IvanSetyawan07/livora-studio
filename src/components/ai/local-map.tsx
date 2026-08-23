import { useState } from "react";
import { Panel, Pill, StatusDot } from "./primitives";
import { cn } from "@/lib/utils";

type Point = { id: string; x: number; y: number; label: string; rank: string; self?: boolean };

const points: Point[] = [
  { id: "livora", x: 50, y: 48, label: "Livora Studio", rank: "Illustrative position", self: true },
  { id: "c1", x: 27, y: 32, label: "Competitor A", rank: "No data" },
  { id: "c2", x: 72, y: 62, label: "Competitor B", rank: "No data" },
  { id: "c3", x: 82, y: 30, label: "Competitor C", rank: "No data" },
  { id: "c4", x: 36, y: 72, label: "Competitor D", rank: "No data" },
];

export function LocalMap() {
  const [hover, setHover] = useState<Point | null>(null);

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div className="rule-accent">
          <h3 className="text-display text-lg">Local presence</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Map surface prepared for a future Google Business Profile connection.
          </p>
        </div>
        <Pill tone="neutral">
          <StatusDot tone="neutral" /> Not connected
        </Pill>
      </div>

      <div className="relative aspect-[16/8] w-full bg-background/60">
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          {Array.from({ length: 9 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={`${(i + 1) * 10}%`}
              y1="0"
              x2={`${(i + 1) * 10}%`}
              y2="100%"
              stroke="hsl(var(--border))"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1="0"
              y1={`${(i + 1) * 16.6}%`}
              x2="100%"
              y2={`${(i + 1) * 16.6}%`}
              stroke="hsl(var(--border))"
              strokeWidth="1"
            />
          ))}
        </svg>

        {points.map((p) => (
          <button
            key={p.id}
            onMouseEnter={() => setHover(p)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(p)}
            onBlur={() => setHover(null)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            aria-label={p.label}
          >
            <span
              className={cn(
                "block rounded-full transition-transform duration-300",
                p.self
                  ? "size-3 bg-brass ring-6 ring-brass/15 hover:scale-125"
                  : "size-2 bg-muted-foreground/60 hover:scale-150",
              )}
            />
          </button>
        ))}

        {hover ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[160%] rounded-sm border border-border-strong bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
            style={{ left: `${hover.x}%`, top: `${hover.y}%` }}
          >
            <span className="block">{hover.label}</span>
            <span className="block font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              {hover.rank}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border p-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <StatusDot tone="brass" /> Livora
        </span>
        <span className="flex items-center gap-2">
          <StatusDot tone="neutral" /> Nearby studios
        </span>
        <span className="ml-auto">Positions are illustrative until map data is connected.</span>
      </div>
    </Panel>
  );
}
