import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

import decorative from "@/assets/scope-deocrative.png";
import furniture from "@/assets/scope-furniture.jpg";
import contractor from "@/assets/scope-contractor.jpg";
import materials from "@/assets/scope-materials.jpg";

const slides = [
  {
    n: "A",
    title: "Decorative Interior",
    img: decorative,
    text: "Every room has a story waiting to be told. We craft interior concepts that transform bare walls and empty floors into spaces that breathe — designed around your life, your taste, and your vision.",
  },
  {
    n: "B",
    title: "Loose Furniture",
    img: furniture,
    text: "Furniture is more than function — it is the quiet language of a room. We curate pieces of uncompromising craftsmanship, where every curve, grain and stitch invites you to slow down and feel at home.",
  },
  {
    n: "C",
    title: "Interior Contractor & Architecture",
    img: contractor,
    text: "Precision is our promise. From blueprint to final brushstroke, our team builds with disciplined hands and watchful eyes — shaping spaces that hold beauty in every detail and comfort in every corner.",
  },
  {
    n: "D",
    title: "Material Innovation, Accessories & Fittings",
    img: materials,
    text: "We source materials and fittings with a connoisseur's eye — innovative, enduring, quietly remarkable. The pieces we choose today become the textures, finishes and memories that define a space for years to come.",
  },
];

export const Scope = () => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [visibleItems, setVisibleItems] = useState<boolean[]>(() => slides.map(() => false));
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    itemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setTimeout(() => {
                setVisibleItems((prev) => {
                  if (prev[idx]) return prev;
                  const copy = [...prev];
                  copy[idx] = true;
                  return copy;
                });
              }, idx * 80);
              obs.disconnect();
            }
          });
        },
        { threshold: 0.2 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <section id="scope" className="py-28 md:py-40 bg-foreground text-background">
      <div className="container-livora">
        <div className="mb-12 md:mb-16">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.45em] mb-5 text-background/60">
            <span className="inline-block h-px w-12 bg-background/40 align-middle mr-4" />
            Scope of Work
          </p>
          <h2 className="serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.05] text-balance">
            Four disciplines, <em className="italic">one studio.</em>
          </h2>
        </div>

        <div className="border-t border-background/20" onMouseLeave={() => setActiveIdx(null)}>
          {slides.map((s, idx) => { //Looping
            const isActive = activeIdx === idx;
            return (
              <div
                key={s.n}
                ref={(el) => (itemRefs.current[idx] = el)}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => setActiveIdx(idx)}
                className="group relative border-b border-background/20 cursor-pointer overflow-hidden"
                style={{
                  opacity: visibleItems[idx] ? 1 : 0,
                  transform: visibleItems[idx] ? "translateY(0)" : "translateY(30px)",
                  transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
                }}
              >
                {/* Expanding image background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div
                    className="absolute right-0 top-0 h-full w-[70%] will-change-[clip-path,opacity]"
                    style={{
                      clipPath: isActive ? "inset(0 0 0 0)" : "inset(0 0 0 100%)",
                      opacity: isActive ? 1 : 0,
                      transition: "clip-path 900ms cubic-bezier(0.65, 0, 0.35, 1), opacity 500ms ease-out",
                    }}
                  >
                    <img
                      src={s.img}
                      alt={s.title}
                      className="h-full w-full will-change-transform"
                      style={{
                        objectFit: "cover",
                        objectPosition: idx === 3 ? "center top" : "center",
                        transform: isActive ? "scale(1)" : "scale(1.08)",
                        transition: "transform 1400ms cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    />
                    <div className="absolute inset-0 bg-foreground/35" />
                    {/* Soft fade to dark on the left edge for text legibility */}
                    <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-foreground to-transparent" />
                  </div>
                </div>

                {/* Row content */}
                <div
                  className="relative grid grid-cols-12 items-center gap-4 md:gap-8 px-2 md:px-4"
                  style={{
                    minHeight: isActive ? "260px" : "120px",
                    transition: "min-height 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  {/* Number circle */}
                  <div className="col-span-2 md:col-span-1 flex justify-start">
                    <span
                      className="flex items-center justify-center rounded-full border border-background/40 text-[11px] md:text-xs tracking-wider font-light text-background/80 transition-all duration-500"
                      style={{
                        width: isActive ? 44 : 36,
                        height: isActive ? 44 : 36,
                        borderColor: isActive ? "hsl(var(--background) / 0.7)" : "hsl(var(--background) / 0.35)",
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Description column (visible only when active) */}
                  <div className="col-span-10 md:col-span-3">
                    <div
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? "translateY(0)" : "translateY(8px)",
                        transition: "opacity 0.5s ease-out 0.15s, transform 0.5s ease-out 0.15s",
                        pointerEvents: isActive ? "auto" : "none",
                      }}
                    >
                      <p className="text-sm text-background/85 font-light leading-[1.6] max-w-xs">{s.text}</p>
                    </div>
                  </div>

                  {/* Big serif title */}
                  <div className="hidden md:flex md:col-span-7 items-center justify-center">
                    <h3
                      className="serif font-light leading-none text-background text-center transition-all duration-700 ease-out"
                      style={{
                        fontSize: isActive ? "clamp(56px, 8vw, 120px)" : "clamp(28px, 3vw, 44px)",
                        letterSpacing: "-0.02em",
                        opacity: 1,
                      }}
                    >
                      {s.title}
                    </h3>
                  </div>

                  {/* Mobile title */}
                  <div className="md:hidden col-span-12 -mt-2">
                    <h3 className="serif font-light text-background text-2xl leading-tight">{s.title}</h3>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
