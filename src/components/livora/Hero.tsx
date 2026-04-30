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

      <div className="relative h-full container-livora flex flex-col justify-end pb-24 md:pb-32 text-primary-foreground">
        <div className="max-w-3xl">
          <p className="reveal is-visible text-xs uppercase tracking-[0.45em] mb-6 opacity-90">
            <span className="divider-line bg-primary-foreground/60" />
            PT. Langgeng Cipta Ruang
          </p>
          <h1 className="serif text-[14vw] md:text-[9vw] lg:text-[8.5rem] leading-[0.95] font-light mb-8">
            Imagine.<br />
            Create.<br />
            <em className="italic font-light opacity-90">Realize.</em>
          </h1>
          <p className="text-base md:text-lg max-w-md font-light tracking-wide opacity-90">
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
