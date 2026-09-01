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
import {
  useAiActivity,
  useAiAgents,
  useBusinessHealth,
  useOverviewKpis,
  usePriorities,
  useRecommendations,
} from "@/hooks/useAiDashboard";
import { channelPerformance } from "@/lib/ai/data";

const kpiTones = ["success", "info", "warning", "ai"] as const;

function Block({
  loading,
  error,
  empty,
  emptyText,
  height = "h-28",
  children,
}: {
  loading: boolean;
  error: unknown;
  empty?: boolean;
  emptyText?: string;
  height?: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return <div className={`w-full animate-pulse rounded-sm border border-border bg-surface/40 ${height}`} />;
  }
  if (error) {
    return (
      <p className="rounded-sm border border-dashed border-border-strong p-6 text-center text-sm text-muted-foreground">
        Data tidak bisa dimuat dari server. Coba muat ulang halaman.
      </p>
    );
  }
  if (empty) {
    return (
      <p className="rounded-sm border border-dashed border-border-strong p-8 text-center text-sm text-muted-foreground">
        {emptyText ?? "Belum ada data."}
      </p>
    );
  }
  return <>{children}</>;
}

export default function AiMarketingOverview() {
  usePageContext("overview");

  const health = useBusinessHealth();
  const kpis = useOverviewKpis();
  const priorities = usePriorities();
  const agents = useAiAgents();
  const pendingRecs = useRecommendations("pending");
  const activity = useAiActivity();

  const topRecommendations = [...(pendingRecs.data ?? [])]
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 } as const;
      return order[a.priority ?? "medium"] - order[b.priority ?? "medium"];
    })
    .slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="AI Marketing"
        title="Overview"
        description="Real-time intelligence and recommendations for Livora's digital growth."
      />

      {/* Business Health + KPI row — LIVE */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1fr_1fr]">
        <div className="sm:col-span-2 xl:col-span-1">
          <Block loading={health.isLoading} error={health.error} height="h-40">
            {health.data ? <BusinessHealthCard health={health.data} /> : null}
          </Block>
        </div>
        {kpis.isLoading
          ? [0, 1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-sm border border-border bg-surface/40" />
            ))
          : (kpis.data ?? []).slice(0, 4).map((k, i) => (
              <KpiCard key={k.id} kpi={k} index={i + 1} tone={kpiTones[i]} />
            ))}
      </div>

      {/* Today's Top Priorities — LIVE */}
      <section className="mt-10">
        <SectionHeading
          title="Today's Priorities"
          description="The 3–5 things that matter most right now — the AI has already ranked them for you."
        />
        <Block
          loading={priorities.isLoading}
          error={priorities.error}
          empty={(priorities.data ?? []).length === 0}
          emptyText="Belum ada prioritas. Agent AI belum menghasilkan rekomendasi pending."
        >
          <PriorityList items={priorities.data ?? []} />
        </Block>
      </section>

      {/* AI Recommendations — LIVE */}
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
        <Block
          loading={pendingRecs.isLoading}
          error={pendingRecs.error}
          empty={topRecommendations.length === 0}
          emptyText="Tidak ada rekomendasi menunggu persetujuan."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {topRecommendations.map((r, i) => (
              <Reveal key={r.id} delay={i * 80}>
                <RecommendationCard rec={r} variant="compact" />
              </Reveal>
            ))}
          </div>
        </Block>
      </section>

      {/* Performance + Channel mix — sumber analytics belum tersambung */}
      <div className="mt-10 grid gap-4 xl:grid-cols-2">
        <IntegrationRequired
          provider="Google Analytics 4"
          title="Traffic, engagement dan conversion belum tersambung"
          description="Grafik performa multi-metrik butuh GA4 Data API. Selama property GA4 belum dipasang, kartu ini sengaja kosong daripada menampilkan angka contoh."
          envKeys={[
            { key: "GA4_PROPERTY_ID", note: "properties/{id}" },
            { key: "GA4_SERVICE_ACCOUNT_JSON", note: "path file kredensial service account" },
          ]}
        />
        <IntegrationRequired
          provider="Channel mix (GA4 + Meta Ads + Google Ads)"
          title="Perbandingan channel belum bisa dihitung"
          description="Channel mix menggabungkan sesi GA4 dengan spend iklan. Kartu ini aktif otomatis setelah GA4 dan minimal satu platform iklan tersambung."
        />
      </div>


      {/* AI Activity — LIVE */}
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
        <Block
          loading={activity.isLoading}
          error={activity.error}
          empty={(activity.data ?? []).length === 0}
          emptyText="Belum ada aktivitas AI yang tercatat."
        >
          <ActivityStream items={(activity.data ?? []).slice(0, 8)} compact />
        </Block>
      </section>

      {/* Marketing systems — LIVE */}
      <section className="mt-10">
        <SectionHeading
          title="Your Marketing Systems"
          description="Every specialised agent, at a glance. Detail lives on each agent's own page."
        />
        <Block
          loading={agents.isLoading}
          error={agents.error}
          empty={(agents.data ?? []).length === 0}
          emptyText="Belum ada agent terdaftar."
        >
          <AgentRail agents={agents.data ?? []} />
        </Block>
      </section>

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
