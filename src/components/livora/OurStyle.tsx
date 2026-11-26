import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Plus } from "lucide-react";
import {
  gsap,
  registerGsap,
  prefersReducedMotion,
  scheduleScrollTriggerRefresh,
} from "@/lib/motionTokens";

import european from "@/assets/style-european.webp";
import tropical from "@/assets/style-tropical.webp";
import industrial from "@/assets/style-industrial.webp";
import japandi from "@/assets/style-japandi.webp";
import scandinavian from "@/assets/style-scandinavian.webp";
import europeanSm from "@/assets/_opt/style-european-800.webp";
import tropicalSm from "@/assets/_opt/style-tropical-800.webp";
import industrialSm from "@/assets/_opt/style-industrial-800.webp";
import japandiSm from "@/assets/_opt/style-japandi-800.webp";
import scandinavianSm from "@/assets/_opt/style-scandinavian-800.webp";

const STYLES = [
  {
    img: european,
    sm: europeanSm,
    w: 1280,
    h: 896,
    words: ["Modern.", "Quiet.", "European."],
    name: "European",
    mood: "Refined moulding, quiet proportion, and timeless continental poise.",
  },
  {
    img: tropical,
    sm: tropicalSm,
    w: 1280,
    h: 1024,
    words: ["Lush.", "Warm.", "Tropical Modern."],
    name: "Tropical Modern",
    mood: "Open-air architecture wrapped in natural stone, timber, and daylight.",
  },
  {
    img: industrial,
    sm: industrialSm,
    w: 1280,
    h: 1024,
    words: ["Raw.", "Bold.", "Industrial."],
    name: "Industrial",
    mood: "Honest concrete, architectural steel, and sculpted shadow play.",
  },
  {
    img: japandi,
    sm: japandiSm,
    w: 1280,
    h: 1024,
    words: ["Warm.", "Minimal.", "Japandi."],
    name: "Japandi",
    mood: "Wabi-sabi serenity balanced with Nordic warmth and tactile craft.",
  },
  {
    img: scandinavian,
    sm: scandinavianSm,
    w: 1280,
    h: 1024,
    words: ["Light.", "Soft.", "Scandinavian."],
    name: "Scandinavian",
    mood: "Sunlit palettes, clean silhouettes, and effortless daily comfort.",
  },
];

