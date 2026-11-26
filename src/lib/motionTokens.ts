import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

let registered = false;
export const registerGsap = () => {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  registered = true;
};

/**
 * Livora motion tokens — premium & editorial.
 * No elastic / bounce easing anywhere.
 */
export const EASE = {
  text: "expo.out",
  card: "power3.out",
  hover: "power2.out",
  scrub: "none",
} as const;

export const DUR = {
  text: 1.0,      // 0.8–1.2
  textFast: 0.8,
  card: 0.85,     // 0.7–1
  hover: 0.7,     // 0.6–0.9
} as const;

export const STAGGER = {
  lines: 0.09,
  items: 0.08,
} as const;

/** Scrub value used for scroll-linked movement (never a fixed duration). */
export const SCRUB = 1;

let refreshTimer: number | null = null;
/**
 * Coalesces multiple mount/API/font/image ScrollTrigger.refresh() requests into
 * a single debounced layout measurement pass to prevent startup reflow storms.
 */
export const scheduleScrollTriggerRefresh = (delayMs = 160) => {
  if (typeof window === "undefined") return;
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
  }
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    registerGsap();
    ScrollTrigger.refresh();
  }, delayMs);
};

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger, SplitText };
