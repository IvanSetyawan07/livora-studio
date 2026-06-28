import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Loader } from "@/components/livora/Loader";
import { Navbar } from "@/components/livora/Navbar";
import { Hero } from "@/components/livora/Hero";
import { Style } from "@/components/livora/Style";
import { Scope } from "@/components/livora/Scope";
import { Projects } from "@/components/livora/Projects";
import { Furniture } from "@/components/livora/Furniture";
import { Contact } from "@/components/livora/Contact";
import { Footer } from "@/components/livora/Footer";
import { useReveal } from "@/hooks/useReveal";
import wallpaper from "@/assets/add.png";

const Index = () => {
  useReveal();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);
  const wallpaperStartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (location.hash) {
      const id = location.hash.slice(1);
      const t = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [location.hash, location.key, ready]);

  useEffect(() => {
    document.title = "LIVORA — Imagine. Create. Realize. | Interior Design Studio";
    const meta = document.querySelector('meta[name="description"]') ?? (() => {
      const m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute("content", "Livora is a one-stop interior ecosystem — design, supply and construction merged seamlessly. Modern, quiet, European.");
  }, []);

  // Smooth parallax — wallpaper eases toward scroll target so it
  // "delays" upward on scroll down and downward on scroll up.
  useEffect(() => {
    if (!ready) return;
    let rafId = 0;
    let current = 0;
    let target = 0;
    let running = false;

    const computeTarget = () => {
      if (!wallpaperStartRef.current) return 0;
      const rect = wallpaperStartRef.current.getBoundingClientRect();
      const scrolledInto = Math.max(0, -rect.top);
      return scrolledInto * 0.35; // parallax factor
    };

    const tick = () => {
      current += (target - current) * 0.08; // easing → delay effect
      setParallaxY(current);
      if (Math.abs(target - current) > 0.1) {
        rafId = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const onScroll = () => {
      target = computeTarget();
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(tick);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [ready]);

  return (
    <>
      <Loader onDone={() => setReady(true)} />
      {ready && (
        <>
          <Navbar />
          <main>
            <Hero />

            {/* Wallpaper Container — absolute background with parallax delay */}
            <div ref={wallpaperStartRef} className="relative overflow-hidden">
              <div
                aria-hidden
                className="absolute left-0 right-0 -z-10 bg-cover bg-center will-change-transform"
                style={{
                  backgroundImage: `url(${wallpaper})`,
                  top: "-10%",
                  bottom: "-10%",
                  transform: `translate3d(0, ${-parallaxY}px, 0)`,
                }}
              />

              <div className="relative z-10">
                <Style />
                <Scope />
                <Projects />
                <Furniture />
              </div>
            </div>

            <Contact />
          </main>
          <Footer />
        </>
      )}
    </>
  );
};


export default Index;