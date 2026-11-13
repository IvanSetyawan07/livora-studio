import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import european from "@/assets/style-european.webp";
import tropical from "@/assets/style-tropical.webp";
import industrial from "@/assets/style-industrial.webp";
import japandi from "@/assets/style-japandi.webp";
import scandinavian from "@/assets/style-scandinavian.webp";
import europeanSm from "@/assets/_opt/style-european-800.webp";
import tropicalSm from "@/assets/_opt/style-tropical-800.webp";
import industrialSm from "@/assets/_opt/style-industrial-800.webp";
import japandiSm from "@/assets/_opt/style-japandi-800.webp";
import scandinavianSm from "@/assets/_opt/style-scandinavian-800.webp";

const STYLES = [
  { img: european, sm: europeanSm, w: 1280, h: 896, words: ["Modern.", "Quiet.", "European."], name: "European" },
  { img: tropical, sm: tropicalSm, w: 1280, h: 1024, words: ["Lush.", "Warm.", "Tropical Modern"], name: "Tropical Modern" },
  { img: industrial, sm: industrialSm, w: 1280, h: 1024, words: ["Raw.", "Bold.", "Industrial."], name: "Industrial" },
  { img: japandi, sm: japandiSm, w: 1280, h: 1024, words: ["Warm.", "Minimal.", "Japandi."], name: "Japandi" },
  { img: scandinavian, sm: scandinavianSm, w: 1280, h: 1024, words: ["Light.", "Soft.", "Scandinavian."], name: "Scandinavian" },
];

