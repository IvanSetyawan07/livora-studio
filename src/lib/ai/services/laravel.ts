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
 */
import { api } from "@/lib/api";
import type { AIApproval, AIRecommendation } from "../types";
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
    
    getBusinessHealth: () => api.get("/ai/dashboard/health").then((r) => unwrap(r.data)),
    getPriorities: () => api.get("/ai/dashboard/priorities").then((r) => unwrapList(r.data)),
    getOverviewKpis: () => api.get("/ai/dashboard/kpis").then((r) => unwrapList(r.data)),
    getAgents: () => api.get("/ai/agents").then((r) => unwrapList(r.data)),
  },
  recommendations: {
    list: (params) => api.get("/ai/recommendations", { params }).then((r) => unwrapList(r.data)),
    getById: (id) => api.get(`/ai/recommendations/${id}`).then((r) => unwrap(r.data)),
    approve: (id) =>
      api.post(`/ai/recommendations/${id}/approve`).then((r) => unwrap<AIRecommendation>(r.data)),
    reject: (id) =>
      api.post(`/ai/recommendations/${id}/reject`).then((r) => unwrap<AIRecommendation>(r.data)),
  },
  actions: {
    list: () => api.get("/ai/actions").then((r) => unwrapList(r.data)),
    approveAndExecute: (id) =>
      api.post(`/ai/actions/${id}/approve-execute`).then((r) => unwrap<AIApproval>(r.data)),
    reject: (id) => api.post(`/ai/actions/${id}/reject`).then((r) => unwrap<AIApproval>(r.data)),
  },
  chat: {
    ask: (message, context) => api.post("/ai/chat", { message, context }).then((r) => unwrap(r.data)),
  },
  usage: {
    getTotals: () => api.get("/ai/usage/totals").then((r) => unwrap(r.data)),
    getByAgent: () => api.get("/ai/usage/by-agent").then((r) => unwrapList(r.data)),
    getByProvider: () => api.get("/ai/usage/by-provider").then((r) => unwrapList(r.data)),
  },
    providers: {
    list: () => api.get("/ai/providers").then((r) => unwrapList(r.data)),
    getRoutingStrategy: () => api.get("/ai/routing-strategy").then((r) => unwrap(r.data)),
    getQuota: () => api.get("/ai/providers/quota").then((r) => unwrapList(r.data)),
    getPreference: () => api.get("/ai/providers/preference").then((r) => unwrap(r.data)),
    setPreference: (provider) =>
      api.post("/ai/providers/preference", { preferredProvider: provider }).then((r) => unwrap(r.data)),
  },
  campaigns: {
    list: () => api.get("/ai/campaigns").then((r) => unwrapList(r.data)),
    getById: (id) => api.get(`/ai/campaigns/${id}`).then((r) => unwrap(r.data)),
  },
  impact: {
    list: () => api.get("/ai/impact").then((r) => unwrapList(r.data)),
  },
  insights: {
    list: (params) => api.get("/ai/insights", { params }).then((r) => unwrapList(r.data)),
    getById: (id) => api.get(`/ai/insights/${id}`).then((r) => unwrap(r.data)),
  },
  activity: {
    list: (params) => api.get("/ai/activity", { params }).then((r) => unwrapList(r.data)),
  },
  integrations: {
    getGoogleStatus: () =>
      api.get("/ai/integrations/google/status").then((r) => unwrap(r.data)),
    getGoogleAuthorizeUrl: () =>
      api
        .get("/ai/integrations/google/authorize-url")
        .then((r) => unwrap<{ url: string }>(r.data).url),
    disconnectGoogle: () =>
      api.post("/ai/integrations/google/disconnect").then((r) => unwrap(r.data)),
  },
  cro: {
    getFunnelSummary: () => api.get("/ai/cro/funnel-summary").then((r) => unwrap(r.data)),
  },
  
  seo: {
  getSearchConsoleSummary: (days = 28) =>
    api.get("/ai/seo/search-console-summary", { params: { days } }).then((r) => unwrap(r.data)),
},

};