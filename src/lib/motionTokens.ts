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

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger, SplitText };
