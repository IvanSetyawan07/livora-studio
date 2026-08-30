import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, Sparkles } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { usePageContext } from "@/context/AiMarketingContext";
import { AI_BACKEND_MODE } from "@/lib/ai/services";
import {
  useAiAgents,
  useBusinessHealth,
  useOverviewKpis,
  usePriorities,
  useRecommendations,
} from "@/hooks/useAiDashboard";
// Belum ada endpoint untuk activity stream, channel mix, dan grafik performa —
// tiga blok itu masih memakai data demo dan ditandai jelas di UI.
import { activity, channelPerformance } from "@/lib/ai/data";

const kpiTones = ["success", "info", "warning", "ai"] as const;

function ErrorNote({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-destructive">
      <AlertTriangle className="size-3.5 shrink-0" />
      {label} gagal dimuat dari API. Cek koneksi atau login admin kamu.
    </div>
  );
}

export default function AiMarketingOverview() {
  usePageContext("overview");

  const health = useBusinessHealth();
  const kpis = useOverviewKpis();
  const priorities = usePriorities();
  const agents = useAiAgents();
  const recommendations = useRecommendations("pending");

  const priorityOrder = { high: 0, medium: 1, low: 2 } as const;

  const topRecommendations = (recommendations.data ?? [])
    .slice()
    .sort(
      (a, b) =>
        priorityOrder[a.priority ?? "medium"] - priorityOrder[b.priority ?? "medium"],
    )
    .slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="AI Marketing"
        title="Overview"
        description="Real-time intelligence and recommendations for Livora's digital growth."
      />

      {AI_BACKEND_MODE === "mock" && (
        <div className="mb-8 flex flex-wrap items-center gap-3 rounded-sm border border-border bg-surface/40 px-4 py-3 text-xs text-muted-foreground">
          <DemoBadge />
          Running in demo mode (VITE_AI_BACKEND=mock). Numbers are illustrative, not production values.
        </div>
      )}

      {/* Business Health + KPI row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1fr_1fr]">
        <div className="sm:col-span-2 xl:col-span-1">
          {health.isLoading ? (
            <Skeleton className="h-[188px] w-full rounded-sm" />
          ) : health.isError || !health.data ? (
            <ErrorNote label="Business health" />
          ) : (
            <BusinessHealthCard health={health.data} />
          )}
        </div>

        {kpis.isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[188px] w-full rounded-sm" />
            ))
          : (kpis.data ?? []).map((k, i) => (
              <KpiCard key={k.id} kpi={k} index={i + 1} tone={kpiTones[i % kpiTones.length]} />
            ))}
      </div>
      {kpis.isError && (
        <div className="mt-4">
          <ErrorNote label="KPI" />
        </div>
      )}

      {/* Today's Top Priorities */}
      <section className="mt-10">
        <SectionHeading
          title="Today's Priorities"
          description="The 3–5 things that matter most right now — the AI has already ranked them for you."
        />
        {priorities.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-sm" />
            ))}
          </div>
        ) : priorities.isError ? (
          <ErrorNote label="Priorities" />
        ) : (priorities.data ?? []).length === 0 ? (
          <Panel className="p-6 text-sm text-muted-foreground">
            Belum ada prioritas. Agent akan mengisi bagian ini begitu ada rekomendasi pending.
          </Panel>
        ) : (
          <PriorityList items={priorities.data ?? []} />
        )}
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
        {recommendations.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full rounded-sm" />
            ))}
          </div>
        ) : recommendations.isError ? (
          <ErrorNote label="Recommendations" />
        ) : topRecommendations.length === 0 ? (
          <Panel className="p-6 text-sm text-muted-foreground">
            Tidak ada rekomendasi pending saat ini.
          </Panel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {topRecommendations.map((r, i) => (
              <Reveal key={r.id} delay={i * 80}>
                <RecommendationCard rec={r} variant="compact" />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* Performance + Channel Performance — belum ada endpoint, masih demo */}
      <div className="mt-10 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Reveal>
          <PerformanceChart />
        </Reveal>
        <Reveal delay={120}>
          <ChannelPerformanceCard channels={channelPerformance} />
        </Reveal>
      </div>
      <p className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <DemoBadge />
        Performance chart & channel mix belum punya endpoint di backend — masih data contoh.
      </p>

      {/* AI Activity — belum ada endpoint, masih demo */}
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

      {/* Agents — LIVE dari /api/ai/agents */}
      <section className="mt-10">
        <SectionHeading
          title="Your Marketing Systems"
          description="Every specialised agent, at a glance. Detail lives on each agent's own page."
        />
        {agents.isLoading ? (
          <Skeleton className="h-40 w-full rounded-sm" />
        ) : agents.isError ? (
          <ErrorNote label="Agents" />
        ) : (
          <AgentRail agents={agents.data ?? []} />
        )}
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
