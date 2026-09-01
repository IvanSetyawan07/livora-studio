// src/lib/ai/services/mock.ts
/**
 * Mock adapter — the default implementation until the Laravel AI
 * orchestration API exists. State lives in memory for the session so
 * Approve/Reject/Execute genuinely mutate the UI (optimistic, not just
 * disabled buttons), while staying honest that nothing here is real.
 */
import {
  activity as activityFixture,
  agents as agentsFixture,
  approvals as approvalsFixture,
  businessHealth as businessHealthFixture,
  insights as insightsFixture,
  overviewKpis,
  priorities as prioritiesFixture,
  recommendations as recommendationsFixture,
} from "../data";

import { campaigns as campaignsFixture, impactRecords as impactFixture } from "../workspace-data";
import { providers as providersFixture, routingStrategy, usageByAgent, usageByProvider, usageTotals } from "../system-data";
import type { AIApproval, AIRecommendation, AISeoService, AiChatContextKey, AiChatMessage, GoogleIntegrationStatus } from "../types";
import type {
  AIActionService,
  AIActivityService,
  AICampaignService,
  AIChatService,
  AIDashboardService,
  AIImpactService,
  AIInsightService,
  AIIntegrationsService,
  AIProviderService,
  AIRecommendationService,
  AIUsageService,
  AIServiceBundle,
} from "./types";

const delay = (ms = 380) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory, mutable copies — this is what makes Approve/Reject feel real
// within a session without a backend.
let recommendationsState: AIRecommendation[] = recommendationsFixture.map((r) => ({ ...r }));
let approvalsState: AIApproval[] = approvalsFixture.map((a) => ({ ...a }));

function syncApprovalFromRecommendation(rec: AIRecommendation) {
  approvalsState = approvalsState.map((a) =>
    a.recommendationId === rec.id
      ? { ...a, status: rec.status, decidedBy: "You", decidedAt: new Date().toISOString() }
      : a,
  );
}

const dashboard: AIDashboardService = {
  async getBusinessHealth() {
    await delay(300);
    return businessHealthFixture;
  },
  async getPriorities() {
    await delay(320);
    return prioritiesFixture;
  },
  async getOverviewKpis() {
    await delay(300);
    return overviewKpis;
  },
  async getAgents() {
    await delay(250);
    return agentsFixture;
  },
};

const recommendations: AIRecommendationService = {
  async list(params) {
    await delay(320);
    if (params?.status) return recommendationsState.filter((r) => r.status === params.status);
    return recommendationsState;
  },
  async getById(id) {
    await delay(200);
    return recommendationsState.find((r) => r.id === id);
  },
  async approve(id) {
    await delay(500);
    recommendationsState = recommendationsState.map((r) => (r.id === id ? { ...r, status: "approved" } : r));
    const updated = recommendationsState.find((r) => r.id === id)!;
    syncApprovalFromRecommendation(updated);
    return updated;
  },
  async reject(id) {
    await delay(400);
    recommendationsState = recommendationsState.map((r) => (r.id === id ? { ...r, status: "rejected" } : r));
    const updated = recommendationsState.find((r) => r.id === id)!;
    syncApprovalFromRecommendation(updated);
    return updated;
  },
};

const actions: AIActionService = {
  async list() {
    await delay(320);
    return approvalsState;
  },
  async approveAndExecute(id) {
    await delay(700);
    approvalsState = approvalsState.map((a) =>
      a.id === id ? { ...a, status: "executed", decidedBy: "You", decidedAt: new Date().toISOString() } : a,
    );
    const updated = approvalsState.find((a) => a.id === id)!;
    recommendationsState = recommendationsState.map((r) =>
      r.id === updated.recommendationId ? { ...r, status: "executed" } : r,
    );
    return updated;
  },
  async reject(id) {
    await delay(400);
    approvalsState = approvalsState.map((a) =>
      a.id === id ? { ...a, status: "rejected", decidedBy: "You", decidedAt: new Date().toISOString() } : a,
    );
    const updated = approvalsState.find((a) => a.id === id)!;
    recommendationsState = recommendationsState.map((r) =>
      r.id === updated.recommendationId ? { ...r, status: "rejected" } : r,
    );
    return updated;
  },
};

