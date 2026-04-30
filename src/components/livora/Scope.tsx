import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import decorative from "@/assets/scope-decorative.jpg";
import furniture from "@/assets/scope-furniture.jpg";
import contractor from "@/assets/scope-contractor.jpg";
import materials from "@/assets/scope-materials.jpg";

const slides = [
  {
    n: "a",
    title: "Decorative Interior",
    img: decorative,
    text: "We create interior concepts that bring beauty, comfort and character — turning empty spaces into expressive environments tailored to your story.",
  },
  {
    n: "b",
    title: "Loose Furniture",
    img: furniture,
    text: "Carefully selected furniture with design quality, comfort and flexibility — premium pieces sourced to balance value and beauty.",
  },
  {
    n: "c",
    title: "Interior Contractor & Architecture",
    img: contractor,
    text: "We handle interior contracting and architectural work with precision — managing the build from blueprint to final brushstroke.",
  },
  {
    n: "d",
    title: "Material Innovation, Accessories & Fittings",
    img: materials,
    text: "Innovative materials and fittings to enhance both function and finish — sourced directly to meet our standard for quiet excellence.",
  },
];

export const Scope = () => {
  const [i, setI] = useState(0);
  const cur = slides[i];
  const next = () => setI((p) => (p + 1) % slides.length);
  const prev = () => setI((p) => (p - 1 + slides.length) % slides.length);

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
                className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ${idx === i ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
              />
            ))}
          </div>

          <div className="md:col-span-5 space-y-8">
            <div key={cur.n} className="space-y-5 animate-[fade-in_0.6s_ease-out]">
              <p className="text-xs tracking-[0.4em] text-background/60 uppercase">
                {cur.n.toUpperCase()} / 0{slides.length}
              </p>
              <h3 className="serif text-3xl md:text-5xl font-light leading-tight">
                {cur.title}
              </h3>
              <p className="text-background/75 leading-relaxed font-light text-base md:text-lg">
                {cur.text}
              </p>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-background/20">
              <div className="flex gap-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setI(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-px transition-all duration-500 ${idx === i ? "w-12 bg-background" : "w-6 bg-background/30"}`}
                  />
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={prev}
                  aria-label="Previous"
                  className="w-11 h-11 border border-background/30 flex items-center justify-center hover:bg-background hover:text-foreground transition-colors duration-500"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  onClick={next}
                  aria-label="Next"
                  className="w-11 h-11 border border-background/30 flex items-center justify-center hover:bg-background hover:text-foreground transition-colors duration-500"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
