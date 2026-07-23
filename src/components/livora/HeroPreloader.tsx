import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import logoLivora from "@/assets/logo-livora.png";

/**
 * Global Hero Preloader
 * Tampilan = desain Loader lama (logo + divider + LIVORA + garis bawah).
 * Prinsip loading = menunggu fonts + hero images siap, dengan MIN/MAX guard,
 * lalu fade-out halus supaya hero terbuka mulus.
 */
export default function HeroPreloader() {
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [textExit, setTextExit] = useState(false);

  useEffect(() => {
    setVisible(true);
    setFading(false);
    setTextExit(false);

    const tIn = setTimeout(() => setTextVisible(true), 250);

    let cancelled = false;
    const start = performance.now();
    const MIN_MS = 1400; // biar animasi teks sempat terlihat
    const MAX_MS = 3500; // hard cap – jangan pernah stuck

    const ready = () => {
      if (cancelled) return;
      const elapsed = performance.now() - start;
      const wait = Math.max(0, MIN_MS - elapsed);
      setTimeout(() => {
        if (cancelled) return;
        setTextExit(true);
        setTimeout(() => {
          if (cancelled) return;
          setFading(true);
          setTimeout(() => !cancelled && setVisible(false), 600);
        }, 500);
      }, wait);
    };

    const fontsPromise = (document as any).fonts?.ready ?? Promise.resolve();

    const imagesReady = () =>
      new Promise<void>((resolve) => {
        const imgs = Array.from(document.images).filter(
          (img) =>
            !img.complete &&
            img.getBoundingClientRect().top < window.innerHeight * 1.5,
        );
        if (imgs.length === 0) return resolve();
        let left = imgs.length;
        const done = () => --left <= 0 && resolve();
        imgs.forEach((img) => {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
        setTimeout(resolve, 2500);
      });

    Promise.race([
      Promise.all([fontsPromise, imagesReady()]),
      new Promise((r) => setTimeout(r, MAX_MS)),
    ]).then(ready);

    return () => {
      cancelled = true;
      clearTimeout(tIn);
    };
  }, []); // cuma jalan sekali saat pertama kali app di-load, bukan tiap ganti halaman

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-700 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-5">
          <img
            src={logoLivora}
            alt="Livora"
            style={{
              width: "56px",
              height: "56px",
              flexShrink: 0,
              animation: "spin-logo 2.4s linear infinite",
            }}
          />

          <div
            style={{
              borderLeft: "1px solid rgba(0,0,0,0.2)",
              height: "64px",
              flexShrink: 0,
            }}
          />

          <div style={{ overflow: "hidden", paddingLeft: "12px" }}>
            <div
              style={{
                lineHeight: 1.2,
                clipPath: textExit
                  ? "inset(0 100% 0 0)"
                  : textVisible
                  ? "inset(0 0% 0 0)"
                  : "inset(0 0% 0 100%)",
                opacity: textVisible ? 1 : 0,
                transition: textExit
                  ? "clip-path 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.5s ease"
                  : "clip-path 0.8s cubic-bezier(0.22,1,0.36,1), opacity 0.6s ease",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  opacity: 0.5,
                  fontWeight: 300,
                  whiteSpace: "nowrap",
                }}
              >
                PT. Langgeng Cipta Ruang
              </div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 500,
                  fontSize: "28px",
                  letterSpacing: "0.18em",
                  marginTop: "4px",
                  whiteSpace: "nowrap",
                }}
              >
                LIVORA
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            height: "1px",
            width: "96px",
            background: "rgba(0,0,0,0.2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "100%",
              background: "currentColor",
              transformOrigin: "left",
              animation: "loader-line 1.8s ease-out forwards",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes loader-line {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes spin-logo {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
