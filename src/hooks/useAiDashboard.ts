/**
 * React Query hooks untuk AI Marketing.
 *
 * Semua halaman AI Marketing sebaiknya lewat sini, bukan memanggil
 * aiServices langsung di useEffect — supaya caching, refetch dan
 * invalidasi setelah approve/reject konsisten di seluruh dashboard.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiServices } from "@/lib/ai/services";
import type {
  AIActivity,
  AIAgent,
  AIAgentId,
  AIApproval,
  AIApprovalStatus,
  AIInsight,
  AIInsightType,
  AIKpi,
  AIProviderInfo,
  AIProviderPreference,
  AIProviderQuota,
  AIRecommendation,
  AIRoutingStrategy,
  AIUsageByAgent,
  AIUsageByProvider,
  AIUsageTotals,
  BusinessHealth,
  Campaign,
  GoogleIntegrationStatus,
  ImpactRecord,
  PriorityItem,
  SearchConsoleSummary,
  CroFunnelSummary,
} from "@/lib/ai/types";
import { agentMeta } from "@/lib/ai/agent-catalog";

/**
 * Single source of truth for every AI Marketing query key. Phase 1 audit:
 * a handful of pages (Settings, Seo's Google card) built their own inline
 * `["ai", "providers"]`-style keys next to this factory instead of using
 * it — same cache entry by accident, easy to typo apart by design. New
 * code should always read a key from here, never write one inline.
 */
export const aiKeys = {
  health: ["ai", "dashboard", "health"] as const,
  kpis: ["ai", "dashboard", "kpis"] as const,
  priorities: ["ai", "dashboard", "priorities"] as const,
  agents: ["ai", "agents"] as const,
  recommendations: (status?: AIApprovalStatus) => ["ai", "recommendations", status ?? "all"] as const,
  actions: ["ai", "actions"] as const,
  insights: (type?: AIInsightType | "all", agent?: AIAgentId | "all") =>
    ["ai", "insights", type ?? "all", agent ?? "all"] as const,
  activity: (agent?: AIAgentId | "all") => ["ai", "activity", agent ?? "all"] as const,
  searchConsole: (days: number) => ["ai", "seo", "search-console", days] as const,
  croFunnel: () => ["ai", "cro", "funnel"] as const,
  campaigns: ["ai", "campaigns"] as const,
  campaign: (id: string) => ["ai", "campaigns", id] as const,
  providers: ["ai", "providers"] as const,
  providerQuota: ["ai", "providers", "quota"] as const,
  providerPreference: ["ai", "providers", "preference"] as const,
  routingStrategy: ["ai", "routing-strategy"] as const,
  usageTotals: ["ai", "usage", "totals"] as const,
  usageByAgent: ["ai", "usage", "by-agent"] as const,
  usageByProvider: ["ai", "usage", "by-provider"] as const,
  impact: ["ai", "impact"] as const,
  googleStatus: ["ai", "integrations", "google", "status"] as const,
};

const STALE = 60_000;

export function useBusinessHealth() {
  return useQuery<BusinessHealth>({
    queryKey: aiKeys.health,
    queryFn: () => aiServices.dashboard.getBusinessHealth(),
    staleTime: STALE,
  });
}
export function useSearchConsoleSummary(days = 28) {
  return useQuery<SearchConsoleSummary>({
    queryKey: aiKeys.searchConsole(days),
    queryFn: () => aiServices.seo.getSearchConsoleSummary(days),
    staleTime: 10 * 60_000, // backend sudah cache 20 menit; ini cuma cegah refetch tiap mount
  });
}

/** KPI funnel CRO — dihitung backend dari tabel consultations (bukan LLM, bukan fixture). */
export function useCroFunnelSummary() {
  return useQuery<CroFunnelSummary>({
    queryKey: aiKeys.croFunnel(),
    queryFn: () => aiServices.cro.getFunnelSummary(),
    staleTime: 5 * 60_000,
  });
}
export function useOverviewKpis() {
  return useQuery<AIKpi[]>({
    queryKey: aiKeys.kpis,
    queryFn: () => aiServices.dashboard.getOverviewKpis(),
    staleTime: STALE,
  });
}

