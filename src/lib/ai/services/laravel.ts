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
  PriorityItem,
  SearchConsoleSummary,
  AiChatMessage,
} from "../types";
import type { AIServiceBundle } from "./types";

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
    list: () => api.get("/ai/actions").then((r) => unwrapList<AIApproval>(r.data)),
    approveAndExecute: (id) =>
      api.post(`/ai/actions/${id}/approve-execute`).then((r) => unwrap<AIApproval>(r.data)),
    reject: (id) => api.post(`/ai/actions/${id}/reject`).then((r) => unwrap<AIApproval>(r.data)),
  },
  chat: {
    ask: (message, context) =>
      api.post("/ai/chat", { message, context }).then((r) => unwrap<AiChatMessage>(r.data)),
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
  },
  impact: {
    list: () => api.get("/ai/impact").then((r) => unwrapList<ImpactRecord>(r.data)),
  },
  insights: {
    list: (params) =>
      api.get("/ai/insights", { params }).then((r) => unwrapList<AIInsight>(r.data)),
    getById: (id) => api.get(`/ai/insights/${id}`).then((r) => unwrap<AIInsight>(r.data)),
  },
  activity: {
    list: (params) =>
      api.get("/ai/activity", { params }).then((r) => unwrapList<AIActivity>(r.data)),
  },
  integrations: {
    getGoogleStatus: () =>
      api.get("/ai/integrations/google/status").then((r) => unwrap<GoogleIntegrationStatus>(r.data)),
    getGoogleAuthorizeUrl: () =>
      api
        .get("/ai/integrations/google/authorize-url")
        .then((r) => unwrap<{ url: string }>(r.data).url),
    disconnectGoogle: () =>
      api
        .post("/ai/integrations/google/disconnect")
        .then((r) => unwrap<GoogleIntegrationStatus>(r.data)),
  },
  cro: {
    getFunnelSummary: () =>
      api.get("/ai/cro/funnel-summary").then((r) => unwrap<CroFunnelSummary>(r.data)),
  },
  seo: {
    getSearchConsoleSummary: (days = 28) =>
      api
        .get("/ai/seo/search-console-summary", { params: { days } })
        .then((r) => unwrap<SearchConsoleSummary>(r.data)),
  },
};
