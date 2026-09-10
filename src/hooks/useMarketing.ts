import { useMutation, useQuery } from "@tanstack/react-query";
import { useAiMarketingContext } from "@/context/AiMarketingContext";
import { useSectionState, type DerivedNonDataStatus } from "@/hooks/useSectionState";
import { aiServices } from "@/lib/ai/services";
import { rangeKey, rangeParams } from "@/lib/ai/date-range";
import type {
  AdsSummary,
  AnalyticsOverview,
  ContentSummary,
  InspirationAnalysis,
  InspirationAnalysisRequest,
  InspirationLibrary,
  LeadsFunnel,
  MarketingStatus,
} from "@/lib/ai/types";

const STALE = 5 * 60_000;

export const marketingKeys = {
  analytics: (k: string) => ["ai", "marketing", "analytics", k] as const,
  ads: (k: string) => ["ai", "marketing", "ads", k] as const,
  content: (k: string) => ["ai", "marketing", "content", k] as const,
  leads: (k: string) => ["ai", "marketing", "leads", k] as const,
};

/** Terjemahkan status envelope backend → status panel UI. */
export function deriveMarketingStatus(
  status: MarketingStatus, message: string | undefined, provider: string, connectHref = "/admin/ai-marketing/settings",
): DerivedNonDataStatus | null {
  switch (status) {
    case "ok": return null;
    case "not_configured": return { status: "not_connected", provider, message, connectHref };
    case "invalid_credentials": return { status: "permission_required", provider, connectHref, message: message ?? "Kredensial ditolak. Periksa token di Settings." };
    case "permission_required": return { status: "permission_required", provider, connectHref, message };
    case "rate_limited": return { status: "rate_limited" };
    default: return { status: "error", message: message ?? `${provider} tidak merespons.`, retriable: true };
  }
}

export function useAnalyticsOverview() {
  const { dateRange } = useAiMarketingContext();
  const q = useQuery<AnalyticsOverview>({
    queryKey: marketingKeys.analytics(rangeKey(dateRange)),
    queryFn: () => aiServices.marketing.getAnalyticsOverview(rangeParams(dateRange)),
    staleTime: STALE,
  });
  const state = useSectionState(q, {
    provider: "Google Analytics 4",
    deriveStatus: (d) => deriveMarketingStatus(d.status, d.message, "Google Analytics 4"),
    isEmpty: (d) => !d.series || d.series.length === 0,
  });
  return { query: q, state };
}

export function useAdsSummary() {
  const { dateRange } = useAiMarketingContext();
  const q = useQuery<AdsSummary>({
    queryKey: marketingKeys.ads(rangeKey(dateRange)),
    queryFn: () => aiServices.marketing.getAdsSummary(rangeParams(dateRange)),
    staleTime: STALE,
  });
  const state = useSectionState(q, {
    provider: "Meta Ads / Google Ads",
    deriveStatus: (d) => deriveMarketingStatus(d.status, d.platforms?.meta?.message ?? d.platforms?.google?.message, "Meta Ads / Google Ads"),
    isEmpty: (d) => d.series.length === 0 && d.campaigns.length === 0,
  });
  return { query: q, state };
}

export function useContentSummary() {
  const { dateRange } = useAiMarketingContext();
  const q = useQuery<ContentSummary>({
    queryKey: marketingKeys.content(rangeKey(dateRange)),
    queryFn: () => aiServices.marketing.getContentSummary(rangeParams(dateRange)),
    staleTime: STALE,
  });
  const state = useSectionState(q, {
    provider: "Meta / TikTok / YouTube",
    deriveStatus: (d) => deriveMarketingStatus(d.status, undefined, "Meta / TikTok / YouTube"),
    isEmpty: (d) => Object.values(d.platforms).every((p) => p.status !== "ok"),
  });
  return { query: q, state };
}

/** Funnel leads dari data internal (konsultasi + wishlist) — selalu live,
 *  tidak menunggu kredensial apa pun. */
export function useLeadsFunnel() {
  const { dateRange } = useAiMarketingContext();
  const q = useQuery<LeadsFunnel>({
    queryKey: marketingKeys.leads(rangeKey(dateRange)),
    queryFn: () => aiServices.marketing.getLeadsFunnel(rangeParams(dateRange)),
    staleTime: STALE,
  });
  const state = useSectionState(q, {
    provider: "Database Livora (konsultasi & wishlist)",
    deriveStatus: (d) => deriveMarketingStatus(d.status, undefined, "Database Livora"),
    isEmpty: (d) => d.series.every((r) => r.leads === 0 && r.wishlistAdds === 0),
  });
  return { query: q, state };
}
/**
 * Content Inspiration — video milik Livora sendiri (YouTube + TikTok) sebagai
 * titik awal, lalu pembanding video sejenis dari YouTube.
 */
export function useInspirationLibrary() {
  return useQuery<InspirationLibrary>({
    queryKey: ["ai", "marketing", "inspiration", "library"],
    queryFn: () => aiServices.marketing.getInspirationLibrary(),
    staleTime: STALE,
  });
}

export function useInspirationAnalysis() {
  return useMutation<InspirationAnalysis, Error, InspirationAnalysisRequest>({
    mutationFn: (payload) => aiServices.marketing.analyzeInspiration(payload),
  });
}