export function usePriorities() {
  return useQuery<PriorityItem[]>({
    queryKey: aiKeys.priorities,
    queryFn: () => aiServices.dashboard.getPriorities(),
    staleTime: STALE,
  });
}

export function useAiAgents() {
  return useQuery<AIAgent[]>({
    queryKey: aiKeys.agents,
    queryFn: () => aiServices.dashboard.getAgents(),
    staleTime: STALE,
  });
}

/**
 * Satu agent, digabung dari data LIVE backend + katalog statis (identitas saja).
 * Kalau backend belum mengembalikan agent tsb, kita tetap render identitasnya
 * dengan status paling konservatif ("coming_soon") — bukan angka karangan.
 */
export function useAgent(id: AIAgentId) {
  const { data: agents = [], isLoading, isError } = useAiAgents();
  const meta = agentMeta(id);
  const live = agents.find((a) => a.id === id);

  const agent: AIAgent = live ?? {
    id,
    name: meta?.name ?? id,
    purpose: meta?.purpose ?? "",
    status: "coming_soon",
    connection: "not_connected",
    lastRun: null,
    tasks: 0,
    insightsCount: 0,
    recommendationsCount: 0,
    pendingApprovals: 0,
    capabilities: [],
    dependencies: [],
    href: meta?.href ?? `/admin/ai-marketing/${id}`,
  };

  return { agent, isLive: Boolean(live), isLoading, isError };
}

/** Satu recommendation by id — dipakai InsightCard untuk menampilkan aksi terkait. */
export function useRecommendation(id?: string | null) {
  return useQuery<AIRecommendation | undefined>({
    queryKey: ["ai", "recommendation", id ?? "none"] as const,
    queryFn: () => aiServices.recommendations.getById(id as string),
    enabled: Boolean(id),
    staleTime: STALE,
  });
}

export function useRecommendations(status?: AIApprovalStatus) {
  return useQuery<AIRecommendation[]>({
    queryKey: aiKeys.recommendations(status),
    queryFn: () => aiServices.recommendations.list(status ? { status } : undefined),
    staleTime: STALE,
  });
}

/** GET /ai/campaigns — dipakai halaman Campaigns dan panel "Campaign Performance" di Overview. */
export function useCampaigns() {
  return useQuery<Campaign[]>({
    queryKey: aiKeys.campaigns,
    queryFn: () => aiServices.campaigns.list(),
    staleTime: STALE,
  });
}

/** Satu campaign by id — dipakai AiMarketingCampaignDetail. */
export function useCampaign(id?: string) {
  return useQuery<Campaign | undefined>({
    queryKey: aiKeys.campaign(id ?? "none"),
    queryFn: () => aiServices.campaigns.getById(id as string),
    enabled: Boolean(id),
    staleTime: STALE,
  });
}

export function useProviders() {
  return useQuery<AIProviderInfo[]>({
    queryKey: aiKeys.providers,
    queryFn: () => aiServices.providers.list(),
    staleTime: STALE,
  });
}

export function useProviderQuota() {
  return useQuery<AIProviderQuota[]>({
    queryKey: aiKeys.providerQuota,
    queryFn: () => aiServices.providers.getQuota(),
    staleTime: 30_000,
  });
}

export function useProviderPreference() {
  return useQuery<AIProviderPreference>({
    queryKey: aiKeys.providerPreference,
    queryFn: () => aiServices.providers.getPreference(),
    staleTime: STALE,
  });
}

export function useRoutingStrategy() {
  return useQuery<AIRoutingStrategy>({
    queryKey: aiKeys.routingStrategy,
    queryFn: () => aiServices.providers.getRoutingStrategy(),
    staleTime: STALE,
  });
}

/** Ganti provider preference, lalu invalidasi kartu preference + provider list. */
export function useSetProviderPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: string | null) => aiServices.providers.setPreference(provider),
    onSuccess: (updated) => {
      qc.setQueryData(aiKeys.providerPreference, updated);
      qc.invalidateQueries({ queryKey: aiKeys.providers });
    },
  });
}

