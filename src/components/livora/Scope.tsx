import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import { gsap, ScrollTrigger, registerGsap, prefersReducedMotion } from "@/lib/motionTokens";
import { scopeItems } from "@/data/scopeOfWork";

const C = {
  bg: "#1a1a17",
  muted: "#8a8a85",
  body: "rgba(255,255,255,0.85)",
  line: "rgba(255,255,255,0.14)",
};

export const Scope = () => {
  const { t } = useTranslation();
  const slides = t("scope.slides", { returnObjects: true }) as { title: string; text: string }[];
  const tr = (i: number) => (Array.isArray(slides) ? slides[i] : undefined);
  const root = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    registerGsap();

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".scope-row").forEach((row) => {
        const number = Array.from(row.querySelectorAll(".scope-number"));
        const title = Array.from(row.querySelectorAll(".scope-title"));
        const imageWrap = row.querySelector(".scope-image-wrap");
        const image = row.querySelector(".scope-image-wrap img");
        const infoLabel = row.querySelector(".scope-info-label");
        const description = row.querySelector(".scope-description");
        const learnMore = row.querySelector(".scope-learnmore");
        const ctas = row.querySelectorAll(".scope-cta");

        gsap.set(number, { y: 24, opacity: 0 });
        gsap.set(title, { y: 30, opacity: 0 });
        gsap.set(imageWrap, { clipPath: "inset(0 0 100% 0)" });
        gsap.set(image, { scale: 1.15 });
        gsap.set(infoLabel, { y: 16, opacity: 0 });
        gsap.set(description, { y: 20, opacity: 0 });
        gsap.set(learnMore, { y: 12, opacity: 0 });
        if (ctas.length) gsap.set(ctas, { y: 16, opacity: 0 });

        const tl = gsap.timeline({
          scrollTrigger: { trigger: row, start: "top 82%", once: true },
        });

        tl.to(number, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" })
          .to(title, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, "-=0.4")
          .to(imageWrap, { clipPath: "inset(0 0 0% 0)", duration: 1, ease: "power3.inOut" }, "-=0.3")
          .to(image, { scale: 1, duration: 1.2, ease: "power3.out" }, "<")
          .to(infoLabel, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, "-=0.35")
          .to(description, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, "-=0.3")
          .to(learnMore, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, "-=0.25");

        if (ctas.length) {
          tl.to(ctas, { y: 0, opacity: 1, duration: 0.5, stagger: 0.16, ease: "power2.out" }, "-=0.2");
        }
      });

      gsap.utils.toArray<HTMLElement>(".scope-header-divider").forEach((d) => {
        gsap.from(d, {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 1,
          ease: "power2.inOut",
          scrollTrigger: { trigger: d, start: "top 85%", toggleActions: "play none none reverse" },
        });
      });

      ScrollTrigger.refresh();
    }, root);

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    return () => {
      window.removeEventListener("load", onLoad);
      ctx.revert();
    };
  }, []);

  return (
    <section id="scope" ref={root} className="relative" style={{ backgroundColor: C.bg, color: "#fff" }}>
      <div className="container-livora pt-20 md:pt-32 pb-6 md:pb-10">
        <div className="flex items-end justify-between gap-6">
          <h2 className="text-lg md:text-xl font-medium tracking-tight">{t("scope.eyebrow")}</h2>
          <p className="text-xs uppercase tracking-widest" style={{ color: C.muted }}>
            Livora Architechture
          </p>
        </div>
        <div className="scope-header-divider mt-5 h-px w-full" style={{ backgroundColor: C.line }} />
      </div>

      {/* Stacking area: setiap row sticky + saling menutupi saat discroll */}
      <div className="scope-stack relative">
        {scopeItems.map((item, index) => (
          <div
            key={item.number}
            className="scope-row group relative md:sticky md:top-0 flex items-center md:min-h-[100svh] py-14 md:py-20"
            style={{
              backgroundColor: C.bg,
              zIndex: index + 1,
              // bayangan tipis di atas biar terasa "kartu" yang menutup kartu sebelumnya
              boxShadow: index > 0 ? "0 -24px 48px -16px rgba(0,0,0,0.5)" : undefined,
            }}
          >
            <div className="container-livora grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 w-full">
              {/* Mobile header — number + title on the same line */}
              <div className="md:hidden flex items-baseline gap-4">
                <span className="scope-number text-3xl font-normal tracking-tight">{item.number}</span>
                <h3 className="scope-title text-2xl font-medium tracking-tight leading-[1.1]">
                  {tr(index)?.title ?? item.title}
                </h3>
              </div>

              {/* Left column */}
              <div className="md:col-span-5 lg:col-span-4">
                <div className="scope-number hidden md:block text-4xl md:text-6xl lg:text-7xl font-normal tracking-tight">
                  {item.number}
                </div>
                <Link
                  to={item.href ?? "/projects"}
                  aria-label={`${tr(index)?.title ?? item.title} — ${t("common.learn_more", "Learn More")}`}
                  className="scope-image-wrap block relative overflow-hidden mt-2 md:mt-10 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  style={{ aspectRatio: "4 / 5" }}
                >
                  <img
                    src={item.image}
                    srcSet={`${item.imageSm} 800w, ${item.image} ${item.width}w`}
                    sizes="(max-width: 768px) 92vw, 34vw"
                    width={item.width}
                    height={item.height}
                    alt={tr(index)?.title ?? item.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <span className="md:hidden absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/65 backdrop-blur-sm text-white px-3 py-1.5 text-[10px] uppercase tracking-[0.2em]">
                    Explore <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </div>

              {/* Right column */}
              <div className="md:col-span-7 lg:col-span-8">
                <h3 className="scope-title hidden md:block text-3xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.05]">
                  {tr(index)?.title ?? item.title}
                </h3>

                <div className="mt-2 md:mt-14 grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3 md:gap-8">
                  <p className="scope-info-label text-xs uppercase tracking-widest" style={{ color: C.muted }}>
                    {t("common.info", "Info")}
                  </p>
                  <div className="max-w-[420px]">
                    <p className="scope-description text-sm md:text-base leading-relaxed" style={{ color: C.body }}>
                      {tr(index)?.text ?? item.description}
                    </p>
                    <Link
                      to={item.href ?? "/projects"}
                      aria-label={`${t("common.learn_more", "Learn More")} — ${tr(index)?.title ?? item.title}`}
                      className="scope-learnmore inline-flex items-center min-h-[44px] py-2 mt-2 md:mt-4 text-sm md:text-base font-medium underline underline-offset-4 transition-colors duration-300 hover:text-white/70"
                    >
                      {t("common.learn_more", "Learn More")}
                      <span className="sr-only"> — {tr(index)?.title ?? item.title}</span>
                    </Link>

                    {item.featured && (
                      <div className="mt-8 md:mt-32 flex flex-wrap items-center gap-4 md:gap-6">
                        <Link
                          to="/projects"
                          className="scope-cta inline-flex items-center min-h-[44px] py-2 text-sm md:text-base font-medium underline underline-offset-4 transition-colors duration-300 hover:text-white/70"
                        >
                          {t("common.see_all_projects", item.ctaLabel ?? "See All Projects")}
                        </Link>
                        <span className="hidden sm:block h-4 w-px" style={{ backgroundColor: C.line }} />
                        <Link
                          to={item.href ?? "/projects"}
                          className="scope-cta inline-flex items-center gap-1 min-h-[44px] py-2 text-sm md:text-base font-medium underline underline-offset-4 transition-colors duration-300 hover:text-white/70"
                        >
                          {item.ctaUrl}
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};