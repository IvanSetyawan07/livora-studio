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
  const [focusIndex, setFocusIndex] = useState(0);

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

  /* ---------- Intro reveal (desktop copy only — see introRef below) ---------- */
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

  /* ---------- Horizontal scroll-jacked gallery (desktop only) ---------- */
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    if (typeof window === "undefined") return;
    registerGsap();

    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1px)", () => {
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: EASE.scrub,
      });

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => "+=" + distance(),
        pin: true,
        scrub: SCRUB,
        animation: tween,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      });

      const cards = gsap.utils.toArray<HTMLElement>(".project-card", track);

      cards.forEach((card, i) => {
        // contextual description reveal, synced to horizontal position
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

        // subtle parallax: photo moves slower than the card
        const img = card.querySelector<HTMLElement>(".card-photo");
        if (img) {
          gsap.fromTo(
            img,
            { xPercent: -8 },
            {
              xPercent: 8,
              ease: EASE.scrub,
              scrollTrigger: {
                trigger: card,
                containerAnimation: tween,
                start: "left right",
                end: "right left",
                scrub: true,
              },
            },
          );
        }

        // gentle physicality: the whole card drifts + rotates as it crosses the track
        gsap.fromTo(
          card,
          { rotate: 1.2, yPercent: 3 },
          {
            rotate: -1.2,
            yPercent: -3,
            ease: EASE.scrub,
            scrollTrigger: {
              trigger: card,
              containerAnimation: tween,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          },
        );

        // breathing scale: card grows as it reaches the centre of the viewport
        const media = card.querySelector<HTMLElement>(".card-media");
        if (media) {
          gsap.fromTo(
            media,
            { scale: 0.88, filter: "brightness(0.82)" },
            {
              scale: 1,
              filter: "brightness(1)",
              ease: "none",
              immediateRender: false,
              scrollTrigger: {
                trigger: card,
                containerAnimation: tween,
                start: "left right",
                end: "center center",
                scrub: true,
              },
            },
          );
          gsap.fromTo(
            media,
            { scale: 1, filter: "brightness(1)" },
            {
              scale: 0.88,
              filter: "brightness(0.82)",
              ease: "none",
              immediateRender: false,
              scrollTrigger: {
                trigger: card,
                containerAnimation: tween,
                start: "center center",
                end: "right left",
                scrub: true,
              },
            },
          );
        }

        // focus tracking
        ScrollTrigger.create({
          trigger: card,
          containerAnimation: tween,
          start: "left 55%",
          end: "right 55%",
          onToggle: (self) => self.isActive && setFocusIndex(i),
        });
      });

      return () => {
        st.kill();
        tween.kill();
      };
    });

    ScrollTrigger.refresh();
    return () => mm.revert();
  }, [filtered]);

  /* ---------- Crossfade on filter change + recompute track ---------- */
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const track = trackRef.current;
    if (!track) return;
    setFocusIndex(0);
    const cards = track.querySelectorAll<HTMLElement>(".project-card");
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

  /* ---------- Mobile focus tracking (native scroll-snap) ---------- */
  const mobileScrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = mobileScrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const cards = Array.from(el.querySelectorAll<HTMLElement>(".project-card"));
      if (!cards.length) return;
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      setFocusIndex(best);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [filtered]);

  /**
   * Card — full-bleed photo, all copy overlaid at the bottom on a floor
   * gradient. Name + eyebrow are always visible; description and the "View
   * Project" tag reveal on hover, matching the reference treatment.
   */
  const Card = ({ p, i }: { p: (typeof filtered)[number]; i: number }) => (
    <article
      className="project-card shrink-0 w-[80vw] sm:w-[62vw] lg:w-[38vw] xl:w-[34vw] snap-center"
      style={{ marginTop: i % 2 === 1 ? "5rem" : i % 3 === 2 ? "2.5rem" : "0rem" }}
    >
      <Link to={`/projects/${p.slug}`} className="group block focus:outline-none">
        <div className="relative overflow-hidden" style={{ height: "min(78vh, 760px)" }}>
          <img
            src={p.img}
            alt={`${p.name} — ${p.category}${p.location ? `, ${p.location}` : ""}`}
            loading="lazy"
            decoding="async"
            className="card-photo w-[116%] h-full object-cover max-w-none transition-transform duration-700 group-hover:scale-[1.04]"
          />

          {/* permanent floor gradient — keeps the overlaid copy legible */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.28) 42%, transparent 68%)",
            }}
          />
          {/* hover-only darken, so the description reads cleanly on any photo */}
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            style={{ background: "rgba(0,0,0,0.22)" }}
          />

          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <p className="text-[10px] uppercase tracking-[0.32em] text-white/75 mb-3">
              {p.category}{p.location ? ` — ${p.location}` : ""}{p.year ? ` · ${p.year}` : ""}
            </p>
            <h3 className="serif text-3xl md:text-4xl font-light leading-tight text-white">
              {p.name}
            </h3>
            {p.description && (
              <p className="card-description mt-3 max-w-[42ch] translate-y-3 text-sm font-light text-white/0 line-clamp-2 transition-all duration-700 group-hover:translate-y-0 group-hover:text-white/80">
                {p.description}
              </p>
            )}
            <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#C9A97A]">
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

  // Shared intro copy (heading, description, filter tabs) — rendered once,
  // statically, for mobile/reduced-motion, and once, animated, as the first
  // column of the desktop pinned track (see introRef below).
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
        Scroll sideways to walk through the studio&rsquo;s most recent rooms.
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

  return (
    <section
      id="projects"
      ref={sectionRef}
      className={reduced ? "py-28 md:py-40" : "lg:h-screen lg:flex lg:flex-col lg:justify-center py-28 md:py-32 overflow-hidden"}
    >
      {/* Mobile/tablet + reduced-motion: intro sits above, full-width (no room to sit beside cards) */}
      <div className={reduced ? "container-livora mb-12" : "container-livora mb-12 lg:hidden"}>
        <IntroCopy />
      </div>

      {reduced ? (
        <div className="container-livora grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in">
          {filtered.map((p, i) => (
            <div key={p.slug} className="w-full">
              <Card p={p} i={0} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Desktop: intro is the first column of the pinned horizontal track, not a stacked block */}
          <div className="hidden lg:block">
            <div ref={trackRef} className="flex items-start gap-10 xl:gap-14 pl-[max(1.5rem,calc((100vw-1680px)/2+2rem))] pr-[12vw] will-change-transform">
              <div
                ref={introRef}
                className="shrink-0 w-[34vw] xl:w-[30vw] flex flex-col justify-center pr-10"
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
                  Scroll sideways to walk through the studio&rsquo;s most recent rooms.
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

          {/* Mobile / tablet: native horizontal scroll-snap */}
          <div
            ref={mobileScrollerRef}
            className="lg:hidden flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth px-6 pb-4 [-webkit-overflow-scrolling:touch]"
          >
            {filtered.map((p, i) => (
              <Card key={p.slug} p={p} i={0} />
            ))}
            <ClosingPanel />
          </div>
        </>
      )}

      {/* Progress indicator — single thin fill line */}
      {!reduced && filtered.length > 0 && (
        <div className="container-livora mt-8">
          <div className="h-px w-full bg-border relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[#C9A97A] transition-all duration-500"
              style={{
                width: `${((Math.min(focusIndex, filtered.length - 1) + 1) / filtered.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
};