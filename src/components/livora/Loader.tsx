import { useEffect, useState } from "react";
import logoLivora from "@/assets/logo-livora.png";
interface LoaderProps {
  onDone?: () => void;
}

export const Loader = ({ onDone }: LoaderProps) => {
  const [gone, setGone] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [textExit, setTextExit] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => setTextVisible(true), 300);
    const t1 = setTimeout(() => setTextExit(true), 1800);
    const t2 = setTimeout(() => setGone(true), 2400);
    const t3 = setTimeout(() => {
      setHidden(true);
      onDone?.();
    }, 3200);

    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-700 ${gone ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-5">

          {/* Icon — static, selalu ada */}
          <img
            src={logoLivora}
            alt="Livora"
            style={{
              width: "56px",
              height: "56px",
              flexShrink: 0,
              animation: "spin-logo 2.4s linear",
            }}
          />

          {/* Garis vertikal — STATIC, tidak pernah animasi */}
          <div
            style={{
              borderLeft: "1px solid rgba(0,0,0,0.2)",
              height: "64px",
              flexShrink: 0,
            }}
          />

          {/* Wrapper dengan overflow hidden agar clip-path bekerja rapi */}
          <div style={{ overflow: "hidden", paddingLeft: "12px" }}>
            <div
              style={{
                lineHeight: 1.2,
                // Masuk dari kanan, keluar ke kiri — clip-path
                clipPath: textExit
                  ? "inset(0 100% 0 0)"   // ← exit: tersembunyi ke kiri (masuk ke garis)
                  : textVisible
                  ? "inset(0 0% 0 0)"     // ← visible: penuh
                  : "inset(0 0% 0 100%)", // ← enter: tersembunyi dari kanan
                opacity: textVisible ? 1 : 0,
                transition: textExit
                  ? "clip-path 0.7s cubic-bezier(0.22,1,0.36,1), opacity 0.7s ease"
                  : "clip-path 0.8s cubic-bezier(0.22,1,0.36,1), opacity 0.6s ease",
              }}
            >
              <div style={{
                fontSize: "10px",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                opacity: 0.5,
                fontWeight: 300,
                whiteSpace: "nowrap",
              }}>
                PT. Langgeng Cipta Ruang
              </div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "28px",
                letterSpacing: "0.18em",
                marginTop: "4px",
                whiteSpace: "nowrap",
              }}>
                LIVORA
              </div>
            </div>
          </div>
        </div>

        {/* Garis bawah */}
        <div style={{
          height: "1px",
          width: "96px",
          background: "rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: "100%",
            background: "currentColor",
            transformOrigin: "left",
            animation: "loader-line 2.4s ease-out forwards",
          }} />
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
};