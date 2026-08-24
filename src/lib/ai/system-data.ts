/**
 * DEMO / PREVIEW FIXTURES for AI System › Usage & Cost and
 * AI System › Providers & Routing. All figures are illustrative — every
 * provider is honestly marked `not_connected` until the Laravel AI
 * orchestration layer exists. Never flip these to "connected" without a
 * real integration behind them.
 */
import type { AIProviderInfo, AIRoutingStrategy, AIUsageByAgent, AIUsageByProvider, AIUsageTotals } from "./types";

export const usageTotals: AIUsageTotals = {
  requests: 12842,
  inputTokens: 5_100_000,
  outputTokens: 3_300_000,
  costToday: 42.8,
  costMonth: 318.4,
  requestsDeltaLabel: "+1,204 vs last week",
};

export const usageByAgent: AIUsageByAgent[] = [
  { agent: "seo", cost: 42, requests: 2380, tokens: 1_240_000 },
  { agent: "content", cost: 88, requests: 3110, tokens: 2_180_000 },
  { agent: "ads", cost: 73, requests: 2860, tokens: 1_760_000 },
  { agent: "leads", cost: 51, requests: 2240, tokens: 980_000 },
  { agent: "cro", cost: 64, requests: 2252, tokens: 1_240_000 },
];

export const usageByProvider: AIUsageByProvider[] = [
  { provider: "Claude", cost: 210.4, share: 66 },
  { provider: "OpenAI", cost: 78.2, share: 25 },
  { provider: "Gemini", cost: 29.8, share: 9 },
];

export const providers: AIProviderInfo[] = [
  {
    id: "prov_claude",
    provider: "Claude",
    model: "claude-sonnet-4-6",
    status: "not_connected",
    usageShare: 66,
    cost: 210.4,
    latencyMs: 940,
    successRate: 99.2,
  },
  {
    id: "prov_openai",
    provider: "OpenAI",
    model: "gpt-4.1",
    status: "not_connected",
    usageShare: 25,
    cost: 78.2,
    latencyMs: 1120,
    successRate: 98.6,
  },
  {
    id: "prov_gemini",
    provider: "Gemini",
    model: "gemini-1.5-pro",
    status: "not_connected",
    usageShare: 9,
    cost: 29.8,
    latencyMs: 1050,
    successRate: 98.9,
  },
];

export const routingStrategy: AIRoutingStrategy = {
  name: "Balanced",
  automatic: true,
  quality: 82,
  speed: 68,
  costEfficiency: 91,
  taskRouting: [
    { taskType: "Simple classification", routedTo: "Fast, low-cost model", reason: "Low complexity, high volume" },
    { taskType: "Complex reasoning", routedTo: "Powerful reasoning model", reason: "Multi-step marketing analysis" },
    { taskType: "Content generation", routedTo: "Writing-optimised model", reason: "Editorial tone & brand voice" },
    { taskType: "Large context analysis", routedTo: "Long-context model", reason: "Full-funnel or full-catalogue review" },
  ],
};
