// path: src/lib/ai/services/types.ts
/**
 * AI Marketing — kontrak (interface) tiap grup service, dipakai bersama
 * oleh `mock.ts` dan `laravel.ts`. `lib/ai/services/index.ts` melakukan
 * `export * from "./types"`, jadi file ini adalah satu-satunya sumber
 * kebenaran untuk bentuk yang wajib dipenuhi kedua adapter tsb.
 *
 * Catatan: file ini sebelumnya tidak sengaja tertimpa isi implementasi
 * `laravel.ts` (duplikat, bukan interface), sehingga `AIIntegrationsService`
 * dkk. tidak pernah benar-benar terdefinisi meski di-import oleh mock.ts.
 * Dipulihkan sebagai bagian dari pekerjaan integrasi Meta Graph API — tidak
 * ada perubahan perilaku untuk grup lain selain penambahan
 * `integrations.getMetaStatus`.
 */
import type {
  AIActivity,
  AIAgent,
  AIAgentId,
  AIApproval,
  AIApprovalStatus,
  AICroService,
  AIDateRangeParams,
  AIInsight,
  AIInsightType,
  AIKpi,
  AIProviderInfo,
  AIProviderPreference,
  AIProviderQuota,
  AIRecommendation,
  AIRoutingStrategy,
  AISeoService,
  AIUsageByAgent,
  AIUsageByProvider,
  AIUsageTotals,
  AiChatContextKey,
  AiChatMessage,
  AiLearningRule,
  AiLearningSummary,
  BusinessHealth,
  Campaign,
  CampaignGoal,
  CampaignPlanStep,
  GoogleIntegrationStatus,
  MarketIntelligenceReport,
  MetaAdsIntegrationStatus,
  ImpactRecord,
  MetaIntegrationStatus,
  PriorityItem,
  AnalyticsOverview,
  AdsSummary,
  AgentRunResult,
  AiContentDraftItem,
  CreateContentDraftRequest,
  ContentSummary,
  HighIntentLeadsResponse,
  LeadsFunnel,
  InspirationLibrary,
  InspirationAnalysis,
  InspirationAnalysisRequest,
} from "../types";

export interface AIMarketingService {
  getAnalyticsOverview: (p: { from: string; to: string; days: number }) => Promise<AnalyticsOverview>;
  getAdsSummary: (p: { from: string; to: string; days: number }) => Promise<AdsSummary>;
  getContentSummary: (p: { from: string; to: string; days: number }) => Promise<ContentSummary>;
  getLeadsFunnel: (p: { from: string; to: string; days: number }) => Promise<LeadsFunnel>;
  getHighIntentLeads: (limit?: number) => Promise<HighIntentLeadsResponse>;
  getContentQueue: () => Promise<AiContentDraftItem[]>;
  createContentDraft: (body: CreateContentDraftRequest) => Promise<AiContentDraftItem>;
  updateContentDraft: (
    id: string,
    body: {
      title?: string;
      status?: string;
      channel?: string;
      caption?: string;
      headline?: string;
      body?: string;
      cta_label?: string;
      scheduled_for?: string;
    },
  ) => Promise<Partial<AiContentDraftItem>>;
  deleteContentDraft: (id: string) => Promise<{ ok: boolean; id: string }>;
  pushContentDraftToEmail: (id: string) => Promise<{ campaignId: number; redirectPath: string }>;
  getInspirationLibrary: () => Promise<InspirationLibrary>;
  analyzeInspiration: (p: InspirationAnalysisRequest) => Promise<InspirationAnalysis>;
  getMarketInsights: (focus?: string) => Promise<MarketIntelligenceReport>;
  analyzeMarket: (p?: { focus?: string; refresh?: boolean }) => Promise<MarketIntelligenceReport>;
  getLearningSummary: (days?: number) => Promise<AiLearningSummary>;
  addLearningRule: (body: { rule: string; category?: string }) => Promise<AiLearningRule>;
  deleteLearningRule: (id: string) => Promise<{ ok: boolean; id: string }>;
}

export interface AIDashboardService {
  getBusinessHealth(params?: AIDateRangeParams): Promise<BusinessHealth>;
  getPriorities(): Promise<PriorityItem[]>;
  getOverviewKpis(params?: AIDateRangeParams): Promise<AIKpi[]>;
  getAgents(): Promise<AIAgent[]>;
  runAgent(key: AIAgentId | "all", limit?: number): Promise<AgentRunResult>;
}

