/**
 * LIVORA — AI Marketing data contracts.
 *
 * These types describe the shapes the future Laravel API is expected to return.
 * Nothing here talks to a backend yet: `src/lib/ai/data.ts` provides clearly
 * labelled demo/preview fixtures until the API is connected.
 */

export type ConnectionState = "connected" | "not_connected" | "coming_soon";

/** Where a piece of intelligence came from. */
export type AISource =
  | "Web Analytics"
  | "Search Console"
  | "Product Data"
  | "Collection Data"
  | "Campaign Data"
  | "Lead Data"
  | "Site Behaviour";

export type AIInsightType =
  | "opportunity"
  | "warning"
  | "trend"
  | "anomaly"
  | "recommendation"
  | "lead_intelligence";

export type AISeverity = "low" | "medium" | "high" | "critical";

export type AIAgentId = "seo" | "content" | "ads" | "leads" | "cro";

export type AIAgentStatus =
  | "active"
  | "running"
  | "paused"
  | "coming_soon"
  | "error";

export type AIApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "failed";

export type AIRisk = "low" | "medium" | "high";

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: AIInsightType;
  severity: AISeverity;
  /** 0–100 */
  confidence: number;
  source: AISource[];
  agent: AIAgentId;
  /** Human readable reasoning summary. Never exposes internal prompts. */
  reasoning: string;
  whatHappened: string;
  whyItMatters: string;
  expectedImpact: string;
  metrics?: { label: string; value: string; delta?: string }[];
  /** Deep-link into the existing analytics system. */
  analyticsHref?: string;
  recommendationId?: string;
  createdAt: string;
}

export type AIPriority = "low" | "medium" | "high";

export interface AIRecommendation {
  id: string;
  insightId: string | null;
  title: string;
  description: string;
  actionType: string;
  risk: AIRisk;
  status: AIApprovalStatus;
  expectedImpact: string;
  confidence: number;
  agent: AIAgentId;
  targetType?: string | null;
  targetId?: number | null;
  createdAt: string;
  /** Priority used for Overview surfacing — distinct from execution risk. */
  priority?: AIPriority;
  /** Why the AI is suggesting this — the reasoning, not just the finding. */
  why?: string;
  /** The concrete lever the AI would pull if approved, e.g. "$100/day → $85/day". */
  suggestedAction?: string;
  /** Current live value → proposed value, when the action is a numeric change. */
  change?: { from: string; to: string };
}

export interface AIAgent {
  id: AIAgentId;
  name: string;
  purpose: string;
  status: AIAgentStatus;
  connection: ConnectionState;
  lastRun: string | null;
  tasks: number;
  insightsCount: number;
  recommendationsCount: number;
  pendingApprovals: number;
  capabilities: string[];
  /** Integrations the agent will depend on once the backend exists. */
  dependencies: { name: string; state: ConnectionState }[];
  href: string;
}

export interface AITask {
  id: string;
  agent: AIAgentId;
  label: string;
  state: "queued" | "running" | "done" | "failed";
  progress: number;
}

export interface AIApproval {
  id: string;
  recommendationId: string;
  title: string;
  summary: string;
  agent: AIAgentId;
  risk: AIRisk;
  status: AIApprovalStatus;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
}

export interface AIAction {
  id: string;
  approvalId: string;
  label: string;
  target: string;
  status: AIApprovalStatus;
  executedAt?: string;
}

export interface AIActivity {
  id: string;
  time: string;
  actor: string;
  agent?: AIAgentId;
  title?: string;
  message: string;
  kind: "analysis" | "insight" | "recommendation" | "approval" | "execution" | "draft" | "system";
  /** Optional audit-trail detail, shown on the Governance › Activity timeline. */
  recommendationId?: string;
  href?: string;
  read?: boolean;
  readAt?: string | null;
  payload?: Record<string, unknown> | null;
  nextReviewAt?: string;
}

