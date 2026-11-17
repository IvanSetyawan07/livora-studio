import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: { ok: true } }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
  },
  API_BASE_URL: "http://127.0.0.1:8000/api",
}));

import { api } from "@/lib/api";
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

    const impact = await mockServices.impact.refresh();
    expect(typeof impact.updated).toBe("number");

    const lib = await mockServices.marketing.getInspirationLibrary();
    expect(lib.status).toBe("not_configured");
    expect(lib.instagram?.status).toBe("not_configured");
    expect(lib.youtube.status).toBe("not_configured");
    expect(lib.tiktok.status).toBe("not_configured");

    const videoRec = await mockServices.marketing.analyzeInspiration({
      mode: "auto_brand",
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
  });
});