export interface AIRecommendationService {
  list(params?: { status?: AIApprovalStatus }): Promise<AIRecommendation[]>;
  getById(id: string): Promise<AIRecommendation | undefined>;
  approve(id: string): Promise<AIRecommendation>;
  reject(id: string): Promise<AIRecommendation>;
}

export interface AIActionService {
  list(params?: { status?: string; agent?: string }): Promise<AIApproval[]>;
  approveAndExecute(id: string): Promise<AIApproval>;
  reject(id: string): Promise<AIApproval>;
}

export interface AIChatService {
  ask(
    message: string,
    context: AiChatContextKey,
    opts?: { webSearch?: boolean; history?: { role: "user" | "assistant"; text: string }[] },
  ): Promise<AiChatMessage>;
}

export interface AIUsageService {
  getTotals(params?: AIDateRangeParams): Promise<AIUsageTotals>;
  getByAgent(params?: AIDateRangeParams): Promise<AIUsageByAgent[]>;
  getByProvider(params?: AIDateRangeParams): Promise<AIUsageByProvider[]>;
}

export interface AIProviderService {
  list(): Promise<AIProviderInfo[]>;
  sync(): Promise<AIProviderInfo[]>;
  test(provider: string): Promise<{ provider: string; model?: string; status: string; latencyMs?: number; message: string }>;
  getRoutingStrategy(): Promise<AIRoutingStrategy>;
  getQuota(): Promise<AIProviderQuota[]>;
  getPreference(): Promise<AIProviderPreference>;
  setPreference(provider: string | null): Promise<AIProviderPreference>;
}

export interface CreateCampaignRequest {
  name: string;
  channel: string;
  summary?: string;
  budget_daily?: string;
  health?: "Good" | "Fair" | "Needs Attention";
  status?: "Active" | "Paused" | "Draft" | "Ended";
}

export interface UpdateCampaignRequest {
  status?: "Active" | "Paused" | "Draft" | "Ended";
  health?: "Good" | "Fair" | "Needs Attention";
  summary?: string;
  budget_daily?: string;
  plan?: CampaignPlanStep[];
  goals?: CampaignGoal[];
}

export interface AICampaignService {
  list(params?: AIDateRangeParams): Promise<Campaign[]>;
  getById(id: string): Promise<Campaign | undefined>;
  create(body: CreateCampaignRequest): Promise<Campaign>;
  update(id: string, body: UpdateCampaignRequest): Promise<Campaign>;
  sync(): Promise<{ synced: number; campaigns: Campaign[] }>;
}

export interface AIImpactService {
  list(): Promise<ImpactRecord[]>;
  refresh(): Promise<{ updated: number; records: ImpactRecord[] }>;
}

export interface AIInsightService {
  list(params?: { type?: AIInsightType; agent?: AIAgentId }): Promise<AIInsight[]>;
  getById(id: string): Promise<AIInsight | undefined>;
  dismiss(id: string): Promise<{ ok: boolean; id: string }>;
}

export interface AIActivityService {
  list(params?: { agent?: AIAgentId; kind?: AIActivity["kind"] }): Promise<AIActivity[]>;
  markRead(id: string): Promise<AIActivity>;
  markAllRead(): Promise<{ ok: boolean; unreadCount: number }>;
}

/**
 * OAuth Google (Search Console) + status read-only Meta Graph API
 * (Facebook Page + Instagram Business). `getMetaStatus` dipakai kartu
 * "Instagram & Facebook" di Content Agent — dicocokkan 1:1 dengan
 * `MetaIntegrationController@status` di backend, tidak pernah membawa token.
 */
export interface AIIntegrationsService {
  getGoogleStatus(): Promise<GoogleIntegrationStatus>;
  getGoogleAuthorizeUrl(): Promise<string>;
  disconnectGoogle(): Promise<GoogleIntegrationStatus>;
  getMetaStatus(): Promise<MetaIntegrationStatus>;
  getMetaAdsStatus(): Promise<MetaAdsIntegrationStatus>;
  getMetaAdsAuthorizeUrl(): Promise<string>;
  disconnectMetaAds(): Promise<MetaAdsIntegrationStatus>;
}

export interface AIServiceBundle {
  marketing: AIMarketingService;
  dashboard: AIDashboardService;
  recommendations: AIRecommendationService;
  actions: AIActionService;
  chat: AIChatService;
  usage: AIUsageService;
  providers: AIProviderService;
  campaigns: AICampaignService;
  impact: AIImpactService;
  insights: AIInsightService;
  activity: AIActivityService;
  integrations: AIIntegrationsService;
  seo: AISeoService;
  cro: AICroService;
}