import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Viewport reveal                                                     */
/* ------------------------------------------------------------------ */

export function useInView<T extends HTMLElement>(once = true) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            if (once) io.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return { ref, inView };
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
        inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Typography + chrome                                                 */
/* ------------------------------------------------------------------ */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("label-eyebrow", className)}>{children}</p>;
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="rule-accent">
        <h2 className="text-display text-xl leading-tight sm:text-2xl">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className,
  hover = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("panel", hover && "panel-hover", className)} style={style}>
      {children}
    </div>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brass";

const toneText: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
  brass: "text-brass",
};

const toneBg: Record<Tone, string> = {
  neutral: "bg-muted-foreground/12 text-muted-foreground",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-destructive/14 text-destructive",
  info: "bg-info/12 text-info",
  brass: "bg-brass/12 text-brass",
};

export function StatusDot({
  tone = "neutral",
  pulse = false,
  className,
}: {
  tone?: Tone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 shrink-0 rounded-full bg-current",
        toneText[tone],
        pulse && "animate-[pulse-dot_2.4s_ease-in-out_infinite]",
        className,
      )}
    />
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase",
        toneBg[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

export function CountUp({
  value,
  duration = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (typeof window === "undefined") {
      setDisplay(value);
      return;
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value === 0) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={cn("num", className)}>
      {prefix}
      {display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

export function Sparkline({
  points,
  className,
  tone = "brass",
}: {
  points: number[];
  className?: string;
  tone?: "brass" | "muted";
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const d = points
    .map((p, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * 100;
      const y = 24 - ((p - min) / span) * 22;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div ref={ref} className={cn("h-6 w-full", className)}>
      <svg viewBox="0 0 100 26" preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
          className={tone === "brass" ? "text-brass/80" : "text-muted-foreground/50"}
          style={{
            strokeDasharray: 200,
            strokeDashoffset: inView ? 0 : 200,
            transition: "stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </svg>
    </div>
  );
}

export function ConfidenceBar({ value, className }: { value: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <span className="label-eyebrow">AI Confidence</span>
        <span className="num text-xs text-brass">{value}%</span>
      </div>
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-brass transition-[width] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: inView ? `${value}%` : "0%" }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Integration states                                                  */
/* ------------------------------------------------------------------ */

export function NotConnected({
  title,
  description,
  state = "not_connected",
  className,
  children,
}: {
  title: string;
  description: string;
  state?: "not_connected" | "coming_soon" | "awaiting_integration";
  className?: string;
  children?: ReactNode;
}) {
  const labels = {
    not_connected: "Not connected",
    coming_soon: "Coming soon",
    awaiting_integration: "Awaiting integration",
  } as const;

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-sm border border-dashed border-border-strong bg-background/40 p-5",
        className,
      )}
    >
      <Pill tone="neutral">
        <StatusDot tone="neutral" /> {labels[state]}
      </Pill>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase",
        className,
      )}
      title="Illustrative preview data — not production analytics"
    >
      Demo preview
    </span>
  );
}
