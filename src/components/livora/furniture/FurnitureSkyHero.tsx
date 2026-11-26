import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motionTokens";
import heroSky from "@/assets/hero-update.webp";
import heroSkySm from "@/assets/_opt/hero-update-800.webp";
import cloud1 from "@/assets/cloud/cloud1.webp";
import cloud2 from "@/assets/cloud/cloud2.webp";
import cloud5 from "@/assets/cloud/cloud5.webp";

interface FurnitureSkyHeroProps {
  activeCategoryLabel?: string | null;
  totalCount?: number;
  onScrollToCatalog?: () => void;
}

/**
 * Atmospheric Sky-to-Stone Editorial Hero untuk halaman /furniture.
 * Melanjutkan atmosfer langit golden-hour landing page livoralcr.com
 * dan melebur mulus ke kanvas galeri #F8F9FB di bawahnya.
 */
export const FurnitureSkyHero: React.FC<FurnitureSkyHeroProps> = ({
  activeCategoryLabel,
  onScrollToCatalog,
}) => {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const hero = heroRef.current;
    if (!hero) return;

    let cloudA: gsap.core.Tween | null = null;
    let cloudB: gsap.core.Tween | null = null;

    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .fromTo(
          ".fhero-eyebrow",
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
        )
        .fromTo(
          ".fhero-title",
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
          "-=0.45",
        )
        .fromTo(
          ".fhero-sub, .fhero-scroll",
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "power3.out" },
          "-=0.55",
        );

      cloudA = gsap.to(".fhero-cloud-a", {
        xPercent: 2.2,
        yPercent: -1.2,
        duration: 15,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      cloudB = gsap.to(".fhero-cloud-b", {
        xPercent: -2.0,
        yPercent: 1.0,
        duration: 18,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }, hero);

    // Pause infinite cloud drift when scrolled off-screen to preserve GPU budget for catalog grid
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            cloudA?.resume();
            cloudB?.resume();
          } else {
            cloudA?.pause();
            cloudB?.pause();
          }
        },
        { threshold: 0.01 },
      );
      observer.observe(hero);
    }

    return () => {
      observer?.disconnect();
      ctx.revert();
    };
  }, []);

  const isCategoryView = Boolean(
    activeCategoryLabel && activeCategoryLabel.toLowerCase() !== "all",
  );
  const headingTitle = isCategoryView
    ? `${activeCategoryLabel} Collection`
    : "Livora Furniture";

  return (
    <section
      ref={heroRef}
      className={`relative w-full flex flex-col justify-between overflow-hidden select-none bg-[#1B6EB1] ${
        isCategoryView
          ? "min-h-[30vh] sm:min-h-[34vh] md:min-h-[36vh]"
          : "min-h-[48vh] sm:min-h-[52vh] md:min-h-[54vh]"
      }`}
    >
      {/* 1. Atmospheric Golden-Hour Sky Base (reusing homepage sky asset + Livora cerulean gradient) */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <img
          src={heroSky}
          srcSet={`${heroSkySm} 800w, ${heroSky} 1920w`}
          sizes="100vw"
          alt=""
          className="absolute inset-0 w-full h-[145%] object-cover object-top opacity-70 scale-105"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(11,66,110,0.52) 0%, rgba(30,136,199,0.42) 32%, rgba(132,188,226,0.42) 60%, rgba(234,244,250,0.72) 82%, #F8F9FB 100%)",
          }}
        />
        {/* Warm sunlit golden-hour horizontal haze */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 42% at 50% 54%, rgba(255,243,221,0.45) 0%, rgba(223,197,164,0.18) 48%, transparent 76%)",
          }}
        />

        {/* Genuine Homepage Drifting Clouds */}
        <img
          src={cloud5}
          alt=""
          className="fhero-cloud-a absolute -left-[6%] top-[24%] w-[44vw] max-w-[540px] opacity-65 mix-blend-screen will-change-transform"
        />
        <img
          src={cloud1}
          alt=""
          className="fhero-cloud-b absolute -right-[5%] top-[10%] w-[38vw] max-w-[480px] opacity-60 mix-blend-screen will-change-transform"
        />
        <img
          src={cloud2}
          alt=""
          className="fhero-cloud-a absolute left-[38%] top-[34%] w-[30vw] max-w-[380px] opacity-30 mix-blend-screen will-change-transform"
        />

        {/* Signature Diagonal Sunlit Travertine/Sandstone Architectural Corner Accent (bottom-right) */}
        <div
          className="absolute right-0 bottom-0 w-[44vw] max-w-[540px] h-[36%] opacity-90"
          style={{
            clipPath: "polygon(100% 8%, 100% 100%, 12% 100%)",
            background:
              "linear-gradient(148deg, #DFC5A4 0%, #EBD9C1 42%, #F5EEE3 74%, #F8F9FB 100%)",
          }}
        />
        <div
          className="absolute right-0 bottom-0 w-[44vw] max-w-[540px] h-[36%] opacity-50"
          style={{
            clipPath: "polygon(100% 8%, 100% 16%, 22% 100%, 12% 100%)",
            background: "linear-gradient(135deg, rgba(255,255,255,0.75), rgba(223,197,164,0.15))",
          }}
        />

        {/* Smooth Sky-to-Canvas Dissolve into #F8F9FB */}
        <div
          className="absolute inset-x-0 bottom-0 h-32 sm:h-40"
          style={{
            background:
              "linear-gradient(180deg, rgba(248,249,251,0) 0%, rgba(248,249,251,0.58) 52%, rgba(248,249,251,0.94) 84%, #F8F9FB 100%)",
          }}
        />
      </div>

      {/* Top spacer to clear transparent fixed Navbar */}
      <div className={isCategoryView ? "h-20 sm:h-24 shrink-0" : "h-24 sm:h-28 shrink-0"} />

      {/* Center Editorial Content */}
      <div
        className={`relative z-10 container-livora text-center max-w-4xl ${
          isCategoryView ? "py-4 sm:py-6" : "py-6 sm:py-10"
        }`}
      >
        <p
          className="fhero-eyebrow text-[10px] sm:text-[11px] uppercase tracking-[0.38em] text-white/95 font-medium mb-3 sm:mb-4"
          style={{ textShadow: "0 1px 10px rgba(11,66,110,0.35)" }}
        >
          Interior Design &amp; Furniture
        </p>

        <h1
          className={`fhero-title serif font-light text-white leading-[1.03] tracking-[-0.015em] text-balance ${
            isCategoryView
              ? "text-[36px] sm:text-[48px] md:text-[58px]"
              : "text-[42px] sm:text-[60px] md:text-[74px]"
          }`}
          style={{ textShadow: "0 4px 26px rgba(11,66,110,0.28)" }}
        >
          {headingTitle}
        </h1>

        <p
          className="fhero-sub mt-3 sm:mt-3.5 text-[11px] sm:text-xs uppercase tracking-[0.26em] text-white/90 font-normal"
          style={{ textShadow: "0 1px 10px rgba(11,66,110,0.30)" }}
        >
          Architectural Forms for Timeless Living
        </p>

        {!isCategoryView && (
          <p className="fhero-sub mt-3 text-[13px] sm:text-sm text-[#0B426E]/80 font-normal max-w-lg mx-auto leading-relaxed hidden sm:block">
            Kurasi furnitur arsitektural dan pengerjaan bespoke berpresisi tinggi untuk ruang hunian serta komersial.
          </p>
        )}
      </div>

      {/* Scroll Indicator melting into #F8F9FB */}
      {isCategoryView ? (
        <div className="h-4 sm:h-6 shrink-0" />
      ) : (
        <div className="fhero-scroll relative z-10 pb-6 sm:pb-8 flex justify-center">
          <button
            type="button"
            onClick={onScrollToCatalog}
            className="group inline-flex flex-col items-center gap-2 text-[9px] uppercase tracking-[0.35em] text-[#0B426E]/70 hover:text-[#0B426E] transition-colors focus:outline-none"
            aria-label="Gulir ke koleksi furnitur"
          >
            <span>Scroll</span>
            <span className="relative w-px h-7 bg-[#0B426E]/20 overflow-hidden">
              <span className="absolute inset-x-0 top-0 h-3 bg-[#1E88C7] scroll-dot" />
            </span>
          </button>
        </div>
      )}
    </section>
  );
};
