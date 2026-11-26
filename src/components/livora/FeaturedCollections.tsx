import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { listCollections, type Collection } from "@/lib/collectionsApi";
import { getLocalLandingPreview } from "@/lib/localLandingPreview";
import {
  gsap,
  registerGsap,
  prefersReducedMotion,
  scheduleScrollTriggerRefresh,
} from "@/lib/motionTokens";
import fallbackImg1 from "@/assets/style-european.webp";
import fallbackImg2 from "@/assets/style-japandi.webp";
import fallbackImg3 from "@/assets/style-tropical.webp";

const FALLBACK_COVERS = [fallbackImg1, fallbackImg2, fallbackImg3];

export const FeaturedCollections = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const sectionRef = useRef<HTMLElement | null>(null);
  const apertureImgRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Sumber data sama persis dengan halaman /collection di sidebar
        const all = await listCollections();
        if (!alive) return;
        const featured = all.filter((c) => Boolean(c.is_featured));
        setCollections((featured.length > 0 ? featured : all).slice(0, 6));
      } catch {
        if (alive) setCollections([]);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const { displayList, isLocalPreview } = useMemo(() => {
    if (collections.length > 0) {
      return { displayList: collections, isLocalPreview: false };
    }
    const localPreview = getLocalLandingPreview();
    if (localPreview?.PREVIEW_COLLECTIONS?.length) {
      return {
        displayList: localPreview.PREVIEW_COLLECTIONS,
        isLocalPreview: true,
      };
    }
    return { displayList: [] as Collection[], isLocalPreview: false };
  }, [collections]);

  const active = displayList[activeIdx] ?? displayList[0];
  const getCollectionHref = (c: Collection) =>
    c.id < 0 ? "/collection" : `/collection/${c.slug}`;

  const getCoverImage = (c: Collection, index: number) =>
    c.featured_image ||
    c.hero_banner ||
    c.card_banner ||
    c.story?.story_banner ||
    FALLBACK_COVERS[index % FALLBACK_COVERS.length];

  // Entrance scroll reveal
  useLayoutEffect(() => {
    if (!loaded || displayList.length === 0 || prefersReducedMotion()) return;
    registerGsap();
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        section.querySelectorAll<HTMLElement>("[data-col-reveal]"),
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "expo.out",
          scrollTrigger: {
            trigger: section,
            start: "top 78%",
            once: true,
          },
        },
      );
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        const rows = section.querySelectorAll<HTMLElement>("[data-col-desktop-reveal]");
        if (rows.length) {
          gsap.fromTo(
            rows,
            { opacity: 0, y: 28 },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              stagger: 0.08,
              ease: "expo.out",
              scrollTrigger: {
                trigger: rows[0],
                start: "top 82%",
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
  }, [loaded, displayList.length]);

  // Silky curtain clip-path wipe + slow zoom settle whenever active collection changes
  // (animates inner wrapper so GSAP scale never fights CSS group-hover:scale on <img>)
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const frame = apertureImgRef.current;
    if (!frame) return;

    const zoomWrap = frame.querySelector<HTMLElement>("[data-aperture-zoom]");
    gsap.killTweensOf([frame, zoomWrap]);

    gsap.fromTo(
      frame,
      { clipPath: "inset(14% 0% 0% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 0.78, ease: "expo.out" },
    );

    if (zoomWrap) {
      gsap.fromTo(
        zoomWrap,
        { scale: 1.1 },
        { scale: 1.0, duration: 1.15, ease: "expo.out" },
      );
    }
  }, [activeIdx, active?.id]);

  if (loaded && displayList.length === 0) {
    return null;
  }

  return (
    <section
      id="collections"
      ref={sectionRef}
      className="relative overflow-x-clip py-24 sm:py-28 lg:py-36 text-[#232528]"
      style={{
        background:
          "linear-gradient(180deg, #FAF8F4 0%, #EDF4F8 50%, #FAF8F4 100%)",
      }}
    >
      {/* Delicate faceted morning-light architectural geometry */}
      <svg
        aria-hidden
        viewBox="0 0 420 420"
        fill="none"
        className="pointer-events-none absolute -top-12 -right-20 w-[340px] sm:w-[460px] text-[#5E93B8] opacity-[0.09]"
      >
        <polygon
          points="210,16 378,113 378,307 210,404 42,307 42,113"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <polygon
          points="210,64 336,136 336,284 210,356 84,284 84,136"
          stroke="currentColor"
          strokeWidth="0.9"
        />
        <line x1="210" y1="16" x2="210" y2="404" stroke="currentColor" strokeWidth="0.7" />
        <line x1="42" y1="113" x2="378" y2="307" stroke="currentColor" strokeWidth="0.7" />
        <line x1="378" y1="113" x2="42" y2="307" stroke="currentColor" strokeWidth="0.7" />
      </svg>

      <div className="container-livora relative z-10">
        {/* ── Section Header ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-end mb-14 lg:mb-20">
          <div className="lg:col-span-7">
            <p
              data-col-reveal
              className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-[#5E93B8] font-medium mb-4"
            >
              <span className="h-px w-8 bg-[#5E93B8]/60" />
              02 · Featured Collections
              {isLocalPreview && (
                <span className="rounded-full border border-[#5E93B8]/30 bg-white/80 px-2.5 py-0.5 text-[9px] tracking-[0.2em] text-[#5E93B8]">
                  Local Preview
                </span>
              )}
            </p>
            <h2
              data-col-reveal
              className="serif text-4xl sm:text-5xl md:text-6xl lg:text-[66px] font-light leading-[0.98] tracking-[-0.015em] text-[#232528]"
            >
              Signature{" "}
              <em className="italic font-light text-[#5E93B8]">
                Living Worlds
              </em>
            </h2>
          </div>
          <div className="lg:col-span-5 flex flex-col lg:items-end gap-4">
            <p
              data-col-reveal
              className="text-sm sm:text-[15px] leading-relaxed text-[#656B73] max-w-[44ch] lg:text-right font-light"
            >
              Curated ensembles of furniture, finishes, and atmosphere — designed to move effortlessly as one cohesive room.
            </p>
            <Link
              data-col-reveal
              to="/collection"
              className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] font-medium text-[#232528] hover:text-[#5E93B8] transition-colors"
            >
              <span>Explore All Collections</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {/* Loading Skeleton */}
        {!loaded ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              {[0, 1, 2].map((n) => (
                <div key={n} className="h-20 rounded-xl bg-[#232528]/5 animate-pulse" />
              ))}
            </div>
            <div className="lg:col-span-6 aspect-[4/5] rounded-tl-[72px] rounded-br-[72px] bg-[#232528]/5 animate-pulse" />
          </div>
        ) : (
          <>
            {/* ── Mobile / Tablet Interactive Pills ── */}
            <div
              data-lenis-prevent
              className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar pb-5 -mx-1 px-1"
            >
              {displayList.map((col, idx) => {
                const isAct = idx === activeIdx;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`shrink-0 min-h-[40px] px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.2em] border transition-all duration-300 ${
                      isAct
                        ? "bg-[#232528] text-[#FAF8F4] border-[#232528] shadow-sm"
                        : "bg-white/85 text-[#656B73] border-[#232528]/12"
                    }`}
                  >
                    {String(idx + 1).padStart(2, "0")} · {col.name}
                  </button>
                );
              })}
            </div>

            {/* ── Main Split Stage (Interactive Lookbook Aperture) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-20 items-start">
              {/* Left: Monumental Numbered Interactive Index (Desktop) */}
              <div className="hidden lg:flex lg:col-span-6 flex-col justify-center">
                <div className="border-t border-[#232528]/12">
                  {displayList.map((col, idx) => {
                    const isAct = idx === activeIdx;
                    const countBits: string[] = [];
                    if (col.items_count && col.items_count > 0) {
                      countBits.push(`${col.items_count} Pieces`);
                    }
                    if (col.packages_count && col.packages_count > 0) {
                      countBits.push(`${col.packages_count} Sets`);
                    }

                    return (
                      <div
                        key={col.id}
                        data-col-desktop-reveal
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={`group relative border-b border-[#232528]/12 transition-colors duration-500 ${
                          isAct ? "py-8" : "py-6"
                        }`}
                      >
                        {/* Active left Soft Sky accent bar */}
                        <span
                          aria-hidden
                          className={`absolute left-0 top-6 bottom-6 w-[2px] rounded-full bg-[#5E93B8] transition-all duration-500 ${
                            isAct ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() => setActiveIdx(idx)}
                          onFocus={() => setActiveIdx(idx)}
                          aria-expanded={isAct}
                          className={`w-full text-left focus:outline-none transition-all duration-500 ${
                            isAct ? "pl-5" : "pl-0 hover:pl-3"
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-4">
                            <div className="flex items-baseline gap-5">
                              <span
                                className={`text-xs font-medium tracking-[0.24em] transition-colors duration-300 ${
                                  isAct ? "text-[#5E93B8]" : "text-[#232528]/35"
                                }`}
                              >
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <h3
                                className={`serif text-3xl xl:text-[44px] font-light leading-[1.06] transition-colors duration-300 ${
                                  isAct
                                    ? "text-[#232528]"
                                    : "text-[#232528]/40 group-hover:text-[#232528]/75"
                                }`}
                              >
                                {col.name}
                              </h3>
                            </div>

                            {col.is_featured && (
                              <span
                                className={`hidden xl:inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.24em] transition-opacity duration-300 ${
                                  isAct ? "opacity-100 text-[#5E93B8]" : "opacity-0"
                                }`}
                              >
                                <Sparkles className="h-3 w-3" />
                                Featured
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Smooth accordion details for active collection */}
                        <div
                          className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            isAct
                              ? "grid-rows-[1fr] opacity-100 mt-4 pl-5"
                              : "grid-rows-[0fr] opacity-0 mt-0 pl-5"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="pl-9 pr-4 space-y-4">
                              {(col.short_description || col.description) && (
                                <p className="text-sm leading-relaxed text-[#656B73] font-light max-w-[46ch] line-clamp-3">
                                  {col.short_description || col.description}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                                {countBits.length > 0 ? (
                                  <span className="text-[11px] uppercase tracking-[0.24em] text-[#656B73]/85">
                                    {countBits.join(" · ")}
                                  </span>
                                ) : (
                                  <span className="text-[11px] uppercase tracking-[0.24em] text-[#656B73]/75">
                                    Bespoke Curated Ensemble
                                  </span>
                                )}

                                <Link
                                  to={getCollectionHref(col)}
                                  className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] font-medium text-[#232528] hover:text-[#5E93B8] transition-colors"
                                >
                                  <span>{col.cta_text || "Explore Collection"}</span>
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Sculptural Architectural Aperture Stage */}
              {active && (
                <div className="lg:col-span-6 lg:sticky lg:top-28">
                  <div className="relative">
                    {/* Offset architectural hairline outline */}
                    <div
                      aria-hidden
                      className="hidden sm:block pointer-events-none absolute -inset-3 translate-x-2 translate-y-2 rounded-tl-[88px] rounded-tr-[20px] rounded-br-[88px] rounded-bl-[20px] border border-[#232528]/10"
                    />

                    <Link
                      to={getCollectionHref(active)}
                      className="group block relative overflow-hidden rounded-tl-[64px] sm:rounded-tl-[84px] rounded-tr-[18px] rounded-br-[64px] sm:rounded-br-[84px] rounded-bl-[18px] bg-[#F1EFEA] aspect-[4/5] max-h-[76vh] w-full shadow-[0_28px_72px_-34px_rgba(35,37,40,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E93B8]"
                    >
                      <div
                        ref={apertureImgRef}
                        className="relative h-full w-full overflow-hidden will-change-[clip-path]"
                      >
                        <div data-aperture-zoom className="h-full w-full will-change-transform">
                          <img
                            src={getCoverImage(active, activeIdx)}
                            alt={active.name}
                            loading="eager"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                          />
                        </div>
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(to top, rgba(28,30,33,0.72) 0%, rgba(28,30,33,0.12) 44%, transparent 72%)",
                          }}
                        />
                      </div>

                      {/* Top index pill */}
                      <div className="absolute top-6 right-6 rounded-full bg-white/92 backdrop-blur-md px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.26em] text-[#232528] shadow-sm">
                        {String(activeIdx + 1).padStart(2, "0")} /{" "}
                        {String(displayList.length).padStart(2, "0")}
                      </div>

                      {/* Bottom editorial glass caption */}
                      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.32em] text-[#E6DFD3] mb-1.5">
                            LIVORA Collection
                          </p>
                          <h3 className="serif text-3xl sm:text-4xl font-light text-white leading-none">
                            {active.name}
                          </h3>
                          {(active.short_description || active.description) && (
                            <p className="lg:hidden mt-2.5 text-xs sm:text-sm font-light text-white/85 line-clamp-2 max-w-[38ch]">
                              {active.short_description || active.description}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 h-11 w-11 rounded-full bg-white text-[#232528] flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:bg-[#5E93B8] group-hover:text-white">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </div>
                    </Link>
                  </div>

                  {/* Mobile direct CTA below aperture */}
                  <div className="lg:hidden mt-5 flex items-center justify-between gap-4 px-1">
                    <span className="text-[11px] uppercase tracking-[0.22em] text-[#656B73]">
                      {active.items_count ? `${active.items_count} Curated Pieces` : "Curated Ensemble"}
                    </span>
                    <Link
                      to={getCollectionHref(active)}
                      className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.22em] font-medium text-[#232528]"
                    >
                      Explore Collection <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
