import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronDown, ZoomIn } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { PageBreadcrumb } from "@/components/livora/Breadcrumb";
import { Footer } from "@/components/livora/Footer";
import { BookConsultation } from "@/components/livora/BookConsultation";
import { ImageLightbox } from "@/components/livora/ImageLightbox";
import { useProjectBySlug } from "@/lib/projectsApi";
import { trackClick, trackView } from "@/lib/adminApi";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ProjectSpaces from "@/components/livora/ProjectSpaces";

gsap.registerPlugin(ScrollTrigger);

const TAGLINES: Record<string, string> = {
  "harmoni-one": "BATAM.",
  "am-house": "PONDOK INDAH KAPUK 2",
  "flytek-sinarmas": "Where focus is framed by refined craftsmanship.",
};

const ProjectDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { project, loading } = useProjectBySlug(slug);
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroImgRef = useRef<HTMLImageElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroSubtitleRef = useRef<HTMLParagraphElement>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Always start at top on mount / route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [slug]);

  useEffect(() => {
    setSlideIndex(0);
  }, [slug]);

  // HERO ANIMATION — satu-satunya effect yang mengontrol title, subtitle, dan zoom gambar hero.
  // Urutan: (1) entrance slide-in per kata → (2) baru setelah entrance selesai total,
  // ScrollTrigger dibuat untuk animasi exit (naik + fade + zoom gambar) yang scrub & reversible.
  useEffect(() => {
    if (!project) return;

    const baseScale = (project.heroZoom ?? 100) / 100;
    const focusX = project.heroFocusX ?? 50;
    const focusY = project.heroFocusY ?? 40;

    const ctx = gsap.context(() => {
      // Base framing gambar — sepenuhnya dikelola GSAP, React tidak lagi menulis transform ke img ini
      gsap.set(heroImgRef.current, {
         scaleX: baseScale,
  scaleY: baseScale,
  transformOrigin: `${focusX}% ${focusY}%`,
      });

      const words = heroTitleRef.current?.querySelectorAll(".hero-word");

      // Set state awal secara eksplisit sebelum animasi apapun jalan
      gsap.set(words, { x: 90, opacity: 0 });
      gsap.set(heroSubtitleRef.current, { x: 70, opacity: 0 });

      // 1. Entrance — slide dari kanan, per kata (stagger)
      const mm = gsap.matchMedia();
      const entranceTl = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          // 2. Desktop only: pin + scrub hero exit so mobile touch never traps scroll
          mm.add("(min-width: 1024px)", () => {
            gsap.timeline({
              scrollTrigger: {
                trigger: heroSectionRef.current,
                start: "top top",
                end: "+=90%",
                pin: true,
                pinSpacing: true,
                scrub: 0.8,
                invalidateOnRefresh: true,
              },
            })
              .to(words, { y: -70, opacity: 0, stagger: 0.03, ease: "power2.inOut" }, 0)
              .to(heroSubtitleRef.current, { y: -50, opacity: 0, ease: "power2.inOut" }, 0)
              .to(heroImgRef.current, { scaleX: baseScale * 1.2, scaleY: baseScale * 1.2, ease: "power2.inOut" }, 0);
          });
        },
      });

      entranceTl
        .to(words, { x: 0, opacity: 1, duration: 1, stagger: 0.08 })
        .to(heroSubtitleRef.current, { x: 0, opacity: 1, duration: 0.9 }, "-=0.5");
    }, heroSectionRef);

    return () => ctx.revert();
  }, [project?.slug]);

  // Analytics: track click on mount, view duration on unmount
  const startRef = useRef<number>(Date.now());
  useEffect(() => {
    const id = project?.apiId;
    if (!id) return;
    startRef.current = Date.now();
    trackClick("project", id);
    return () => {
      const sec = Math.round((Date.now() - startRef.current) / 1000);
      trackView("project", id, sec);
    };
  }, [project?.apiId]);

  // useReveal — re-run setelah project load dari API
  useEffect(() => {
    if (!project) return;
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [project]); // ← re-run setiap kali project berubah

  // Scroll-down indicator: show after 2s idle, hide on scroll/movement past hero
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const clearIdle = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const scheduleShow = () => {
      clearIdle();
      if (window.scrollY < 80) {
        idleTimer = setTimeout(() => {
          if (window.scrollY < 80) setShowScrollHint(true);
        }, 2000);
      }
    };

    const onActivity = () => {
      setShowScrollHint(false);
      scheduleShow();
    };

    const onScroll = () => {
      if (window.scrollY > 80) {
        setShowScrollHint(false);
        clearIdle();
      } else {
        setShowScrollHint(false);
        scheduleShow();
      }
    };

    scheduleShow();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("touchstart", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);

    return () => {
      clearIdle();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [slug]);

  useEffect(() => {
    if (project) {
      document.title = `${project.name} — LIVORA`;
      const meta =
        document.querySelector('meta[name="description"]') ??
        (() => {
          const m = document.createElement("meta");
          m.setAttribute("name", "description");
          document.head.appendChild(m);
          return m;
        })();
      meta.setAttribute(
        "content",
        `${project.name} — ${project.category} in ${project.location}. Interior design by LIVORA.`,
      );
    }
  }, [project]);

  if (!project) {
    // Still resolving from API — render blank instead of flashing "not found"
    if (loading) {
      return <main className="min-h-screen bg-background" />;
    }
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="serif text-4xl font-light mb-4">Project not found</p>
          <Link to="/" className="text-xs uppercase tracking-[0.3em] underline-grow">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const handleBack = () => {
    navigate("/#projects");
  };

  const slides = project.slides ?? [];
  const hasSlides = slides.length > 0;
  const currentSlide = hasSlides ? slides[slideIndex % slides.length] : null;
  const displayTitle = currentSlide?.title ?? project.name;
  const displayImage = currentSlide?.image ?? project.img;

  const goPrev = () => setSlideIndex((i) => (i - 1 + slides.length) % slides.length);
  const goNext = () => setSlideIndex((i) => (i + 1) % slides.length);

  return (
    <>
      <Navbar />
      <main style={{ background: "#FAFAF8" }}>
        {/* HERO — full screen */}
        <section ref={heroSectionRef} className="relative w-full overflow-hidden h-[100svh] md:h-screen">
          <img
            ref={heroImgRef}
            src={project.img}
            alt={`${project.name} — hero`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: `${project.heroFocusX ?? 50}% ${project.heroFocusY ?? 40}%`,
            }}
            onLoad={() => ScrollTrigger.refresh()}
          />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <h1
              ref={heroTitleRef}
              className="serif font-light text-white leading-[1.05] text-balance"
              style={{ fontSize: "clamp(36px, 8vw, 112px)" }}
            >
              {project.name.split(" ").map((word, i) => (
                <span key={i} className="hero-word inline-block" style={{ marginRight: "0.25em" }}>
                  {word}
                </span>
              ))}
            </h1>
            <p
              ref={heroSubtitleRef}
              className="text-white/85 mt-6 text-center"
              style={{
                fontSize: "14px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              {TAGLINES[project.slug] ?? project.subtitle ?? ""}
            </p>
          </div>

          {/* Scroll-down indicator */}
          {showScrollHint && (
            <div
              className="scroll-indicator absolute z-10 pointer-events-none"
              style={{
                bottom: "32px",
                left: "50%",
                transform: "translateX(-50%)",
              }}
              aria-hidden="true"
            >
              <div className="scroll-indicator-inner">
                <ChevronDown size={36} color="#FFFFFF" strokeWidth={1.5} />
              </div>
            </div>
          )}
        </section>

        {/* SECTION 1 — BREADCRUMB + HERO TITLE */}
        <PageBreadcrumb
          items={[{ label: "Home", to: "/" }, { label: "Projects", to: "/projects" }, { label: project.name }]}
        />

        <section
          className="reveal px-6 md:px-[60px] pb-8"
          style={{
            background: "#FAFAF8",
          }}
        >
          <h2
            className="serif font-light leading-[1.05] text-balance mb-6 transition-opacity duration-500"
            style={{ color: "#1A1A1A", fontSize: "clamp(32px, 6vw, 56px)", marginTop: "16px" }}
            key={displayTitle}
          >
            {displayTitle}
          </h2>
          <div className="h-px w-full bg-[#1A1A1A]/15" />
        </section>

        {/* SECTION 2 — SPLIT CONTENT */}
        <section className="grid grid-cols-1 md:grid-cols-5 reveal" style={{ transitionDelay: "0.1s" }}>
          {/* LEFT 60% — slideshow (swipeable + tap to zoom) */}
          <div
            className="md:col-span-3 relative group px-5 sm:px-6 md:pl-[60px] md:pr-0"
            style={{ background: "#FAFAF8" }}
          >
            <div
              onTouchStart={(e) => {
                touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }}
              onTouchEnd={(e) => {
                const start = touchStartRef.current;
                touchStartRef.current = null;
                if (!start || slides.length <= 1) return;
                const dx = e.changedTouches[0].clientX - start.x;
                const dy = e.changedTouches[0].clientY - start.y;
                if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
                  if (dx < 0) goNext();
                  else goPrev();
                }
              }}
              className="relative overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label={`View ${displayTitle} fullscreen`}
                className="block w-full cursor-zoom-in text-left"
              >
                <img
                  key={displayImage}
                  src={displayImage}
                  alt={`${displayTitle} — ${project.category}`}
                  className="transition-opacity duration-500 animate-fade-in w-full h-[320px] sm:h-[440px] md:h-[600px] object-cover block"
                />
                <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-sm text-white px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <ZoomIn size={12} /> Zoom
                </span>
              </button>

              {hasSlides && slides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous slide"
                    className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 left-3 md:left-4 w-11 h-11 rounded-full bg-white/90 text-[#1A1A1A] border border-black/10 shadow-sm active:scale-95"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Next slide"
                    className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 right-3 md:right-4 w-11 h-11 rounded-full bg-white/90 text-[#1A1A1A] border border-black/10 shadow-sm active:scale-95"
                  >
                    →
                  </button>

                  <div
                    className="absolute flex gap-1.5 bottom-3 left-1/2 -translate-x-1/2"
                    aria-hidden="false"
                  >
                    {slides.map((_, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setSlideIndex(i)}
                        aria-label={`Go to slide ${i + 1}`}
                        className="py-2 px-0.5 flex items-center"
                      >
                        <span
                          style={{
                            width: i === slideIndex ? "24px" : "8px",
                            height: "8px",
                            borderRadius: "999px",
                            background: i === slideIndex ? "#C9A97A" : "rgba(255,255,255,0.75)",
                            transition: "all 0.3s ease",
                            display: "block",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT 40% */}
          <div
            className="md:col-span-2 flex flex-col px-6 py-10 md:px-12 md:py-12"
            style={{ background: "#FAFAF8" }}
          >
            <p
              className="uppercase mb-4"
              style={{
                color: "#C9A97A",
                fontSize: "11px",
                letterSpacing: "0.2em",
              }}
            >
              {project.category}
            </p>
            <p
              style={{
                color: "#4A4A4A",
                lineHeight: 1.8,
                fontSize: "15px",
              }}
            >
              {project.description}
            </p>

            <div className="h-px w-full bg-[#1A1A1A]/15 my-8" />

            <div className="grid grid-cols-2 gap-x-6 gap-y-7">
              {[
                { label: "LOCATION", value: project.location },
                { label: "YEAR", value: project.year },
                { label: "SCOPE", value: project.scope },
              ].map((d) => (
                <div key={d.label}>
                  <p
                    className="uppercase"
                    style={{
                      color: "#C9A97A",
                      fontSize: "10px",
                      letterSpacing: "0.15em",
                    }}
                  >
                    {d.label}
                  </p>
                  <p
                    style={{
                      color: "#1A1A1A",
                      fontSize: "14px",
                      marginTop: "4px",
                    }}
                  >
                    {d.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex-1" />

            <button
              onClick={handleBack}
              className="self-start mt-8 inline-flex items-center min-h-[44px] py-2 uppercase hover:opacity-70 transition-opacity"
              style={{
                color: "#C9A97A",
                background: "none",
                border: "none",
                fontSize: "12px",
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
          </div>
        </section>

        {/* SECTION 3 — FLOOR PLANS & ROOMS */}
        <ProjectSpaces projectId={project.apiId} />

        <BookConsultation />
      </main>
      <ImageLightbox
        open={lightboxOpen}
        images={
          hasSlides
            ? slides.map((s) => ({ src: s.image, alt: s.title ?? project.name }))
            : [{ src: project.img, alt: project.name }]
        }
        startIndex={hasSlides ? slideIndex % slides.length : 0}
        onClose={() => setLightboxOpen(false)}
      />
      <Footer />
    </>
  );
};

export default ProjectDetail;