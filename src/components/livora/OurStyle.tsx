import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import european from "@/assets/style-european.jpg";
import tropical from "@/assets/style-tropical.jpg";
import industrial from "@/assets/style-industrial.jpg";
import japandi from "@/assets/style-japandi.jpg";
import scandinavian from "@/assets/style-scandinavian.jpg";

const STYLES = [
  { img: european, words: ["Modern.", "Quiet.", "European."], name: "European" },
  { img: tropical, words: ["Lush.", "Warm.", "Tropical Modern"], name: "Tropical Modern" },
  { img: industrial, words: ["Raw.", "Bold.", "Industrial."], name: "Industrial" },
  { img: japandi, words: ["Warm.", "Minimal.", "Japandi."], name: "Japandi" },
  { img: scandinavian, words: ["Light.", "Soft.", "Scandinavian."], name: "Scandinavian" },
];

export function OurStyle() {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>(".style-panel");
      const distance = () => (track.current?.scrollWidth ?? 0) - window.innerWidth;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => "+=" + (distance() + window.innerHeight * 1.2),
          scrub: 1.1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.fromTo(
        ".style-intro",
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      )
        .to(".style-intro", { opacity: 0, y: -50, duration: 0.5, ease: "power2.in" }, ">+=0.3")
        .to(track.current, { x: () => -distance(), ease: "none", duration: 4 }, ">");

      panels.forEach((panel) => {
        gsap.fromTo(
  panel.querySelector(".style-img"),
  { scaleX: 1.25, scaleY: 1.25 },
  {
    scaleX: 1,
    scaleY: 1,
    ease: "none",
            scrollTrigger: {
              trigger: panel,
              containerAnimation: tl,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          },
        );
        gsap.fromTo(
          panel.querySelectorAll(".style-word"),
          { yPercent: 120, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: panel,
              containerAnimation: tl,
              start: "left 70%",
              end: "left 25%",
              scrub: true,
            },
          },
        );
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="style"
      ref={root}
      className="relative h-screen overflow-hidden bg-foreground text-background"
    >
      <div className="style-intro pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
        <span className="text-[11px] uppercase tracking-[0.4em] text-background/50">Chapter 02</span>
        <h2 className="serif mt-4 text-[16vw] font-light leading-[0.85] text-background sm:text-[9vw]">
          Our Style
        </h2>
        <p className="mt-6 max-w-md text-sm font-light text-background/60">
          Five languages of space. One standard of craft.
        </p>
      </div>

      <div ref={track} className="absolute inset-y-0 left-0 flex h-full flex-nowrap">
        <div aria-hidden className="h-screen w-screen shrink-0" />
        {STYLES.map((s, i) => (
          <article
            key={s.name}
            className="style-panel relative h-screen w-screen shrink-0 sm:w-[62vw]"
          >
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={s.img}
                alt={`${s.name} interior by Livora`}
                loading="lazy"
                className="style-img h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/25 to-transparent" />
            </div>
            <div className="relative flex h-full flex-col justify-end p-8 sm:p-14">
              <span className="mb-6 text-[11px] uppercase tracking-[0.4em] text-background/50">
                {String(i + 1).padStart(2, "0")}
              </span>
              {s.words.map((w) => (
                <span key={w} className="block overflow-hidden">
                  <span className="style-word serif block text-[11vw] font-light leading-[0.95] text-background sm:text-[4.6vw]">
                    {w}
                  </span>
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default OurStyle;