export function OurStyle() {
  const { t } = useTranslation();
  const panelsCopy = t("style.panels", { returnObjects: true }) as { words: string[] }[];
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const [activeStyle, setActiveStyle] = useState(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px)", () => {
        if (!root.current || !track.current) return;
        const panels = gsap.utils.toArray<HTMLElement>(".style-panel", root.current);
        const distance = () => Math.max(0, (track.current?.scrollWidth ?? 0) - window.innerWidth);

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => "+=" + (distance() + window.innerHeight * 1.2),
            scrub: 1.1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: 10,
            onUpdate: (self) => {
              const p = self.progress;
              if (p < 0.16) return;
              const ratio = Math.min(1, Math.max(0, (p - 0.16) / 0.84));
              setActiveStyle(Math.min(STYLES.length - 1, Math.floor(ratio * STYLES.length)));
            },
          },
        });
        stRef.current = tl.scrollTrigger ?? null;

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

        return () => {
          stRef.current = null;
        };
      });
    }, root);

    return () => {
      ctx.revert();
    };
  }, []);

  const jumpDesktopStyle = (i: number) => {
    const st = stRef.current;
    if (!st) return;
    const ratio = 0.22 + (i / Math.max(1, STYLES.length - 1)) * 0.72;
    const targetY = st.start + (st.end - st.start) * ratio;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  const scrollMobileTo = (i: number) => {
    const el = mobileTrackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(STYLES.length - 1, i));
    const card = el.children[clamped] as HTMLElement | undefined;
    if (card) {
      el.scrollTo({ left: card.offsetLeft - 20, behavior: "smooth" });
    }
    setActiveStyle(clamped);
  };

  const onMobileScroll = () => {
    const el = mobileTrackRef.current;
    if (!el) return;
    const first = el.children[0] as HTMLElement | undefined;
    const step = first ? first.offsetWidth + 16 : 1;
    const idx = Math.round(el.scrollLeft / step);
    setActiveStyle(Math.max(0, Math.min(STYLES.length - 1, idx)));
  };

  return (
    <section id="style" className="relative bg-foreground text-background">
      {/* ── Mobile / Tablet interactive horizontal carousel (no scroll trap) ── */}
      <div className="lg:hidden py-16 sm:py-20">
        <div className="container-livora mb-6">
          <span className="text-[11px] uppercase tracking-[0.4em] text-background/55">{t("style.chapter")}</span>
          <h2 className="serif mt-3 text-4xl sm:text-5xl font-light leading-[1.02] text-background">
            {t("style.heading")}
          </h2>
          <p className="mt-3 max-w-md text-sm font-light text-background/65">
            {t("style.subtitle")}
          </p>

          {/* Interactive quick-jump pills */}
          <div data-lenis-prevent className="mt-6 flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {STYLES.map((s, i) => (
              <button
                key={s.name}
                type="button"
                onClick={() => scrollMobileTo(i)}
                className={`shrink-0 min-h-[40px] px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.18em] border transition-colors ${
                  activeStyle === i
                    ? "bg-background text-foreground border-background font-medium"
                    : "border-white/20 text-background/75 hover:border-white/45"
                }`}
              >
                {String(i + 1).padStart(2, "0")} · {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Swipeable cards */}
        <div
          ref={mobileTrackRef}
          data-lenis-prevent
          onScroll={onMobileScroll}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar px-5"
        >
          {STYLES.map((s, i) => (
            <article
              key={s.name}
              className="relative shrink-0 w-[85vw] sm:w-[68vw] h-[60dvh] min-h-[380px] max-h-[540px] snap-center rounded-xl overflow-hidden bg-neutral-900"
            >
              <img
                src={s.img}
                srcSet={`${s.sm} 800w, ${s.img} ${s.w}w`}
                sizes="85vw"
                alt={`${s.name} interior by Livora`}
                loading="eager"
                decoding="async"
                width={s.w}
                height={s.h}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="relative flex h-full flex-col justify-between p-6">
                <span className="self-start rounded-full border border-white/25 bg-black/30 backdrop-blur-sm px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/85">
                  {String(i + 1).padStart(2, "0")} / {String(STYLES.length).padStart(2, "0")}
                </span>
                <div>
                  {((Array.isArray(panelsCopy) && panelsCopy[i]?.words) || s.words).map((w) => (
                    <span
                      key={w}
                      className="serif block text-3xl sm:text-4xl font-light leading-[1.02] text-white"
                    >
                      {w}
                    </span>
                  ))}
                  <Link
                    to="/projects"
                    className="mt-4 inline-flex items-center gap-1.5 min-h-[44px] py-2 text-[11px] uppercase tracking-[0.22em] text-[#C9A97A] hover:text-white transition-colors"
                  >
                    Explore style <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Prev / Dots / Next controls */}
        <div className="container-livora mt-5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {STYLES.map((s, i) => (
              <button
                key={s.name}
                type="button"
                aria-label={`View ${s.name}`}
                onClick={() => scrollMobileTo(i)}
                className="h-8 flex items-center px-1"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    activeStyle === i ? "w-6 bg-background" : "w-1.5 bg-background/30"
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous style"
              onClick={() => scrollMobileTo(activeStyle - 1)}
              disabled={activeStyle === 0}
              className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white disabled:opacity-30 active:scale-95 transition"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next style"
              onClick={() => scrollMobileTo(activeStyle + 1)}
              disabled={activeStyle === STYLES.length - 1}
              className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white disabled:opacity-30 active:scale-95 transition"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop pinned horizontal showcase ── */}
      <div
        ref={root}
        className="hidden lg:block relative h-screen overflow-hidden"
      >
        <div className="style-intro pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
          <span className="text-[11px] uppercase tracking-[0.4em] text-background/50">{t("style.chapter")}</span>
          <h2 className="serif mt-4 text-[9vw] font-light leading-[0.85] text-background">
            {t("style.heading")}
          </h2>
          <p className="mt-10 max-w-md text-sm font-light text-background/60">
            {t("style.subtitle")}
          </p>
        </div>

        <div ref={track} className="absolute inset-y-0 left-0 flex h-full flex-nowrap">
          <div aria-hidden className="h-screen w-screen shrink-0" />
          {STYLES.map((s, i) => (
            <article
              key={s.name}
              className="style-panel relative h-screen w-[62vw] shrink-0"
            >
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={s.img}
                  srcSet={`${s.sm} 800w, ${s.img} ${s.w}w`}
                  sizes="62vw"
                  alt={`${s.name} interior by Livora`}
                  loading="eager"
                  decoding="async"
                  width={s.w}
                  height={s.h}
                  className="style-img h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/25 to-transparent" />
              </div>
              <div className="relative flex h-full flex-col justify-end p-14">
                <span className="mb-6 text-[11px] uppercase tracking-[0.4em] text-background/50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {((Array.isArray(panelsCopy) && panelsCopy[i]?.words) || s.words).map((w) => (
                  <span key={w} className="block overflow-hidden">
                    <span className="style-word serif block text-[4.6vw] font-light leading-[0.95] text-background">
                      {w}
                    </span>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* Desktop interactive style pills */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/15 px-2 py-1.5">
          {STYLES.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => jumpDesktopStyle(i)}
              className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.18em] transition-colors ${
                activeStyle === i ? "bg-white text-black" : "text-white/70 hover:text-white"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default OurStyle;
