// path: src/lib/ai/services/laravel.ts
/**
 * Laravel adapter — talks to the real AI orchestration API.
 *
 * Path dicocokkan 1:1 dengan routes/api.php (prefix /ai, auth:sanctum + admin).
 *
 * Catatan penting: `AppServiceProvider::boot()` memanggil
 * JsonResource::withoutWrapping(), jadi response Resource TIDAK terbungkus
 * { "data": ... }. Helper unwrap() di bawah tetap dipasang sebagai jaring
 * pengaman kalau config cache di server belum ke-clear — supaya UI tidak
 * blank / tidak melempar "x.map is not a function".
 *
 * Semua pemanggilan unwrap memakai generic eksplisit supaya tipe kembalian
 * konkret (bukan unknown) dan cocok dengan kontrak di ./types.
 */
import { api } from "@/lib/api";
import type { AIServiceBundle } from "./types";
import type {
  AIActivity,
  AIAgent,
  AIApproval,
  AIInsight,
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
  CroFunnelSummary,
  GoogleIntegrationStatus,
  ImpactRecord,
  MarketIntelligenceReport,
  MetaAdsIntegrationStatus,
  MetaIntegrationStatus,
  PriorityItem,
  SearchConsoleSiteItem,
  SearchConsoleSummary,
  LocalSeoSummary,
  AiChatMessage,
  AiLearningRule,
  AiLearningSummary,
  IgBoostEntry,
  AnalyticsOverview,
  AdsSummary,
  AgentRunResult,
  AiContentDraftItem,
  ContentSummary,
  HighIntentLeadsResponse,
  LeadsFunnel,
  InspirationLibrary,
  InspirationAnalysis,
} from "../types";

type Envelope<T> = T | { data: T };

