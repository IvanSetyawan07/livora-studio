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
  insightId: string;
  title: string;
  description: string;
  actionType: string;
  risk: AIRisk;
  status: AIApprovalStatus;
  expectedImpact: string;
  confidence: number;
  agent: AIAgentId;
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
  message: string;
  kind: "analysis" | "insight" | "recommendation" | "approval" | "execution" | "system";
  /** Optional audit-trail detail, shown on the Governance › Activity timeline. */
  recommendationId?: string;
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
  label: string;
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
  requestsDeltaLabel: string;
}

export interface AIUsageByAgent {
  agent: AIAgentId;
  cost: number;
  requests: number;
  tokens: number;
}

export interface AIUsageByProvider {
  provider: string;
  cost: number;
  share: number;
}

export type AIProviderStatus = "connected" | "not_connected" | "degraded";

export interface AIProviderInfo {
  id: string;
  provider: string;
  model: string;
  status: AIProviderStatus;
  usageShare: number;
  cost: number;
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
  | "recommendations"
  | "usage"
  | "providers"
  | "general";

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
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
  connectedAt: string | null;
}