import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  BookmarkPlus,
  BrainCircuit,
  Check,
  ExternalLink,
  Globe,
  Loader2,
  Megaphone,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { PlatformRow } from "@/components/ai/offline";
import { ActivityStream } from "@/components/ai/activity-stream";
import { AgentRail } from "@/components/ai/agent-rail";
import { KpiCard } from "@/components/ai/kpi-card";
import { PriorityList } from "@/components/ai/priority-list";
import { RecommendationCard } from "@/components/ai/recommendation-card";
import { Panel, Pill, Reveal, SectionHeading, Sparkline, StatusDot } from "@/components/ai/primitives";
import { SectionNotice } from "@/components/ai/section-state";
import { typeMeta } from "@/components/ai/insight-card";
import { useAiMarketingContext, usePageContext } from "@/context/AiMarketingContext";
import { useSectionState } from "@/hooks/useSectionState";
import { AdRoasKpiCard, AvgEngagementKpiCard, PerformanceOverviewPanel, SocialPerformanceRows } from "@/components/ai/marketing-panels";
import {
  extractApiErrorMessage,
  useAddLearningRule,
  useAiActivity,
  useAiAgents,
  useAiInsights,
  useCampaigns,
  useContentQueue,
  useCreateContentDraft,
  useDeleteLearningRule,
  useLearningSummary,
  useOverviewKpis,
  usePriorities,
  useRecommendations,
  useRunAgent,
} from "@/hooks/useAiDashboard";
import { marketingKeys, useAnalyzeMarket, useMarketInsights } from "@/hooks/useMarketing";

import type { AIInsight, AIKpi, Campaign, CampaignHealth, MarketExternalContentIdea } from "@/lib/ai/types";

const healthTone: Record<CampaignHealth, "success" | "warning" | "danger"> = {
  Good: "success",
  Fair: "warning",
  "Needs Attention": "danger",
};

/** Channel string dari backend bebas teks — cocokkan ke 2 platform ads yang
 *  panel ini peduli. Campaign lain (organic/email/dll) tidak masuk sini,
 *  itu ranahnya bukan "Campaign Performance (Ads)". */
function matchesAdPlatform(channel: string, platform: "meta" | "google"): boolean {
  const c = channel.toLowerCase();
  if (platform === "meta") return c.includes("meta") || c.includes("facebook") || c.includes("instagram");
  return c.includes("google");
}

const kpiTones = ["success", "info", "warning", "ai"] as const;

function Block({
  loading,
  error,
  onRetry,
  empty,
  emptyText,
  height = "h-28",
  children,
}: {
  loading: boolean;
  error: unknown;
  onRetry?: () => void;
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
      <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border-strong p-6 text-center text-sm text-muted-foreground">
        <p>Data tidak bisa dimuat dari server.</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            <RotateCcw className="size-3" /> Coba lagi
          </button>
        ) : null}
      </div>
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

/** Satu baris platform ads di panel "Campaign Performance" — dipakai kalau
 *  ada minimal satu AiCampaign yang channel-nya cocok. Menampilkan metric
 *  ASLI dari campaign tsb (metric.value/deltaLabel/spark dari backend),
 *  bukan spend/ROAS hasil hitungan sendiri — backend belum punya angka itu. */
function AdPlatformRow({ platform, campaigns }: { platform: string; campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return <PlatformRow icon={Megaphone} label={platform} />;
  }
  // Kalau lebih dari satu campaign match, tampilkan yang health-nya paling butuh perhatian.
  const rank: Record<CampaignHealth, number> = { "Needs Attention": 0, Fair: 1, Good: 2 };
  const lead = [...campaigns].sort((a, b) => rank[a.health] - rank[b.health])[0];
  return (
    <Link
      to="/admin/ai-marketing/campaigns"
      className="flex items-center gap-3 rounded-sm border border-border px-3.5 py-3 transition-colors hover:bg-accent/40"
    >
      <Megaphone className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">{platform}</span>
          <Pill tone={healthTone[lead.health]} className="shrink-0">
            {lead.health}
          </Pill>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">
          {campaigns.length} campaign{campaigns.length > 1 ? "s" : ""} · {lead.metric.label}: {lead.metric.value}
          {lead.budgetDaily ? ` · ${lead.budgetDaily}` : ""}
        </p>
      </div>
      {lead.spark.length > 1 ? (
        <Sparkline
          points={lead.spark}
          tone={lead.metric.deltaDirection === "down" ? "danger" : "success"}
          className="w-16 shrink-0"
        />
      ) : null}
    </Link>
  );
}


