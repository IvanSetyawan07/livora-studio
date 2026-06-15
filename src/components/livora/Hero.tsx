import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import heroImg from "@/assets/hero-livora.jpg";

export const Hero = () => {
  const { t } = useTranslation();
  const [y, setY] = useState(0);
  const [showCompany, setShowCompany] = useState(false);
  const [showLine1, setShowLine1] = useState(false);
  const [showLine2, setShowLine2] = useState(false);
  const [showLine3, setShowLine3] = useState(false);
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    const onScroll = () => setY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setShowCompany(true), 200);
    const t2 = setTimeout(() => setShowLine1(true), 700);
    const t3 = setTimeout(() => setShowLine2(true), 1100);
    const t4 = setTimeout(() => setShowLine3(true), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

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
    return () => { clearTimeout(typingTimeout); clearInterval(typingInterval); };
  }, [t]);

  return (
    <section id="top" className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 will-change-transform" style={{ transform: `translate3d(0, ${y * 0.35}px, 0)` }}>
        <img src={heroImg} alt="Modern quiet luxury interior by Livora" className="h-[120%] w-full object-cover ken-burns" style={{ objectPosition: "center bottom" }} width={1920} height={1280} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/55" />
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)" }} />
      <div className="relative h-full container-livora flex flex-col justify-end pb-24 md:pb-32">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.45em] mb-6" style={{
            color: "#FFFFFF", textShadow: "1px 1px 6px rgba(0,0,0,0.6)",
            opacity: showCompany ? 1 : 0,
            transform: showCompany ? "translateX(0)" : "translateX(-60px)",
            transition: "all 1.2s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <span className="inline-block h-px w-12 bg-background/40 align-middle mr-4" />
            {t("hero.company")}
          </p>
          <h1 className="serif text-[14vw] md:text-[9vw] lg:text-[8.5rem] leading-[0.95] font-light mb-8" style={{ color: "#FFFFFF", textShadow: "2px 2px 12px rgba(0,0,0,0.5), 0px 0px 30px rgba(0,0,0,0.3)" }}>
            {[
              { show: showLine1, text: t("hero.line1"), em: false },
              { show: showLine2, text: t("hero.line2"), em: false },
              { show: showLine3, text: t("hero.line3"), em: true },
            ].map(({ show, text, em }, i) => {
              const style = { opacity: show ? 1 : 0, transform: show ? "translateX(0)" : "translateX(-100px)", filter: show ? "blur(0px)" : "blur(10px)", transition: "all 1.3s cubic-bezier(0.22,1,0.36,1)" };
              return em
                ? <em key={i} className="block italic font-light" style={style}>{text}</em>
                : <span key={i} className="block" style={style}>{text}</span>;
            })}
          </h1>
          <p className="text-base md:text-lg max-w-md font-light tracking-wide" style={{ color: "#FFFFFF", textShadow: "1px 1px 6px rgba(0,0,0,0.6)", minHeight: "1.5em" }}>
            {displayedText}
            {displayedText.length > 0 && displayedText.length < t("hero.description").length && (
              <span style={{ display: "inline-block", marginLeft: "4px", animation: "blink 0.7s infinite" }}>|</span>
            )}
          </p>
        </div>
      </div>
      <style>{`@keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }`}</style>
    </section>
  );
};