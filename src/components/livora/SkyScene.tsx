import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import cloud1 from "@/assets/cloud-1.png.asset.json";
import cloud2 from "@/assets/cloud-2.png.asset.json";
import cloud3 from "@/assets/cloud-3.png.asset.json";
import skyToHouse from "@/assets/sky-to-house.png.asset.json";
import room from "@/assets/livora-hero.jpg";

/**
 * Cinematic hero:
 * 1. Livora title over a blue sky framed by clouds
 * 2. On scroll the clouds part, the title leaves, and the sky pans down to the house
 * 3. The camera pushes through the doorway into the interior
 * 4. Interior copy: PT. Langgeng Cipta Ruang / Imagine. Create. Realize.
 */
export const SkyScene = ({ ready = true }: { ready?: boolean }) => {
  const root = useRef<HTMLDivElement>(null);

  // Intro reveal once the loader is gone
  useEffect(() => {
    if (!ready) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .fromTo(
          ".hero-letter",
          { yPercent: 115, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 1.2, stagger: 0.07, ease: "power4.out" },
        )
        .fromTo(
          ".hero-sub, .hero-scroll",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" },
          "-=0.5",
        );

      gsap.to(".drift-a", {
        xPercent: 6,
        yPercent: -3,
        duration: 9,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
      gsap.to(".drift-b", {
        xPercent: -6,
        yPercent: 4,
        duration: 11,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }, root);
    return () => ctx.revert();
  }, [ready]);

  // Scroll-driven scene
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.05,
          invalidateOnRefresh: true,
        },
      });

      // 1. Clouds part, title leaves
      tl.to(".cloud-tl", { xPercent: -95, yPercent: -55, opacity: 0, ease: "power2.in" }, 0)
        .to(".cloud-tr", { xPercent: 105, yPercent: -45, opacity: 0, ease: "power2.in" }, 0)
        .to(".cloud-bl", { xPercent: -120, opacity: 0, ease: "power2.in" }, 0.02)
        .to(".cloud-br", { xPercent: 120, yPercent: 20, opacity: 0, ease: "power2.in" }, 0.02)
        .to(".cloud-blue", { yPercent: 70, opacity: 0, ease: "power2.in" }, 0.02)
        .to(
          ".hero-title",
          { yPercent: -60, scale: 1.35, opacity: 0, filter: "blur(6px)", ease: "power2.in" },
          0,
        )
        .to(".hero-scroll", { opacity: 0, y: -30, ease: "power2.in" }, 0)

        // 2. One continuous image pans from sky down to the house
        .fromTo(
          ".scene-img",
          { backgroundPosition: "50% 0%" },
          { backgroundPosition: "50% 100%", ease: "none", duration: 1.6 },
          0,
        )
        .fromTo(".house-caption", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4 }, 1.25)
        .to(".house-caption", { opacity: 0, y: -30, duration: 0.3 }, 1.6)

        // 3. Zoom through the doorway
        .to(".scene-zoom", { scale: 6.5, ease: "power2.in", duration: 1.1 }, 1.6)
        .to(".scene-zoom", { opacity: 0, duration: 0.35 }, 2.05)

        // 4. Interior
        .fromTo(
          ".interior",
          { opacity: 0, scale: 1.28 },
          { opacity: 1, scale: 1, ease: "power2.out", duration: 0.8 },
          2.05,
        )
        .fromTo(
          ".interior-line",
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, stagger: 0.12, ease: "power3.out", duration: 0.7 },
          2.55,
        )
        .fromTo(".interior-body", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6 }, 3);
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section id="top" ref={root} className="relative h-[520vh]">
      <div className="sticky top-0 h-screen overflow-hidden bg-[#8CC0E8]">
        {/* Continuous sky → house image */}
        <div className="scene-zoom absolute inset-0 will-change-transform">
          <div
            className="scene-img absolute inset-0"
            style={{
              backgroundImage: `url(${skyToHouse.url})`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "50% 0%",
            }}
          />
        </div>

        {/* Clouds */}
        <img
          src={cloud1.url}
          alt=""
          aria-hidden
          className="cloud-tl drift-a pointer-events-none absolute -top-[8vh] -left-[12vw] w-[62vw] max-w-none opacity-95"
        />
        <img
          src={cloud3.url}
          alt=""
          aria-hidden
          className="cloud-tr drift-b pointer-events-none absolute -top-[12vh] -right-[14vw] w-[58vw] max-w-none scale-x-[-1] opacity-90"
        />
        <img
          src={cloud2.url}
          alt=""
          aria-hidden
          className="cloud-bl drift-b pointer-events-none absolute bottom-[4vh] -left-[20vw] w-[70vw] max-w-none opacity-70"
        />
        <img
          src={cloud1.url}
          alt=""
          aria-hidden
          className="cloud-br drift-a pointer-events-none absolute bottom-[-8vh] -right-[18vw] w-[64vw] max-w-none opacity-60"
        />
        <div
          className="cloud-blue pointer-events-none absolute right-[-10vw] bottom-[-10vh] h-[55vh] w-[70vw] rounded-full opacity-70 blur-[60px]"
          style={{ background: "radial-gradient(circle, rgba(120,170,215,0.75), transparent 70%)" }}
        />

        {/* Title */}
        <div className="hero-title absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
          <h1 className="serif flex overflow-hidden text-[22vw] font-light leading-[0.85] text-background sm:text-[14vw]">
            {"Livora".split("").map((c, i) => (
              <span key={i} className="hero-letter block">
                {c}
              </span>
            ))}
          </h1>
          <p className="hero-sub mt-6 text-[11px] uppercase tracking-[0.45em] text-background/85">
            Interior Design &amp; Furniture
          </p>
        </div>

        <div className="hero-scroll absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-background/75">
          Scroll
        </div>

        <div className="house-caption absolute bottom-14 left-1/2 z-30 -translate-x-1/2 text-center text-background opacity-0">
          <span className="text-[11px] uppercase tracking-[0.4em]">Step inside</span>
        </div>

        {/* Interior */}
        <div className="interior absolute inset-0 z-40 opacity-0">
          <img
            src={room}
            alt="Warm modern living room furnished by Livora"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/45 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="container-livora">
              <span className="interior-body block text-[11px] uppercase tracking-[0.4em] text-background/70 opacity-0">
                PT. Langgeng Cipta Ruang
              </span>
              <div className="mt-6">
                {["Imagine.", "Create.", "Realize."].map((w) => (
                  <span key={w} className="block overflow-hidden">
                    <span className="interior-line serif block text-[13vw] font-light leading-[1] text-background sm:text-[5.2vw]">
                      {w}
                    </span>
                  </span>
                ))}
              </div>
              <p className="interior-body mt-8 max-w-md text-sm font-light leading-relaxed text-background/80 opacity-0 sm:text-base">
                Create your dream space with us — a single point of contact for design, supply and
                construction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkyScene;
