import { useEffect } from "react";

export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    );

    const observeAll = () => {
      document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)").forEach((el) => io.observe(el));
    };

    observeAll();

    // Content can mount later (loader, async data) — keep picking up new nodes.
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });

    // Safety net: nothing should ever stay invisible forever.
    const fallback = window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 1.2) el.classList.add("is-visible");
      });
    }, 1200);

    return () => {
      io.disconnect();
      mo.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);
}
