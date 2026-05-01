import { useEffect, useRef, useState } from "react";
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

const AUTOPLAY = 5000;
const TICK = 50;

export const Scope = () => {
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    setProgress(0);
    if (tickRef.current) window.clearInterval(tickRef.current);
    const startedAt = Date.now();
    tickRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(100, (elapsed / AUTOPLAY) * 100);
      setProgress(pct);
      if (elapsed >= AUTOPLAY) {
        setI((p) => (p + 1) % slides.length);
      }
    }, TICK);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [i]);

  const cur = slides[i];

  return (
    <section id="scope" className="py-28 md:py-40 bg-foreground text-background">
      <div className="container-livora">
        <div className="reveal mb-12 md:mb-16">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.45em] text-background/60 mb-5">
            <span className="inline-block h-px w-12 bg-background/40 align-middle mr-4" />
            04 — Scope of Work
          </p>
          <h2 className="serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.05]">
            Four disciplines, <em className="italic">one studio.</em>
          </h2>
        </div>

        <div className="grid md:grid-cols-12 gap-8 md:gap-14 items-center">
          <div className="md:col-span-7">
            <div className="relative overflow-hidden aspect-[5/4]">
              {slides.map((s, idx) => (
                <img
                  key={s.n}
                  src={s.img}
                  alt={s.title}
                  width={1280}
                  height={896}
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover ${
                    idx === i ? "opacity-100 kenburns-slide" : "opacity-0"
                  }`}
                  style={{
                    transition: "opacity 0.8s ease, transform 0.8s ease",
                  }}
                />
              ))}
            </div>

            {/* Progress segments below image */}
            <div className="mt-6 flex gap-3">
              {slides.map((_, idx) => (
                <div
                  key={idx}
                  className="relative h-px flex-1 bg-background/20 overflow-hidden"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-background"
                    style={{
                      width:
                        idx < i
                          ? "100%"
                          : idx === i
                          ? `${progress}%`
                          : "0%",
                      transition: idx === i ? "width 50ms linear" : "none",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-5 space-y-8">
            <div key={cur.n} className="space-y-5 animate-[fade-in_0.8s_ease-out]">
              <p className="text-xs tracking-[0.4em] text-background/60 uppercase">
                {cur.n} / 0{slides.length}
              </p>
              <h3 className="serif text-3xl md:text-5xl font-light leading-tight">
                {cur.title}
              </h3>
              <p className="text-background/75 leading-relaxed font-light text-base md:text-lg">
                {cur.text}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
