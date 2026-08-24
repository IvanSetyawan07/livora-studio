/**
 * Laravel adapter — talks to the real AI orchestration API.
 *
 * Not used by default (see index.ts). Every endpoint below is a
 * reasonable REST convention for what the Laravel side is expected to
 * expose; adjust paths to match the actual API once it's built. Because
 * every page imports `aiServices` (not this file directly), switching
 * from mock to live data is a one-line change in index.ts — no UI code
 * needs to move.
 */
import { api } from "@/lib/api";
import type { AIApproval, AIRecommendation } from "../types";
import type { AIServiceBundle } from "./types";

export const laravelServices: AIServiceBundle = {
  dashboard: {
    getBusinessHealth: () => api.get("/ai/dashboard/health").then((r) => r.data),
    getPriorities: () => api.get("/ai/dashboard/priorities").then((r) => r.data),
    getOverviewKpis: () => api.get("/ai/dashboard/kpis").then((r) => r.data),
    getAgents: () => api.get("/ai/agents").then((r) => r.data),
  },
  recommendations: {
    list: (params) => api.get("/ai/recommendations", { params }).then((r) => r.data),
    getById: (id) => api.get(`/ai/recommendations/${id}`).then((r) => r.data),
    approve: (id) => api.post<AIRecommendation>(`/ai/recommendations/${id}/approve`).then((r) => r.data),
    reject: (id) => api.post<AIRecommendation>(`/ai/recommendations/${id}/reject`).then((r) => r.data),
  },
  actions: {
    list: () => api.get("/ai/actions").then((r) => r.data),
    approveAndExecute: (id) => api.post<AIApproval>(`/ai/actions/${id}/approve-execute`).then((r) => r.data),
    reject: (id) => api.post<AIApproval>(`/ai/actions/${id}/reject`).then((r) => r.data),
  },
  chat: {
    ask: (message, context) => api.post("/ai/chat", { message, context }).then((r) => r.data),
  },
  usage: {
    getTotals: () => api.get("/ai/usage/totals").then((r) => r.data),
    getByAgent: () => api.get("/ai/usage/by-agent").then((r) => r.data),
    getByProvider: () => api.get("/ai/usage/by-provider").then((r) => r.data),
  },
  providers: {
    list: () => api.get("/ai/providers").then((r) => r.data),
    getRoutingStrategy: () => api.get("/ai/routing-strategy").then((r) => r.data),
  },
  campaigns: {
    list: () => api.get("/ai/campaigns").then((r) => r.data),
    getById: (id) => api.get(`/ai/campaigns/${id}`).then((r) => r.data),
  },
  impact: {
    list: () => api.get("/ai/impact").then((r) => r.data),
  },
};
