import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import cloud4 from "@/assets/cloud/cloud4.png";
import cloud2 from "@/assets/cloud/cloud2.png";
import cloud3 from "@/assets/cloud/cloud3.png";
import skyToHouse from "@/assets/hero-update.png";
import cloud1 from "@/assets/cloud/cloud1.png";
import cloud5 from "@/assets/cloud/cloud5.png";
import cloud6 from "@/assets/cloud/cloud6.png";

type CloudItem = {
  id: number;
  src: string;
  name: string;
  layer: "drift-front" | "drift-mid" | "drift-back";
  left: string;
  top: string;
  width: string;
  opacity: number;
  zIndex: number;
  imageTransform?: string;
};

const CLOUDS: CloudItem[] = [
  /**
   * 1. cloud5
   * Long bright cloud on the LEFT side.
   * This is the most visible left foreground cloud.
   */
  {
    id: 1,
    src: cloud5,
    name: "left-main-bright",
    layer: "drift-front",
    left: "13.8%",
    top: "29.5%",
    width: "32vw",
    opacity: 0.96,
    zIndex: 12,
    imageTransform: "rotate(-8deg)",
  },

  /**
   * 2. cloud6
   * Thin/faint cloud in the UPPER MID area, pushed to the back.
   * This should feel like a background cloud, not a focal one.
   */
  {
    id: 2,
    src: cloud6,
    name: "upper-mid-thin-back",
    layer: "drift-back",
    left: "46.8%",
    top: "14.2%",
    width: "14vw",
    opacity: 0.28,
    zIndex: 5,
    imageTransform: "rotate(10deg) scaleY(0.92)",
  },

  /**
   * 3. cloud4
   * Soft cloud in the CENTER area, behind the title.
   * Keep it subtle and not too heavy.
   */
  {
    id: 3,
    src: cloud4,
    name: "center-soft-back",
    layer: "drift-back",
    left: "43.5%",
    top: "39.5%",
    width: "23vw",
    opacity: 0.36,
    zIndex: 6,
    imageTransform: "rotate(8deg)",
  },

  /**
   * 4. cloud1
   * Main bright cloud at TOP RIGHT.
   * This one is closer to the sunlight, so it needs to look stronger/brighter.
   */
  {
    id: 4,
    src: cloud1,
    name: "top-right-bright-main",
    layer: "drift-front",
    left: "82.5%",
    top: "16.8%",
    width: "26vw",
    opacity: 0.98,
    zIndex: 13,
    imageTransform: "rotate(-10deg)",
  },

  /**
   * 5. cloud2
   * Mid-right cloud, thinner than the top-right one.
   * It sits behind/around the title area but should not overpower.
   */
  {
    id: 5,
    src: cloud2,
    name: "right-mid-thin",
    layer: "drift-mid",
    left: "64.5%",
    top: "36.5%",
    width: "20vw",
    opacity: 0.62,
    zIndex: 8,
    imageTransform: "rotate(-15deg) scaleY(0.88)",
  },

  /**
   * 6. cloud3
   * Small faint cloud on the upper-left / upper-mid region.
   * This is a BACK cloud and should stay subtle.
   */
  {
    id: 6,
    src: cloud3,
    name: "upper-left-small-back",
    layer: "drift-back",
    left: "27.8%",
    top: "24.0%",
    width: "13vw",
    opacity: 0.24,
    zIndex: 4,
    imageTransform: "rotate(5deg)",
  },
];

/**
 * Cinematic hero:
 * 1. Livora title over a blue sky framed by clouds
 * 2. On scroll the clouds part, the title leaves, and the sky pans down to the house
 * 3. Copy fades in over the house
 */
