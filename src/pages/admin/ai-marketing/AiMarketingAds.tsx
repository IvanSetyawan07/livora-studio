import { AgentPageShell } from "@/components/ai/agent-page";
import {
  CategoryBarChart,
  FunnelBars,
  MultiLineChart,
  StatGrid,
} from "@/components/ai/dashboard-charts";
import { InsightCard } from "@/components/ai/insight-card";
import { DemoBadge, NotConnected, Reveal, SectionHeading } from "@/components/ai/primitives";
import { agentById, insights } from "@/lib/ai/data";
import { adsFunnel, adsKpis, adsSeries, adsSeriesConfig, spendByPlatform } from "@/lib/ai/dashboard-data";

export default function AdsAgentPage() {
  const agent = agentById("ads")!;
  const agentInsights = insights.filter((i) => i.agent === "ads");

  return (
    <AgentPageShell agent={agent}>
      <section className="mt-10">
        <SectionHeading
          title="Ads — campaign performance"
          description="Spend, leads, cost per lead and ROAS across Google Ads, Meta Ads, Instagram and YouTube."
          action={<DemoBadge />}
        />
        <StatGrid kpis={adsKpis} />
      </section>

      <section className="mt-6">
        <MultiLineChart
          title="Campaign Performance (30 Days)"
          data={adsSeries}
          series={adsSeriesConfig}
          height={340}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <CategoryBarChart title="Spend by Platform" data={spendByPlatform} height={280} />
        <FunnelBars title="Conversion Funnel" rows={adsFunnel} />
      </section>

      <section className="mt-10">
        <SectionHeading
          title="AI insights"
          description="Budget and creative recommendations the Ads Agent has surfaced."
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
            title="No ads insights yet"
            description="The Ads Agent will surface budget shifts and creative fatigue warnings here once it runs."
          />
        )}
      </section>
    </AgentPageShell>
  );
}
