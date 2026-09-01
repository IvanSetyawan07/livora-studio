// src/pages/admin/ai-marketing/AiMarketingCro.tsx
import { AgentPageShell } from "@/components/ai/agent-page";
import { InsightCard } from "@/components/ai/insight-card";
import { DemoBadge, NotConnected, Panel, Reveal, SectionHeading } from "@/components/ai/primitives";
import { useAgent, useAiInsights } from "@/hooks/useAiDashboard";

export default function CroAgentPage() {
  const { agent } = useAgent("cro");
  const { data: agentInsights = [], isLoading } = useAiInsights("all", "cro");

  return (
    <AgentPageShell agent={agent}>
      <section className="mt-10">
        <SectionHeading
          title="Conversion overview"
          description="Funnel and CTA performance are sourced from existing Web Analytics; session-level behaviour needs a capture layer."
          action={<DemoBadge />}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {["Consultation starts", "Funnel completion", "Avg. abandon step", "CTA click rate"].map(
            (label, i) => (
              <Reveal key={label} delay={i * 60}>
                <Panel className="p-5">
                  <p className="label-eyebrow">{label}</p>
                  <p className="text-display mt-2 text-2xl text-muted-foreground">—</p>
                  <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                    Awaiting orchestration
                  </p>
                </Panel>
              </Reveal>
            ),
          )}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading
          title="AI insights"
          description="Funnel drop-off, anomalies and UX friction detected across the site."
        />
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
              role="status"
              aria-label="Loading insights"
            />
          </div>
        ) : agentInsights.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {agentInsights.map((i, idx) => (
              <Reveal key={i.id} delay={idx * 70}>
                <InsightCard insight={i} />
              </Reveal>
            ))}
          </div>
        ) : (
          <NotConnected
            title="No conversion insights yet"
            description="The CRO Agent will surface funnel and UX friction findings here once it runs."
          />
        )}
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <SectionHeading title="Page performance" />
          <NotConnected
            title="Per-page conversion breakdown is not enabled"
            description="Page-level conversion and drop-off rates will populate from Web Analytics once the CRO Agent is running."
          />
        </Panel>
        <Panel className="p-6">
          <SectionHeading title="Session behaviour" />
          <NotConnected
            title="Session behaviour capture is not connected"
            description="Scroll depth, rage clicks and form abandonment need a client-side capture layer in the Laravel backend."
          />
        </Panel>
      </section>
    </AgentPageShell>
  );
}