export const SkyScene = ({ ready = true }: { ready?: boolean }) => {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .fromTo(
          ".hero-letter",
          { yPercent: 115, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1.2,
            stagger: 0.07,
            ease: "power4.out",
          }
        )
        .fromTo(
          ".hero-sub, .hero-scroll",
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.1,
            ease: "power3.out",
          },
          "-=0.5"
        );

      // Super subtle idle movement so the initial composition remains close
      gsap.to(".drift-front", {
        xPercent: 0.8,
        yPercent: -0.35,
        duration: 12,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".drift-mid", {
        xPercent: -0.55,
        yPercent: 0.25,
        duration: 15,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".drift-back", {
        xPercent: 0.35,
        yPercent: -0.18,
        duration: 18,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }, root);

    return () => ctx.revert();
  }, [ready]);

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

      // Clouds move away
      tl.to(".cloud-1", { xPercent: -92, yPercent: -28, opacity: 0, ease: "power2.in" }, 0)
        .to(".cloud-2", { xPercent: 10, yPercent: -50, opacity: 0, ease: "power2.in" }, 0.02)
        .to(".cloud-3", { xPercent: -8, yPercent: 18, opacity: 0, ease: "power2.in" }, 0.04)
        .to(".cloud-4", { xPercent: 72, yPercent: -30, opacity: 0, ease: "power2.in" }, 0)
        .to(".cloud-5", { xPercent: 44, yPercent: -14, opacity: 0, ease: "power2.in" }, 0.03)
        .to(".cloud-6", { xPercent: -28, yPercent: -10, opacity: 0, ease: "power2.in" }, 0.02)

        // Title leaves
        .to(
          ".hero-title",
          {
            yPercent: -60,
            scale: 1.35,
            opacity: 0,
            filter: "blur(6px)",
            ease: "power2.in",
          },
          0
        )
        .to(".hero-scroll", { opacity: 0, y: -30, ease: "power2.in" }, 0)

        // Sky to house pan
        .fromTo(
          ".scene-img",
          { backgroundPosition: "50% 0%" },
          { backgroundPosition: "50% 100%", ease: "none", duration: 1.6 },
          0
        )

        // House overlay content
        .fromTo(
          ".house-overlay",
          { opacity: 0 },
          { opacity: 1, duration: 0.5, ease: "power2.out" },
          1.3
        )
        .fromTo(
          ".interior-line",
          { yPercent: 110, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            stagger: 0.12,
            ease: "power3.out",
            duration: 0.7,
          },
          1.4
        )
        .fromTo(
          ".interior-body",
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.6 },
          1.9
        );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section id="top" ref={root} className="relative h-[380vh]">
      <div className="sticky top-0 h-screen overflow-hidden bg-[#8CC0E8]">
        {/* Continuous sky -> house image */}
        <div className="absolute inset-0 will-change-transform">
          <div
            className="scene-img absolute inset-0"
            style={{
              backgroundImage: `url(${skyToHouse})`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "50% 0%",
            }}
          />
        </div>

        {/* Clouds */}
        <div className="pointer-events-none absolute inset-0 z-[8] overflow-hidden">
          {CLOUDS.map((cloud) => (
            <div
              key={cloud.id}
              className={`cloud-${cloud.id} absolute`}
              style={{
                left: cloud.left,
                top: cloud.top,
                width: cloud.width,
                zIndex: cloud.zIndex,
              }}
            >
              {/* anchor by center */}
              <div className="-translate-x-1/2 -translate-y-1/2">
                <div className={cloud.layer}>
                  <img
                    src={cloud.src}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="block h-auto w-full max-w-none select-none"
                    style={{
                      opacity: cloud.opacity,
                      transform: cloud.imageTransform,
                      transformOrigin: "center center",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Title */}
        <div className="hero-title absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
          <h1 className="serif flex overflow-hidden text-[22vw] font-light leading-[0.85] text-background sm:text-[14vw]">
            {"Livora".split("").map((c, i) => (
              <span key={i} className="hero-letter block" style={{ textShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
                {c}
              </span>
            ))}
          </h1>

          <p className="hero-sub mt-6 text-[11px] uppercase tracking-[0.45em] text-background/85">
            Interior Design &amp; Furniture
          </p>
        </div>

        <div className="hero-scroll absolute bottom-10 left-1/2 z-20 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-background/75">
          Scroll
        </div>

        {/* Copy over house image */}
        <div className="house-overlay absolute inset-0 z-30 opacity-0">
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/45 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="container-livora">
              <span className="interior-line block text-[11px] uppercase tracking-[0.4em] text-background/70">
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