// Small, scripted, context-aware canned responses — NOT a real model call.
// Every reply says so. This exists purely so the drawer demonstrates the
// intended UX (context-awareness, suggested questions) before the Laravel
// + Claude integration lands.
const scriptedReplies: Partial<Record<AiChatContextKey, string>> = {
  overview:
    "Business health is 85/100 and trending up. The two things worth your attention this week are the consultation funnel (step-two completion dropped to 38%) and 6 unanswered reviews.",
  seo: "Serenade's engagement is up 41% but organic visibility hasn't followed — that's the metadata recommendation waiting in your queue. Local pack rank also moved from #4 to #3.",
  content: "Oak & Linen is your top-3 collection by engagement with zero editorial coverage. That's the highest-leverage content gap open right now.",
  ads: "Cost per lead is down 12% month over month and ROAS sits at 4.2x, both trending the right way. Spend is still concentrated in Google — worth watching for diminishing returns.",
  leads: "Three identities crossed the high-intent threshold this week. All three were routed to the senior queue and one has already booked a consultation.",
  cro: "Step-two completion on the consultation form fell from 71% to 38% over two weeks. The recommendation queued for this proposes cutting required fields from nine to five.",
  campaigns: "Consultation Funnel Recovery needs the most attention — it's the only campaign currently off track.",
  impact: "The project-template fix and the lead-routing change have both measured positive so far. Nothing has come back negative yet.",
  actions: "You have items waiting in Needs Review. Approving low-risk ones first is usually the fastest way to clear the queue.",
  recommendations: "Recommendations are sorted by priority — the consultation funnel fix is the highest-impact one currently open.",
  usage: "Content Agent is your highest-cost agent this month, driven by draft volume rather than any single expensive request.",
  providers: "No provider is connected yet — these figures are illustrative until the Laravel AI orchestration layer is wired up.",
  general: "I can help you understand what's happening in your marketing right now — try asking about a specific agent or metric.",
};

const chat: AIChatService = {
  async ask(message, context) {
    await delay(650);
    const base = scriptedReplies[context] ?? scriptedReplies.general!;
    const text =
      message.trim().length > 0
        ? base
        : "What can I help you with? Try one of the suggested questions, or ask about anything on this page.";
    return { id: `msg_${Date.now()}`, role: "assistant", text, createdAt: new Date().toISOString() };
  },
};

const usage: AIUsageService = {
  async getTotals() {
    await delay(280);
    return usageTotals;
  },
  async getByAgent() {
    await delay(280);
    return usageByAgent;
  },
  async getByProvider() {
    await delay(280);
    return usageByProvider;
  },
};

const providers: AIProviderService = {
  async list() {
    await delay(280);
    return providersFixture;
  },
  async getRoutingStrategy() {
    await delay(280);
    return routingStrategy;
  },
  async getQuota() {
    await delay(200);
    return [];
  },
  async getPreference() {
    await delay(150);
    return { preferredProvider: null, scope: "global" };
  },
  async setPreference(provider) {
    await delay(200);
    return { preferredProvider: provider, scope: "global" };
  },
};

const insights: AIInsightService = {
  async list(params) {
    await delay(300);
    return insightsFixture.filter(
      (i) =>
        (!params?.type || i.type === params.type) &&
        (!params?.agent || i.agent === params.agent),
    );
  },
  async getById(id) {
    await delay(200);
    return insightsFixture.find((i) => i.id === id);
  },
};

const activity: AIActivityService = {
  async list(params) {
    await delay(280);
    return activityFixture.filter(
      (a) =>
        (!params?.agent || a.agent === params.agent) &&
        (!params?.kind || a.kind === params.kind),
    );
  },
};

const campaigns: AICampaignService = {
  async list() {
    await delay(320);
    return campaignsFixture;
  },
  async getById(id) {
    await delay(220);
    return campaignsFixture.find((c) => c.id === id);
  },
};

const impact: AIImpactService = {
  async list() {
    await delay(300);
    return impactFixture;
  },
};

// In-memory saja, jujur bukan koneksi Google beneran — cuma biar UI
// "Connect / Disconnect" bisa dites tanpa backend saat VITE_AI_BACKEND=mock.
let googleIntegrationState: GoogleIntegrationStatus = {
  connected: false,
  email: null,
  scope: null,
  connectedAt: null,
};

const integrations: AIIntegrationsService = {
  async getGoogleStatus() {
    await delay(200);
    return googleIntegrationState;
  },
  async getGoogleAuthorizeUrl() {
    await delay(200);
    // Tidak ada consent screen asli di mode demo — langsung tandai connected
    // supaya alurnya tetap bisa dicoba end-to-end di UI.
    googleIntegrationState = {
      connected: true,
      email: "demo@livoralcr.com",
      scope: "webmasters.readonly",
      connectedAt: new Date().toISOString(),
    };
    return "#mock-google-connected";
  },
  async disconnectGoogle() {
    await delay(200);
    googleIntegrationState = { connected: false, email: null, scope: null, connectedAt: null };
    return googleIntegrationState;
  },
};

// Honest-empty: belum ada koneksi Search Console beneran di mode mock,
// jadi selalu balikin status disconnected/no-data (bukan angka fiktif).
const seo: AISeoService = {
  async getSearchConsoleSummary() {
    await delay(250);
    return {
      connected: false,
      hasData: false,
      message: "Search Console belum terhubung.",
      period: null,
      totals: null,
      siteUrl: null,
    };
  },
};

// Honest-empty juga untuk CRO: mode mock tidak punya database consultation.
const cro: AICroService = {
  async getFunnelSummary() {
    await delay(200);
    return {
      hasData: false,
      message: "Mode mock tidak terhubung ke database konsultasi.",
      totals: null,
      stages: [],
      unavailable: [],
    };
  },
};

export const mockServices: AIServiceBundle = {
  dashboard,
  recommendations,
  actions,
  chat,
  usage,
  providers,
  campaigns,
  impact,
  insights,
  activity,
  integrations,
  seo,
  cro,
};