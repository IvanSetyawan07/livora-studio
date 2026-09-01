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

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brass" | "ai" | "insight";

export const toneText: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
  brass: "text-brass",
  ai: "text-ai",
  insight: "text-insight",
};

const toneBg: Record<Tone, string> = {
  neutral: "bg-muted-foreground/12 text-muted-foreground",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-destructive/14 text-destructive",
  info: "bg-info/12 text-info",
  brass: "bg-brass/12 text-brass",
  ai: "bg-ai/12 text-ai",
  insight: "bg-insight/12 text-insight",
};

/** Shared risk vocabulary for the AI Action Center. Distinct from the
 * narrower `AIRisk` recommendation type in lib/ai/types — this one adds
 * "critical" for actions that must never auto-execute. */
export type ExecutionRisk = "low" | "medium" | "high" | "critical";

export const riskTone: Record<ExecutionRisk, Tone> = {
  low: "success",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

export function RiskPill({ risk, className }: { risk: ExecutionRisk; className?: string }) {
  return (
    <Pill tone={riskTone[risk]} className={className}>
      <StatusDot tone={riskTone[risk]} pulse={risk === "critical"} />
      {risk} risk
    </Pill>
  );
}

/** Priority vocabulary for Today's Priorities / AI Recommendations. */
export type Priority = "low" | "medium" | "high";

export const priorityTone: Record<Priority, Tone> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

export function PriorityPill({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <Pill tone={priorityTone[priority]} className={cn("font-semibold", className)}>
      <StatusDot tone={priorityTone[priority]} pulse={priority === "high"} />
      {priority}
    </Pill>
  );
}

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

const sparklineToneClass: Record<string, string> = {
  brass: "text-brass/80",
  ai: "text-ai/80",
  insight: "text-insight/80",
  success: "text-success/80",
  warning: "text-warning/80",
  danger: "text-destructive/80",
  info: "text-info/80",
  muted: "text-muted-foreground/50",
};

export function Sparkline({
  points,
  className,
  tone = "brass",
}: {
  points: number[];
  className?: string;
  tone?: "brass" | "ai" | "insight" | "success" | "warning" | "danger" | "info" | "muted";
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
          className={sparklineToneClass[tone] ?? sparklineToneClass.muted}
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

/** Generic labelled, animated progress bar — used for AI confidence,
 * routing quality/speed/cost, and anywhere else a percentage needs to
 * feel alive instead of static. */
export function AnimatedBar({
  label,
  value,
  valueLabel,
  tone = "ai",
  className,
}: {
  label: string;
  value: number;
  valueLabel?: string;
  tone?: Tone;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const fillClass =
    tone === "ai"
      ? "bg-ai"
      : tone === "insight"
        ? "bg-insight"
        : tone === "success"
          ? "bg-success"
          : tone === "warning"
            ? "bg-warning"
            : tone === "danger"
              ? "bg-destructive"
              : tone === "info"
                ? "bg-info"
                : "bg-brass";
  return (
    <div ref={ref} className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <span className="label-eyebrow">{label}</span>
        <span className={cn("num text-xs", toneText[tone])}>{valueLabel ?? `${Math.round(value)}%`}</span>
      </div>
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-border">
        <div
          className={cn("h-full rounded-full transition-[width] duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)]", fillClass)}
          style={{ width: inView ? `${Math.max(0, Math.min(100, value))}%` : "0%" }}
        />
      </div>
    </div>
  );
}

/**
 * Animated circular percentage gauge — the signature "alive number" for
 * Business Health and any other headline score. Sweeps in on view instead
 * of appearing static, so the dashboard never feels flat or sleep-inducing.
 */
export function RadialGauge({
  value,
  size = 128,
  strokeWidth = 10,
  tone = "ai",
  suffix = "",
  label,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: "ai" | "success" | "warning" | "danger" | "insight";
  suffix?: string;
  label?: string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const strokeColor =
    tone === "success"
      ? "hsl(var(--success))"
      : tone === "warning"
        ? "hsl(var(--warning))"
        : tone === "danger"
          ? "hsl(var(--destructive))"
          : tone === "insight"
            ? "hsl(var(--insight))"
            : "hsl(var(--ai))";

  return (
    <div ref={ref} className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={inView ? offset : circumference}
          style={{
            transition: "stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1)",
            filter: `drop-shadow(0 0 6px ${strokeColor.replace(")", " / 0.35)")})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
        <CountUp value={value} duration={1300} className="text-display text-3xl leading-none" suffix={suffix} />
        {label ? <span className="label-eyebrow mt-1">{label}</span> : null}
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

