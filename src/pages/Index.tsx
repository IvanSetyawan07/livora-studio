import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Loader } from "@/components/livora/Loader";
import { Navbar } from "@/components/livora/Navbar";
import { Hero } from "@/components/livora/Hero";
import { StyleGlassmorphism } from "@/components/livora/Style";
import { Scope } from "@/components/livora/Scope";
import { Projects } from "@/components/livora/Projects";
import { Furniture } from "@/components/livora/Furniture";
import { Contact } from "@/components/livora/Contact";
import { Footer } from "@/components/livora/Footer";
import { useReveal } from "@/hooks/useReveal";
import { CatalogPreview } from "@/components/livora/CatalogPreview";
import wallpaper from "@/assets/add.png";

const Index = () => {
  useReveal();
  const location = useLocation();
  const hasLoaded = typeof window !== "undefined" && sessionStorage.getItem("livora_loaded") === "1";
  const [ready, setReady] = useState(hasLoaded);
  const [isFurnitureVisible, setIsFurnitureVisible] = useState(false);
  const furnitureRef = useRef<HTMLDivElement | null>(null);

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

  // Track Furniture section visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFurnitureVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    if (furnitureRef.current) {
      observer.observe(furnitureRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {!hasLoaded && <Loader onDone={() => { sessionStorage.setItem("livora_loaded", "1"); setReady(true); }} />}
      {ready && (
        <>
          <Navbar />
          <main>
            <Hero />

            {/* Wallpaper Container — background stays fixed while scrolling through this block */}
            <div className="relative">
              <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <div
                  className="sticky top-0 h-screen w-full bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${wallpaper})` }}
                />
              </div>

              <div className="relative z-10">
                <StyleGlassmorphism />
                <Scope />
                <Projects />
                {/* <CatalogPreview /> */}
                {/* Furniture - trigger point */}
                <Furniture />
                <div ref={furnitureRef} />

                <Contact />
              </div>
            </div>

          </main>
          <Footer />
        </>
      )}
    </>
  );
};

export default Index;