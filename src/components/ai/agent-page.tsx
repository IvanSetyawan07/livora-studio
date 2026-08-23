import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { statusMeta } from "@/components/ai/agent-rail";
import {
  NotConnected,
  Panel,
  Pill,
  Reveal,
  SectionHeading,
  StatusDot,
} from "@/components/ai/primitives";
import type { AIAgent } from "@/lib/ai/types";

const connLabel = {
  connected: "Connected",
  not_connected: "Not connected",
  coming_soon: "Coming soon",
} as const;

const connTone = {
  connected: "success",
  not_connected: "neutral",
  coming_soon: "neutral",
} as const;

export function AgentPageShell({
  agent,
  children,
}: {
  agent: AIAgent;
  children?: ReactNode;
}) {
  const meta = statusMeta[agent.status];

  return (
    <>
      <PageHeader
        eyebrow="AI Agent"
        title={agent.name}
        description={agent.purpose}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={meta.tone}>
              <StatusDot tone={meta.tone} pulse={meta.pulse} />
              {meta.label}
            </Pill>
            <Link
              to="/admin/analytics"
              className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-2 text-xs transition-colors hover:bg-accent"
            >
              View full analytics <ExternalLink className="size-3.5" />
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Status", meta.label],
          ["Last run", agent.lastRun ?? "Never"],
          ["Insights generated", String(agent.insightsCount)],
          ["Pending approvals", String(agent.pendingApprovals)],
        ].map(([label, value], i) => (
          <Reveal key={label} delay={i * 60}>
            <Panel hover className="p-5">
              <p className="label-eyebrow">{label}</p>
              <p className="text-display mt-2 text-xl">{value}</p>
            </Panel>
          </Reveal>
        ))}
      </div>

      {children}

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <SectionHeading title="Planned capabilities" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {agent.capabilities.map((c) => (
              <li
                key={c}
                className="rounded-sm border border-border bg-background/40 px-3 py-2 text-sm text-muted-foreground"
              >
                {c}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="p-6">
          <SectionHeading title="Integration status" />
          <ul className="space-y-2">
            {agent.dependencies.map((d) => (
              <li
                key={d.name}
                className="flex items-center justify-between rounded-sm border border-border px-3 py-2.5 text-sm"
              >
                {d.name}
                <Pill tone={connTone[d.state]}>
                  <StatusDot tone={connTone[d.state]} pulse={d.state === "connected"} />
                  {connLabel[d.state]}
                </Pill>
              </li>
            ))}
          </ul>
          <NotConnected
            className="mt-4"
            state="coming_soon"
            title={`${agent.name} execution is not implemented yet`}
            description="This page defines the interface and data contracts. Reasoning will run in the Laravel API via Claude; this dashboard never holds model credentials."
          />
        </Panel>
      </section>
    </>
  );
}
