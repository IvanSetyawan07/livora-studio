/**
 * Laravel adapter — talks to the real AI orchestration API (Fase 3/4).
 *
 * Path di sini SUDAH dicocokkan satu-satu dengan routes/api.php
 * (group `Route::middleware('admin')->prefix('ai')`).
 *
 * Catatan penting: sebagian endpoint memakai JsonResource (agents,
 * recommendations, campaigns, impact, providers) dan sebagian lagi
 * `response()->json(...)` polos (dashboard, usage). Kalau suatu saat
 * `JsonResource::withoutWrapping()` tidak jalan (BOM di provider,
 * config cache basi, dsb) response resource akan terbungkus `{ data: ... }`
 * dan UI langsung kosong tanpa error. `unwrap()` di bawah bikin adapter
 * tahan dua-duanya — bukan menutupi bug backend, cuma tidak bikin
 * dashboard blank karena satu byte.
 */
import { api } from "@/lib/api";
import type { AIApproval, AIRecommendation } from "../types";
import type { AIServiceBundle } from "./types";

function unwrap<T>(payload: unknown): T {
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

const get = <T>(url: string, config?: Parameters<typeof api.get>[1]) =>
  api.get(url, config).then((r) => unwrap<T>(r.data));

const post = <T>(url: string, body?: unknown) =>
  api.post(url, body).then((r) => unwrap<T>(r.data));

export const laravelServices: AIServiceBundle = {
  dashboard: {
    getBusinessHealth: () => get("/ai/dashboard/health"),
    getPriorities: () => get("/ai/dashboard/priorities"),
    getOverviewKpis: () => get("/ai/dashboard/kpis"),
    getAgents: () => get("/ai/agents"),
  },
  recommendations: {
    list: (params) => get("/ai/recommendations", { params }),
    getById: (id) => get(`/ai/recommendations/${id}`),
    approve: (id) => post<AIRecommendation>(`/ai/recommendations/${id}/approve`),
    reject: (id) => post<AIRecommendation>(`/ai/recommendations/${id}/reject`),
  },
  actions: {
    list: () => get("/ai/actions"),
    approveAndExecute: (id) => post<AIApproval>(`/ai/actions/${id}/approve-execute`),
    reject: (id) => post<AIApproval>(`/ai/actions/${id}/reject`),
  },
  chat: {
    ask: (message, context) => post("/ai/chat", { message, context }),
  },
  usage: {
    getTotals: () => get("/ai/usage/totals"),
    getByAgent: () => get("/ai/usage/by-agent"),
    getByProvider: () => get("/ai/usage/by-provider"),
  },
  providers: {
    list: () => get("/ai/providers"),
    getRoutingStrategy: () => get("/ai/routing-strategy"),
  },
  campaigns: {
    list: () => get("/ai/campaigns"),
    getById: (id) => get(`/ai/campaigns/${id}`),
  },
  impact: {
    list: () => get("/ai/impact"),
  },
};
