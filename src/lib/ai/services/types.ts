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
  AIRecommendation,
  AIRoutingStrategy,
  AiChatContextKey,
  AiChatMessage,
  AIUsageByAgent,
  AIUsageByProvider,
  AIUsageTotals,
  BusinessHealth,
  Campaign,
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
  list(params?: { status?: AIApprovalStatus }): Promise<AIRecommendation[]>;
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
}
