import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Global Hero Preloader
 * Ditampilkan saat pertama kali landing di sebuah halaman.
 * Menunggu: document.fonts.ready + window "load" (semua image utama) atau timeout aman.
 * Fade out lembut setelah konten siap.
 */
export default function HeroPreloader() {
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setVisible(true);
    setFading(false);

    let cancelled = false;
    const start = performance.now();
    const MIN_MS = 500;     // biar tidak flicker
    const MAX_MS = 3500;    // hard cap – jangan pernah stuck

    const ready = () => {
      if (cancelled) return;
      const elapsed = performance.now() - start;
      const wait = Math.max(0, MIN_MS - elapsed);
      setTimeout(() => {
        if (cancelled) return;
        setFading(true);
        setTimeout(() => !cancelled && setVisible(false), 500);
      }, wait);
    };

    // Tunggu fonts
    const fontsPromise =
      (document as any).fonts?.ready ?? Promise.resolve();

    // Tunggu semua hero-image visible di viewport (first paint images)
    const imagesReady = () =>
      new Promise<void>((resolve) => {
        const imgs = Array.from(document.images).filter(
          (img) => !img.complete && img.getBoundingClientRect().top < window.innerHeight * 1.5,
        );
        if (imgs.length === 0) return resolve();
        let left = imgs.length;
        const done = () => (--left <= 0) && resolve();
        imgs.forEach((img) => {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
        setTimeout(resolve, 2500); // safety
      });

    Promise.race([
      Promise.all([fontsPromise, imagesReady()]),
      new Promise((r) => setTimeout(r, MAX_MS)),
    ]).then(ready);

    return () => {
      cancelled = true;
    };
    // Re-trigger tiap ganti route
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#f7f1e8] transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="serif text-3xl md:text-4xl tracking-[0.4em] text-foreground/90">
          LIVORA
        </div>
        <div className="h-[1px] w-24 bg-foreground/20 overflow-hidden relative">
          <span className="absolute inset-y-0 left-0 w-1/3 bg-foreground/70 animate-[preloadSlide_1.2s_ease-in-out_infinite]" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.35em] text-foreground/50">
          Preparing your experience
        </p>
      </div>
      <style>{`
        @keyframes preloadSlide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
