// src/lib/ai/services/types.ts
/**
 * Service contracts for the AI Marketing surface.
 *
 * The UI only ever imports `aiServices` from `./index`, never a concrete
 * implementation directly. Default sekarang LIVE (Laravel); set
 * VITE_AI_BACKEND=mock untuk kembali ke fixture demo.
 */
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
  AiChatContextKey,
  AiChatMessage,
  AIUsageByAgent,
  AIUsageByProvider,
  AIUsageTotals,
  AISeoService,
  BusinessHealth,
  Campaign,
  GoogleIntegrationStatus,
  ImpactRecord,
  PriorityItem,
} from "../types";

export interface AIDashboardService {
  getBusinessHealth(): Promise<BusinessHealth>;
  getPriorities(): Promise<PriorityItem[]>;
  getOverviewKpis(): Promise<AIKpi[]>;
  getAgents(): Promise<AIAgent[]>;
}

export interface AIRecommendationService {
  list(params?: { agent?: AIAgentId; status?: AIApprovalStatus }): Promise<AIRecommendation[]>;
  getById(id: string): Promise<AIRecommendation | undefined>;
  approve(id: string): Promise<AIRecommendation>;
  reject(id: string): Promise<AIRecommendation>;
}

export interface AIActionService {
  /** Actions reuse the AIApproval shape — an action is a recommendation in flight. */
  list(): Promise<AIApproval[]>;
  approveAndExecute(id: string): Promise<AIApproval>;
  reject(id: string): Promise<AIApproval>;
}

export interface AIChatService {
  ask(message: string, context: AiChatContextKey): Promise<AiChatMessage>;
}

export interface AIUsageService {
  getTotals(): Promise<AIUsageTotals>;
  getByAgent(): Promise<AIUsageByAgent[]>;
  getByProvider(): Promise<AIUsageByProvider[]>;
}

export interface AIProviderService {
  list(): Promise<AIProviderInfo[]>;
  getRoutingStrategy(): Promise<AIRoutingStrategy>;
  /** Snapshot kuota terakhir per provider, dibaca dari header respons API asli. */
  getQuota(): Promise<AIProviderQuota[]>;
  getPreference(): Promise<AIProviderPreference>;
  setPreference(provider: string | null): Promise<AIProviderPreference>;
}

export interface AICampaignService {
  list(): Promise<Campaign[]>;
  getById(id: string): Promise<Campaign | undefined>;
}

export interface AIImpactService {
  list(): Promise<ImpactRecord[]>;
}

/** Fase 5 — tabel ai_insights (InsightController). */
export interface AIInsightService {
  list(params?: { type?: AIInsightType; agent?: AIAgentId; limit?: number }): Promise<AIInsight[]>;
  getById(id: string): Promise<AIInsight | undefined>;
}

/** Fase 5 — tabel ai_activity_log (ActivityController). */
export interface AIActivityService {
  list(params?: { agent?: AIAgentId; kind?: AIActivity["kind"]; limit?: number }): Promise<AIActivity[]>;
}

/**
 * Fase 6 — koneksi OAuth Google (Search Console) untuk SEO Agent.
 * Path dicocokkan 1:1 dengan GoogleIntegrationController di backend.
 */
export interface AIIntegrationsService {
  getGoogleStatus(): Promise<GoogleIntegrationStatus>;
  /** Return URL consent screen Google — UI yang melakukan window.location.href. */
  getGoogleAuthorizeUrl(): Promise<string>;
  disconnectGoogle(): Promise<GoogleIntegrationStatus>;
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
}