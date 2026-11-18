import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { AIActivity } from "@/lib/ai/types";
import { useMarkActivityRead } from "@/hooks/useAiDashboard";
import { cn } from "@/lib/utils";
import { Panel, Reveal, StatusDot } from "./primitives";

const kindTone: Record<string, "info" | "brass" | "success" | "warning" | "neutral"> = {
  analysis: "info",
  agent_run: "info",
  insight: "brass",
  recommendation: "success",
  approval: "warning",
  action: "success",
  execution: "success",
  alert: "warning",
  system: "neutral",
};

function formatTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function resolveActivityTarget(a: AIActivity): string | null {
  if (a.href) return a.href;
  const routes: Record<string, string> = {
    seo: "/admin/ai-marketing/seo",
    content: "/admin/ai-marketing/content",
    ads: "/admin/ai-marketing/ads",
    leads: "/admin/ai-marketing/leads",
    cro: "/admin/ai-marketing/cro",
  };
  if (a.kind === "approval") return "/admin/ai-marketing/ai-center/recommendations";
  if (a.kind === "action") return "/admin/ai-marketing/ai-center/actions";
  if (a.kind === "insight") return "/admin/ai-marketing/insights";
  return routes[a.agent] ?? null;
}

export function ActivityStream({
  items,
  compact = false,
}: {
  items: AIActivity[];
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const markRead = useMarkActivityRead();

  function onItemClick(a: AIActivity) {
    if (!a.read) {
      markRead.mutate(a.id);
    }
    const target = resolveActivityTarget(a);
    if (target) {
      navigate(target);
    }
  }

  return (
    <Panel className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <p className="label-eyebrow">AI Activity</p>
        <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          <StatusDot tone="success" /> Audit Trail
        </span>
      </div>

      <ol className="mt-4 flex-1 space-y-0 overflow-hidden">
        {items.slice(0, compact ? 6 : items.length).map((a, i) => {
          const target = resolveActivityTarget(a);
          const tone = kindTone[a.kind] ?? "neutral";
          return (
            <Reveal key={a.id} delay={i * 40}>
              <li className="group relative flex gap-3 py-2.5">
                <span className="num w-24 shrink-0 pt-1 text-[11px] text-muted-foreground">
                  {formatTime(a.time)}
                </span>
                <span className="relative flex w-3 shrink-0 justify-center">
                  <span className="absolute top-2 bottom-[-1.25rem] w-px bg-border group-last:hidden" />
                  <StatusDot
                    tone={tone}
                    pulse={!a.read}
                    className="relative mt-2"
                  />
                </span>
                <button
                  type="button"
                  onClick={() => onItemClick(a)}
                  disabled={!target}
                  className={cn(
                    "min-w-0 flex-1 rounded-sm px-2 py-1 text-left transition-colors",
                    target ? "hover:bg-accent/50" : "cursor-default",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      {a.title ? (
                        <span className="block text-xs font-medium text-foreground">{a.title}</span>
                      ) : null}
                      <span className={cn("block text-sm leading-snug", a.title ? "text-xs text-muted-foreground" : "text-foreground/90")}>
                        {a.message}
                      </span>
                    </span>
                    {target ? (
                      <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    ) : null}
                  </div>
                  <span className="mt-0.5 block font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                    {a.actor}
                    {!a.read ? " · belum dibaca" : ""}
                  </span>
                </button>
              </li>
            </Reveal>
          );
        })}
      </ol>
    </Panel>
  );
}
