/**
 * STATIC PRESENTATION CATALOG — bukan data bisnis.
 *
 * Berisi identitas agent saja (nama, tujuan, route). TIDAK berisi status,
 * jumlah insight, atau metrik apa pun — semua itu HARUS datang dari backend
 * (`GET /ai/agents`). File ini ada supaya komponen presentational tidak perlu
 * mengimpor fixture demo (`@/lib/ai/data`) hanya untuk mendapatkan label.
 */
import type { AIAgentId } from "./types";

export interface AgentMeta {
  id: AIAgentId;
  name: string;
  purpose: string;
  href: string;
}

export const AGENT_CATALOG: Record<AIAgentId, AgentMeta> = {
  seo: {
    id: "seo",
    name: "SEO Agent",
    purpose: "Analyse organic visibility and identify search opportunities.",
    href: "/admin/ai-marketing/seo",
  },
  content: {
    id: "content",
    name: "Content Agent",
    purpose: "Turn marketing opportunities into concrete content recommendations.",
    href: "/admin/ai-marketing/content",
  },
  ads: {
    id: "ads",
    name: "Ads Agent",
    purpose: "Analyse paid performance and recommend budget reallocation.",
    href: "/admin/ai-marketing/ads",
  },
  leads: {
    id: "leads",
    name: "Lead Intelligence Agent",
    purpose: "Score lead behaviour and surface high-intent enquiries.",
    href: "/admin/ai-marketing/leads",
  },
  cro: {
    id: "cro",
    name: "CRO Agent",
    purpose: "Identify conversion friction across the Livora website.",
    href: "/admin/ai-marketing/cro",
  },
};

export function agentMeta(id: string): AgentMeta | undefined {
  return AGENT_CATALOG[id as AIAgentId];
}

export function agentLabel(id: string): string {
  return agentMeta(id)?.name ?? id;
}
