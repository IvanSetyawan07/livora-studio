import { Link } from "react-router-dom";
import { ArrowUpRight, Instagram, KeyRound, Megaphone, Sparkles, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { LockedKpiCard, OfflinePanel, PlatformRow } from "@/components/ai/offline";
import { ActivityStream } from "@/components/ai/activity-stream";
import { AgentRail } from "@/components/ai/agent-rail";
import { KpiCard } from "@/components/ai/kpi-card";
import { PriorityList } from "@/components/ai/priority-list";
import { RecommendationCard } from "@/components/ai/recommendation-card";
import { Panel, Pill, Reveal, SectionHeading, StatusDot } from "@/components/ai/primitives";
import { typeMeta } from "@/components/ai/insight-card";
import { usePageContext } from "@/context/AiMarketingContext";
import {
  useAiActivity,
  useAiAgents,
  useAiInsights,
  useOverviewKpis,
  usePriorities,
  useRecommendations,
} from "@/hooks/useAiDashboard";
import type { AIInsight } from "@/lib/ai/types";

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

function InsightRow({ insight }: { insight: AIInsight }) {
  const meta = typeMeta[insight.type];
  return (
    <Link
      to="/admin/ai-marketing/insights"
      className="group flex items-start gap-3 rounded-sm border border-border p-3.5 transition-colors hover:bg-accent/40"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug group-hover:text-foreground">
          {insight.title}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{insight.description}</p>
      </div>
      <Pill tone={meta.tone} className="shrink-0">
        <StatusDot tone={meta.tone} pulse={insight.severity === "critical"} />
        {insight.severity}
      </Pill>
    </Link>
  );
}

const socialPlatforms: { label: string; icon: LucideIcon }[] = [
  { label: "Instagram", icon: Instagram },
  { label: "TikTok", icon: Megaphone },
  { label: "Facebook", icon: Megaphone },
  { label: "YouTube", icon: Megaphone },
];

export default function AiMarketingOverview() {
  usePageContext("overview");

  const kpis = useOverviewKpis();
  const priorities = usePriorities();
  const agents = useAiAgents();
  const pendingRecs = useRecommendations("pending");
  const insights = useAiInsights();
  const activity = useAiActivity();

  const liveKpis = (kpis.data ?? []).slice(0, 4);
  const topInsights = (insights.data ?? []).slice(0, 4);

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

      {/* KPI row — live KPI + kartu terkunci untuk metrik yang butuh integrasi */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.isLoading
          ? [0, 1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-sm border border-border bg-surface/40" />
            ))
          : liveKpis.map((k, i) => <KpiCard key={k.id} kpi={k} index={i} tone={kpiTones[i]} />)}
        <LockedKpiCard label="Avg Engagement" provider="GA4 Data API" index={4} />
        <LockedKpiCard label="Ad ROAS" provider="Meta / Google Ads" index={5} />
      </div>

      {/* Performance chart + AI Insights */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <OfflinePanel
          title="Performance Overview (30 Days)"
          provider="Google Analytics 4"
          message="Grafik multi-metrik (traffic, leads, engagement, conversions) aktif setelah GA4_PROPERTY_ID dan GA4_SERVICE_ACCOUNT_JSON dipasang di backend/.env."
          legend={[
            { label: "Traffic", className: "bg-info" },
            { label: "Leads", className: "bg-success" },
            { label: "Engagement", className: "bg-ai" },
            { label: "Conversions", className: "bg-warning" },
          ]}
          action={
            <span className="rounded-sm border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
              30 Days
            </span>
          }
        />

        <Panel className="flex h-full flex-col p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-display rule-accent text-lg">AI Insights</h3>
            <Link
              to="/admin/ai-marketing/insights"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <Block
            loading={insights.isLoading}
            error={insights.error}
            empty={topInsights.length === 0}
            emptyText="Belum ada insight. Jalankan agent AI di server untuk menghasilkannya."
          >
            <div className="space-y-2.5">
              {topInsights.map((ins) => (
                <InsightRow key={ins.id} insight={ins} />
              ))}
            </div>
          </Block>
        </Panel>
      </div>

      {/* Social + Content Queue + Campaign spend */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel className="flex h-full flex-col p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-display rule-accent text-lg">Social Media Performance</h3>
            <span className="text-[11px] text-muted-foreground">(30 Days)</span>
          </div>
          <div className="flex-1 space-y-2.5">
            {socialPlatforms.map((p) => (
              <div
                key={p.label}
                className="flex items-center gap-3 rounded-sm border border-dashed border-border-strong px-3.5 py-3"
              >
                <p.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm">{p.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Not connected
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Engagement per platform aktif setelah kredensial Meta / TikTok / YouTube dipasang.
          </p>
        </Panel>

        <Panel className="flex h-full flex-col p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-display rule-accent text-lg">Content Queue</h3>
            <Link
              to="/admin/ai-marketing/content"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border-strong bg-muted/20 px-6 py-10 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-border-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <KeyRound className="size-3" /> Not connected
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Antrian konten terjadwal butuh koneksi platform sosial (Meta / TikTok / YouTube).
            </p>
          </div>
        </Panel>

        <OfflinePanel
          title="Campaign Performance (30 Days)"
          provider="Meta Ads + Google Ads"
          message="Donut spend per platform aktif setelah META_ADS_* dan GOOGLE_ADS_* terisi. Tidak ada angka contoh yang ditampilkan."
          height="h-full min-h-40"
          action={
            <Link
              to="/admin/ai-marketing/ads"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View report <ArrowUpRight className="size-3" />
            </Link>
          }
        />
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
