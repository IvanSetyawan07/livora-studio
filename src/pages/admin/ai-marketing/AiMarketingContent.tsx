import { AgentPageShell } from "@/components/ai/agent-page";
import { ContentQueue } from "@/components/ai/content-queue";
import {
  CategoryBarChart,
  MultiLineChart,
  StatGrid,
  StatStrip,
} from "@/components/ai/dashboard-charts";
import { DemoBadge, NotConnected, Panel, SectionHeading } from "@/components/ai/primitives";
import { agentById, contentQueue } from "@/lib/ai/data";
import {
  postsByPlatform,
  socialEngagementSeries,
  socialKpis,
  socialSeriesConfig,
  socialStats,
} from "@/lib/ai/dashboard-data";

export default function ContentAgentPage() {
  const agent = agentById("content")!;

  return (
    <AgentPageShell agent={agent}>
      <section className="mt-10">
        <SectionHeading
          title="Social media — performance tracking"
          description="Followers, publishing cadence and engagement across Instagram, Facebook, TikTok and YouTube."
          action={<DemoBadge />}
        />
        <StatGrid kpis={socialKpis} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <MultiLineChart
          title="Engagement by Platform (30 Days)"
          data={socialEngagementSeries}
          series={socialSeriesConfig}
          height={300}
        />
        <div>
          <CategoryBarChart
            title="Posts Published by Platform (7d)"
            data={postsByPlatform}
            height={240}
          />
          <StatStrip items={socialStats} />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Content queue"
          description="Planned and AI-assisted content across owned and social surfaces."
          action={<DemoBadge />}
        />
        <ContentQueue items={contentQueue} />
      </section>

      <section className="mt-10">
        <Panel className="p-6">
          <SectionHeading title="Generation" />
          <NotConnected
            state="coming_soon"
            title="Draft generation runs through Claude"
            description="Briefs and drafts will be produced server-side and enter the queue as Needs Review — never published automatically."
          />
        </Panel>
      </section>
    </AgentPageShell>
  );
}
