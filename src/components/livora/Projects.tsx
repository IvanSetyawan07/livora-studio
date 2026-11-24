import { useTranslation } from "react-i18next";
import { useMemo, useState, useEffect, useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import {
  registerGsap,
  gsap,
  ScrollTrigger,
  prefersReducedMotion,
} from "@/lib/motionTokens";
import { useHighlightProjects, useAllProjects } from "@/lib/projectsApi";
import { getLocalLandingPreview } from "@/lib/localLandingPreview";
import type { Project } from "@/data/projects";

const getProjectHref = (p: Project) =>
  p.apiId != null && p.apiId < 0 ? "/projects" : `/projects/${p.slug}`;

/**
 * Hanna Stína-inspired 3-column bottom-aligned staggered heights (`items-end`):
 * Tall Left → Calm Low Center → Extra-Tall Right, alternating rhythm per row.
 */
const STAGGER_ROW_ASPECTS = [
  ["aspect-[3/4]", "aspect-[4/3]", "aspect-[3/4.55]"],
  ["aspect-[4/3]", "aspect-[3/4.45]", "aspect-[3/3.75]"],
];

export const Projects = () => {
  const { t } = useTranslation();
  const highlights = useHighlightProjects();
  const all = useAllProjects();
  const [filter, setFilter] = useState("All");

  const sectionRef = useRef<HTMLElement | null>(null);
  const archRef = useRef<HTMLElement | null>(null);
  const stitchWrapRef = useRef<HTMLDivElement | null>(null);

  // Desktop floating cursor pill ("View Project ↗")
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const cursorX = useRef<gsap.QuickToFunc | null>(null);
  const cursorY = useRef<gsap.QuickToFunc | null>(null);
  const [cursorVisible, setCursorVisible] = useState(false);

  const { sourceHighlights, sourceAll, isLocalPreview } = useMemo(() => {
    const validImg = (p: Project) => Boolean(p.img && p.img !== "/placeholder.svg");
    const liveHighlights = highlights.filter(validImg);
    const liveAll = all.filter(validImg);

    if (liveHighlights.length > 0) {
      return {
        sourceHighlights: liveHighlights,
        sourceAll: liveAll.length > 0 ? liveAll : liveHighlights,
        isLocalPreview: false,
      };
    }

    const localPreview = getLocalLandingPreview();
    if (liveAll.length < 3 && localPreview?.PREVIEW_PROJECTS?.length) {
      return {
        sourceHighlights: localPreview.PREVIEW_PROJECTS,
        sourceAll: localPreview.PREVIEW_PROJECTS,
        isLocalPreview: true,
      };
    }

    if (liveAll.length > 0) {
      return {
        sourceHighlights: liveAll,
        sourceAll: liveAll,
        isLocalPreview: false,
      };
    }

    return {
      sourceHighlights: highlights.length > 0 ? highlights : all,
      sourceAll: all,
      isLocalPreview: false,
    };
  }, [highlights, all]);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(sourceAll.map((p) => p.category).filter(Boolean))),
    ],
    [sourceAll],
  );

  const filtered = useMemo(() => {
    const base =
      filter === "All"
        ? sourceHighlights
        : sourceAll.filter((p) => p.category === filter);
    return base.length > 0 ? base : sourceHighlights;
  }, [filter, sourceHighlights, sourceAll]);

  const flagship = filtered[0];
  const restProjects = useMemo(() => filtered.slice(1, 7), [filtered]);

  // Group remaining projects into 3-up Hanna Stína staggered baseline rows
  const galleryRows = useMemo(() => {
    const rows: Project[][] = [];
    for (let i = 0; i < restProjects.length; i += 3) {
      rows.push(restProjects.slice(i, i + 3));
    }
    return rows;
  }, [restProjects]);

  useEffect(() => {
    if (typeof window === "undefined" || prefersReducedMotion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = cursorRef.current;
    if (!el) return;

    cursorX.current = gsap.quickTo(el, "x", { duration: 0.34, ease: "power3.out" });
    cursorY.current = gsap.quickTo(el, "y", { duration: 0.34, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      cursorX.current?.(e.clientX);
      cursorY.current?.(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  /* ── GSAP Choreography: Rising Arch + Split-Image Converging Stitch + Staggered Gallery Reveal ── */
  useLayoutEffect(() => {
    if (prefersReducedMotion() || typeof window === "undefined") return;
    registerGsap();

    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      if (archRef.current) {
        gsap.fromTo(
          archRef.current,
          { borderTopLeftRadius: 84, borderTopRightRadius: 84 },
          {
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            ease: "none",
            scrollTrigger: {
              trigger: archRef.current,
              start: "top 96%",
              end: "top 18%",
              scrub: 0.25,
            },
          },
        );
      }

      const introItems = section.querySelectorAll<HTMLElement>("[data-proj-reveal]");
      if (introItems.length) {
        gsap.fromTo(
          introItems,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.08,
            ease: "expo.out",
            scrollTrigger: { trigger: section, start: "top 78%", once: true },
          },
        );
      }

      const mm = gsap.matchMedia();

      // Split-Image Converging Stitch (Desktop flagship #1)
      mm.add("(min-width: 1024px)", () => {
        const stitchWrap = stitchWrapRef.current;
        if (!stitchWrap) return;

        const leftHalf = stitchWrap.querySelector<HTMLElement>("[data-stitch-left]");
        const rightHalf = stitchWrap.querySelector<HTMLElement>("[data-stitch-right]");
        const stitchImgs = stitchWrap.querySelectorAll<HTMLElement>("[data-stitch-img]");
        const stitchTitle = stitchWrap.querySelector<HTMLElement>("[data-stitch-title]");
        const seamGlow = stitchWrap.querySelector<HTMLElement>("[data-stitch-seam]");

        if (leftHalf && rightHalf) {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: stitchWrap,
              start: "top 86%",
              end: "center 46%",
              scrub: 0.28,
              invalidateOnRefresh: true,
            },
          });

          tl.fromTo(leftHalf, { y: 48, x: -10 }, { y: 0, x: 0, ease: "none" }, 0)
            .fromTo(rightHalf, { y: -48, x: 10 }, { y: 0, x: 0, ease: "none" }, 0)
            .fromTo(stitchImgs, { scale: 1.12 }, { scale: 1.01, ease: "none" }, 0);

          if (seamGlow) {
            tl.fromTo(seamGlow, { opacity: 0.85 }, { opacity: 0, ease: "none" }, 0.45);
          }

          if (stitchTitle) {
            tl.fromTo(
              stitchTitle,
              { xPercent: -5, opacity: 0.72 },
              { xPercent: 0, opacity: 1, ease: "none" },
              0,
            );
          }
        }
      });

      // Architectural curtain reveal for each staggered gallery plate
      section.querySelectorAll<HTMLElement>("[data-plate]").forEach((plate, idx) => {
        const frame = plate.querySelector<HTMLElement>("[data-plate-frame]");
        const img = plate.querySelector<HTMLElement>("[data-plate-img]");
        const meta = plate.querySelector<HTMLElement>("[data-plate-meta]");

        if (frame) {
          gsap.fromTo(
            frame,
            { clipPath: "inset(12% 0% 0% 0%)", opacity: 0.35 },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              opacity: 1,
              duration: 1.0,
              delay: (idx % 3) * 0.08,
              ease: "expo.out",
              scrollTrigger: { trigger: plate, start: "top 88%", once: true },
            },
          );
        }
        if (img) {
          gsap.fromTo(
            img,
            { scale: 1.1 },
            {
              scale: 1,
              duration: 1.25,
              delay: (idx % 3) * 0.08,
              ease: "expo.out",
              scrollTrigger: { trigger: plate, start: "top 88%", once: true },
            },
          );
        }
        if (meta) {
          gsap.fromTo(
            meta,
            { opacity: 0, y: 14 },
            {
              opacity: 1,
              y: 0,
              duration: 0.75,
              delay: (idx % 3) * 0.08 + 0.14,
              ease: "power3.out",
              scrollTrigger: { trigger: plate, start: "top 88%", once: true },
            },
          );
        }
      });
    }, section);

    const tId = setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => {
      clearTimeout(tId);
      ctx.revert();
    };
  }, [filter, filtered.length]);

  const cardHoverProps = {
    onMouseEnter: () => setCursorVisible(true),
    onMouseLeave: () => setCursorVisible(false),
  };

  return (
    <section
      id="projects"
      ref={(node) => {
        sectionRef.current = node;
        archRef.current = node;
      }}
      className="relative z-20 -mt-12 sm:-mt-16 lg:-mt-24 bg-[#FAF8F4] text-[#232528] rounded-t-[36px] sm:rounded-t-[60px] lg:rounded-t-[84px] shadow-[0_-24px_70px_-24px_rgba(35,37,40,0.16)] overflow-x-clip"
    >
      {/* Floating custom cursor pill (desktop pointer-fine only) */}
      <div
        ref={cursorRef}
        aria-hidden
        className={`hidden lg:flex fixed top-0 left-0 z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-white/95 backdrop-blur-md border border-[#232528]/10 px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-[#232528] shadow-[0_14px_34px_rgba(35,37,40,0.16)] transition-opacity duration-300 ${
          cursorVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
      >
        <span>{t("projects.view", "View Project")}</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-[#5E93B8]" />
      </div>

      {/* Top subtle architectural breathing indicator */}
      <div className="flex justify-center pt-5 sm:pt-7">
        <span className="h-1 w-14 rounded-full bg-[#232528]/12" aria-hidden />
      </div>

      <div className="container-livora pt-12 sm:pt-16 lg:pt-24 pb-20 sm:pb-24 lg:pb-32">
        {/* ── Monumental Editorial Header (Hanna Stína Staggered Headline) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end pb-12 lg:pb-16 border-b border-[#232528]/12">
          <div className="lg:col-span-8">
            <p
              data-proj-reveal
              className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-[#5E93B8] font-medium mb-4"
            >
              <span className="h-px w-8 bg-[#5E93B8]/60" />
              01 · {t("projects.eyebrow", "Selected Works")}
              {isLocalPreview && (
                <span className="rounded-full border border-[#5E93B8]/30 bg-white/85 px-2.5 py-0.5 text-[9px] tracking-[0.2em] text-[#5E93B8]">
                  Local Preview
                </span>
              )}
            </p>
            <h2
              data-proj-reveal
              className="serif text-4xl sm:text-6xl lg:text-[72px] font-light leading-[0.94] tracking-[-0.02em] text-[#232528]"
            >
              {t("projects.title", "EXPLORE THE")}
              <span className="block sm:pl-14 italic font-light text-[#5E93B8]">
                {t("projects.title_em", "Selected Works")}
              </span>
            </h2>
          </div>

          <div className="lg:col-span-4 flex flex-col lg:items-end gap-5">
            <p
              data-proj-reveal
              className="text-sm sm:text-[15px] leading-relaxed text-[#656B73] max-w-[40ch] lg:text-right font-light"
            >
              Architectural residences, private villas, and tailored interiors shaped from concept to tactile reality.
            </p>

            {/* Minimal Category Filter Tabs */}
            <div
              data-proj-reveal
              className="flex flex-wrap lg:justify-end gap-2"
              role="group"
              aria-label="Filter projects by category"
            >
              {categories.map((c) => {
                const active = filter === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFilter(c)}
                    aria-pressed={active}
                    className={`min-h-[36px] px-4 py-1.5 text-[10px] uppercase tracking-[0.24em] transition-all duration-300 border ${
                      active
                        ? "bg-[#232528] text-[#FAF8F4] border-[#232528]"
                        : "bg-white/75 text-[#656B73] border-[#232528]/14 hover:border-[#232528] hover:text-[#232528]"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Act 1: Flagship Project #1 — Split-Image Converging Stitch ── */}
        {flagship && (
          <div ref={stitchWrapRef} className="mt-14 lg:mt-20">
            <Link
              to={getProjectHref(flagship)}
              {...cardHoverProps}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E93B8]"
            >
              {/* Desktop Split-Image Converging Stitch Stage */}
              <div className="hidden lg:block relative">
                <div className="relative flex w-full h-[66vh] min-h-[480px] max-h-[660px]">
                  {/* Left Half */}
                  <div
                    data-stitch-left
                    className="relative w-1/2 h-full overflow-hidden bg-[#F1EFEA] will-change-transform"
                  >
                    <img
                      data-stitch-img
                      src={flagship.img}
                      alt={`${flagship.name} — left architectural view`}
                      loading="eager"
                      decoding="async"
                      className="absolute inset-y-0 left-0 w-[200%] max-w-none h-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                    />
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(28,30,33,0.66) 0%, rgba(28,30,33,0.12) 44%, transparent 72%)",
                      }}
                    />
                  </div>

                  {/* Right Half */}
                  <div
                    data-stitch-right
                    className="relative w-1/2 h-full overflow-hidden bg-[#F1EFEA] will-change-transform"
                  >
                    <img
                      data-stitch-img
                      src={flagship.img}
                      alt={`${flagship.name} — right architectural view`}
                      loading="eager"
                      decoding="async"
                      className="absolute inset-y-0 right-0 w-[200%] max-w-none h-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                    />
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(28,30,33,0.66) 0%, rgba(28,30,33,0.12) 44%, transparent 72%)",
                      }}
                    />
                  </div>

                  <div
                    data-stitch-seam
                    aria-hidden
                    className="pointer-events-none absolute inset-y-6 left-1/2 -translate-x-1/2 w-px bg-white/80"
                  />

                  <div className="pointer-events-none absolute top-6 left-6 inline-flex items-center gap-2 bg-white/92 backdrop-blur-md px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.24em] text-[#232528]">
                    <span>[01]</span>
                    <span>Featured Residence</span>
                  </div>

                  <div
                    data-stitch-title
                    className="pointer-events-none absolute inset-x-0 bottom-0 p-10 xl:p-12 flex items-end justify-between gap-8"
                  >
                    <div className="max-w-2xl">
                      <p className="text-[11px] uppercase tracking-[0.32em] text-[#E6DFD3] mb-2">
                        {flagship.category}
                        {flagship.location ? ` · ${flagship.location}` : ""}
                        {flagship.year ? ` · ${flagship.year}` : ""}
                      </p>
                      <h3 className="serif text-5xl xl:text-6xl font-light leading-[0.98] text-white">
                        {flagship.name}
                      </h3>
                      {flagship.description && (
                        <p className="mt-3 text-sm font-light text-white/85 line-clamp-2 max-w-[54ch]">
                          {flagship.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-2 bg-white/95 px-5 py-3 text-[10px] uppercase tracking-[0.26em] text-[#232528] font-medium shadow-lg transition-transform duration-500 group-hover:translate-x-1">
                      Explore Case
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#5E93B8]" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile / Tablet Flagship Card */}
              <div data-plate className="lg:hidden">
                <div
                  data-plate-frame
                  className="relative overflow-hidden aspect-[4/5] sm:aspect-[16/10] bg-[#F1EFEA]"
                >
                  <img
                    data-plate-img
                    src={flagship.img}
                    alt={`${flagship.name} — ${flagship.category}`}
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(28,30,33,0.75) 0%, rgba(28,30,33,0.16) 48%, transparent 74%)",
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-[#E6DFD3] mb-1.5">
                      [01] · {flagship.category}
                      {flagship.year ? ` · ${flagship.year}` : ""}
                    </p>
                    <h3 className="serif text-3xl sm:text-4xl font-light text-white leading-tight">
                      {flagship.name}
                    </h3>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ── Act 2: Hanna Stína 3-Column Bottom-Aligned Staggered Gallery Wall (`items-end`) ── */}
        {galleryRows.length > 0 && (
          <div className="mt-16 sm:mt-20 lg:mt-24 space-y-16 lg:space-y-24">
            {galleryRows.map((row, rowIdx) => {
              const rowAspects =
                STAGGER_ROW_ASPECTS[rowIdx % STAGGER_ROW_ASPECTS.length];
              const colSpanClass =
                row.length === 1
                  ? "lg:col-span-8 lg:col-start-3"
                  : row.length === 2
                  ? "lg:col-span-6"
                  : "lg:col-span-4";

              return (
                <div
                  key={`proj-row-${rowIdx}`}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8 items-end"
                >
                  {row.map((p, colIdx) => {
                    const num = String(rowIdx * 3 + colIdx + 2).padStart(2, "0");
                    const aspectClass =
                      row.length === 1
                        ? "aspect-[16/10]"
                        : row.length === 2
                        ? colIdx === 0
                          ? "aspect-[16/11]"
                          : "aspect-[4/4.3]"
                        : rowAspects[colIdx % 3];

                    return (
                      <article
                        key={p.slug}
                        data-plate
                        className={colSpanClass}
                      >
                        <Link
                          to={getProjectHref(p)}
                          {...cardHoverProps}
                          className="group block focus:outline-none"
                        >
                          <div
                            data-plate-frame
                            className={`relative overflow-hidden bg-[#F1EFEA] ${aspectClass}`}
                          >
                            <img
                              data-plate-img
                              src={p.img}
                              alt={`${p.name} — ${p.category}`}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045]"
                            />
                            <div className="pointer-events-none absolute inset-0 bg-[#232528]/0 group-hover:bg-[#232528]/10 transition-colors duration-500" />
                          </div>

                          {/* Exact Swiss-Gallery Baseline Caption: [02] PROJECT NAME   YEAR */}
                          <div
                            data-plate-meta
                            className="mt-3.5 pt-3 border-t border-[#232528]/12 flex items-baseline justify-between gap-4"
                          >
                            <div className="flex items-baseline gap-2.5 min-w-0">
                              <span className="text-[10px] font-mono text-[#5E93B8] shrink-0">
                                [{num}]
                              </span>
                              <h3 className="text-xs sm:text-[13px] uppercase tracking-[0.18em] font-medium text-[#232528] group-hover:text-[#5E93B8] transition-colors truncate">
                                {p.name}
                              </h3>
                            </div>
                            <span className="text-[10px] font-mono tracking-[0.16em] text-[#656B73] shrink-0">
                              {p.year || p.category}
                            </span>
                          </div>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Editorial Closing Bar ── */}
        <div className="mt-16 lg:mt-24 pt-8 border-t border-[#232528]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <p className="serif italic text-2xl sm:text-3xl font-light text-[#656B73]">
            Every room here began as a quiet conversation.
          </p>
          <Link
            to="/projects"
            className="group inline-flex items-center gap-3 self-start sm:self-auto border border-[#232528]/20 bg-white px-6 py-3 text-[10px] uppercase tracking-[0.28em] font-medium text-[#232528] hover:bg-[#232528] hover:text-[#FAF8F4] hover:border-[#232528] transition-all duration-300"
          >
            <span>See All Projects</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};
