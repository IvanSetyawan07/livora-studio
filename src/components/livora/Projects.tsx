import { useMemo, useState, useEffect, useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import {
  registerGsap,
  gsap,
  ScrollTrigger,
  SplitText,
  EASE,
  DUR,
  STAGGER,
  SCRUB,
  prefersReducedMotion,
} from "@/lib/motionTokens";
import { useHighlightProjects, useAllProjects } from "@/lib/projectsApi";

export const Projects = () => {
  const highlights = useHighlightProjects();
  const all = useAllProjects();
  const [filter, setFilter] = useState("All");

  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const introRef = useRef<HTMLDivElement | null>(null);
  const headlineRef = useRef<HTMLHeadingElement | null>(null);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(all.map((p) => p.category).filter(Boolean)))],
    [all],
  );

  const filtered = useMemo(() => {
    if (filter === "All") return highlights;
    return all.filter((p) => p.category === filter);
  }, [filter, highlights, all]);

  /* ---------- Intro reveal ---------- */
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    registerGsap();
    const scope = introRef.current;
    const headline = headlineRef.current;
    if (!scope || !headline) return;

    const ctx = gsap.context(() => {
      let split: SplitText | null = null;
      try {
        split = new SplitText(headline, { type: "lines", linesClass: "gsap-line" });
        split.lines.forEach((line) => {
          const wrap = document.createElement("span");
          wrap.style.display = "block";
          wrap.style.overflow = "hidden";
          line.parentNode?.insertBefore(wrap, line);
          wrap.appendChild(line);
        });
      } catch {
        /* noop */
      }

      const tl = gsap.timeline({
        scrollTrigger: { trigger: scope, start: "top 80%", once: true },
      });

      tl.from(scope.querySelectorAll<HTMLElement>("[data-intro-eyebrow]"), {
        autoAlpha: 0,
        y: 16,
        duration: DUR.textFast,
        ease: EASE.text,
      });

      if (split?.lines?.length) {
        tl.from(
          split.lines,
          { yPercent: 115, duration: DUR.text, ease: EASE.text, stagger: STAGGER.lines },
          "-=0.5",
        );
      } else {
        tl.from(headline, { autoAlpha: 0, y: 24, duration: DUR.text, ease: EASE.text }, "-=0.5");
      }

      tl.from(
        scope.querySelectorAll<HTMLElement>("[data-intro-item]"),
        {
          autoAlpha: 0,
          y: 18,
          duration: DUR.textFast,
          ease: EASE.text,
          stagger: STAGGER.items,
        },
        "-=0.55",
      );

      return () => split?.revert();
    }, scope);

    return () => ctx.revert();
  }, []);

  /* ---------- Master Horizontal Scroll & Cinematic Focus System ---------- */
  useLayoutEffect(() => {
    if (prefersReducedMotion() || typeof window === "undefined") return;
    registerGsap();

    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1px)", () => {
        const getDistance = () => Math.max(0, track.scrollWidth - window.innerWidth);
        // Sengaja hanya menargetkan `.project-card` — INTRO & ClosingPanel
        // TIDAK boleh ikut sistem scale/opacity/rotation di bawah ini.
        // Mereka hanya berpindah lewat translateX milik `track` (lihat tween di bawah).
        const cards = gsap.utils.toArray<HTMLElement>(".project-card", track);

        if (!cards.length) return;

        // Inisialisasi setter & style dasar card (Zero Rotation, Clean Vertical Layout)
        const cardsData = cards.map((card) => {
          const media = card.querySelector<HTMLElement>(".card-media");
          gsap.set(card, {
            transformPerspective: 1200,
            transformOrigin: "50% 50%",
            willChange: "transform, opacity",
            force3D: true,
          });
          return {
            el: card,
            media,
            setScale: gsap.quickSetter(card, "scale"),
            setOpacity: gsap.quickSetter(card, "opacity"),
            setRotation: gsap.quickSetter(card, "rotation", "deg"), // Dikunci 0
            setY: gsap.quickSetter(card, "y", "px"),
            setX: gsap.quickSetter(card, "x", "px"),
            baseX: 0,
            cur: { f: 0 },
          };
        });

        let trackBaseLeft = 0;
        let focalPoint = window.innerWidth * 0.55;
        let maxFocusDistance = window.innerWidth * 0.7;

        const updateMetrics = () => {
          const currentX = gsap.getProperty(track, "x") as number;
          gsap.set(track, { x: 0 });

          const trackRect = track.getBoundingClientRect();
          trackBaseLeft = trackRect.left;
          focalPoint = window.innerWidth * 0.55;
          maxFocusDistance = window.innerWidth * 0.7;

          cardsData.forEach((data) => {
            const cardRect = data.el.getBoundingClientRect();
            data.baseX = (cardRect.left - trackRect.left) + cardRect.width / 2;
          });

          gsap.set(track, { x: currentX });
        };

        ScrollTrigger.addEventListener("refreshInit", updateMetrics);
        updateMetrics();

        // 1) Master Tween Horizontal (Intro ikut bergerak natural dalam satu track)
        const tween = gsap.to(track, {
          x: () => -getDistance(),
          ease: "none",
        });

        const st = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => "+=" + getDistance(),
          pin: true,
          scrub: SCRUB || 0.8,
          animation: tween,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        });

        // 2) Ticker-driven Continuous Interpolation Loop (Smooth Up/Down, No Hard Popping)
        const FOCUS_RATIO = 0.55;
        const clamp01 = gsap.utils.clamp(0, 1);
        const easeFocus = gsap.parseEase("power2.out");

        const measure = () => {
          const currentTrackX = gsap.getProperty(track, "x") as number;
          const vw = window.innerWidth;
          const focal = vw * FOCUS_RATIO;
          const span = (cards[0]?.offsetWidth || vw * 0.4) * 1.15;

          // Secondary micro-interaction velocity energy
          const velocity = Math.abs(st.getVelocity()) || 0;
          const energy = clamp01(velocity / 2600);

          let bestIdx = 0;
          let minAbsDist = Infinity;

          for (let i = 0; i < cardsData.length; i++) {
            const data = cardsData[i];
            const cardScreenX = trackBaseLeft + currentTrackX + data.baseX;
            const distToFocus = cardScreenX - focal;
            const absDist = Math.abs(distToFocus);

            if (absDist < minAbsDist) {
              minAbsDist = absDist;
              bestIdx = i;
            }

            const signed = (cardScreenX - focal) / span;
            const dist = Math.abs(signed);
            const fTarget = easeFocus(clamp01(1 - dist));

            // Lerp halus untuk mencegah snapping/jumping
            data.cur.f += (fTarget - data.cur.f) * 0.14;
            const f = data.cur.f;

            // Target Values: Scale (0.84 - 1.10), Lift Y (-28px), Opacity (0.82 - 1)
            const scale = gsap.utils.interpolate(0.84, 1.10, f) + energy * 0.01;
            const liftY = gsap.utils.interpolate(16, -28, f); // Focused card naik -28px
            const opacity = gsap.utils.interpolate(0.82, 1, f); // dulu 0.45 — kegelapan di foto gelap, sekarang lebih ringan
            const subX = gsap.utils.clamp(-6, 6, signed * 6); // Subtle horizontal offset maks 6px

            data.setScale(scale);
            data.setOpacity(opacity);
            data.setY(liftY);
            data.setRotation(0); // Sesuai instruksi: STRICTLY NO ROTATION
            data.setX(subX);

            // Z-Index hierarchy
            data.el.style.zIndex = String(50 + Math.round(f * 50));
          }
        };

        gsap.ticker.add(measure);
        measure();

        // 3) Cinematic Image Parallax di dalam card-photo
        cards.forEach((card) => {
          const img = card.querySelector<HTMLElement>(".card-photo");
          if (img) {
            gsap.fromTo(
              img,
              { xPercent: -5 },
              {
                xPercent: 5,
                ease: "none",
                scrollTrigger: {
                  trigger: card,
                  containerAnimation: tween,
                  start: "left right",
                  end: "right left",
                  scrub: true,
                },
              }
            );
          }

          const desc = card.querySelector<HTMLElement>(".card-description");
          if (desc) {
            gsap.from(desc, {
              autoAlpha: 0,
              y: 12,
              duration: DUR.card,
              ease: EASE.card,
              scrollTrigger: {
                trigger: card,
                containerAnimation: tween,
                start: "left 30%",
                toggleActions: "play reverse play reverse",
              },
            });
          }
        });

        const onResize = () => {
          ScrollTrigger.refresh();
        };
        window.addEventListener("resize", onResize);

        return () => {
          gsap.ticker.remove(measure);
          window.removeEventListener("resize", onResize);
          ScrollTrigger.removeEventListener("refreshInit", updateMetrics);
          st.kill();
          tween.kill();
        };
      });
    }, section);

    const timeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      clearTimeout(timeout);
      ctx.revert();
    };
  }, [filtered]);

  /* ---------- Filter Change Crossfade ---------- */
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const track = trackRef.current;
    if (!track) return;

    const cards = track.querySelectorAll<HTMLElement>(".project-card");
    if (!cards.length) return;

    gsap.fromTo(
      cards,
      { autoAlpha: 0 },
      {
        autoAlpha: 1,
        duration: DUR.card,
        ease: EASE.card,
        stagger: STAGGER.items,
        onComplete: () => ScrollTrigger.refresh(),
      },
    );

    const t = setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => clearTimeout(t);
  }, [filter]);

  const Card = ({ p, i }: { p: (typeof filtered)[number]; i: number }) => (
    <article
      className="project-card shrink-0 w-[82vw] sm:w-[62vw] lg:w-[38vw] xl:w-[34vw] mt-0 lg:mt-[var(--card-offset)] relative"
      style={{ ["--card-offset" as string]: i % 2 === 1 ? "5rem" : i % 3 === 2 ? "2.5rem" : "0rem" }}
    >
      <Link to={`/projects/${p.slug}`} className="group block focus:outline-none">
        <div
          className="card-media relative overflow-hidden will-change-transform"
          style={{ height: "min(72vh, 760px)" }}
        >
          <img
            src={p.img}
            alt={`${p.name} — ${p.category}${p.location ? `, ${p.location}` : ""}`}
            loading="lazy"
            decoding="async"
            className="card-photo w-[116%] h-full object-cover max-w-none transition-transform duration-700 group-hover:scale-[1.04]"
          />

          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.28) 42%, transparent 68%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            style={{ background: "rgba(0,0,0,0.22)" }}
          />

          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <p className="text-[10px] uppercase tracking-[0.32em] text-white/75 mb-3 transition-all duration-500 lg:opacity-0 lg:-translate-y-2 lg:group-hover:opacity-100 lg:group-hover:translate-y-0">
              {p.category}{p.location ? ` — ${p.location}` : ""}{p.year ? ` · ${p.year}` : ""}
            </p>
            <h3 className="serif text-3xl md:text-4xl font-light leading-tight text-white">
              {p.name}
            </h3>
            {p.description && (
              <p className="card-description mt-3 max-w-[42ch] text-sm font-light text-white/80 line-clamp-2 transition-all duration-700 delay-75 lg:translate-y-3 lg:text-white/0 lg:group-hover:translate-y-0 lg:group-hover:text-white/80">
                {p.description}
              </p>
            )}
            <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#C9A97A] transition-all duration-700 delay-150 lg:opacity-0 lg:translate-y-2 lg:group-hover:opacity-100 lg:group-hover:translate-y-0">
              View Project ↗
            </span>
          </div>
        </div>
      </Link>
    </article>
  );

  const ClosingPanel = () => (
    <div className="shrink-0 w-[80vw] sm:w-[60vw] lg:w-[34vw] snap-center flex flex-col justify-center">
      <p className="serif italic text-2xl md:text-3xl font-light text-foreground/55 max-w-[24ch]">
        Every room here began as a quiet conversation.
      </p>
      <Link
        to="/projects"
        className="mt-8 inline-block text-[11px] uppercase tracking-[0.3em] text-foreground/80 hover:text-foreground underline-grow"
      >
        See all projects →
      </Link>
    </div>
  );

  const reduced = prefersReducedMotion();

  const IntroCopy = () => (
    <>
      <p className="text-[10px] md:text-xs uppercase tracking-[0.45em] text-foreground/60 mb-5">
        <span className="divider-line" />
        Our Projects
      </p>
      <h2 className="serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.05] text-balance">
        Selected works, <em className="italic text-[#C9A97A]">crafted to last.</em>
      </h2>
      <p className="mt-5 text-sm text-foreground/60 max-w-[52ch]">
        Scroll sideways to walk through the architecture's&rsquo;s most recent rooms.
      </p>
      <div className="flex gap-2 mt-8 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            aria-pressed={filter === c}
            className={`text-[10px] uppercase tracking-[0.3em] px-5 py-2.5 border transition-all duration-500 ${
              filter === c
                ? "bg-foreground text-background border-foreground"
                : "border-border text-foreground/70 hover:border-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </>
  );

  if (reduced) {
    return (
      <section id="projects" className="py-28 md:py-40">
        <div className="container-livora mb-12">
          <IntroCopy />
        </div>
        <div className="container-livora grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in">
          {filtered.map((p) => (
            <div key={p.slug} className="w-full">
              <Card p={p} i={0} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="container-livora pt-24 pb-10 lg:hidden">
        <IntroCopy />
      </div>

      <section
        id="projects"
        ref={sectionRef}
        className="h-screen flex flex-col justify-center overflow-hidden py-10 lg:py-32"
      >
        <div>
          <div ref={trackRef} className="flex w-max items-center lg:items-start gap-6 lg:gap-10 xl:gap-14 pl-6 lg:pl-[max(1.5rem,calc((100vw-1680px)/2+2rem))] pr-[18vw] lg:pr-[12vw] will-change-transform">
              {/*
                INTRO = "slide" pertama di dalam track horizontal yang sama dengan project cards.
                WAJIB tetap flex child biasa dari `trackRef`.
                DILARANG KERAS memberi position: sticky / fixed di sini atau di parent-nya —
                pergerakannya harus 100% murni ikut translateX() milik `track` (lihat master
                tween "1) Master Tween Horizontal" di atas). Intro juga sengaja TIDAK dimasukkan
                ke `.project-card`, jadi ia tidak ikut sistem scale/opacity/rotation cinematic
                focus — ukurannya tetap normal, hanya posisinya yang bergeser bersama track.
              */}
              <div
                ref={introRef}
                className="hidden lg:flex shrink-0 w-[34vw] xl:w-[30vw] flex-col justify-center pr-10"
                style={{ minHeight: "min(78vh, 760px)" }}
              >
                <div data-intro-eyebrow>
                  <p className="text-[10px] md:text-xs uppercase tracking-[0.45em] text-foreground/60 mb-5">
                    <span className="divider-line" />
                    Our Projects
                  </p>
                </div>
                <h2
                  ref={headlineRef}
                  className="serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.05] text-balance"
                >
                  Selected works, <em className="italic text-[#C9A97A]">crafted to last.</em>
                </h2>
                <p data-intro-item className="mt-5 text-sm text-foreground/60 max-w-[52ch]">
                  Scroll sideways to walk through the architecture&rsquo;s most recent rooms.
                </p>
                <div data-intro-item className="flex gap-2 mt-8 flex-wrap">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFilter(c)}
                      aria-pressed={filter === c}
                      className={`text-[10px] uppercase tracking-[0.3em] px-5 py-2.5 border transition-all duration-500 ${
                        filter === c
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-foreground/70 hover:border-foreground hover:text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {filtered.map((p, i) => (
                <Card key={p.slug} p={p} i={i} />
              ))}
            <ClosingPanel />
          </div>
        </div>
      </section>
    </>
  );
};