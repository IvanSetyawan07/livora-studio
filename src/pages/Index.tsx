import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { isPreloaderDone, PRELOADER_READY_EVENT } from "@/components/livora/HeroPreloader";
import { scrollToTarget } from "@/components/SmoothScroll";
import { scheduleScrollTriggerRefresh } from "@/lib/motionTokens";
import { Navbar } from "@/components/livora/Navbar";
import { SkyScene } from "@/components/livora/SkyScene";
import { Projects } from "@/components/livora/Projects";
import { FeaturedCollections } from "@/components/livora/FeaturedCollections";
import { Furniture } from "@/components/livora/Furniture";
import { OurStyle } from "@/components/livora/OurStyle";
import { Scope } from "@/components/livora/Scope";
import { Contact } from "@/components/livora/Contact";
import { AppointmentPortal } from "@/components/livora/AppointmentPortal";
import { Footer } from "@/components/livora/Footer";
import { PromoFloatingModal } from "@/components/livora/PromoFloatingModal";

const Index = () => {
  const location = useLocation();
  const [ready, setReady] = useState(() => isPreloaderDone());
  const progressTextRef = useRef<HTMLSpanElement | null>(null);
  const progressFillRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (ready) return;
    const onReady = () => setReady(true);
    window.addEventListener(PRELOADER_READY_EVENT, onReady);
    return () => window.removeEventListener(PRELOADER_READY_EVENT, onReady);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    if (location.hash) {
      const id = location.hash.slice(1);
      const t = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) scrollToTarget(el, { offset: -80 });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [location.hash, location.key, ready]);

  // Whisper-thin zero-rerender scroll progress counter (cached maxScroll — zero scrollHeight thrash)
  useEffect(() => {
    let raf = 0;
    let maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    const measure = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (!raf) raf = requestAnimationFrame(update);
    };

    const update = () => {
      raf = 0;
      const pct = Math.max(0, Math.min(100, Math.round((window.scrollY / maxScroll) * 100)));
      if (progressTextRef.current) {
        progressTextRef.current.textContent = String(pct).padStart(2, "0");
      }
      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleY(${pct / 100})`;
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        measure();
        scheduleScrollTriggerRefresh(220);
      });
      ro.observe(document.documentElement);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    document.title = "LIVORA | Arsitek & Desain Interior Jakarta · Custom Furniture";
    const meta = document.querySelector('meta[name="description"]') ?? (() => {
      const m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute("content", "LIVORA (Livora LCR) — studio arsitek, desain interior & custom furniture di Jakarta untuk rumah, apartemen, villa, kantor dan ruang komersial. Konsultasi gratis.");
  }, []);

  return (
    <>
      <Navbar />
      <PromoFloatingModal ready={ready} />

      {/* Whisper-thin bright frosted scroll progress indicator (desktop wide only) */}
      <aside
        aria-hidden
        className="hidden 2xl:flex fixed left-5 bottom-8 z-30 pointer-events-none flex-col items-center gap-2 rounded-full bg-white/88 backdrop-blur-md border border-[#232528]/12 px-2 py-3 text-[#232528] shadow-[0_10px_30px_rgba(35,37,40,0.1)]"
      >
        <span
          ref={progressTextRef}
          className="text-[10px] font-medium tracking-[0.18em] tabular-nums text-[#656B73]"
        >
          00
        </span>
        <span className="relative block w-px h-10 bg-[#232528]/15 overflow-hidden">
          <span
            ref={progressFillRef}
            className="block w-full h-full bg-[#5E93B8] origin-top"
            style={{ transform: "scaleY(0)" }}
          />
        </span>
      </aside>

      <main className="bg-[#FAF8F4]">
        {/* 1. Hero Sky-to-House Scene (100% Untouched) */}
        <SkyScene ready={ready} />

        {/* 2. Projects — Rising Arch Bridge + Split-Image Converging Stitch + Editorial Spread */}
        <Projects />

        {/* 3. Featured Collections — Interactive Lookbook Aperture */}
        <FeaturedCollections />

        {/* 4. Furniture — New Arrival Museum Pedestal + 4 Selected Pieces */}
        <Furniture />

        {/* 5. Our Style — 5-Column Expanding Architectural Pillars (Daylight Gallery) */}
        <OurStyle />

        {/* 6. Scope of Work — Full-Scale 40/60 Sunlit Daylight Curtain Stack */}
        <Scope />

        {/* 7. Contact & Showroom */}
        <Contact />

        {/* 8. Split-Door Architectural Appointment Portal — Ready to Realize Your Dream Space */}
        <AppointmentPortal />
      </main>
      <Footer />
    </>
  );
};

export default Index;