export function OurStyle() {
  const { t } = useTranslation();
  const panelsCopy = t("style.panels", {
    returnObjects: true,
  }) as { words: string[] }[];

  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    registerGsap();

    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        section.querySelectorAll<HTMLElement>("[data-style-reveal]"),
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "expo.out",
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            once: true,
          },
        },
      );

      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        const pillars = section.querySelectorAll<HTMLElement>("[data-style-pillar]");
        if (pillars.length) {
          gsap.fromTo(
            pillars,
            { opacity: 0, y: 40 },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              stagger: 0.08,
              ease: "expo.out",
              scrollTrigger: {
                trigger: pillars[0],
                start: "top 85%",
                once: true,
              },
            },
          );
        }
      });
    }, section);

    scheduleScrollTriggerRefresh();
    return () => {
      ctx.revert();
    };
  }, []);

  const getWords = (idx: number) =>
    (Array.isArray(panelsCopy) && panelsCopy[idx]?.words) || STYLES[idx].words;

  return (
    <section
      id="style"
      ref={sectionRef}
      className="relative overflow-x-clip py-24 sm:py-28 lg:py-36 text-[#232528]"
      style={{
        background:
          "linear-gradient(180deg, #FAF8F4 0%, #F1EFEA 50%, #EDF4F8 100%)",
      }}
    >
      <div className="container-livora relative z-10">
        {/* ── Editorial Header ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-end mb-12 lg:mb-16">
          <div className="lg:col-span-7">
            <p
              data-style-reveal
              className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-[#5E93B8] font-medium mb-4"
            >
              <span className="h-px w-8 bg-[#5E93B8]/60" />
              04 · {t("style.chapter", "Our Style")}
            </p>
            <h2
              data-style-reveal
              className="serif text-4xl sm:text-5xl md:text-6xl lg:text-[66px] font-light leading-[0.98] tracking-[-0.015em] text-[#232528]"
            >
              {t("style.heading", "Architectural Languages")}
            </h2>
          </div>

          <div className="lg:col-span-5 flex flex-col lg:items-end gap-3">
            <p
              data-style-reveal
              className="text-sm sm:text-[15px] leading-relaxed font-light text-[#656B73] max-w-[44ch] lg:text-right"
            >
              {t(
                "style.subtitle",
                "Five signature interior atmospheres — shaped around light, proportion, and material honesty.",
              )}
            </p>
            <span
              data-style-reveal
              className="hidden lg:inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#5E93B8]"
            >
              Hover or select a pillar to unfold
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            DESKTOP: 5-COLUMN EXPANDING ARCHITECTURAL PILLARS (Daylight Gallery)
           ══════════════════════════════════════════════════════════════ */}
        <div
          className="hidden lg:flex gap-3 xl:gap-4 h-[74vh] min-h-[540px] max-h-[760px]"
          role="tablist"
          aria-label="LIVORA interior design styles"
        >
          {STYLES.map((s, idx) => {
            const isActive = idx === activeIdx;
            const words = getWords(idx);
            const num = String(idx + 1).padStart(2, "0");

            return (
              <article
                key={s.name}
                data-style-pillar
                role="tab"
                tabIndex={0}
                aria-selected={isActive}
                onMouseEnter={() => setActiveIdx(idx)}
                onFocus={() => setActiveIdx(idx)}
                onClick={() => setActiveIdx(idx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveIdx(idx);
                  }
                }}
                style={{
                  flexGrow: isActive ? 3.7 : 0.85,
                  flexBasis: 0,
                  contain: "layout paint",
                  transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className="relative min-w-0 overflow-hidden rounded-[24px] cursor-pointer transition-[flex-grow] duration-700 border border-[#232528]/8 bg-[#E8E4DC] shadow-[0_24px_60px_-34px_rgba(35,37,40,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E93B8]"
              >
                {/* Background Photograph */}
                <img
                  src={s.img}
                  srcSet={`${s.sm} 800w, ${s.img} ${s.w}w`}
                  sizes="(min-width: 1024px) 52vw, 100vw"
                  alt={`${s.name} interior by Livora`}
                  loading="eager"
                  decoding="async"
                  width={s.w}
                  height={s.h}
                  style={{
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  className={`absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ${
                    isActive ? "scale-100" : "scale-110"
                  }`}
                />

                {/* Soft Daylight Vignette (keeps photography bright & crisp) */}
                <div
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    background:
                      "linear-gradient(to top, rgba(28,30,33,0.78) 0%, rgba(28,30,33,0.2) 42%, transparent 72%)",
                  }}
                />
                <div
                  className={`absolute inset-0 bg-[#232528]/34 transition-opacity duration-700 ${
                    isActive ? "opacity-0" : "opacity-100 hover:opacity-75"
                  }`}
                />

                {/* Resting Vertical Pillar Spine (Visible when compressed) */}
                <div
                  className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-between py-7 px-3 transition-opacity duration-500 ${
                    isActive ? "opacity-0" : "opacity-100 delay-150"
                  }`}
                >
                  <span className="text-[11px] font-medium tracking-[0.26em] text-white/90 tabular-nums drop-shadow-sm">
                    {num}
                  </span>
                  <span
                    className="serif text-2xl font-light tracking-[0.06em] text-white whitespace-nowrap drop-shadow-sm"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                    }}
                  >
                    {s.name}
                  </span>
                  <span className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md border border-white/35 flex items-center justify-center text-white">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </div>

                {/* Expanded Editorial Content (Fixed inner text width prevents text rewrap during flex-grow) */}
                <div
                  className={`relative z-10 flex h-full flex-col justify-between p-8 xl:p-10 transition-[opacity,transform] duration-500 ${
                    isActive
                      ? "opacity-100 translate-y-0 delay-200"
                      : "opacity-0 translate-y-5 pointer-events-none"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2.5 rounded-full bg-white/90 backdrop-blur-md px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-[#232528] shadow-sm whitespace-nowrap">
                      <span>{num}</span>
                      <span className="h-1 w-1 rounded-full bg-[#5E93B8]" />
                      <span>{s.name}</span>
                    </span>
                    <span className="rounded-full bg-[#232528]/35 backdrop-blur-md px-3 py-1 text-[11px] tracking-[0.24em] text-white/90 tabular-nums whitespace-nowrap">
                      {num} / {String(STYLES.length).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="w-[340px] xl:w-[440px] max-w-none">
                    <div className="mb-4">
                      {words.map((w) => (
                        <span
                          key={w}
                          className="serif block text-4xl xl:text-[54px] font-light leading-[0.98] text-white"
                        >
                          {w}
                        </span>
                      ))}
                    </div>

                    <p className="text-sm font-light leading-relaxed text-white/85 max-w-[42ch] mb-6">
                      {s.mood}
                    </p>

                    <Link
                      to="/projects"
                      onClick={(e) => e.stopPropagation()}
                      className="group/btn inline-flex items-center gap-2.5 rounded-full bg-white/95 px-5 py-2.5 text-[11px] uppercase tracking-[0.24em] font-medium text-[#232528] hover:bg-[#5E93B8] hover:text-white transition-colors duration-300 shadow-lg"
                    >
                      <span>Explore Style</span>
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            MOBILE / TABLET: TACTILE VERTICAL ACCORDION PHOTO PANELS
           ══════════════════════════════════════════════════════════════ */}
        <div className="lg:hidden space-y-3">
          {STYLES.map((s, idx) => {
            const isActive = idx === activeIdx;
            const words = getWords(idx);
            const num = String(idx + 1).padStart(2, "0");

            return (
              <article
                key={s.name}
                onClick={() => setActiveIdx(idx)}
                style={{
                  transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className={`relative overflow-hidden rounded-[20px] border border-[#232528]/10 transition-[height] duration-500 cursor-pointer shadow-sm ${
                  isActive ? "h-[430px] sm:h-[480px]" : "h-[82px]"
                }`}
              >
                <img
                  src={s.sm}
                  srcSet={`${s.sm} 800w, ${s.img} ${s.w}w`}
                  sizes="94vw"
                  alt={`${s.name} interior by Livora`}
                  loading="lazy"
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ${
                    isActive ? "scale-100" : "scale-110"
                  }`}
                />

                <div
                  className="absolute inset-0"
                  style={{
                    background: isActive
                      ? "linear-gradient(to top, rgba(28,30,33,0.8) 0%, rgba(28,30,33,0.22) 50%, transparent 100%)"
                      : "rgba(35,37,40,0.44)",
                  }}
                />

                {!isActive ? (
                  <div className="relative z-10 h-full px-5 flex items-center justify-between">
                    <div className="flex items-baseline gap-4">
                      <span className="text-[11px] tracking-[0.26em] text-[#E6DFD3] tabular-nums">
                        {num}
                      </span>
                      <h3 className="serif text-2xl font-light text-white">
                        {s.name}
                      </h3>
                    </div>
                    <span className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white">
                      <Plus className="h-4 w-4" />
                    </span>
                  </div>
                ) : (
                  <div className="relative z-10 flex h-full flex-col justify-between p-6">
                    <span className="self-start rounded-full bg-white/90 backdrop-blur-md px-3.5 py-1 text-[10px] uppercase tracking-[0.26em] text-[#232528]">
                      {num} / {String(STYLES.length).padStart(2, "0")} · {s.name}
                    </span>

                    <div>
                      {words.map((w) => (
                        <span
                          key={w}
                          className="serif block text-3xl sm:text-4xl font-light leading-[1.0] text-white"
                        >
                          {w}
                        </span>
                      ))}
                      <p className="mt-2.5 text-xs sm:text-sm font-light text-white/85 max-w-[38ch]">
                        {s.mood}
                      </p>
                      <Link
                        to="/projects"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[10px] uppercase tracking-[0.22em] font-medium text-[#232528]"
                      >
                        Explore Style <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default OurStyle;
