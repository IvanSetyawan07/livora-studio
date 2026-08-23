import { Link } from "react-router-dom";
import { ArrowUpRight, Bot, LineChart, Megaphone, PenLine, Users } from "lucide-react";
import type { AIAgent, AIAgentStatus } from "@/lib/ai/types";
import { Panel, Pill, StatusDot } from "./primitives";

const icons = {
  seo: LineChart,
  content: PenLine,
  ads: Megaphone,
  leads: Users,
  cro: Bot,
} as const;

export const statusMeta: Record<
  AIAgentStatus,
  { label: string; tone: "success" | "info" | "warning" | "neutral" | "danger"; pulse: boolean }
> = {
  active: { label: "Active", tone: "success", pulse: true },
  running: { label: "Running", tone: "info", pulse: true },
  paused: { label: "Paused", tone: "warning", pulse: false },
  coming_soon: { label: "Coming soon", tone: "neutral", pulse: false },
  error: { label: "Error", tone: "danger", pulse: true },
};

export function AgentCard({ agent }: { agent: AIAgent }) {
  const Icon = icons[agent.id];
  const meta = statusMeta[agent.status];

  return (
    <Link
      to={agent.href}
      className="panel panel-hover group flex w-[260px] shrink-0 flex-col justify-between p-5 sm:w-auto"
    >
      <div>
        <div className="flex items-start justify-between">
          <Icon className="size-4 text-brass" />
          <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
        <h3 className="text-display mt-4 text-base">{agent.name}</h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {agent.purpose}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <Pill tone={meta.tone}>
          <StatusDot tone={meta.tone} pulse={meta.pulse} />
          {meta.label}
        </Pill>
        <dl className="grid grid-cols-3 gap-2 border-t border-border pt-3">
          <Stat label="Insights" value={agent.insightsCount} />
          <Stat label="Recs" value={agent.recommendationsCount} />
          <Stat label="Pending" value={agent.pendingApprovals} />
        </dl>
        <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Last run · {agent.lastRun ?? "never"}
        </p>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="label-eyebrow">{label}</dt>
      <dd className="num mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

export function AgentRail({ agents }: { agents: AIAgent[] }) {
  return (
    <div className="scroll-rail -mx-1 flex gap-4 px-1 pb-3 lg:grid lg:grid-cols-5 lg:overflow-visible">
      {agents.map((a) => (
        <AgentCard key={a.id} agent={a} />
      ))}
    </div>
  );
}

export function AgentPipeline() {
  const steps = ["Observe", "Analyse", "Identify", "Recommend", "Approve", "Execute", "Monitor"];
  return (
    <Panel className="p-5">
      <p className="label-eyebrow">Agent operating loop</p>
      <ol className="scroll-rail mt-4 flex items-center gap-2 pb-2">
        {steps.map((s, i) => (
          <li key={s} className="flex shrink-0 items-center gap-2">
            <span className="rounded-sm border border-border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase">
              {s}
            </span>
            {i < steps.length - 1 ? <span className="h-px w-5 bg-border-strong" /> : null}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Agents are autonomous workers, not chatbots. Nothing reaches production without human approval.
      </p>
    </Panel>
  );
}
