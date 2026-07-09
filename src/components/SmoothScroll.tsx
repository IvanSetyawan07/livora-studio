import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";

const SmoothScroll = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // Pause Lenis when a full-screen overlay locks body scroll,
    // otherwise wheel events keep scrolling the page behind it.
    const updateLockState = () => {
      if (document.body.style.overflow === "hidden") lenis.stop();
      else lenis.start();
    };
    updateLockState();
    const observer = new MutationObserver(updateLockState);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] });

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      lenis.destroy();
    };
  }, [pathname]);

  return null;
};

export default SmoothScroll;
