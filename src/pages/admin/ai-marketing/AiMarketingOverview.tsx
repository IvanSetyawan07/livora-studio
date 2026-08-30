// src/pages/admin/ai-marketing/AiMarketingOverview.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActivityStream } from "@/components/ai/activity-stream";
import { AgentRail } from "@/components/ai/agent-rail";
import { BusinessHealthCard } from "@/components/ai/business-health-card";
import { ChannelPerformanceCard } from "@/components/ai/channel-performance-card";
import { KpiCard } from "@/components/ai/kpi-card";
import { PerformanceChart } from "@/components/ai/performance-chart";
import { PriorityList } from "@/components/ai/priority-list";
import { RecommendationCard } from "@/components/ai/recommendation-card";
import { DemoBadge, Panel, Reveal, SectionHeading } from "@/components/ai/primitives";
import { usePageContext } from "@/context/AiMarketingContext";
import { aiServices } from "@/lib/ai/services";
import type {
  AIAgent,
  AIKpi,
  AIRecommendation,
  BusinessHealth,
  PriorityItem,
} from "@/lib/ai/types";
// Activity feed & channel performance don't have a backend endpoint yet
// (ai_activity_log has no controller, and channel-level performance was
// never scoped) — keep these on demo fixtures until that's built.
import { activity, channelPerformance } from "@/lib/ai/data";

const kpiTones = ["success", "info", "warning", "ai"] as const;
const priorityOrder = { high: 0, medium: 1, low: 2 } as const;

export default function AiMarketingOverview() {
  usePageContext("overview");

  const [loading, setLoading] = useState(true);
  const [businessHealth, setBusinessHealth] = useState<BusinessHealth | null>(null);
  const [overviewKpis, setOverviewKpis] = useState<AIKpi[]>([]);
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [topRecommendations, setTopRecommendations] = useState<AIRecommendation[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [health, kpis, priorityItems, agentList, pendingRecs] = await Promise.all([
        aiServices.dashboard.getBusinessHealth(),
        aiServices.dashboard.getOverviewKpis(),
        aiServices.dashboard.getPriorities(),
        aiServices.dashboard.getAgents(),
        aiServices.recommendations.list({ status: "pending" }),
      ]);

      if (cancelled) return;

      setBusinessHealth(health);
      setOverviewKpis(kpis);
      setPriorities(priorityItems);
      setAgents(agentList);
      setTopRecommendations(
        [...pendingRecs]
          .sort((a, b) => priorityOrder[a.priority ?? "medium"] - priorityOrder[b.priority ?? "medium"])
          .slice(0, 4),
      );
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="AI Marketing"
        title="Overview"
        description="Real-time intelligence and recommendations for Livora's digital growth."
      />

      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-sm border border-border bg-surface/40 px-4 py-3 text-xs text-muted-foreground">
        <DemoBadge />
        Business Health, Priorities, Recommendations and Marketing Systems below are live from the
        AI API. The Activity feed and Channel Performance chart are still demo data pending their
        own backend endpoints.
      </div>

      {/* Business Health + KPI row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1fr_1fr]">
        <div className="sm:col-span-2 xl:col-span-1">
          {businessHealth && <BusinessHealthCard health={businessHealth} />}
        </div>
        {overviewKpis.map((k, i) => (
          <KpiCard key={k.id} kpi={k} index={i + 1} tone={kpiTones[i]} />
        ))}
      </div>

      {/* Today's Top Priorities */}
      <section className="mt-10">
        <SectionHeading
          title="Today's Priorities"
          description="The 3–5 things that matter most right now — the AI has already ranked them for you."
        />
        <PriorityList items={priorities} />
      </section>

      {/* AI Recommendations */}
      <section className="mt-10">
        <SectionHeading
          title="AI Recommendations"
          description="Actionable proposals, not just findings. Approve, reject, or dig into each one."
          action={
            <Link
              to="/admin/ai-marketing/ai-center/recommendations"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all <ArrowUpRight className="size-3.5" />
            </Link>
          }
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {topRecommendations.map((r, i) => (
            <Reveal key={r.id} delay={i * 80}>
              <RecommendationCard rec={r} variant="compact" />
            </Reveal>
          ))}
          {!loading && topRecommendations.length === 0 && (
            <p className="text-sm text-muted-foreground">No pending recommendations right now.</p>
          )}
        </div>
      </section>

      {/* Performance + Channel Performance */}
      <div className="mt-10 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Reveal>
          <PerformanceChart />
        </Reveal>
        <Reveal delay={120}>
          <ChannelPerformanceCard channels={channelPerformance} />
        </Reveal>
      </div>

      {/* AI Activity */}
      <section className="mt-10">
        <SectionHeading
          title="AI Activity"
          description="A live trail of what every agent has been doing."
          action={
            <Link
              to="/admin/ai-marketing/activity"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Full activity log <ArrowUpRight className="size-3.5" />
            </Link>
          }
        />
        <ActivityStream items={activity} compact />
      </section>

      {/* Channel / Marketing summary */}
      <section className="mt-10">
        <SectionHeading
          title="Your Marketing Systems"
          description="Every specialised agent, at a glance. Detail lives on each agent's own page."
        />
        <AgentRail agents={agents} />
      </section>

      {/* Concept footer */}
      <Panel className="mt-10 p-6">
        <p className="label-eyebrow flex items-center gap-2">
          <Sparkles className="size-3.5 text-ai" />
          How Livora's AI Marketing Operating System fits together
        </p>
        <div className="scroll-rail mt-4 flex gap-3 pb-2">
          {[
            ["Data", "What happened?"],
            ["AI Analysis", "Why did it happen?"],
            ["Priority", "What matters most?"],
            ["Recommendation", "What should we do?"],
            ["Approval", "Should we do it?"],
            ["Action", "Execute it."],
            ["Impact", "Did it work?"],
            ["Learning", "Do more of what works."],
          ].map(([k, v]) => (
            <div key={k} className="w-[176px] shrink-0 rounded-sm border border-border p-4">
              <p className="label-eyebrow text-ai">{k}</p>
              <p className="mt-2 text-sm">{v}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}