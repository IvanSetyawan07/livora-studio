import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

vi.mock("@/lib/api", () => {
  class MockApiError extends Error {
    kind: string;
    status: number | null;
    retriable: boolean;
    constructor(init: { kind: string; message: string; status?: number | null; retriable?: boolean }) {
      super(init.message);
      this.kind = init.kind;
      this.status = init.status ?? null;
      this.retriable = init.retriable ?? true;
    }
  }
  return {
    ApiError: MockApiError,
    isApiConfigured: true,
    api: {
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: { ok: true } }),
      patch: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: { ok: true } }),
    },
    API_BASE_URL: "http://127.0.0.1:8000/api",
  };
});

import { ApiError, api } from "@/lib/api";
import { captureUtmFromUrl, getStoredUtm, trackLivoraEvent } from "@/lib/analytics";
import { extractApiErrorMessage } from "@/hooks/useAiDashboard";
import { mockServices } from "@/lib/ai/services/mock";

describe("AI Marketing analytics & service helpers", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("captures and persists UTM parameters from URL", () => {
    const utm = captureUtmFromUrl("?utm_source=instagram&utm_medium=paid_social&utm_campaign=pik2_launch");
    expect(utm).toEqual({
      utm_source: "instagram",
      utm_medium: "paid_social",
      utm_campaign: "pik2_launch",
    });
    expect(getStoredUtm()).toEqual(utm);
  });

  it("falls back to meta/google source when fbclid or gclid is present", () => {
    expect(captureUtmFromUrl("?fbclid=IwAR123")).toEqual({
      utm_source: "meta",
      utm_medium: "paid_social",
    });
    sessionStorage.clear();
    expect(captureUtmFromUrl("?gclid=CjwK123")).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
    });
  });

  it("sends Livora funnel events with stored UTM context", () => {
    captureUtmFromUrl("?utm_source=tiktok&utm_campaign=sofa_promo");
    trackLivoraEvent("promo_cta_click", { banner_id: 7 });
    expect(api.post).toHaveBeenCalledWith(
      "/funnel",
      expect.objectContaining({
        event: "promo_cta_click",
        meta: { banner_id: 7 },
        utm_source: "tiktok",
        utm_campaign: "sofa_promo",
      }),
    );
  });

  it("extracts Laravel API error messages cleanly", () => {
    const apiErr = new ApiError({
      kind: "validation",
      message: "Draft belum siap.",
      status: 422,
    });
    expect(extractApiErrorMessage(apiErr, "Fallback")).toBe("Draft belum siap.");

    const axiosErr = new axios.AxiosError("Request failed", "422", undefined, undefined, {
      status: 422,
      statusText: "Unprocessable",
      headers: {},
      config: {} as any,
      data: { message: "Target SEO belum tersedia." },
    });
    expect(extractApiErrorMessage(axiosErr, "Fallback")).toBe("Target SEO belum tersedia.");
    expect(extractApiErrorMessage(new Error("Network down"), "Fallback")).toBe("Network down");
    expect(extractApiErrorMessage("weird", "Fallback")).toBe("Fallback");
  });

  it("exposes complete AI service contracts on mock adapter", async () => {
    const runRes = await mockServices.dashboard.runAgent("seo");
    expect(runRes.agent).toBe("seo");

    const leads = await mockServices.marketing.getHighIntentLeads();
    expect(leads.status).toBe("ok");
    expect(Array.isArray(leads.leads)).toBe(true);

    const queue = await mockServices.marketing.getContentQueue();
    expect(Array.isArray(queue)).toBe(true);

    const synced = await mockServices.campaigns.sync();
    expect(typeof synced.synced).toBe("number");

    const createdCampaign = await mockServices.campaigns.create({
      name: "Campaign Kemang Q4",
      channel: "Instagram",
    });
    expect(createdCampaign.name).toBe("Campaign Kemang Q4");
    const updatedCampaign = await mockServices.campaigns.update(createdCampaign.id, {
      status: "Paused",
    });
    expect(updatedCampaign.status).toBe("Paused");

    const impact = await mockServices.impact.refresh();
    expect(typeof impact.updated).toBe("number");

    const market = await mockServices.marketing.analyzeMarket({ focus: "japandi" });
    expect(market.status).toBe("not_configured");
    expect(market.focus).toBe("japandi");

    const lib = await mockServices.marketing.getInspirationLibrary();
    expect(lib.status).toBe("not_configured");
    expect(lib.instagram?.status).toBe("not_configured");
    expect(lib.youtube.status).toBe("not_configured");
    expect(lib.tiktok.status).toBe("not_configured");

    const videoRec = await mockServices.marketing.analyzeInspiration({
      mode: "auto_brand",
      scope: "external",
      platforms: ["instagram", "youtube", "tiktok"],
    });
    expect(videoRec.status).toBe("not_configured");
    expect(videoRec.recommendations).toEqual([]);

    const draft = await mockServices.marketing.createContentDraft({
      title: "Showroom Reel Valen",
      channel: "instagram",
      caption: "Warm bouclé detail",
      meta: { reference_url: "https://www.instagram.com/reel/abc/" },
    });
    expect(draft.channel).toBe("instagram");
    expect(draft.status).toBe("needs_review");
    expect(draft.meta?.reference_url).toBe("https://www.instagram.com/reel/abc/");

    const deletedDraft = await mockServices.marketing.deleteContentDraft(draft.id);
    expect(deletedDraft.ok).toBe(true);

    const actList = await mockServices.activity.list();
    if (actList.length > 0) {
      const marked = await mockServices.activity.markRead(actList[0].id);
      expect(marked.read).toBe(true);
    }
    const allRead = await mockServices.activity.markAllRead();
    expect(allRead.unreadCount).toBe(0);

    const providerPing = await mockServices.providers.test("gemini");
    expect(providerPing.provider).toBe("gemini");

    const learning = await mockServices.marketing.getLearningSummary(30);
    expect(learning.periodDays).toBe(30);
    expect(Array.isArray(learning.learningMemory.rules)).toBe(true);

    const rule = await mockServices.marketing.addLearningRule({
      rule: "Prioritaskan produk custom wardrobe margin tinggi",
      category: "profit_focus",
    });
    expect(rule.category).toBe("profit_focus");
    const removedRule = await mockServices.marketing.deleteLearningRule(rule.id);
    expect(removedRule.ok).toBe(true);
  });
});
