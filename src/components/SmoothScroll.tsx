import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import {
  gsap,
  ScrollTrigger,
  registerGsap,
  prefersReducedMotion,
  scheduleScrollTriggerRefresh,
} from "@/lib/motionTokens";

registerGsap();
ScrollTrigger.config({ ignoreMobileResize: true });

let activeLenis: Lenis | null = null;

export function getLenis(): Lenis | null {
  return activeLenis;
}

export function scrollToTopImmediate(): void {
  if (activeLenis) {
    activeLenis.scrollTo(0, { immediate: true, force: true });
  }
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
}

export function scrollToTarget(
  target: HTMLElement | string | number,
  opts?: { offset?: number; immediate?: boolean },
): void {
  const offset = opts?.offset ?? 0;
  if (activeLenis) {
    activeLenis.scrollTo(target, {
      offset,
      immediate: Boolean(opts?.immediate),
      duration: opts?.immediate ? 0 : 0.9,
    });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({
      top: Math.max(0, target + offset),
      behavior: opts?.immediate || prefersReducedMotion() ? "auto" : "smooth",
    });
    return;
  }
  const el =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target;
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({
    top: Math.max(0, top),
    behavior: opts?.immediate || prefersReducedMotion() ? "auto" : "smooth",
  });
}

const SmoothScroll = () => {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdmin || prefersReducedMotion()) {
      activeLenis = null;
      return;
    }

    const lenis = new Lenis({
      duration: 0.95,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    activeLenis = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const update = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    // Pause Lenis only when lock state actually toggles (avoid spamming start/stop on class changes)
    let wasLocked = false;
    const updateLockState = () => {
      const locked = document.body.style.overflow === "hidden";
      if (locked === wasLocked) return;
      wasLocked = locked;
      if (locked) lenis.stop();
      else lenis.start();
    };
    updateLockState();
    const observer = new MutationObserver(updateLockState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });

    // Refresh ScrollTrigger once fonts finish swapping (Tenor Sans / Cormorant Garamond / Questrial)
    const onFontsReady = () => scheduleScrollTriggerRefresh(120);
    (document as Document & { fonts?: FontFaceSet }).fonts?.ready
      ?.then(onFontsReady)
      .catch(() => {});

    return () => {
      gsap.ticker.remove(update);
      gsap.ticker.lagSmoothing(500, 33);
      observer.disconnect();
      lenis.destroy();
      if (activeLenis === lenis) activeLenis = null;
    };
  }, [isAdmin]);

  return null;
};

export default SmoothScroll;
