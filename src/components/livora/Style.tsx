import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import styleImg__asset from "@/assets/style-european.jpg.asset.json";

const styleImg = styleImg__asset.url;

export const StyleGlassmorphism = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  
  // Parallax hanya untuk desktop (md+), mobile tidak perlu parallax
  const y = useTransform(scrollY, (value) => value * 0.04);

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
        transition={{
          duration: 0.8,
          ease: [0.16, 1, 0.3, 1],
        }}
        viewport={{ once: false, amount: 0.2 }}
        style={{ 
          // Hanya apply parallax di desktop
          y: window.matchMedia("(min-width: 768px)").matches ? y : 0
        }}
        whileHover={{
          // Disable hover lift effect di mobile, hanya desktop
          y: window.matchMedia("(min-width: 768px)").matches ? -12 : 0,
          transition: { duration: 0.5, ease: "easeOut" },
        }}
        className="mx-auto w-full max-w-6xl rounded-3xl md:rounded-[40px] border border-white/12 bg-white/8 backdrop-blur-xl p-6 md:p-10 lg:p-24 shadow-2xl transition-all"
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

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.7 }}
              viewport={{ once: false }}
              className="serif text-4xl md:text-6xl lg:text-8xl font-light leading-[1.0]"
            >
              Modern.<br />Quiet.<br /><em className="italic">European.</em>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              viewport={{ once: false }}
              className="text-base md:text-lg lg:text-xl text-foreground/70 font-light leading-relaxed max-w-lg"
            >
              Inspired by European elegance, refined details and the balance between
              beauty and function. Our spaces speak softly, but with conviction.
            </motion.p>

            {/* Pills Container - Stack on mobile, horizontal on desktop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7 }}
              viewport={{ once: false }}
              className="flex flex-wrap md:flex-nowrap gap-2 md:gap-4 pt-4 md:pt-6 text-[10px] md:text-[11px] uppercase tracking-[0.25em] md:tracking-[0.3em] text-foreground/65"
            >
              {["Refined", "Balanced", "Timeless"].map((pill, idx) => (
                <motion.span
                  key={pill}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.05, duration: 0.5 }}
                  viewport={{ once: false }}
                  whileHover={{ 
                    borderColor: "rgba(255, 255, 255, 0.6)",
                    scale: 1.05
                  }}
                  className="px-3 md:px-4 py-1.5 md:py-2 border border-white/20 rounded-full hover:border-white/40 transition-colors cursor-pointer"
                >
                  {pill}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* Image */}
          <div className="reveal md:col-span-7 order-1 md:order-2 hover-zoom rounded-[32px] overflow-hidden shadow-xl">
            {/* ↑ Motion ada di sini: 2 class */}
            
            {/* 1. "reveal" - untuk fade-in / slide-in effect */}
            {/* 2. "hover-zoom" - untuk zoom on hover effect */}
            
            <img
              src={styleImg}
              alt="Modern quiet European bedroom"
              width={1280}
              height={896}
              loading="lazy"
              className="w-full aspect-[4/5] md:aspect-[5/4] object-cover"
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
};