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
  const [scrollY, setScrollY] = useState(0);
  const [isFurnitureVisible, setIsFurnitureVisible] = useState(false);
  const wallpaperStartRef = useRef(null);
  const furnitureRef = useRef(null);

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

  // Track scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track Furniture
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

  // Hitung background position
  const getBackgroundOffset = () => {
    if (!wallpaperStartRef.current) return 0;

    const startTop = wallpaperStartRef.current.offsetTop;
    
    // Jika belum sampai Style, offset = 0 (tidak gerak)
    if (scrollY < startTop) return 0;

    // Hitung scroll progress dari Style sampai Furniture
    const scrollProgress = scrollY - startTop;
    
    // Limit offset agar wallpaper tidak naik terus
    // Misalnya gerak maksimal 400px
    const maxOffset = Math.min(scrollProgress, 400);
    
    return maxOffset;
  };

  return (
    <>
      <Loader onDone={() => setReady(true)} />
      {ready && (
        <>
          <Navbar />
          <main>
            <Hero />

            {/* Wallpaper Container */}
            <div ref={wallpaperStartRef} className="relative">
              {/* Background - Naik perlahan sampai penuh, terus Fixed */}
              <div
                className="fixed inset-0 bg-cover bg-center -z-10"
                style={{
                  backgroundImage: `url(${wallpaper})`,
                  backgroundAttachment: isFurnitureVisible ? 'fixed' : 'scroll',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  transform: `translateY(${-getBackgroundOffset()}px)`,
                  transition: isFurnitureVisible ? 'none' : 'transform 0.1s ease-out',
                }}
              />

              {/* Overlay */}
              <div className="fixed inset-0 -z-10" />

              {/* Content Wrapper */}
              <div className="relative z-10">
                <Style />
                <Scope />
                <Projects />
                
                {/* Furniture - trigger point */}
                
                  <Furniture />
                  <div ref={furnitureRef}>
                </div>
              </div>
            </div>

            {/* Contact */}
            <Contact />
          </main>
          <Footer />
        </>
      )}
    </>
  );
};

export default Index;