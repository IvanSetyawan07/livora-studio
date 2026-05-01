import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
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

export const Scope = () => {
  const [i, setI] = useState(0);
  const timerRef = useRef<number | null>(null);

  const start = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setI((p) => (p + 1) % slides.length);
    }, AUTOPLAY);
  };

  useEffect(() => {
    start();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const next = () => {
    setI((p) => (p + 1) % slides.length);
    start();
  };
  const prev = () => {
    setI((p) => (p - 1 + slides.length) % slides.length);
    start();
  };

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
          <div className="md:col-span-7 relative overflow-hidden aspect-[5/4]">
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

            {/* Click zones — left half = prev, right half = next */}
            <button
              onClick={prev}
              aria-label="Previous slide"
              className="absolute inset-y-0 left-0 w-1/2 z-10 group"
              style={{
                cursor:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><circle cx='24' cy='24' r='22' fill='rgba(255,255,255,0.85)' stroke='rgba(0,0,0,0.1)'/><path d='M28 16 L20 24 L28 32' fill='none' stroke='%231A1A1A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>\") 24 24, w-resize",
              }}
            />
            <button
              onClick={next}
              aria-label="Next slide"
              className="absolute inset-y-0 right-0 w-1/2 z-10 group"
              style={{
                cursor:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><circle cx='24' cy='24' r='22' fill='rgba(255,255,255,0.85)' stroke='rgba(0,0,0,0.1)'/><path d='M20 16 L28 24 L20 32' fill='none' stroke='%231A1A1A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>\") 24 24, e-resize",
              }}
            />
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
