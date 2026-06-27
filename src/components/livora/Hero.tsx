import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useScroll, useTransform } from "framer-motion";
import heroImg__asset from "@/assets/hero-livora.jpg.asset.json";
const heroImg = heroImg__asset.url;

export const Hero = () => {
  const { t } = useTranslation();
  const heroRef = useRef<HTMLElement>(null);
  const [heroHeight, setHeroHeight] = useState(800);
  const [showCompany, setShowCompany] = useState(false);
  const [showLine1, setShowLine1] = useState(false);
  const [showLine2, setShowLine2] = useState(false);
  const [showLine3, setShowLine3] = useState(false);
  const [displayedText, setDisplayedText] = useState("");

  // ── Framer scroll (sama dengan CatalogDetail) ──
  const { scrollY } = useScroll();

  // ── Measure hero height ──
  useEffect(() => {
    const measure = () => {
      if (heroRef.current) setHeroHeight(heroRef.current.clientHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ── Parallax image (sama dengan CatalogHero) ──
  const imgY = useTransform(scrollY, [0, 800], [0, 140]);
  const imgScale = useTransform(scrollY, [0, 800], [1, 1.08]);

  // ── Scroll-driven exit: text slides left + fade + Y (sama persis CatalogHero) ──
  const textX = useTransform(
    scrollY,
    [0, heroHeight * 0.3, heroHeight * 0.6, heroHeight * 0.95],
    [0, -40, -80, -120]
  );
  const textOpacity = useTransform(
    scrollY,
    [0, heroHeight * 0.5, heroHeight],
    [1, 0.5, 0],
    { clamp: true }
  );
  const textY = useTransform(
    scrollY,
    [0, heroHeight * 0.5, heroHeight],
    [0, -40, -80],
    { clamp: true }
  );

  // ── Overlay darkens on scroll ──
  const overlayOpacity = useTransform(scrollY, [0, 600], [0.55, 0.78]);

  // ── Entry animations (staggered, sama seperti sebelumnya) ──
  useEffect(() => {
    const t1 = setTimeout(() => setShowCompany(true), 200);
    const t2 = setTimeout(() => setShowLine1(true), 700);
    const t3 = setTimeout(() => setShowLine2(true), 1100);
    const t4 = setTimeout(() => setShowLine3(true), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  // ── Typewriter effect ──
  useEffect(() => {
    const fullText = t("hero.description");
    let charIndex = 0;
    let typingInterval: ReturnType<typeof setInterval>;
    const typingTimeout = setTimeout(() => {
      typingInterval = setInterval(() => {
        if (charIndex <= fullText.length) {
          setDisplayedText(fullText.substring(0, charIndex));
          charIndex++;
        } else {
          clearInterval(typingInterval);
        }
      }, 20);
    }, 2400);
    return () => {
      clearTimeout(typingTimeout);
      clearInterval(typingInterval);
    };
  }, [t]);

  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <section id="top" ref={heroRef} className="relative h-screen w-full overflow-hidden">

      {/* ── Background image: parallax + initial zoom ── */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ y: imgY, scale: imgScale }}
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.2, ease }}
      >
        <img
          src={heroImg}
          alt="Modern quiet luxury interior by Livora"
          className="h-[120%] w-full object-cover ken-burns"
          style={{ objectPosition: "center bottom" }}
          width={1920}
          height={1280}
        />
      </motion.div>

      {/* ── Cinematic layered overlays (scroll-reactive opacity) ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: overlayOpacity }}
      >
        {/* Left-heavy gradient (sama dengan CatalogHero) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.15) 100%)",
          }}
        />
        {/* Top-bottom gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      </motion.div>

      {/* ── Content: scroll-driven exit (x + opacity + y) ── */}
      <motion.div
        className="relative h-full container-livora flex flex-col justify-end pb-24 md:pb-32"
        style={{ x: textX, opacity: textOpacity, y: textY }}
      >
        <div className="max-w-3xl">
          {/* Company eyebrow */}
          <p
            className="text-xs uppercase tracking-[0.45em] mb-6"
            style={{
              color: "#FFFFFF",
              textShadow: "1px 1px 6px rgba(0,0,0,0.6)",
              opacity: showCompany ? 1 : 0,
              transform: showCompany ? "translateX(0)" : "translateX(-60px)",
              transition: "all 1.2s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <span className="inline-block h-px w-12 bg-background/40 align-middle mr-4" />
            {t("hero.company")}
          </p>

          {/* Headline */}
          <h1
            className="serif text-[14vw] md:text-[9vw] lg:text-[8.5rem] leading-[0.95] font-light mb-8"
            style={{
              color: "#FFFFFF",
              textShadow:
                "2px 2px 12px rgba(0,0,0,0.5), 0px 0px 30px rgba(0,0,0,0.3)",
            }}
          >
            {[
              { show: showLine1, text: t("hero.line1"), em: false },
              { show: showLine2, text: t("hero.line2"), em: false },
              { show: showLine3, text: t("hero.line3"), em: true },
            ].map(({ show, text, em }, i) => {
              const style = {
                opacity: show ? 1 : 0,
                transform: show ? "translateX(0)" : "translateX(-100px)",
                filter: show ? "blur(0px)" : "blur(10px)",
                transition: "all 1.3s cubic-bezier(0.22,1,0.36,1)",
              };
              return em ? (
                <em key={i} className="block italic font-light" style={style}>
                  {text}
                </em>
              ) : (
                <span key={i} className="block" style={style}>
                  {text}
                </span>
              );
            })}
          </h1>

          {/* Typewriter description */}
          <p
            className="text-base md:text-lg max-w-md font-light tracking-wide"
            style={{
              color: "#FFFFFF",
              textShadow: "1px 1px 6px rgba(0,0,0,0.6)",
              minHeight: "1.5em",
            }}
          >
            {displayedText}
            {displayedText.length > 0 &&
              displayedText.length < t("hero.description").length && (
                <span
                  style={{
                    display: "inline-block",
                    marginLeft: "4px",
                    animation: "blink 0.7s infinite",
                  }}
                >
                  |
                </span>
              )}
          </p>
        </div>
      </motion.div>

      <style>{`@keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }`}</style>
    </section>
  );
};