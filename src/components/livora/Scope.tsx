import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

import decorative from "@/assets/scope-decorative.jpg";
import furniture from "@/assets/scope-furniture.jpg";
import contractor from "@/assets/scope-contractor.jpg";
import materials from "@/assets/scope-materials.jpg";

const slides = [
  {
    n: "A",
    title: "Decorative Interior",
    img: decorative,
    text:
      "Every room has a story waiting to be told. We craft interior concepts that transform bare walls and empty floors into spaces that breathe — designed around your life, your taste, and your vision.",
  },
  {
    n: "B",
    title: "Loose Furniture",
    img: furniture,
    text:
      "Furniture is more than function — it is the quiet language of a room. We curate pieces of uncompromising craftsmanship, where every curve, grain and stitch invites you to slow down and feel at home.",
  },
  {
    n: "C",
    title: "Interior Contractor & Architecture",
    img: contractor,
    text:
      "Precision is our promise. From blueprint to final brushstroke, our team builds with disciplined hands and watchful eyes — shaping spaces that hold beauty in every detail and comfort in every corner.",
  },
  {
    n: "D",
    title: "Material Innovation, Accessories & Fittings",
    img: materials,
    text:
      "We source materials and fittings with a connoisseur's eye — innovative, enduring, quietly remarkable. The pieces we choose today become the textures, finishes and memories that define a space for years to come.",
  },
];

export const Scope = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [openMobile, setOpenMobile] = useState<number | null>(null);
  const [visibleItems, setVisibleItems] = useState<boolean[]>(
    () => slides.map(() => false)
  );
  const [parallaxY, setParallaxY] = useState(0);

  const listRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Stagger entrance via IntersectionObserver
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
        { threshold: 0.2 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const currentImageIdx = hoverIdx ?? activeIdx;

  const handleMouseMove = (e: React.MouseEvent<HTMLUListElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientY - rect.top) / rect.height; // 0..1
    setParallaxY((rel - 0.5) * 20); // ±10px
  };

  return (
    <section
      id="scope"
      className="py-28 md:py-40 bg-foreground text-background"
    >
      <div className="container-livora">
        <div className="reveal mb-12 md:mb-16">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.45em] mb-5 text-background/60">
            <span className="inline-block h-px w-12 bg-background/40 align-middle mr-4" />
            Scope of Work
          </p>
          <h2 className="serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.05] text-balance">
            Four disciplines, <em className="italic">one studio.</em>
          </h2>
        </div>

        <div className="grid md:grid-cols-12 gap-8 md:gap-14 md:items-start">
          {/* Left: List 60% */}
          <ul
            ref={listRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
              setHoverIdx(null);
              setParallaxY(0);
            }}
            className="md:col-span-7 border-t border-background/15"
          >
            {slides.map((s, idx) => {
              const isHover = hoverIdx === idx;
              const isActive = hoverIdx === null && activeIdx === idx;
              const showDesc = isHover || isActive;
              const isOpenMobile = openMobile === idx;
              return (
                <li
                  key={s.n}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  onMouseEnter={() => {
                    setHoverIdx(idx);
                    setActiveIdx(idx);
                  }}
                  onClick={() =>
                    setOpenMobile((p) => (p === idx ? null : idx))
                  }
                  className="group border-b border-background/20 cursor-pointer"
                  style={{
                    opacity: visibleItems[idx] ? 1 : 0,
                    transform: visibleItems[idx]
                      ? "translateY(0)"
                      : "translateY(30px)",
                    transition:
                      "opacity 0.6s ease-out, transform 0.6s ease-out",
                  }}
                >
                  <div className="flex items-start gap-6 md:gap-10 py-8 md:py-10">
                    <span className="text-[11px] md:text-xs tracking-[0.3em] text-background/50 font-light w-8 shrink-0 pt-3">
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    <div className="flex-1 min-w-0">
                      <h3 className="serif text-2xl md:text-[32px] leading-tight font-light text-background">
                        {s.title}
                      </h3>

                      {/* Description (active or hover, mobile tap) */}
                      <div
                        className="overflow-hidden"
                        style={{
                          maxHeight:
                            showDesc || isOpenMobile ? "200px" : "0px",
                          opacity: showDesc || isOpenMobile ? 1 : 0,
                          transform:
                            showDesc || isOpenMobile
                              ? "translateY(0)"
                              : "translateY(6px)",
                          transition:
                            "max-height 0.4s ease-out, opacity 0.3s ease-out, transform 0.3s ease-out",
                        }}
                      >
                        <p className="mt-3 text-sm text-background/65 font-light leading-[1.6] max-w-2xl">
                          {s.text}
                        </p>
                      </div>

                      {/* Mobile-only image */}
                      <div
                        className="md:hidden overflow-hidden"
                        style={{
                          maxHeight: isOpenMobile ? "320px" : "0px",
                          opacity: isOpenMobile ? 1 : 0,
                          transition:
                            "max-height 0.4s ease-out, opacity 0.3s ease-out",
                        }}
                      >
                        <img
                          src={s.img}
                          alt={s.title}
                          className="mt-4 w-full aspect-[4/3] object-cover rounded-sm"
                        />
                      </div>
                    </div>

                    <ArrowRight
                      className="shrink-0 text-background mt-3 transition-all duration-300 ease-out"
                      style={{
                        opacity: isHover ? 1 : 0,
                        transform: isHover
                          ? "translateX(0)"
                          : "translateX(-10px)",
                      }}
                      size={22}
                      strokeWidth={1.25}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Right: Image panel */}
          <div className="hidden md:block md:col-span-5 md:sticky md:top-24">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[4px]">
              {slides.map((s, idx) => (
                <img
                  key={s.n}
                  src={s.img}
                  alt={s.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    opacity: idx === currentImageIdx ? 1 : 0,
                    transform: `translateY(${
                      idx === currentImageIdx ? parallaxY : 0
                    }px) scale(1.04)`,
                    transition:
                      "opacity 0.4s ease-out, transform 0.5s ease-out",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
