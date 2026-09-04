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
  BusinessHealth,
  Campaign,
  GoogleIntegrationStatus,
  ImpactRecord,
  MetaIntegrationStatus,
  PriorityItem,
} from "../types";

export interface AIDashboardService {
  getBusinessHealth(params?: AIDateRangeParams): Promise<BusinessHealth>;
  getPriorities(): Promise<PriorityItem[]>;
  getOverviewKpis(params?: AIDateRangeParams): Promise<AIKpi[]>;
  getAgents(): Promise<AIAgent[]>;
}

export interface AIRecommendationService {
  list(params?: { status?: AIApprovalStatus }): Promise<AIRecommendation[]>;
  getById(id: string): Promise<AIRecommendation | undefined>;
  approve(id: string): Promise<AIRecommendation>;
  reject(id: string): Promise<AIRecommendation>;
}

export interface AIActionService {
  list(): Promise<AIApproval[]>;
  approveAndExecute(id: string): Promise<AIApproval>;
  reject(id: string): Promise<AIApproval>;
}

export interface AIChatService {
  ask(message: string, context: AiChatContextKey): Promise<AiChatMessage>;
}

export interface AIUsageService {
  getTotals(params?: AIDateRangeParams): Promise<AIUsageTotals>;
  getByAgent(params?: AIDateRangeParams): Promise<AIUsageByAgent[]>;
  getByProvider(params?: AIDateRangeParams): Promise<AIUsageByProvider[]>;
}

export interface AIProviderService {
  list(): Promise<AIProviderInfo[]>;
  getRoutingStrategy(): Promise<AIRoutingStrategy>;
  getQuota(): Promise<AIProviderQuota[]>;
  getPreference(): Promise<AIProviderPreference>;
  setPreference(provider: string | null): Promise<AIProviderPreference>;
}

export interface AICampaignService {
  list(params?: AIDateRangeParams): Promise<Campaign[]>;
  getById(id: string): Promise<Campaign | undefined>;
}

export interface AIImpactService {
  list(): Promise<ImpactRecord[]>;
}

export interface AIInsightService {
  list(params?: { type?: AIInsightType; agent?: AIAgentId }): Promise<AIInsight[]>;
  getById(id: string): Promise<AIInsight | undefined>;
}

export interface AIActivityService {
  list(params?: { agent?: AIAgentId; kind?: AIActivity["kind"] }): Promise<AIActivity[]>;
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
}

export interface AIServiceBundle {
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