export interface AIKpi {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  deltaLabel?: string;
  deltaDirection?: "up" | "down" | "flat";
  footnote: string;
  spark: number[];
  live?: boolean;
}
export interface SearchConsoleQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsolePageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleSeriesPoint {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleSiteItem {
  siteUrl: string;
  permissionLevel: string;
}

export interface SearchConsoleSummary {
  connected: boolean;
  hasData: boolean;
  message: string | null;
  period: { start: string; end: string; days: number } | null;
  totals: { clicks: number; impressions: number; ctr: number; position: number } | null;
  siteUrl: string | null;
  series?: SearchConsoleSeriesPoint[];
  topQueries?: SearchConsoleQueryRow[];
  topPages?: SearchConsolePageRow[];
}

export interface CroFunnelStage {
  key: string;
  label: string;
  reached: number;
  rate: number | null;
  avgHoursInStage: number | null;
  lost: number;
}

export interface CroFunnelSummary {
  hasData: boolean;
  days?: number;
  message: string | null;
  totals: {
    consultations: number;
    completed: number;
    completionRate: number | null;
    topDropOffStage: string | null;
    topDropOffCount: number | null;
    lostLast30d: number;
    lostPrev30d: number;
  } | null;
  stages: CroFunnelStage[];
  shopAndWa?: {
    shop_carts_30d?: number;
    wa_price_inquiries_30d?: number;
    wa_inquiries_currently_pending?: number;
    cart_to_wa_claim_rate_percent?: number | null;
    promo_items_avg_views_28d?: number | null;
    non_promo_items_avg_views_28d?: number | null;
  };
  funnelEvents?: { event: string; count: number }[];
  unavailable: { metric: string; reason: string }[];
}

export interface AgentRunResult {
  agent?: string;
  status: string;
  message?: string;
  insights_created?: number;
  recommendations_created?: number;
  provider?: string;
  results?: Record<string, AgentRunResult>;
}

export interface HighIntentLead {
  id: string;
  name: string;
  contact: string;
  source: string;
  channel: string;
  score: number;
  signals: string[];
  lastActivity: string;
  status: string;
  href: string;
}

export interface HighIntentLeadsResponse {
  status: string;
  total: number;
  leads: HighIntentLead[];
}

export interface AiContentDraftItem {
  id: string;
  recommendationId: string | null;
  marketingCampaignId?: number | null;
  title: string;
  channel: "instagram" | "facebook" | "email" | "tiktok" | "youtube" | "website";
  headline: string | null;
  caption: string | null;
  body?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  mediaUrl: string | null;
  status: "needs_review" | "approved" | "scheduled" | "published" | "draft";
  scheduledFor: string | null;
  externalId?: string | null;
  createdAt?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface CreateContentDraftRequest {
  title: string;
  channel: "instagram" | "facebook" | "email" | "tiktok" | "youtube" | "website";
  headline?: string | null;
  caption?: string | null;
  body?: string | null;
  media_url?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  target_type?: "item" | "project" | "promo_banner" | null;
  target_id?: number | null;
  meta?: Record<string, unknown> | null;
}

export interface AICroService {
  getFunnelSummary(days?: number): Promise<CroFunnelSummary>;
}

export interface LocalSeoReview {
  id: string;
  reviewer: string | null;
  rating: number | null;
  comment: string | null;
  replied: boolean;
  replyComment?: string | null;
  createdAt: string | null;
}

export interface LocalSeoSeriesPoint {
  date: string;
  mapViews: number;
  directionRequests: number;
  calls: number;
}

export interface LocalSeoSummary {
  connected: boolean;
  hasData: boolean;
  message: string | null;
  period: { start: string; end: string; days: number } | null;
  listing: {
    name: string | null;
    address: string | null;
    primaryCategory: string | null;
    mapsUri: string | null;
  } | null;
  totals: {
    mapViews: number;
    directionRequests: number;
    calls: number;
    averageRating: number | null;
    totalReviewCount: number | null;
  } | null;
  series: LocalSeoSeriesPoint[];
  reviews: LocalSeoReview[];
  unavailable: { metric: string; reason: string }[];
}

export interface AISeoService {
  getSearchConsoleSummary(days?: number): Promise<SearchConsoleSummary>;
  getLocalSummary(days?: number): Promise<LocalSeoSummary>;
  draftReviewReply?(
    reviewId: string,
    payload: { reviewer?: string | null; rating?: number | null; comment?: string | null },
  ): Promise<{ reviewId: string; draft: string; provider?: string | null }>;
  replyReview?(reviewId: string, comment: string): Promise<{ comment: string; updateTime?: string }>;
  getSearchConsoleSites?(): Promise<{ sites: SearchConsoleSiteItem[]; selected: string | null; message?: string }>;
  selectSearchConsoleSite?(siteUrl: string | null): Promise<{ ok: boolean; siteUrl: string | null }>;
}

export interface SeoOpportunity {
  id: string;
  title: string;
  impact: "High" | "Medium" | "Low";
  confidence: number;
  source: string;
  status: "Review" | "Approved" | "Dismissed";
  detail: string;
}

export interface TimeseriesPoint {
  date: string;
  traffic: number;
  leads: number;
  engagement: number;
  conversions: number;
}

/* ------------------------------------------------------------------ */
/* Date range params shared across dashboard sections                  */
/* ------------------------------------------------------------------ */

export interface AIDateRangeParams {
  range?: "7d" | "28d" | "90d" | "custom";
  startDate?: string;
  endDate?: string;
  days?: number;
}

/* ------------------------------------------------------------------ */
/* Overview — Business Health & Today's Priorities                     */
/* ------------------------------------------------------------------ */

export interface BusinessHealth {
  /** 0–100 composite score. */
  score: number;
  status: "Healthy" | "Needs Attention" | "At Risk";
  deltaLabel: string;
  deltaDirection: "up" | "down" | "flat";
  /** One or two short sentences — never a wall of text. */
  summary: string;
  areasNeedingAttention: number;
  /** Rentang tanggal yang benar-benar dipakai backend, mis. "2026-08-13 → 2026-09-09". */
  rangeLabel?: string;
}

export interface PriorityItem {
  id: string;
  priority: AIPriority;
  title: string;
  explanation: string;
  agent: AIAgentId;
  expectedImpact?: string;
  /** Deep link the "Review" CTA opens — a recommendation, agent or action. */
  href: string;
  recommendationId?: string;
}

/* ------------------------------------------------------------------ */
/* Workspace — Campaigns                                               */
/* ------------------------------------------------------------------ */

export type CampaignHealth = "Good" | "Fair" | "Needs Attention";
export type CampaignPlanStepState = "done" | "active" | "upcoming";

export interface CampaignPlanStep {
  id: string;
  label?: string;
  title?: string;
  state: CampaignPlanStepState;
  recommendationId?: string;
}

export interface CampaignGoal {
  label: string;
  target: string;
  current: string;
  onTrack: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  health: CampaignHealth;
  status: "Active" | "Paused" | "Draft" | "Ended";
  summary: string;
  budgetDaily?: string;
  goals: CampaignGoal[];
  plan: CampaignPlanStep[];
  activeExperiments: { id: string; name: string; hypothesis: string; status: "Running" | "Queued" | "Done" }[];
  relatedRecommendationIds: string[];
  spark: number[];
  metric: { label: string; value: string; deltaLabel: string; deltaDirection: "up" | "down" | "flat" };
}

/* ------------------------------------------------------------------ */
/* Workspace — Impact tracking                                         */
/* ------------------------------------------------------------------ */

export type ImpactPeriod = 7 | 14 | 30;
export type ImpactResult = "positive" | "negative" | "neutral" | "monitoring";

export interface ImpactRecord {
  id: string;
  recommendationId: string;
  title: string;
  agent: AIAgentId;
  approvedAt: string;
  metricLabel: string;
  before: string;
  after: Partial<Record<ImpactPeriod, string>>;
  changePct: Partial<Record<ImpactPeriod, number>>;
  result: ImpactResult;
  aiConclusion: string;
}

/* ------------------------------------------------------------------ */
/* AI System — Usage, providers, routing                               */
/* ------------------------------------------------------------------ */

export interface AIUsageTotals {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costToday: number;
  costMonth: number;
  /** Panggilan yang harga modelnya belum terdaftar (cost null di backend). */
  untrackedToday?: number;
  untrackedMonth?: number;
  requestsDeltaLabel: string;
}

export interface AIUsageByAgent {
  agent: AIAgentId;
  cost: number;
  requests: number;
  tokens: number;
  untracked?: number;
}

export interface AIUsageByProvider {
  provider: string;
  cost: number;
  share: number;
  untracked?: number;
}

export type AIProviderStatus = "connected" | "not_connected" | "degraded";

export interface AIProviderInfo {
  id: string;
  provider: string;
  model: string;
  status: AIProviderStatus;
  usageShare: number;
  cost: number;
  /** Jumlah request dengan harga model yang belum terdaftar. */
  untrackedRequests?: number;
  latencyMs: number;
  successRate: number;
}

export type AIRoutingStrategyName = "Balanced" | "Quality First" | "Cost Saver" | "Speed First";

export interface AIRoutingStrategy {
  name: AIRoutingStrategyName;
  automatic: boolean;
  quality: number;
  speed: number;
  costEfficiency: number;
  taskRouting: { taskType: string; routedTo: string; reason: string }[];
}

export interface AIProviderQuota {
  provider: string;
  requestsLimit: number | null;
  requestsRemaining: number | null;
  requestsUsedPct: number | null;
  tokensLimit: number | null;
  tokensRemaining: number | null;
  tokensUsedPct: number | null;
  requestsResetAt: string | null;
  tokensResetAt: string | null;
  note: string | null;
  updatedAt: string | null;
}

export interface AIProviderPreference {
  preferredProvider: string | null;
  scope: "global";
}

/* ------------------------------------------------------------------ */
/* Ask AI — context-aware chat                                         */
/* ------------------------------------------------------------------ */

export type AiChatContextKey =
  | "overview"
  | "seo"
  | "content"
  | "ads"
  | "leads"
  | "cro"
  | "campaigns"
  | "impact"
  | "actions"
  | "approvals"
  | "insights"
  | "activity"
  | "recommendations"
  | "usage"
  | "providers"
  | "settings"
  | "general";

export interface AiExecutedOperation {
  type: string;
  status: "ok" | "error";
  title: string;
  detail: string;
  href: string;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  provider?: string | null;
  model?: string | null;
  createdAt: string;
  /** Set kalau balasan ini menghasilkan rekomendasi baru yang otomatis
   * ditulis ke Recommendations — dipakai buat nampilin kartu konfirmasi
   * kecil di bawah bubble chat. */
  recommendation?: AIRecommendation | null;
  /** Daftar perintah sistem nyata yang langsung dieksekusi oleh Ask AI. */
  executedActions?: AiExecutedOperation[];
}

export interface AiLearningRule {
  id: string;
  rule: string;
  category: string;
  source: string;
  createdAt: string;
}

export interface AiLearningSummary {
  generatedAt: string;
  periodDays: number;
  profitGrounding: {
    ordersAndRevenue: {
      paidOrdersCount: number;
      paidRevenueRp: number;
      pipelineOrdersCount: number;
      pipelineValueRp: number;
      avgOrderValueRp: number;
      topSellingItems: { itemId: number | null; title: string; qty: number; revenueRp: number }[];
    };
    consultationsPipeline: {
      totalPeriod: number;
      unrespondedNew: number;
      activeHighIntent: number;
      completedCount: number;
      cancelledCount: number;
      byStage: Record<string, number>;
      topServiceTypes: Record<string, number>;
      recentHighPriority: {
        id: number;
        name: string;
        status: string;
        serviceType: string | null;
        area: string | null;
        phone: string | null;
      }[];
    };
    whatsappLiviBot: {
      totalPeriod: number;
      pendingCount: number;
      answeredCount: number;
      pendingInquiries: {
        id: number;
        customerName: string;
        phone: string | null;
        itemsAsked: string[];
        question: string | null;
        createdAt: string;
      }[];
    };
    catalogDemand: {
      topItems: {
        id: number;
        title: string;
        priceRp: number | null;
        isOnPromo: boolean;
        views: number;
        clicks: number;
        wishlists: number;
        demandScore: number;
      }[];
      projects: { id: number; title: string; location: string | null }[];
      activePromos: { id: number; title: string; label: string | null; cta: string | null }[];
    };
    profitLeaks: string[];
  };
  learningMemory: {
    impact: {
      positive: number;
      negative: number;
      neutral: number;
      monitoring: number;
      provenWinners: {
        agent: string;
        title: string;
        metric: string;
        changePct: number | null;
        conclusion: string;
      }[];
      underperforming: {
        agent: string;
        title: string;
        metric: string;
        changePct: number | null;
        conclusion: string;
      }[];
    };
    governance: {
      approvedOrExecuted: number;
      rejected: number;
      pending: number;
      preferredActionTypes: Record<string, number>;
      recentlyRejectedTitles: string[];
    };
    rules: AiLearningRule[];
  };
}

export interface ChannelPerformanceItem {
  channel: string;
  value: number;
  share: number;
  tone: "ai" | "insight" | "success" | "warning" | "info";
}

export interface ContentQueueItem {
  id: string;
  platform: "Instagram" | "Facebook" | "TikTok" | "YouTube" | "Blog" | "Website";
  title: string;
  status: "Draft" | "Scheduled" | "Published" | "Needs Review";
  scheduledFor: string;
  aiAssisted: boolean;
  engagement?: { label: string; value: string }[];
}

/** Fase 6 — status koneksi OAuth Google (Search Console) untuk SEO Agent. */
export interface GoogleIntegrationStatus {
  connected: boolean;
  email: string | null;
  scope: string | null;
  hasAnalyticsScope?: boolean;
  message?: string | null;
  connectedAt: string | null;
}

export interface MarketExternalContentIdea {
  id: string;
  title: string;
  channel: "instagram" | "tiktok" | "youtube" | "email" | "website" | "facebook";
  format: string;
  externalInspiration: string;
  marketReason: string;
  captionDraft: string;
  ctaLabel: string;
}

export interface MarketIntelligenceReport {
  status: "ok" | "not_configured" | "error";
  message?: string;
  generatedAt: string;
  focus: string;
  provider?: string;
  model?: string;
  webGrounded?: boolean;
  cached?: boolean;
  marketSummary: string | null;
  trendingAesthetics: { name: string; whyNow: string; recommendedFocus: string }[];
  externalContentIdeas: MarketExternalContentIdea[];
  competitorAngles: string[];
  sources: { title: string; url: string; domain?: string }[];
  internalSignals?: Record<string, string[]>;
}

/**
 * Status koneksi Meta Graph API (Facebook Page + Instagram Business) untuk
 * kartu "Instagram & Facebook" di Content Agent. Dicocokkan 1:1 dengan
 * MetaIntegrationController — read-only, tidak ada token di sini.
 */
export type MetaConnectionState =
  | "ok"
  | "not_configured"
  | "invalid_token"
  | "permission_required"
  | "api_error";

export interface MetaFacebookStatus {
  connected: boolean;
  status: MetaConnectionState;
  page_id: string | null;
  name: string | null;
}

export interface MetaInstagramStatus {
  connected: boolean;
  status: MetaConnectionState;
  account_id: string | null;
  username: string | null;
}

export interface MetaIntegrationStatus {
  connected: boolean;
  status: MetaConnectionState;
  lastCheckedAt: string | null;
  facebook: MetaFacebookStatus;
  instagram: MetaInstagramStatus;
}
export interface MetaAdsIntegrationStatus {
  connected: boolean;
  accountId: string | null;
  accountName: string | null;
  expiresAt: string | null;
  connectedAt: string | null;
}

export type MarketingStatus =
  | "ok" | "not_configured" | "invalid_credentials" | "permission_required" | "rate_limited" | "api_error";

export interface MarketingPeriodInfo { from: string; to: string; days: number }

export interface AnalyticsOverview {
  status: MarketingStatus;
  message?: string;
  period: MarketingPeriodInfo;
  generatedAt: string;
  propertyId?: string | null;
  series?: { date: string; sessions: number; users: number; pageviews: number; engagementRate: number; conversions: number }[];
  channels?: { label: string; sessions: number; conversions: number }[];
  totals?: { sessions: number; users: number; pageviews: number; engagementRate: number; conversions: number };
  deltas?: Record<"sessions" | "users" | "pageviews" | "engagementRate" | "conversions", number | null>;
}

export interface AdsPlatformStatus { status: MarketingStatus; message?: string; label?: string; accountId?: string | null }

export interface AdsSummary {
  status: MarketingStatus;
  period: MarketingPeriodInfo;
  generatedAt: string;
  kpis: { spend: number; leads: number; cpl: number | null; roas: number | null; ctr: number | null };
  series: { date: string; spend: number; leads: number; clicks: number; impressions: number; revenue: number; cpl: number | null }[];
  budgetSplit: { platform: "meta" | "google"; label: string; spend: number }[];
  campaigns: { id: string; name: string; platform: "meta" | "google"; spend: number; leads: number; cpl: number | null; status: string; impressions: number; clicks: number; revenue: number }[];
  platforms: { meta: AdsPlatformStatus; google: AdsPlatformStatus };
}

export type ContentPlatformKey = "instagram" | "facebook" | "tiktok" | "youtube";
export interface ContentPlatform {
  status: MarketingStatus; message?: string; label?: string; handle?: string | null;
  followers?: number; reach?: number; engagements?: number; posts?: number | null; seriesAvailable?: boolean;
}
export interface ContentSummary {
  status: MarketingStatus;
  period: MarketingPeriodInfo;
  generatedAt: string;
  kpis: { followers: number; engagementRate: number | null; postsPerWeek: number | null; reach: number };
  engagementSeries: ({ date: string } & Partial<Record<ContentPlatformKey, number>>)[];
  platforms: Record<ContentPlatformKey, ContentPlatform>;
}

/** Funnel Lead Intelligence — agregasi tabel konsultasi & wishlist (data
 *  internal, tidak butuh kredensial). Cocok 1:1 dengan LeadsController@funnel. */
export interface LeadsFunnel {
  status: MarketingStatus;
  period: MarketingPeriodInfo;
  generatedAt: string;
  kpis: { leads: number; wishlistAdds: number; responded: number; responseRate: number | null };
  deltas: { leads: number | null; wishlistAdds: number | null; responseRate: number | null };
  series: { date: string; leads: number; wishlistAdds: number; responded: number }[];
  byStatus: { status: string; count: number }[];
}

export type VideoPlatform = "instagram" | "youtube" | "tiktok";

/** Content Inspiration — video nyata dari Instagram/YouTube/TikTok, tanpa angka rekaan. */
export interface InspirationVideo {
  platform: VideoPlatform;
  id: string;
  title: string;
  channel?: string | null;
  channelId?: string;
  thumbnail: string;
  url: string;
  publishedAt: string | null;
  durationSeconds?: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares?: number | null;
  saves?: number | null;
  engagementRate: number | null;
  completionRate?: number | null;
  sourceKind?: "reference_creator" | "livora_benchmark" | "web_discovered";
  metricsSource?: string;
}

export interface InspirationLibrarySection {
  status: MarketingStatus;
  message?: string;
  videos?: InspirationVideo[];
}

export interface PlatformTrafficOverview {
  platform: VideoPlatform;
  status: MarketingStatus;
  connected: boolean;
  message?: string | null;
  videoCount: number;
  totalViews: number | null;
  avgViews: number | null;
  avgEngagementRate: number | null;
  topVideo: {
    title: string;
    url: string;
    views: number | null;
    engagementRate: number | null;
  } | null;
}

export interface LivoraBrandContextSummary {
  items: { targetType: "item"; targetId: number; name: string; clicks?: number }[];
  projects: { targetType: "project"; targetId: number; name: string }[];
  promos: { targetType: "promo_banner"; targetId: number; name: string; label?: string | null }[];
}

export interface InspirationLibrary {
  status: MarketingStatus;
  generatedAt: string;
  instagram?: InspirationLibrarySection;
  youtube: InspirationLibrarySection;
  tiktok: InspirationLibrarySection;
  trafficOverview?: Record<VideoPlatform, PlatformTrafficOverview>;
  brandContext?: LivoraBrandContextSummary;
  tiktokDiscoveryAvailable: boolean;
  tiktokDiscoveryNote: string;
}

export interface InspirationAnalysisRequest {
  query?: string;
  mode?: "auto_brand" | "topic";
  scope?: "external" | "all";
  platforms?: VideoPlatform[];
  sourceTitle?: string;
  sourcePlatform?: VideoPlatform;
  sourceViews?: number;
  sourceEngagementRate?: number;
  sourceUrl?: string;
}

export interface RecommendedVideoItem {
  id: string;
  platform: VideoPlatform;
  sourceKind: "reference_creator" | "livora_benchmark" | "web_discovered";
  title: string;
  channel: string | null;
  url: string;
  thumbnail: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares?: number | null;
  saves?: number | null;
  engagementRate: number | null;
  metricsSource: string;
  description: string;
  reason: string;
  brandFitScore: number;
  trafficInsight: string;
  livoraAdaptation: {
    conceptTitle: string;
    hook: string;
    shotList: string[];
    captionDraft: string;
    recommendedChannel: VideoPlatform;
    targetFormat: string;
    targetType?: "item" | "project" | "promo_banner" | null;
    targetId?: number | null;
    targetName?: string | null;
  };
}

export interface CrossPlatformTrafficAnalysis {
  summary: string;
  marketSummary?: string | null;
  platformNotes?: Partial<Record<VideoPlatform, string>>;
  platforms?: Record<VideoPlatform, PlatformTrafficOverview>;
}

export interface InspirationMarketInsights {
  market_summary?: string | null;
  trending_aesthetics?: { name: string; whyNow: string; recommendedFocus: string }[];
  external_content_angles?: string[];
}

export interface InspirationAnalysis {
  status: MarketingStatus | "empty";
  message?: string;
  query: string;
  mode?: "auto_brand" | "topic";
  scope?: "external" | "all";
  generatedAt?: string;
  references: InspirationVideo[];
  recommendations?: RecommendedVideoItem[];
  trafficAnalysis?: CrossPlatformTrafficAnalysis;
  marketInsights?: InspirationMarketInsights | null;
  brandContextUsed?: LivoraBrandContextSummary;
  discoveryNotes?: Record<string, string>;
  analysis: { text: string; provider: string; model: string } | null;
  analysisError?: string | null;
}