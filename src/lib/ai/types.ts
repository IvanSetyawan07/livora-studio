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
}

export interface AIKpi {
  id: string;
  label: string;
  value: number;
  suffix?: string;
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

export interface ContentQueueItem {
  id: string;
  platform: "Instagram" | "Facebook" | "TikTok" | "YouTube" | "Blog" | "Website";
  title: string;
  status: "Draft" | "Scheduled" | "Published" | "Needs Review";
  scheduledFor: string;
  aiAssisted: boolean;
  engagement?: { label: string; value: string }[];
}
