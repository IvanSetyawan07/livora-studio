/**
 * Service contracts for the AI Marketing surface.
 *
 * The UI only ever imports `aiServices` from `./index`, never a concrete
 * implementation directly. That keeps every page swappable: today
 * `aiServices` resolves to `mockServices` (in-memory demo data); once the
 * Laravel AI orchestration API exists, flip `VITE_AI_BACKEND=live` (see
 * index.ts) and `laravelServices` takes over with zero UI changes.
 */
import type {
  AIAgent,
  AIApproval,
  AIApprovalStatus,
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

export interface AIServiceBundle {
  dashboard: AIDashboardService;
  recommendations: AIRecommendationService;
  actions: AIActionService;
  chat: AIChatService;
  usage: AIUsageService;
  providers: AIProviderService;
  campaigns: AICampaignService;
  impact: AIImpactService;
}