export function useUsageTotals() {
  return useQuery<AIUsageTotals>({
    queryKey: aiKeys.usageTotals,
    queryFn: () => aiServices.usage.getTotals(),
    staleTime: STALE,
  });
}

export function useUsageByAgent() {
  return useQuery<AIUsageByAgent[]>({
    queryKey: aiKeys.usageByAgent,
    queryFn: () => aiServices.usage.getByAgent(),
    staleTime: STALE,
  });
}

export function useUsageByProvider() {
  return useQuery<AIUsageByProvider[]>({
    queryKey: aiKeys.usageByProvider,
    queryFn: () => aiServices.usage.getByProvider(),
    staleTime: STALE,
  });
}

/** GET /ai/impact — dipakai halaman Impact. */
export function useImpact() {
  return useQuery<ImpactRecord[]>({
    queryKey: aiKeys.impact,
    queryFn: () => aiServices.impact.list(),
    staleTime: STALE,
  });
}

/**
 * Status koneksi Google (Search Console). Dipakai Settings dan kartu
 * integrasi di halaman Seo — sebelumnya masing-masing punya implementasi
 * sendiri (Settings lewat `googleIntegration.ts` yang selalu memanggil API
 * asli, Seo lewat `useEffect` manual ke `aiServices` langsung), jadi
 * status bisa berbeda antara dua halaman dan salah satunya tidak ikut
 * saklar mock/live `VITE_AI_BACKEND`. Sekarang keduanya lewat sini.
 */
export function useGoogleIntegrationStatus() {
  return useQuery<GoogleIntegrationStatus>({
    queryKey: aiKeys.googleStatus,
    queryFn: () => aiServices.integrations.getGoogleStatus(),
    staleTime: 30_000,
  });
}

export function useGoogleDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => aiServices.integrations.disconnectGoogle(),
    onSuccess: (status) => {
      qc.setQueryData(aiKeys.googleStatus, status);
      qc.invalidateQueries({ queryKey: aiKeys.agents });
    },
  });
}

/** Ambil authorize URL lalu redirect browser ke consent screen Google. */
export function useGoogleAuthorize() {
  return useMutation({
    mutationFn: async () => {
      const url = await aiServices.integrations.getGoogleAuthorizeUrl();
      if (!url) throw new Error("Backend tidak mengembalikan authorize URL.");
      window.location.href = url;
      return url;
    },
  });
}

export function useAiActions() {
  return useQuery<AIApproval[]>({
    queryKey: aiKeys.actions,
    queryFn: () => aiServices.actions.list(),
    staleTime: STALE,
  });
}

export function useAiInsights(type?: AIInsightType | "all", agent?: AIAgentId | "all") {
  return useQuery<AIInsight[]>({
    queryKey: aiKeys.insights(type, agent),
    queryFn: () =>
      aiServices.insights.list({
        ...(type && type !== "all" ? { type } : {}),
        ...(agent && agent !== "all" ? { agent } : {}),
      }),
    staleTime: STALE,
  });
}

export function useAiActivity(agent?: AIAgentId | "all") {
  return useQuery<AIActivity[]>({
    queryKey: aiKeys.activity(agent),
    queryFn: () => aiServices.activity.list(agent && agent !== "all" ? { agent } : undefined),
    staleTime: 30_000,
  });
}

/** Approve / reject sebuah recommendation, lalu invalidasi semua turunannya. */
export function useRecommendationDecision() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ai"] });
  };

  const approve = useMutation({
    mutationFn: (id: string) => aiServices.recommendations.approve(id),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (id: string) => aiServices.recommendations.reject(id),
    onSuccess: invalidate,
  });

  return { approve, reject };
}

/** Approve+execute / reject sebuah action (AIApproval). */
export function useActionDecision() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ai"] });

  const approveAndExecute = useMutation({
    mutationFn: (id: string) => aiServices.actions.approveAndExecute(id),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (id: string) => aiServices.actions.reject(id),
    onSuccess: invalidate,
  });
  

  return { approveAndExecute, reject };
}