import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import {
  gsap,
  ScrollTrigger,
  registerGsap,
  prefersReducedMotion,
} from "@/lib/motionTokens";
import { scopeItems } from "@/data/scopeOfWork";

/**
 * 4 serene sunlit tonal stone/sky surfaces for each rising curtain layer
 * — bright, fresh, calm architectural depth with zero dark navy blocks.
 */
const DAYLIGHT_TONES = ["#FAF8F4", "#EDF4F8", "#F2EFE9", "#F6F3EC"];

export const Scope = () => {
  const { t } = useTranslation();
  const slides = t("scope.slides", {
    returnObjects: true,
  }) as { title: string; text: string }[];
  const tr = (i: number) => (Array.isArray(slides) ? slides[i] : undefined);
  const rootRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    registerGsap();

    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelectorAll<HTMLElement>("[data-scope-head]"),
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "expo.out",
          scrollTrigger: { trigger: root, start: "top 80%", once: true },
        },
      );

      const divider = root.querySelector<HTMLElement>("[data-scope-divider]");
      if (divider) {
        gsap.fromTo(
          divider,
          { scaleX: 0 },
          {
            scaleX: 1,
            transformOrigin: "left center",
            duration: 1.0,
            ease: "expo.out",
            scrollTrigger: { trigger: divider, start: "top 85%", once: true },
          },
        );
      }

      const mm = gsap.matchMedia();

      // Desktop & Tablet: Daylight Depth-Parallax Curtain Stack Choreography
      mm.add("(min-width: 768px)", () => {
        const cards = gsap.utils.toArray<HTMLElement>(".scope-curtain", root);

        cards.forEach((card, idx) => {
          const inner = card.querySelector<HTMLElement>(".scope-curtain-inner");
          const img = card.querySelector<HTMLElement>(".scope-curtain-img");
          const nextCard = cards[idx + 1];

          // Image slow architectural un-zoom as card enters
          if (img) {
            gsap.fromTo(
              img,
              { scale: 1.12 },
              {
                scale: 1.0,
                ease: "none",
                scrollTrigger: {
                  trigger: card,
                  start: "top bottom",
                  end: "top top",
                  scrub: 0.28,
                },
              },
            );
          }

          // Rising top corner flattening for cards 02..04
          if (idx > 0) {
            gsap.fromTo(
              card,
              { borderTopLeftRadius: 36, borderTopRightRadius: 36 },
              {
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                ease: "none",
                scrollTrigger: {
                  trigger: card,
                  start: "top bottom",
                  end: "top 12%",
                  scrub: 0.25,
                },
              },
            );
          }

          // When the next daylight stone curtain rises over this sticky card,
          // smoothly scale & softly recede this card for calm architectural depth
          if (nextCard && inner) {
            gsap.fromTo(
              inner,
              { scale: 1, y: 0, filter: "brightness(1)" },
              {
                scale: 0.95,
                y: -14,
                filter: "brightness(0.86)",
                ease: "none",
                scrollTrigger: {
                  trigger: nextCard,
                  start: "top bottom",
                  end: "top top",
                  scrub: 0.28,
                },
              },
            );
          }
        });
      });

      // Mobile subtle fade-in per scope card
      mm.add("(max-width: 767px)", () => {
        gsap.utils.toArray<HTMLElement>(".scope-curtain", root).forEach((card) => {
          gsap.fromTo(
            card,
            { opacity: 0, y: 28 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: "expo.out",
              scrollTrigger: { trigger: card, start: "top 86%", once: true },
            },
          );
        });
      });
    }, root);

    const tId = setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => {
      clearTimeout(tId);
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="scope"
      ref={rootRef}
      className="relative bg-[#EDF4F8] text-[#232528]"
    >
      {/* ── Bright Editorial Header Band ── */}
      <div className="container-livora pt-20 sm:pt-24 lg:pt-28 pb-10 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-7">
            <p
              data-scope-head
              className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-[#5E93B8] font-medium mb-4"
            >
              <span className="h-px w-8 bg-[#5E93B8]/60" />
              05 · {t("scope.eyebrow", "Scope of Work")}
            </p>
            <h2
              data-scope-head
              className="serif text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-light leading-[0.98] tracking-[-0.015em] text-[#232528]"
            >
              From Vision{" "}
              <em className="italic font-light text-[#5E93B8]">
                to Turnkey Reality
              </em>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:text-right">
            <p
              data-scope-head
              className="text-sm sm:text-[15px] font-light leading-relaxed text-[#656B73] max-w-[42ch] lg:ml-auto"
            >
              Four integrated disciplines working under one studio roof — from interior architecture and bespoke furniture to disciplined execution.
            </p>
          </div>
        </div>

        <div
          data-scope-divider
          className="mt-10 h-px w-full bg-[#232528]/12"
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FULL-SCALE 40 / 60 SUNLIT DAYLIGHT CURTAIN STACK
         ══════════════════════════════════════════════════════════════ */}
      <div className="relative">
        {scopeItems.map((item, index) => {
          const title = tr(index)?.title ?? item.title;
          const description = tr(index)?.text ?? item.description;
          const totalStr = String(scopeItems.length).padStart(2, "0");
          const surfaceBg = DAYLIGHT_TONES[index % DAYLIGHT_TONES.length];

          return (
            <article
              key={item.number}
              className="scope-curtain relative md:sticky md:top-0 md:h-[100svh] md:min-h-[640px] overflow-hidden border-t border-[#232528]/8"
              style={{
                backgroundColor: surfaceBg,
                zIndex: index + 1,
                boxShadow:
                  index > 0
                    ? "0 -22px 60px -20px rgba(35, 37, 40, 0.14)"
                    : undefined,
              }}
            >
              <div className="scope-curtain-inner relative h-full w-full grid grid-cols-1 lg:grid-cols-12 will-change-transform">
                {/* Delicate architectural geometry watermark on Left Daylight Panel */}
                <svg
                  aria-hidden
                  viewBox="0 0 300 300"
                  fill="none"
                  className="pointer-events-none hidden lg:block absolute -bottom-16 -left-16 w-[300px] text-[#5E93B8] opacity-[0.07]"
                >
                  <polygon
                    points="150,12 270,81 270,219 150,288 30,219 30,81"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <line x1="150" y1="12" x2="150" y2="288" stroke="currentColor" strokeWidth="0.8" />
                  <line x1="30" y1="81" x2="270" y2="219" stroke="currentColor" strokeWidth="0.8" />
                </svg>

                {/* ── LEFT 40% (Bright Calm Editorial Dossier + Progress Rail) ── */}
                <div className="lg:col-span-5 relative z-10 flex flex-col justify-between px-6 sm:px-10 lg:px-12 xl:px-16 py-10 sm:py-12 lg:py-16 order-2 lg:order-1">
                  {/* Top Bar: Index + Progress Dots */}
                  <div className="flex items-center justify-between gap-4 border-b border-[#232528]/10 pb-5">
                    <div className="flex items-baseline gap-2.5">
                      <span className="serif text-4xl sm:text-5xl font-light text-[#232528] leading-none tabular-nums">
                        {item.number}
                      </span>
                      <span className="text-xs uppercase tracking-[0.26em] text-[#5E93B8]">
                        / {totalStr}
                      </span>
                    </div>

                    {/* 4-Step Discipline Progress Rail */}
                    <div
                      className="flex items-center gap-2"
                      aria-label={`Scope ${index + 1} of ${scopeItems.length}`}
                    >
                      {scopeItems.map((s, dotIdx) => (
                        <span
                          key={s.number}
                          className={`block h-1.5 rounded-full transition-all duration-300 ${
                            dotIdx === index
                              ? "w-7 bg-[#5E93B8]"
                              : dotIdx < index
                              ? "w-2 bg-[#232528]/45"
                              : "w-2 bg-[#232528]/15"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Middle: Monumental Title & Description */}
                  <div className="my-8 lg:my-auto py-2 lg:py-6">
                    <p className="text-[10px] uppercase tracking-[0.34em] text-[#B89D7A] font-medium mb-3">
                      LIVORA Discipline
                    </p>
                    <h3 className="serif text-3xl sm:text-4xl lg:text-5xl xl:text-[54px] font-light leading-[1.03] text-[#232528] text-balance">
                      {title}
                    </h3>

                    <div className="mt-6 h-px w-14 bg-[#5E93B8]/50" />

                    <p className="mt-6 text-sm sm:text-[15px] lg:text-base font-light leading-relaxed text-[#656B73] max-w-[44ch]">
                      {description}
                    </p>
                  </div>

                  {/* Bottom: Clean Editorial CTAs */}
                  <div className="pt-5 border-t border-[#232528]/10 flex flex-wrap items-center gap-4">
                    <Link
                      to={item.href ?? "/projects"}
                      className="group inline-flex items-center gap-2.5 rounded-full bg-[#232528] px-6 py-3 text-[11px] uppercase tracking-[0.24em] font-medium text-[#FAF8F4] hover:bg-[#5E93B8] transition-colors duration-300 shadow-[0_12px_28px_-14px_rgba(35,37,40,0.45)]"
                    >
                      <span>{t("common.learn_more", "Explore Discipline")}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>

                    {item.featured && (
                      <Link
                        to="/projects"
                        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.24em] text-[#656B73] hover:text-[#232528] transition-colors underline-grow py-2"
                      >
                        {t(
                          "common.see_all_projects",
                          item.ctaLabel ?? "See All Projects",
                        )}
                      </Link>
                    )}
                  </div>
                </div>

                {/* ── RIGHT 60%: MASSIVE FULL-HEIGHT ARCHITECTURAL PHOTOGRAPH ── */}
                <div className="lg:col-span-7 relative overflow-hidden order-1 lg:order-2 min-h-[300px] sm:min-h-[380px] lg:min-h-full bg-[#EAE6DE]">
                  <Link
                    to={item.href ?? "/projects"}
                    aria-label={`${title} — ${t("common.learn_more", "Learn More")}`}
                    className="group block relative h-full w-full focus:outline-none"
                  >
                    <img
                      src={item.image}
                      srcSet={`${item.imageSm} 800w, ${item.image} ${item.width}w`}
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      width={item.width}
                      height={item.height}
                      alt={title}
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                      className="scope-curtain-img h-full w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                    />
                    {/* Soft daylight edge seam blending left stone panel into photo */}
                    <div
                      aria-hidden
                      className="pointer-events-none hidden lg:block absolute inset-y-0 left-0 w-24"
                      style={{
                        background: `linear-gradient(to right, ${surfaceBg}, transparent)`,
                      }}
                    />

                    {/* Corner frosted glass tag */}
                    <span className="absolute bottom-5 right-5 sm:bottom-8 sm:right-8 inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md border border-[#232528]/10 px-4 py-2 text-[10px] uppercase tracking-[0.26em] text-[#232528] shadow-sm">
                      <span>{item.number} · {title}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#5E93B8]" />
                    </span>
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