export default function AiMarketingOverview() {
  usePageContext("overview");
  const qc = useQueryClient();
  const { dateRange, openAsk } = useAiMarketingContext();

  const kpis = useOverviewKpis();
  const kpiSection = useSectionState(kpis);
  const priorities = usePriorities();
  const agents = useAiAgents();
  const pendingRecs = useRecommendations("pending");
  const insights = useAiInsights();
  const activity = useAiActivity();
  const campaigns = useCampaigns();
  const contentQueue = useContentQueue();
  const runAgent = useRunAgent();
  const marketQuery = useMarketInsights();
  const analyzeMarket = useAnalyzeMarket();
  const createDraft = useCreateContentDraft();
  const learningQuery = useLearningSummary();
  const addRule = useAddLearningRule();
  const deleteRule = useDeleteLearningRule();

  const [savingIdeaId, setSavingIdeaId] = useState<string | null>(null);
  const [savedIdeaTitles, setSavedIdeaTitles] = useState<Set<string>>(new Set());
  const [newRuleText, setNewRuleText] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState("profit_focus");

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    if (!newRuleText.trim()) return;
    try {
      await addRule.mutateAsync({ rule: newRuleText.trim(), category: newRuleCategory });
      setNewRuleText("");
      toast.success("Aturan strategi disimpan ke memori adaptif AI.");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyimpan aturan pembelajaran."));
    }
  }

  async function handleRunAll() {
    try {
      const res = await runAgent.mutateAsync({ key: "all", limit: 3 });
      const results = res.results ?? {};
      const okCount = Object.values(results).filter((r) => r.status === "ok").length;
      toast.success(`Siklus AI selesai (${okCount}/${Object.keys(results).length || 5} agent menghasilkan insight).`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menjalankan siklus AI."));
    }
  }

  async function handleRefreshMarket() {
    try {
      const fresh = await analyzeMarket.mutateAsync({ refresh: true });
      qc.setQueryData(marketingKeys.market(""), fresh);
      toast.success("Analisis pasar eksternal diperbarui.");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menjalankan analisis pasar."));
    }
  }

  async function handleSaveMarketIdea(idea: MarketExternalContentIdea) {
    setSavingIdeaId(idea.id);
    try {
      await createDraft.mutateAsync({
        title: idea.title,
        channel: idea.channel,
        headline: idea.title,
        caption: idea.captionDraft,
        body: `${idea.marketReason}\n\nInspirasi Eksternal: ${idea.externalInspiration}`,
        cta_label: idea.ctaLabel,
        meta: {
          source: "market_pulse",
          format: idea.format,
          external_inspiration: idea.externalInspiration,
        },
      });
      setSavedIdeaTitles((prev) => new Set(prev).add(idea.title.toLowerCase()));
      toast.success("Ide konten eksternal disimpan ke Content Queue.");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyimpan ide ke Content Queue."));
    } finally {
      setSavingIdeaId(null);
    }
  }

  const queueTitles = new Set((contentQueue.data ?? []).map((d) => d.title.toLowerCase()));
  const topInsights = (insights.data ?? []).slice(0, 4);
  const metaCampaigns = (campaigns.data ?? []).filter((c) => matchesAdPlatform(c.channel, "meta"));
  const googleCampaigns = (campaigns.data ?? []).filter((c) => matchesAdPlatform(c.channel, "google"));

  const topRecommendations = [...(pendingRecs.data ?? [])]
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 } as const;
      return order[a.priority ?? "medium"] - order[b.priority ?? "medium"];
    })
    .slice(0, 4);

  const market = marketQuery.data;

  return (
    <>
      <PageHeader
        eyebrow="AI Marketing"
        title="Overview"
        description="Real-time intelligence, riset pasar eksternal, dan rekomendasi untuk pertumbuhan Livora."
        action={
          <button
            type="button"
            onClick={handleRunAll}
            disabled={runAgent.isPending}
            className="inline-flex items-center gap-1.5 rounded-sm bg-ai px-3.5 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {runAgent.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            {runAgent.isPending ? "Running all agents…" : "Run All Agents"}
          </button>
        }
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-6">
        {kpiSection.status === "loading" ? (
          [0, 1, 2, 3, 4, 5].map((i) => <KpiCard key={i} label="KPI" index={i} state={kpiSection} />)
        ) : kpiSection.status === "data" ? (
          <>
            {kpiSection.data.slice(0, 4).map((k: AIKpi, i: number) => (
              <KpiCard
                key={k.id}
                label={k.label}
                index={i}
                tone={kpiTones[i]}
                state={{ ...kpiSection, data: k }}
              />
            ))}
            <AvgEngagementKpiCard index={4} />
            <AdRoasKpiCard index={5} />
          </>
        ) : (
          <Panel className="col-span-full">
            <SectionNotice state={kpiSection} title="KPI tidak bisa dimuat" height="h-32" />
          </Panel>
        )}
      </div>

      {/* Performance chart + AI Insights */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <PerformanceOverviewPanel />

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
            onRetry={() => void insights.refetch()}
            empty={topInsights.length === 0}
            emptyText="Belum ada insight. Klik Run All Agents di kanan atas untuk memulai analisis."
          >
            <div className="space-y-2.5">
              {topInsights.map((ins) => (
                <InsightRow key={ins.id} insight={ins} />
              ))}
            </div>
          </Block>
        </Panel>
      </div>

      {/* AI Adaptive Profit & Self-Learning Engine */}
      <section className="mt-6">
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <BrainCircuit className="size-4 text-ai" />
                <h3 className="text-display text-lg">Adaptive Profit & Self-Learning Engine</h3>
                <Pill tone="success">
                  <StatusDot tone="success" pulse /> Real DB Grounded
                </Pill>
              </div>
              <p className="text-xs text-muted-foreground">
                AI membaca omzet shop, pipeline konsultasi interior, dan antrean WA LiviBot secara langsung, serta belajar dari hasil Impact dan aturan strategi Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={openAsk}
              className="inline-flex items-center gap-1.5 rounded-sm bg-ai px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90"
            >
              <Sparkles className="size-3.5" /> Kendalikan via Ask AI
            </button>
          </div>

          {learningQuery.isLoading ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton-shimmer h-24 rounded-md" />
              ))}
            </div>
          ) : learningQuery.isError ? (
            <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border-strong p-5 text-center text-xs text-muted-foreground">
              <p>Ringkasan profit & pembelajaran adaptif belum dapat dimuat.</p>
              <button
                type="button"
                onClick={() => void learningQuery.refetch()}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-1 text-xs text-foreground hover:bg-accent"
              >
                <RotateCcw className="size-3" /> Coba lagi
              </button>
            </div>
          ) : learningQuery.data ? (
            <div className="mt-4 space-y-5">
              {/* Real Revenue & Pipeline Strip */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-sm border border-border bg-background/40 p-3.5">
                  <p className="label-eyebrow">Shop Revenue Lunas ({learningQuery.data.periodDays}d)</p>
                  <p className="num text-display mt-1.5 text-xl text-success">
                    Rp {learningQuery.data.profitGrounding.ordersAndRevenue.paidRevenueRp.toLocaleString("id-ID")}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {learningQuery.data.profitGrounding.ordersAndRevenue.paidOrdersCount} order lunas · AOV Rp{" "}
                    {learningQuery.data.profitGrounding.ordersAndRevenue.avgOrderValueRp.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="rounded-sm border border-border bg-background/40 p-3.5">
                  <p className="label-eyebrow">Pipeline Order Shop Aktif</p>
                  <p className="num text-display mt-1.5 text-xl text-foreground">
                    Rp {learningQuery.data.profitGrounding.ordersAndRevenue.pipelineValueRp.toLocaleString("id-ID")}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {learningQuery.data.profitGrounding.ordersAndRevenue.pipelineOrdersCount} order menunggu penawaran/bayar
                  </p>
                </div>
                <div className="rounded-sm border border-border bg-background/40 p-3.5">
                  <p className="label-eyebrow">Pipeline Proyek Interior</p>
                  <p className="num text-display mt-1.5 text-xl text-ai">
                    {learningQuery.data.profitGrounding.consultationsPipeline.activeHighIntent} High-Intent
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {learningQuery.data.profitGrounding.consultationsPipeline.unrespondedNew} baru belum dijawab ·{" "}
                    {learningQuery.data.profitGrounding.consultationsPipeline.completedCount} closing
                  </p>
                </div>
                <div className="rounded-sm border border-border bg-background/40 p-3.5">
                  <p className="label-eyebrow">Antrean Cek Harga WA LiviBot</p>
                  <p className="num text-display mt-1.5 text-xl text-warning">
                    {learningQuery.data.profitGrounding.whatsappLiviBot.pendingCount} Pending
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {learningQuery.data.profitGrounding.whatsappLiviBot.answeredCount} sudah dijawab ({learningQuery.data.periodDays}d)
                  </p>
                </div>
              </div>

              {/* Profit Leaks Alert */}
              {learningQuery.data.profitGrounding.profitLeaks.length > 0 ? (
                <div className="rounded-sm border border-warning/40 bg-warning/[0.06] p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-warning uppercase tracking-wider">
                      <AlertTriangle className="size-3.5" /> Kebocoran Profit yang Terdeteksi Otomatis
                    </p>
                    <Link to="/admin/ai-marketing/leads" className="text-xs font-medium text-ai hover:underline">
                      Tindak Lanjuti di Lead Intelligence →
                    </Link>
                  </div>
                  <ul className="space-y-1.5 text-xs text-foreground/90">
                    {learningQuery.data.profitGrounding.profitLeaks.map((leak, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-warning" />
                        <span>{leak}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Self-Learning Memory & Custom Rules */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-sm border border-border bg-background/40 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="label-eyebrow text-ai">Rekam Jejak Self-Learning AI</p>
                    <Link to="/admin/ai-marketing/impact" className="text-[11px] text-muted-foreground hover:text-foreground">
                      Impact ({learningQuery.data.learningMemory.impact.positive} positif · {learningQuery.data.learningMemory.impact.monitoring} dipantau) →
                    </Link>
                  </div>
                  {learningQuery.data.learningMemory.impact.provenWinners.length > 0 ? (
                    <ul className="space-y-2 text-xs">
                      {learningQuery.data.learningMemory.impact.provenWinners.map((w, idx) => (
                        <li key={idx} className="rounded border border-border/70 bg-secondary/30 px-3 py-2">
                          <span className="font-mono text-[10px] text-success uppercase">[{w.agent} · WIN]</span>{" "}
                          <span className="font-medium text-foreground">{w.title}</span>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{w.conclusion}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      AI telah mencatat {learningQuery.data.learningMemory.governance.approvedOrExecuted} aksi yang disetujui dan{" "}
                      {learningQuery.data.learningMemory.governance.rejected} yang ditolak untuk mengadaptasi rekomendasi berikutnya.
                    </p>
                  )}
                </div>

                <div className="rounded-sm border border-border bg-background/40 p-4">
                  <p className="label-eyebrow mb-2">Aturan Strategi & Fokus Profit (Diikuti Semua Agent AI)</p>
                  <form onSubmit={handleAddRule} className="mb-3 flex flex-wrap gap-1.5">
                    <select
                      value={newRuleCategory}
                      onChange={(e) => setNewRuleCategory(e.target.value)}
                      className="h-8 rounded border border-border bg-secondary px-2 text-[11px] text-foreground focus:border-ai focus:outline-none"
                    >
                      <option value="profit_focus">Fokus Profit</option>
                      <option value="target_audience">Target Audiens</option>
                      <option value="channel_strategy">Strategi Channel</option>
                      <option value="brand_voice">Brand Voice</option>
                    </select>
                    <input
                      value={newRuleText}
                      onChange={(e) => setNewRuleText(e.target.value)}
                      placeholder="Ajari AI, mis: Fokuskan promo ke custom wardrobe & sofa..."
                      className="h-8 min-w-[180px] flex-1 rounded border border-border bg-secondary/60 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={addRule.isPending || !newRuleText.trim()}
                      className="inline-flex h-8 items-center gap-1 rounded bg-ai px-2.5 text-xs font-semibold text-background disabled:opacity-50"
                    >
                      {addRule.isPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                      Simpan
                    </button>
                  </form>

                  {learningQuery.data.learningMemory.rules.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Belum ada aturan khusus. Tambahkan arahan bisnis di atas atau ketik <code>simpan aturan: ...</code> di Ask AI.
                    </p>
                  ) : (
                    <ul className="max-h-36 space-y-1.5 overflow-y-auto pr-1 text-xs">
                      {learningQuery.data.learningMemory.rules.map((r) => (
                        <li key={r.id} className="flex items-start justify-between gap-2 rounded border border-border/60 bg-secondary/30 px-2.5 py-1.5">
                          <div className="min-w-0">
                            <span className="font-mono text-[10px] text-ai uppercase">[{r.category}]</span>{" "}
                            <span className="text-foreground/90">{r.rule}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteRule.mutate(r.id)}
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            title="Hapus aturan"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </Panel>
      </section>

      {/* Market & Competitor Pulse — External Intelligence */}
      <section className="mt-6">
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-ai" />
                <h3 className="text-display text-lg">Market & Competitor Pulse</h3>
                {market?.webGrounded ? (
                  <Pill tone="ai">Google Grounded</Pill>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Tren pasar interior eksternal, sudut pandang kompetitor, dan ide konten non-katalog yang siap disimpan ke antrean.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefreshMarket}
              disabled={analyzeMarket.isPending || marketQuery.isLoading}
              className="inline-flex items-center gap-1.5 rounded-sm border border-ai/40 bg-ai/10 px-3 py-1.5 text-xs font-medium text-ai transition-colors hover:bg-ai/20 disabled:opacity-50"
            >
              {analyzeMarket.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {analyzeMarket.isPending ? "Menganalisis pasar..." : "Analisis Pasar Sekarang"}
            </button>
          </div>

          {marketQuery.isLoading ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton-shimmer h-28 rounded-md" />
              ))}
            </div>
          ) : marketQuery.error || !market || market.status !== "ok" ? (
            <div className="mt-4 rounded-sm border border-dashed border-border-strong p-5 text-center text-xs text-muted-foreground">
              <p>{market?.message ?? "Analisis pasar eksternal belum dijalankan atau provider Gemini belum tersedia."}</p>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {market.marketSummary ? (
                <p className="rounded-sm border border-border bg-secondary/40 p-3.5 text-sm leading-relaxed text-foreground/90">
                  {market.marketSummary}
                </p>
              ) : null}

              {market.trendingAesthetics.length > 0 ? (
                <div>
                  <p className="label-eyebrow mb-2">Estetika & Tren Permintaan Saat Ini</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {market.trendingAesthetics.slice(0, 3).map((t) => (
                      <div key={t.name} className="rounded-sm border border-border bg-background/40 p-3">
                        <p className="text-sm font-medium text-foreground">{t.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{t.whyNow}</p>
                        <p className="mt-1.5 text-[11px] text-ai">{t.recommendedFocus}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {market.externalContentIdeas.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="label-eyebrow">Ide Konten Eksternal Siap Eksekusi</p>
                    <Link to="/admin/ai-marketing/content" className="text-[11px] text-ai hover:underline">
                      Kelola Content & Video Recommender →
                    </Link>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3">
                    {market.externalContentIdeas.slice(0, 3).map((idea) => {
                      const alreadySaved =
                        savedIdeaTitles.has(idea.title.toLowerCase()) ||
                        queueTitles.has(idea.title.toLowerCase());
                      return (
                        <div key={idea.id} className="flex flex-col justify-between rounded-sm border border-border bg-background/40 p-3.5">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <Pill tone="info">{idea.channel}</Pill>
                              <span className="font-mono text-[10px] text-muted-foreground uppercase">{idea.format}</span>
                            </div>
                            <p className="text-sm font-medium leading-snug text-foreground">{idea.title}</p>
                            <p className="text-xs text-muted-foreground">{idea.marketReason}</p>
                            <p className="rounded bg-secondary/50 px-2 py-1 text-[11px] text-foreground/80">
                              Ref: {idea.externalInspiration}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={alreadySaved || savingIdeaId === idea.id}
                            onClick={() => void handleSaveMarketIdea(idea)}
                            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-sm border border-ai/40 bg-ai/10 px-2.5 py-1.5 text-xs font-medium text-ai transition-colors hover:bg-ai/20 disabled:border-border disabled:bg-secondary/50 disabled:text-muted-foreground"
                          >
                            {alreadySaved ? (
                              <>
                                <Check className="size-3.5 text-success" /> Tersimpan di Queue
                              </>
                            ) : savingIdeaId === idea.id ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" /> Menyimpan...
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="size-3.5" /> Simpan ke Queue
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {market.sources.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
                  <span className="font-mono uppercase tracking-wider">Sumber riset:</span>
                  {market.sources.slice(0, 4).map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-foreground/80 hover:border-ai/40 hover:text-ai"
                    >
                      {s.domain || s.title}
                      <ExternalLink className="size-2.5" />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </Panel>
      </section>

      {/* Social + Content Queue + Campaign spend */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel className="flex h-full flex-col p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-display rule-accent text-lg">Social Performance</h3>
            <span className="text-[11px] text-muted-foreground">({dateRange.days} Days)</span>
          </div>
          <div className="flex-1"><SocialPerformanceRows /></div>
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
          <Block
            loading={contentQueue.isLoading}
            error={contentQueue.error}
            onRetry={() => void contentQueue.refetch()}
            empty={(contentQueue.data ?? []).length === 0}
            emptyText="Belum ada draft konten. Jalankan Content Agent atau simpan ide dari Market Pulse."
          >
            <div className="space-y-2.5">
              {(contentQueue.data ?? []).slice(0, 4).map((d) => (
                <Link
                  key={d.id}
                  to="/admin/ai-marketing/content"
                  className="flex items-center justify-between gap-3 rounded-sm border border-border px-3.5 py-2.5 transition-colors hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                      {d.channel} · {d.status.replace("_", " ")}
                    </p>
                  </div>
                  <Pill tone={d.status === "scheduled" || d.status === "published" ? "success" : d.status === "approved" ? "info" : "warning"}>
                    {d.status.replace("_", " ")}
                  </Pill>
                </Link>
              ))}
            </div>
          </Block>
        </Panel>

        <Panel className="flex h-full flex-col p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-display rule-accent text-lg">Campaign Performance ({dateRange.days} Days)</h3>
            <Link
              to="/admin/ai-marketing/ads"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View report <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <Block
            loading={campaigns.isLoading}
            error={campaigns.error}
            onRetry={() => void campaigns.refetch()}
            height="h-full min-h-40"
          >
            <div className="flex-1 space-y-2.5">
              <AdPlatformRow platform="Meta Ads" campaigns={metaCampaigns} />
              <AdPlatformRow platform="Google Ads" campaigns={googleCampaigns} />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {metaCampaigns.length + googleCampaigns.length > 0
                ? "Metric per platform diambil dari AI campaign yang sudah dibuat agent. Spend/ROAS asli tampil setelah akun iklan tersambung."
                : "Belum ada AI campaign untuk Meta Ads atau Google Ads. Baris akan terisi begitu agent membuat rencana untuk platform tsb."}
            </p>
          </Block>
        </Panel>
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
          onRetry={() => void priorities.refetch()}
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
          onRetry={() => void pendingRecs.refetch()}
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
          onRetry={() => void activity.refetch()}
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
          onRetry={() => void agents.refetch()}
          empty={(agents.data ?? []).length === 0}
          emptyText="Belum ada agent terdaftar."
        >
          <AgentRail agents={agents.data ?? []} />
        </Block>
      </section>

      <Panel className="mt-10 p-6">
        <p className="label-eyebrow flex items-center gap-2">
          <Sparkles className="size-3.5 text-ai" />
          Alur Kerja Sistem AI Marketing Livora
        </p>
        <div className="scroll-rail mt-4 flex gap-3 pb-2">
          {(
            [
              ["Data", "Metrik & sinyal nyata", "/admin/ai-marketing/settings"],
              ["AI Analysis", "Diagnosa & temuan", "/admin/ai-marketing/insights"],
              ["Priority", "Urutan dampak tertinggi", "/admin/ai-marketing/ai-center/recommendations"],
              ["Recommendation", "Usulan perubahan konkret", "/admin/ai-marketing/ai-center/recommendations"],
              ["Approval", "Kontrol aman sebelum jalan", "/admin/ai-marketing/approvals"],
              ["Action", "Eksekusi otomatis / draft", "/admin/ai-marketing/ai-center/actions"],
              ["Impact", "Ukur sebelum & sesudah", "/admin/ai-marketing/impact"],
              ["Content", "Ide eksternal & antrean", "/admin/ai-marketing/content"],
            ] as const
          ).map(([k, v, to]) => (
            <Link
              key={k}
              to={to}
              className="w-[176px] shrink-0 rounded-sm border border-border p-4 transition-colors hover:border-ai/40 hover:bg-accent/40"
            >
              <p className="label-eyebrow text-ai">{k}</p>
              <p className="mt-2 text-sm text-foreground/90">{v}</p>
            </Link>
          ))}
        </div>
      </Panel>
    </>
  );
}
