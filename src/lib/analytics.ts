import { api } from "@/lib/api";

export interface UtmPayload {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

const UTM_STORAGE_KEY = "livora_utm_params";
const SESSION_KEY = "livora_session";

let initialized = false;
let gaReady = false;
let pixelReady = false;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string };
    _fbq?: unknown;
  }
}

export function getLivoraSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `lvr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}

export function captureUtmFromUrl(search?: string): UtmPayload {
  try {
    const params = new URLSearchParams(search ?? window.location.search);
    const keys: (keyof UtmPayload)[] = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const found: UtmPayload = {};
    let hasAny = false;

    for (const k of keys) {
      const val = params.get(k);
      if (val && val.trim()) {
        found[k] = val.trim().slice(0, 150);
        hasAny = true;
      }
    }

    if (!hasAny && params.get("fbclid")) {
      found.utm_source = "meta";
      found.utm_medium = "paid_social";
      hasAny = true;
    } else if (!hasAny && params.get("gclid")) {
      found.utm_source = "google";
      found.utm_medium = "cpc";
      hasAny = true;
    }

    if (hasAny) {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(found));
      return found;
    }
  } catch {
    // ignore storage failures
  }
  return getStoredUtm();
}

export function getStoredUtm(): UtmPayload {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmPayload) : {};
  } catch {
    return {};
  }
}

function loadGtag(measurementId: string) {
  if (!measurementId || gaReady || typeof document === "undefined") return;
  gaReady = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

function loadMetaPixel(pixelId: string) {
  if (!pixelId || pixelReady || typeof document === "undefined") return;
  pixelReady = true;

  const w = window;
  if (!w.fbq) {
    const n: any = function (...args: unknown[]) {
      if (n.callMethod) {
        n.callMethod(...args);
      } else {
        n.queue.push(args);
      }
    };
    w.fbq = n;
    if (!w._fbq) w._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  w.fbq?.("init", pixelId);
}

export async function initAnalytics() {
  captureUtmFromUrl();
  if (initialized) return;
  initialized = true;

  const envGa = import.meta.env["VITE_GA4_MEASUREMENT_ID"] as string | undefined;
  const envPixel = import.meta.env["VITE_META_PIXEL_ID"] as string | undefined;

  if (envGa) loadGtag(envGa);
  if (envPixel) loadMetaPixel(envPixel);

  try {
    const { data } = await api.get<{ gaMeasurementId?: string | null; metaPixelId?: string | null }>(
      "/public/tracking-config",
    );
    if (data?.gaMeasurementId && !envGa) loadGtag(data.gaMeasurementId);
    if (data?.metaPixelId && !envPixel) loadMetaPixel(data.metaPixelId);
  } catch {
    // Non-blocking: website stays working cleanly even offline/local
  }
}

export function trackPageView(path: string) {
  if (path.startsWith("/admin")) return;
  captureUtmFromUrl();
  if (gaReady && window.gtag) {
    window.gtag("event", "page_view", { page_path: path });
  }
  if (pixelReady && window.fbq) {
    window.fbq("track", "PageView");
  }
}

export type LivoraFunnelEvent =
  | "konsultasi_klik"
  | "view_item"
  | "view_project"
  | "view_promo"
  | "promo_cta_click"
  | "view_catalog_hotspot"
  | "whatsapp_inquiry_click"
  | "add_to_wishlist"
  | "add_to_cart"
  | "cart_created"
  | "consultation_submitted";

export function trackLivoraEvent(
  event: LivoraFunnelEvent,
  params: Record<string, unknown> = {},
) {
  const utm = getStoredUtm();
  const payload = { ...params, ...utm };

  if (gaReady && window.gtag) {
    window.gtag("event", event, payload);
  }

  if (pixelReady && window.fbq) {
    if (event === "consultation_submitted") window.fbq("track", "Lead", payload);
    else if (event === "add_to_cart" || event === "cart_created") window.fbq("track", "AddToCart", payload);
    else if (event === "add_to_wishlist") window.fbq("track", "AddToWishlist", payload);
    else if (event === "whatsapp_inquiry_click") window.fbq("track", "Contact", payload);
    else if (event === "view_item" || event === "view_project") window.fbq("track", "ViewContent", payload);
    else window.fbq("trackCustom", event, payload);
  }

  // Mirror server-side funnel_events (non-add_to_cart supported list)
  if (event !== "add_to_cart") {
    api
      .post("/funnel", {
        event,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
        session: getLivoraSessionId(),
        meta: params,
        ...utm,
      })
      .catch(() => {});
  }
}
