import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollToTopImmediate } from "@/components/SmoothScroll";
import { scheduleScrollTriggerRefresh } from "@/lib/motionTokens";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return; // let hash navigation handle scrolling
    scrollToTopImmediate();
    scheduleScrollTriggerRefresh(140);
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
