import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { isPreloaderDone, PRELOADER_READY_EVENT } from "@/components/livora/HeroPreloader";
import { Navbar } from "@/components/livora/Navbar";
import { SkyScene } from "@/components/livora/SkyScene";
import { OurStyle } from "@/components/livora/OurStyle";
import { Scope } from "@/components/livora/Scope";
import { Projects } from "@/components/livora/Projects";
import { Furniture } from "@/components/livora/Furniture";
import { Contact } from "@/components/livora/Contact";
import { Footer } from "@/components/livora/Footer";
import { useReveal } from "@/hooks/useReveal";
import wallpaper from "@/assets/add.webp";

const Index = () => {
  useReveal();
  const location = useLocation();
  const [ready, setReady] = useState(() => isPreloaderDone());

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
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [location.hash, location.key, ready]);

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
      <main>
        <SkyScene ready={ready} />

        {/* Wallpaper Container — background stays fixed while scrolling through this block */}
        <div className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div
              className="sticky top-0 h-screen w-full bg-cover bg-center bg-no-repeat will-change-transform"
              style={{ backgroundImage: `url(${wallpaper})` }}
            />
          </div>

          <div className="relative z-10">
            <OurStyle />
            <Scope />
            <Projects />
            <Furniture />
            <Contact />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Index;