import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import cloud4 from "@/assets/cloud/cloud4.webp";
import cloud2 from "@/assets/cloud/cloud2.webp";
import cloud3 from "@/assets/cloud/cloud3.webp";
import skyToHouse from "@/assets/hero-update.webp";
import cloud1 from "@/assets/cloud/cloud1.webp";
import cloud5 from "@/assets/cloud/cloud5.webp";
import cloud6 from "@/assets/cloud/cloud6.webp";
import skyToHouseSm from "@/assets/_opt/hero-update-800.webp";
import cloud1Sm from "@/assets/_opt/cloud1-560.webp";
import cloud2Sm from "@/assets/_opt/cloud2-560.webp";
import cloud3Sm from "@/assets/_opt/cloud3-560.webp";
import cloud4Sm from "@/assets/_opt/cloud4-560.webp";
import cloud5Sm from "@/assets/_opt/cloud5-560.webp";
import cloud6Sm from "@/assets/_opt/cloud6-560.webp";

type CloudItem = {
  id: number;
  src: string;
  sm: string;
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
  {
    id: 1,
    src: cloud5,
    sm: cloud5Sm,
    name: "left-main-bright",
    layer: "drift-front",
    left: "13.8%",
    top: "29.5%",
    width: "32vw",
    opacity: 0.96,
    zIndex: 12,
    imageTransform: "rotate(-8deg)",
  },
  {
    id: 2,
    src: cloud6,
    sm: cloud6Sm,
    name: "upper-mid-thin-back",
    layer: "drift-back",
    left: "46.8%",
    top: "14.2%",
    width: "14vw",
    opacity: 0.28,
    zIndex: 5,
    imageTransform: "rotate(10deg) scaleY(0.92)",
  },
  {
    id: 3,
    src: cloud4,
    sm: cloud4Sm,
    name: "center-soft-back",
    layer: "drift-back",
    left: "43.5%",
    top: "39.5%",
    width: "23vw",
    opacity: 0.36,
    zIndex: 6,
    imageTransform: "rotate(8deg)",
  },
  {
    id: 4,
    src: cloud1,
    sm: cloud1Sm,
    name: "top-right-bright-main",
    layer: "drift-front",
    left: "82.5%",
    top: "16.8%",
    width: "26vw",
    opacity: 0.98,
    zIndex: 13,
    imageTransform: "rotate(-10deg)",
  },
  {
    id: 5,
    src: cloud2,
    sm: cloud2Sm,
    name: "right-mid-thin",
    layer: "drift-mid",
    left: "64.5%",
    top: "36.5%",
    width: "20vw",
    opacity: 0.62,
    zIndex: 8,
    imageTransform: "rotate(-15deg) scaleY(0.88)",
  },
  {
    id: 6,
    src: cloud3,
    sm: cloud3Sm,
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

export const SkyScene = ({ ready = true }: { ready?: boolean }) => {
  const root = useRef<HTMLDivElement>(null);
  const heroImgRef = useRef<HTMLImageElement>(null);
  const [assetsReady, setAssetsReady] = useState(false);

  // ── Tunggu gambar utama DOM selesai dimuat sebelum ScrollTrigger dibuat (tanpa unduhan ganda) ──
  useEffect(() => {
    const img = heroImgRef.current;
    if (!img || img.complete) {
      setAssetsReady(true);
      return;
    }
    const done = () => setAssetsReady(true);
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    return () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
    };
  }, []);

  // ── Entrance: "Livora" letters + subtitle ──
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!ready) {
        gsap.set(".hero-letter", { yPercent: 115, opacity: 0 });
        gsap.set(".hero-sub, .hero-scroll", { opacity: 0, y: 20 });
        return;
      }

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

      const driftFront = gsap.to(".drift-front", {
        xPercent: 0.8,
        yPercent: -0.35,
        duration: 12,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      const driftMid = gsap.to(".drift-mid", {
        xPercent: -0.55,
        yPercent: 0.25,
        duration: 15,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      const driftBack = gsap.to(".drift-back", {
        xPercent: 0.35,
        yPercent: -0.18,
        duration: 18,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      // Pause infinite cloud drift when SkyScene is scrolled completely out of view
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onLeave: () => {
          driftFront.pause();
          driftMid.pause();
          driftBack.pause();
        },
        onEnterBack: () => {
          driftFront.play();
          driftMid.play();
          driftBack.play();
        },
      });
    }, root);

    return () => ctx.revert();
  }, [ready]);

  // ── Scroll-scrubbed cinematic timeline ──
  useEffect(() => {
    if (!assetsReady) return;

    gsap.registerPlugin(ScrollTrigger);

    // Abaikan resize palsu dari address bar mobile saat scroll
    ScrollTrigger.config({ ignoreMobileResize: true });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      // Jangan skip total — tetap tampilkan konten akhir tanpa animasi,
      // supaya user dengan macOS Reduce Motion tetap bisa lihat
      // "Imagine. Create. Realize." dan bukan layar kosong/statis di awal.
      gsap.set(".cloud-1, .cloud-2, .cloud-3, .cloud-4, .cloud-5, .cloud-6", { opacity: 0 });
      gsap.set(".hero-title, .hero-scroll", { opacity: 0 });
      gsap.set(".scene-img", { yPercent: -50 });
      gsap.set(".house-overlay", { opacity: 1 });
      gsap.set(".interior-line", { opacity: 1, yPercent: 0 });
      gsap.set(".interior-body", { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.05,
        },
      });

      tl.to(".cloud-1", { xPercent: -92, yPercent: -28, opacity: 0, ease: "power2.in" }, 0)
        .to(".cloud-2", { xPercent: 10, yPercent: -50, opacity: 0, ease: "power2.in" }, 0.02)
        .to(".cloud-3", { xPercent: -8, yPercent: 18, opacity: 0, ease: "power2.in" }, 0.04)
        .to(".cloud-4", { xPercent: 72, yPercent: -30, opacity: 0, ease: "power2.in" }, 0)
        .to(".cloud-5", { xPercent: 44, yPercent: -14, opacity: 0, ease: "power2.in" }, 0.03)
        .to(".cloud-6", { xPercent: -28, yPercent: -10, opacity: 0, ease: "power2.in" }, 0.02)
        .to(
          ".hero-title",
          {
            yPercent: -60,
            scaleX: 1.35,
            scaleY: 1.35,
            opacity: 0,
            ease: "power2.in",
          },
          0
        )
        .to(".hero-scroll", { opacity: 0, y: -30, ease: "power2.in" }, 0)
        .fromTo(
          ".scene-img",
          { yPercent: 0 },
          { yPercent: -50, ease: "none", duration: 1.6 },
          0
        )
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

    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => ctx.revert();
  }, [assetsReady]);

  // ── Typewriter tidak ada di file ini (itu ada di Hero.tsx yang lain) ──

  return (
    <section id="top" ref={root} className="relative h-[260vh] md:h-[380vh]">
      <div className="sticky top-0 h-[100svh] md:h-screen overflow-hidden bg-[#8CC0E8]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="scene-img absolute left-0 top-0 h-[200%] w-full will-change-transform">
            <img
              ref={heroImgRef}
              src={skyToHouse}
              srcSet={`${skyToHouseSm} 800w, ${skyToHouse} 1448w`}
              sizes="100vw"
              alt=""
              aria-hidden
              draggable={false}
              fetchPriority="high"
              loading="eager"
              decoding="sync"
              width={1448}
              height={1086}
              className="h-full w-full select-none object-cover"
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-[8] overflow-hidden">
          {CLOUDS.map((cloud) => (
            <div
              key={cloud.id}
              className={`cloud-${cloud.id} absolute will-change-transform`}
              style={{
                left: cloud.left,
                top: cloud.top,
                width: cloud.width,
                zIndex: cloud.zIndex,
              }}
            >
              <div className="-translate-x-1/2 -translate-y-1/2">
                <div className={`${cloud.layer} will-change-transform`}>
                  <img
                    src={cloud.src}
                    srcSet={`${cloud.sm} 560w, ${cloud.src} 1254w`}
                    sizes="(max-width: 640px) 36vw, 32vw"
                    alt=""
                    aria-hidden
                    draggable={false}
                    decoding="async"
                    width={1254}
                    height={1254}
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

        <div className="hero-title absolute inset-0 z-20 flex flex-col items-center justify-center px-6 will-change-transform">
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

        <div className="house-overlay absolute inset-0 z-30 opacity-0">
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/45 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="container-livora">
              <span className="interior-line block text-xs sm:text-sm md:text-[20px] uppercase tracking-[0.26em] sm:tracking-[0.4em] text-background/75">
                PT. Langgeng Cipta Ruang
              </span>

              <div className="mt-4 sm:mt-6">
                {["Imagine.", "Create.", "Realize."].map((w) => (
                  <span key={w} className="block overflow-hidden">
                    <span className="interior-line serif block text-[12vw] font-light leading-[1] text-background sm:text-[5.2vw]">
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