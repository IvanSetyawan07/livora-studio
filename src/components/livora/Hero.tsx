import { useEffect, useState } from "react";
import heroImg from "@/assets/hero-livora.jpg";

export const Hero = () => {
  const [y, setY] = useState(0);
  useEffect(() => {
    const onScroll = () => setY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section id="top" className="relative h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 will-change-transform"
        style={{ transform: `translate3d(0, ${y * 0.35}px, 0)` }}
      >
        <img
          src={heroImg}
          alt="Modern quiet luxury interior by Livora"
          className="h-[120%] w-full object-cover ken-burns"
          width={1920}
          height={1280}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/55" />
      </div>

      {/* Left-side dark gradient overlay for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)",
        }}
      />

      <div className="relative h-full container-livora flex flex-col justify-end pb-24 md:pb-32">
        <div className="max-w-3xl">
          <p
            className="reveal is-visible text-xs uppercase tracking-[0.45em] mb-6"
            style={{ color: "#FFFFFF", textShadow: "1px 1px 6px rgba(0,0,0,0.6)" }}
          >
            <span className="divider-line bg-white/70" />
            PT. LANGGENG CIPTA RUANG
          </p>
          <h1
            className="serif text-[14vw] md:text-[9vw] lg:text-[8.5rem] leading-[0.95] font-light mb-8"
            style={{
              color: "#FFFFFF",
              textShadow:
                "2px 2px 12px rgba(0,0,0,0.5), 0px 0px 30px rgba(0,0,0,0.3)",
            }}
          >
            Imagine.<br />
            Create.<br />
            <em className="italic font-light">Realize.</em>
          </h1>
          <p
            className="text-base md:text-lg max-w-md font-light tracking-wide"
            style={{ color: "#FFFFFF", textShadow: "1px 1px 6px rgba(0,0,0,0.6)" }}
          >
            Create your dream space with us — a single point of contact for design, supply and construction.
          </p>
        </div>
      </div>

      <a
        href="#about"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-primary-foreground/80 text-[10px] uppercase tracking-[0.4em]"
      >
        Scroll
        <span className="relative block w-px h-12 bg-primary-foreground/30 overflow-hidden">
          <span className="absolute inset-x-0 top-0 h-3 bg-primary-foreground scroll-dot" />
        </span>
      </a>
    </section>
  );
};