function unwrap<T>(payload: Envelope<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "data" in (payload as Record<string, unknown>)
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

/** Untuk endpoint list: apapun yang datang, UI selalu dapat array. */
function unwrapList<T>(payload: unknown): T[] {
  const value = unwrap<unknown>(payload as Envelope<unknown>);
  return Array.isArray(value) ? (value as T[]) : [];
}

export const laravelServices: AIServiceBundle = {
  dashboard: {
    getBusinessHealth: (p) =>
      api.get("/ai/dashboard/health", { params: p }).then((r) => unwrap<BusinessHealth>(r.data)),
    getPriorities: () =>
      api.get("/ai/dashboard/priorities").then((r) => unwrapList<PriorityItem>(r.data)),
    getOverviewKpis: (p) =>
      api.get("/ai/dashboard/kpis", { params: p }).then((r) => unwrapList<AIKpi>(r.data)),
    getAgents: () => api.get("/ai/agents").then((r) => unwrapList<AIAgent>(r.data)),
    runAgent: (key, limit = 5) =>
      api.post(`/ai/agents/${key}/run`, { limit }).then((r) => unwrap<AgentRunResult>(r.data)),
  },
  recommendations: {
    list: (params) =>
      api.get("/ai/recommendations", { params }).then((r) => unwrapList<AIRecommendation>(r.data)),
    getById: (id) =>
      api.get(`/ai/recommendations/${id}`).then((r) => unwrap<AIRecommendation>(r.data)),
    approve: (id) =>
      api.post(`/ai/recommendations/${id}/approve`).then((r) => unwrap<AIRecommendation>(r.data)),
    reject: (id) =>
      api.post(`/ai/recommendations/${id}/reject`).then((r) => unwrap<AIRecommendation>(r.data)),
  },
  actions: {
    list: (params) => api.get("/ai/actions", { params }).then((r) => unwrapList<AIApproval>(r.data)),
    approveAndExecute: (id) =>
      api.post(`/ai/actions/${id}/approve-execute`).then((r) => unwrap<AIApproval>(r.data)),
    reject: (id) => api.post(`/ai/actions/${id}/reject`).then((r) => unwrap<AIApproval>(r.data)),
  },
  chat: {
    ask: (message, context, opts) =>
      api
        .post("/ai/chat", {
          message,
          context,
          ...(opts?.webSearch !== undefined ? { webSearch: opts.webSearch } : {}),
          ...(opts?.history ? { history: opts.history } : {}),
        })
        .then((r) => unwrap<AiChatMessage>(r.data)),
  },
  usage: {
    getTotals: (p) =>
      api.get("/ai/usage/totals", { params: p }).then((r) => unwrap<AIUsageTotals>(r.data)),
    getByAgent: (p) =>
      api.get("/ai/usage/by-agent", { params: p }).then((r) => unwrapList<AIUsageByAgent>(r.data)),
    getByProvider: (p) =>
      api
        .get("/ai/usage/by-provider", { params: p })
        .then((r) => unwrapList<AIUsageByProvider>(r.data)),
  },
  providers: {
    list: () => api.get("/ai/providers").then((r) => unwrapList<AIProviderInfo>(r.data)),
    sync: () => api.post("/ai/providers/sync").then((r) => unwrapList<AIProviderInfo>(r.data)),
    test: (provider) =>
      api
        .post(`/ai/providers/${encodeURIComponent(provider)}/test`)
        .then((r) => unwrap<{ provider: string; model?: string; status: string; latencyMs?: number; message: string }>(r.data)),
    getRoutingStrategy: () =>
      api.get("/ai/routing-strategy").then((r) => unwrap<AIRoutingStrategy>(r.data)),
    getQuota: () =>
      api.get("/ai/providers/quota").then((r) => unwrapList<AIProviderQuota>(r.data)),
    getPreference: () =>
      api.get("/ai/providers/preference").then((r) => unwrap<AIProviderPreference>(r.data)),
    setPreference: (provider) =>
      api
        .post("/ai/providers/preference", { preferredProvider: provider })
        .then((r) => unwrap<AIProviderPreference>(r.data)),
  },
  campaigns: {
    list: (p) => api.get("/ai/campaigns", { params: p }).then((r) => unwrapList<Campaign>(r.data)),
    getById: (id) => api.get(`/ai/campaigns/${id}`).then((r) => unwrap<Campaign>(r.data)),
    create: (body) => api.post("/ai/campaigns", body).then((r) => unwrap<Campaign>(r.data)),
    update: (id, body) => api.patch(`/ai/campaigns/${id}`, body).then((r) => unwrap<Campaign>(r.data)),
    sync: () => api.post("/ai/campaigns/sync").then((r) => unwrap<{ synced: number; campaigns: Campaign[] }>(r.data)),
  },
  impact: {
    list: () => api.get("/ai/impact").then((r) => unwrapList<ImpactRecord>(r.data)),
    refresh: () => api.post("/ai/impact/refresh").then((r) => unwrap<{ updated: number; records: ImpactRecord[] }>(r.data)),
  },
  insights: {
    list: (params) =>
      api.get("/ai/insights", { params }).then((r) => unwrapList<AIInsight>(r.data)),
    getById: (id) => api.get(`/ai/insights/${id}`).then((r) => unwrap<AIInsight>(r.data)),
    dismiss: (id) => api.post(`/ai/insights/${id}/dismiss`).then((r) => unwrap<{ ok: boolean; id: string }>(r.data)),
  },
  activity: {
    list: (params) =>
      api.get("/ai/activity", { params }).then((r) => unwrapList<AIActivity>(r.data)),
    markRead: (id) =>
      api.post(`/ai/activity/${id}/read`).then((r) => unwrap<AIActivity>(r.data)),
    markAllRead: () =>
      api.post("/ai/activity/read-all").then((r) => unwrap<{ ok: boolean; unreadCount: number }>(r.data)),
  },
  integrations: {
    getGoogleStatus: () =>
      api.get("/ai/integrations/google/status").then((r) => unwrap<GoogleIntegrationStatus>(r.data)),
    getGoogleAuthorizeUrl: () =>
      api.get("/ai/integrations/google/authorize-url").then((r) => unwrap<{ url: string }>(r.data).url),
    disconnectGoogle: () =>
      api.post("/ai/integrations/google/disconnect").then((r) => unwrap<GoogleIntegrationStatus>(r.data)),
    getMetaStatus: () =>
      api.get("/ai/content/meta/status").then((r) => unwrap<MetaIntegrationStatus>(r.data)),
    // Connect/Disconnect Meta Ads (Marketing API) — kartu "Meta Ads API" di
    // Settings. Token juga tidak pernah ada di response ini (ditahan backend,
    // MetaAdsOAuthController).
    getMetaAdsStatus: () =>
      api.get("/ai/integrations/meta-ads/status").then((r) => unwrap<MetaAdsIntegrationStatus>(r.data)),
    getMetaAdsAuthorizeUrl: () =>
      api.get("/ai/integrations/meta-ads/authorize-url").then((r) => unwrap<{ url: string }>(r.data).url),
    disconnectMetaAds: () =>
      api.post("/ai/integrations/meta-ads/disconnect").then((r) => unwrap<MetaAdsIntegrationStatus>(r.data)),
  },
  cro: {
    getFunnelSummary: (days = 28) =>
      api.get("/ai/cro/funnel-summary", { params: { days } }).then((r) => unwrap<CroFunnelSummary>(r.data)),
  },
  seo: {
    getLocalSummary: (days = 30) =>
      api
        .get("/ai/seo/local-summary", { params: { days } })
        .then((r) => unwrap<LocalSeoSummary>(r.data)),
    getSearchConsoleSummary: (days = 28) =>
      api
        .get("/ai/seo/search-console-summary", { params: { days } })
        .then((r) => unwrap<SearchConsoleSummary>(r.data)),
    getSearchConsoleSites: () =>
      api
        .get("/ai/seo/search-console-sites")
        .then((r) => unwrap<{ sites: SearchConsoleSiteItem[]; selected: string | null; message?: string }>(r.data)),
    selectSearchConsoleSite: (siteUrl) =>
      api
        .post("/ai/seo/search-console-site", { siteUrl })
        .then((r) => unwrap<{ ok: boolean; siteUrl: string | null }>(r.data)),
    draftReviewReply: (reviewId, payload) =>
      api
        .post(`/ai/seo/local-reviews/${encodeURIComponent(reviewId)}/draft-reply`, payload)
        .then((r) => unwrap<{ reviewId: string; draft: string; provider?: string | null }>(r.data)),
    replyReview: (reviewId, comment) =>
      api
        .post(`/ai/seo/local-reviews/${encodeURIComponent(reviewId)}/reply`, { comment })
        .then((r) => unwrap<{ comment: string; updateTime?: string }>(r.data)),
  },
  marketing: {
    getAnalyticsOverview: (p) =>
      api.get("/ai/analytics/overview", { params: p }).then((r) => unwrap<AnalyticsOverview>(r.data)),
    getAdsSummary: (p) =>
      api.get("/ai/ads/summary", { params: p }).then((r) => unwrap<AdsSummary>(r.data)),
    getContentSummary: (p) =>
      api.get("/ai/content/summary", { params: p }).then((r) => unwrap<ContentSummary>(r.data)),
    getLeadsFunnel: (p) =>
      api.get("/ai/leads/funnel", { params: p }).then((r) => unwrap<LeadsFunnel>(r.data)),
    getHighIntentLeads: (limit = 25) =>
      api.get("/ai/leads/high-intent", { params: { limit } }).then((r) => unwrap<HighIntentLeadsResponse>(r.data)),
    getContentQueue: () =>
      api.get("/ai/content/queue").then((r) => unwrapList<AiContentDraftItem>(r.data)),
    createContentDraft: (body) =>
      api.post("/ai/content/queue", body).then((r) => unwrap<AiContentDraftItem>(r.data)),
    updateContentDraft: (id, body) =>
      api.patch(`/ai/content/queue/${id}`, body).then((r) => unwrap<Partial<AiContentDraftItem>>(r.data)),
    deleteContentDraft: (id) =>
      api.delete(`/ai/content/queue/${id}`).then((r) => unwrap<{ ok: boolean; id: string }>(r.data)),
    pushContentDraftToEmail: (id) =>
      api.post(`/ai/content/queue/${id}/email-draft`).then((r) => unwrap<{ campaignId: number; redirectPath: string }>(r.data)),
    getInspirationLibrary: () =>
      api.get("/ai/content/inspiration/library").then((r) => unwrap<InspirationLibrary>(r.data)),
    analyzeInspiration: (p) =>
      api.post("/ai/content/inspiration/analyze", p).then((r) => unwrap<InspirationAnalysis>(r.data)),
    getMarketInsights: (focus) =>
      api
        .get("/ai/market/insights", { params: focus ? { focus } : undefined })
        .then((r) => unwrap<MarketIntelligenceReport>(r.data)),
    analyzeMarket: (p) =>
      api.post("/ai/market/analyze", p ?? {}).then((r) => unwrap<MarketIntelligenceReport>(r.data)),
    getLearningSummary: (days = 30) =>
      api.get("/ai/learning/summary", { params: { days } }).then((r) => unwrap<AiLearningSummary>(r.data)),
    addLearningRule: (body) =>
      api.post("/ai/learning/rules", body).then((r) => unwrap<AiLearningRule>(r.data)),
    deleteLearningRule: (id) =>
      api.delete(`/ai/learning/rules/${encodeURIComponent(id)}`).then((r) => unwrap<{ ok: boolean; id: string }>(r.data)),
    addIgBoost: (body) =>
      api.post("/ai/learning/ig-boost", body).then((r) => unwrap<IgBoostEntry>(r.data)),
    deleteIgBoost: (id) =>
      api.delete(`/ai/learning/ig-boost/${encodeURIComponent(id)}`).then((r) => unwrap<{ ok: boolean; id: string }>(r.data)),
  },
};