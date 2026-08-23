import { Check, Clock, Circle } from "lucide-react";
import { AgentPageShell } from "@/components/ai/agent-page";
import { CategoryBarChart, FunnelBars, StatGrid } from "@/components/ai/dashboard-charts";
import { InsightCard } from "@/components/ai/insight-card";
import {
  DemoBadge,
  NotConnected,
  Panel,
  Pill,
  Reveal,
  SectionHeading,
} from "@/components/ai/primitives";
import { agentById, insights } from "@/lib/ai/data";
import {
  emailFunnel,
  followUpLeads,
  followUpSteps,
  opsKpis,
  type FollowUpLead,
} from "@/lib/ai/dashboard-data";

function LeadTimeline({ lead }: { lead: FollowUpLead }) {
  return (
    <Panel hover className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {lead.status === "Responded" ? (
            <Check className="size-4 text-success" />
          ) : (
            <Clock className="size-4 text-warning" />
          )}
          <h4 className="text-display text-lg">{lead.name}</h4>
        </div>
        <Pill tone={lead.status === "Responded" ? "success" : "warning"}>{lead.status}</Pill>
      </div>

      <ol className="mt-4 space-y-3">
        {lead.steps.map((s) => (
          <li key={s.title} className="flex gap-3">
            <span className="mt-0.5">
              {s.state === "done" ? (
                <Check className="size-3.5 text-success" />
              ) : s.state === "active" ? (
                <Clock className="size-3.5 text-warning" />
              ) : (
                <Circle className="size-3.5 text-muted-foreground" />
              )}
            </span>
            <div>
              <p className="text-sm">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.note}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export default function LeadsAgentPage() {
  const agent = agentById("leads")!;
  const agentInsights = insights.filter((i) => i.agent === "leads");

  return (
    <AgentPageShell agent={agent}>
      <section className="mt-10">
        <SectionHeading
          title="Operations — email & follow-up"
          description="Automated sequences, response speed and recovered leads across the follow-up programme."
          action={<DemoBadge />}
        />
        <StatGrid kpis={opsKpis} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <CategoryBarChart
          title="Response Rate by Follow-Up Step"
          data={followUpSteps}
          height={280}
        />
        <FunnelBars title="Email Funnel (This Week)" rows={emailFunnel} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {followUpLeads.map((lead, i) => (
          <Reveal key={lead.id} delay={i * 80}>
            <LeadTimeline lead={lead} />
          </Reveal>
        ))}
      </section>

      <section className="mt-10">
        <SectionHeading
          title="AI insights"
          description="High-intent identities flagged by repeat visits, catalogue downloads and wishlist activity."
        />
        {agentInsights.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {agentInsights.map((i, idx) => (
              <Reveal key={i.id} delay={idx * 70}>
                <InsightCard insight={i} />
              </Reveal>
            ))}
          </div>
        ) : (
          <NotConnected
            title="No lead insights yet"
            description="The Lead Intelligence Agent will surface scored, high-intent identities here once it runs."
          />
        )}
      </section>
    </AgentPageShell>
  );
}
