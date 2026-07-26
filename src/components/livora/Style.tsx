import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styleEuropean from "@/assets/style-european.jpg";
import styleJapandi from "@/assets/style-japandi.jpg";
import styleScandinavian from "@/assets/style-scandinavian.jpg";
import styleIndustrial from "@/assets/style-industrial.jpg";
import styleTropical from "@/assets/style-tropical.jpg";

type Slide = {
  key: string;
  image: string;
  alt: string;
  titleLines: [string, string, string];
  emphasis: string;
  description: string;
  pills: [string, string, string];
};

const SLIDES: Slide[] = [
  {
    key: "european",
    image: styleEuropean,
    alt: "Modern quiet European bedroom",
    titleLines: ["Modern.", "Quiet.", ""],
    emphasis: "European.",
    description:
      "Inspired by European elegance, refined details and the balance between beauty and function. Our spaces speak softly, but with conviction.",
    pills: ["Refined", "Balanced", "Timeless"],
  },
  {
    key: "japandi",
    image: styleJapandi,
    alt: "Warm minimal Japandi bedroom",
    titleLines: ["Warm.", "Minimal.", ""],
    emphasis: "Japandi.",
    description:
      "A quiet meeting of Japanese restraint and Scandinavian warmth. Natural wood, soft light, and honest materials make room to breathe.",
    pills: ["Serene", "Grounded", "Natural"],
  },
  {
    key: "scandinavian",
    image: styleScandinavian,
    alt: "Bright Scandinavian living room",
    titleLines: ["Bright.", "Simple.", ""],
    emphasis: "Scandinavian.",
    description:
      "Light oak, soft neutrals, and generous daylight. A style built around comfort, clarity, and the everyday hygge of home.",
    pills: ["Airy", "Cozy", "Honest"],
  },
  {
    key: "industrial",
    image: styleIndustrial,
    alt: "Industrial loft living area",
    titleLines: ["Raw.", "Bold.", ""],
    emphasis: "Industrial.",
    description:
      "Brick, blackened steel, and warm edison glow. An urban composition where texture, structure, and shadow become the ornament.",
    pills: ["Textural", "Confident", "Urban"],
  },
  {
    key: "tropical",
    image: styleTropical,
    alt: "Contemporary tropical modern interior",
    titleLines: ["Lush.", "Warm.", ""],
    emphasis: "Tropical Modern.",
    description:
      "Teak, rattan, stone, and living green. A modern take on Indonesian warmth — layered, tactile, and alive with the outdoors.",
    pills: ["Organic", "Layered", "Alive"],
  },
];

const AUTOPLAY_MS = 3000;

export const StyleGlassmorphism = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, (value) => value * 0.04);

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  const go = useCallback((next: number, dir: 1 | -1) => {
    setDirection(dir);
    setIndex((next + SLIDES.length) % SLIDES.length);
  }, []);

  const next = useCallback(() => go(index + 1, 1), [go, index]);
  const prev = useCallback(() => go(index - 1, -1), [go, index]);

  // Auto-slide every 3s
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused]);

  const slide = SLIDES[index];

  return (
    <section
      ref={sectionRef}
      id="style"
      className="py-20 md:py-32 lg:py-48 container-livora"
    >
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, translateY: 60 }}
        whileInView={{ opacity: 1, translateY: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: false, amount: 0.2 }}
        style={{
          y: typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches ? y : 0,
        }}
        className="mx-auto w-full max-w-6xl rounded-3xl md:rounded-[40px] border border-white/12 bg-white/8 backdrop-blur-xl p-6 md:p-10 lg:p-24 shadow-2xl transition-all"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="grid md:grid-cols-12 gap-8 md:gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <div className="md:col-span-5 order-2 md:order-1 space-y-6 md:space-y-8">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              viewport={{ once: false }}
              className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] md:tracking-[0.45em] text-foreground/70"
            >
              <span className="divider-line" /> Our Style
            </motion.p>

            <div className="relative min-h-[220px] md:min-h-[300px] lg:min-h-[380px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={slide.key + "-text"}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-6 md:space-y-8"
                >
                  <h2 className="serif text-4xl md:text-6xl lg:text-8xl font-light leading-[1.0]">
                    {slide.titleLines[0]}
                    <br />
                    {slide.titleLines[1]}
                    <br />
                    <em className="italic">{slide.emphasis}</em>
                  </h2>

                  <p className="text-base md:text-lg lg:text-xl text-foreground/70 font-light leading-relaxed max-w-lg">
                    {slide.description}
                  </p>

                  <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-4 pt-2 md:pt-4 text-[10px] md:text-[11px] uppercase tracking-[0.25em] md:tracking-[0.3em] text-foreground/65">
                    {slide.pills.map((pill) => (
                      <span
                        key={pill}
                        className="px-3 md:px-4 py-1.5 md:py-2 border border-white/20 rounded-full hover:border-white/40 transition-colors cursor-pointer"
                      >
                        {pill}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dots */}
            <div className="flex items-center gap-2 pt-2">
              {SLIDES.map((s, i) => (
                <button
                  key={s.key}
                  aria-label={`Go to ${s.key} style`}
                  onClick={() => go(i, i > index ? 1 : -1)}
                  className="group h-2 flex items-center"
                >
                  <span
                    className={`block h-[2px] transition-all duration-500 ${
                      i === index
                        ? "w-10 bg-foreground/80"
                        : "w-5 bg-foreground/25 group-hover:bg-foreground/50"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Image Carousel */}
          <div className="md:col-span-7 order-1 md:order-2 relative">
            <div className="relative rounded-[32px] overflow-hidden shadow-xl aspect-[4/5] md:aspect-[5/4] bg-black/10">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.img
                  key={slide.key + "-img"}
                  src={slide.image}
                  alt={slide.alt}
                  width={1280}
                  height={1024}
                  loading="lazy"
                  custom={direction}
                  initial={{ opacity: 0, scale: 1.06, x: direction * 40 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 1.02, x: direction * -40 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Mobile tap zones (hidden on md+) */}
              <button
                type="button"
                aria-label="Previous style"
                onClick={prev}
                className="md:hidden absolute inset-y-0 left-0 w-1/3 z-10"
              />
              <button
                type="button"
                aria-label="Next style"
                onClick={next}
                className="md:hidden absolute inset-y-0 right-0 w-1/3 z-10"
              />

              {/* Desktop arrows */}
              <button
                type="button"
                aria-label="Previous style"
                onClick={prev}
                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 h-11 w-11 items-center justify-center rounded-full bg-white/70 backdrop-blur border border-white/60 text-foreground shadow-md hover:bg-white transition-all hover:-translate-x-0.5"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Next style"
                onClick={next}
                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 h-11 w-11 items-center justify-center rounded-full bg-white/70 backdrop-blur border border-white/60 text-foreground shadow-md hover:bg-white transition-all hover:translate-x-0.5"
              >
                <ChevronRight size={20} />
              </button>

              {/* Style label chip */}
              <div className="absolute top-4 left-4 md:top-6 md:left-6 px-3 py-1.5 rounded-full bg-black/35 backdrop-blur text-white text-[10px] md:text-[11px] uppercase tracking-[0.3em]">
                {slide.emphasis.replace(".", "")}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
