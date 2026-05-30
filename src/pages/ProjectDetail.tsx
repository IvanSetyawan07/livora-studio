import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { PageBreadcrumb } from "@/components/livora/Breadcrumb";
import { Footer } from "@/components/livora/Footer";
import { useProjectBySlug } from "@/lib/projectsApi";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { slugifyItem } from "@/data/items";
import { useReveal } from "@/hooks/useReveal";

const TAGLINES: Record<string, string> = {
  "harmony-one": "BATAM.",
  "am-house": "PONDOK INDAH KAPUK 2",
  "flytek-sinarmas": "Where focus is framed by refined craftsmanship.",
};

const ProjectDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const project = slug ? getProjectBySlug(slug) : undefined;
  const [slideIndex, setSlideIndex] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);
  useReveal();

  // Always start at top on mount / route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [slug]);

  useEffect(() => {
    setSlideIndex(0);
  }, [slug]);

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
  const displayItems = currentSlide?.items ?? [];

  const goPrev = () => setSlideIndex((i) => (i - 1 + slides.length) % slides.length);
  const goNext = () => setSlideIndex((i) => (i + 1) % slides.length);

  return (
    <>
      <Navbar />
      <main style={{ background: "#FAFAF8" }}>
        {/* HERO — full screen */}
        <section className="relative w-full overflow-hidden" style={{ height: "100vh" }}>
          <img
            src={project.img}
            alt={`${project.name} — hero`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center 40%" }}
          />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <h1
              className="serif font-light text-white leading-[1.05] text-balance"
              style={{ fontSize: "clamp(48px, 8vw, 112px)" }}
            >
              {project.name.split(" ").map((word, i) => (
                <span
                  key={i}
                  className="rise-word"
                  style={{
                    animationDelay: `${i * 0.13}s`,
                    marginRight: "0.25em",
                  }}
                >
                  {word}
                </span>
              ))}
            </h1>
            <p
              className="text-white/85 mt-6 rise-word"
              style={{
                fontSize: "16px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                animationDelay: `${project.name.split(" ").length * 0.13 + 0.25}s`,
                animationDuration: "0.9s",
              }}
            >
              {TAGLINES[project.slug] ?? "Cihampelas"}
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
          className="reveal"
          style={{
            background: "#FAFAF8",
            padding: "0 60px 32px 60px",
          }}
        >
          <h2
            className="serif font-light leading-[1.05] text-balance mb-6 transition-opacity duration-500"
            style={{ color: "#1A1A1A", fontSize: "56px", marginTop: "16px" }}
            key={displayTitle}
          >
            {displayTitle}
          </h2>
          <div className="h-px w-full bg-[#1A1A1A]/15" />
        </section>

        {/* SECTION 2 — SPLIT CONTENT */}
        <section className="grid md:grid-cols-5 reveal" style={{ transitionDelay: "0.1s" }}>
          {/* LEFT 60% — slideshow */}
          <div className="md:col-span-3 relative group" style={{ paddingLeft: "60px", background: "#FAFAF8" }}>
            <img
              key={displayImage}
              src={displayImage}
              alt={`${displayTitle} — ${project.category}`}
              className="transition-opacity duration-500 animate-fade-in"
              style={{
                width: "100%",
                height: "600px",
                objectFit: "cover",
                display: "block",
                borderRadius: 0,
              }}
            />

            {hasSlides && slides.length > 1 && (
              <>
                <button
                  onClick={goPrev}
                  aria-label="Previous slide"
                  className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  style={{
                    left: "76px",
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.9)",
                    color: "#1A1A1A",
                    border: "1px solid rgba(0,0,0,0.08)",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  ←
                </button>
                <button
                  onClick={goNext}
                  aria-label="Next slide"
                  className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  style={{
                    right: "16px",
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.9)",
                    color: "#1A1A1A",
                    border: "1px solid rgba(0,0,0,0.08)",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  →
                </button>

                <div
                  className="absolute flex gap-2"
                  style={{
                    bottom: "16px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    paddingLeft: "60px",
                  }}
                >
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSlideIndex(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      style={{
                        width: i === slideIndex ? "24px" : "8px",
                        height: "8px",
                        borderRadius: "999px",
                        background: i === slideIndex ? "#C9A97A" : "rgba(255,255,255,0.7)",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* RIGHT 40% */}
          <div
            className="md:col-span-2 flex flex-col"
            style={{
              background: "#FAFAF8",
              padding: "48px 48px",
            }}
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
              className="self-start mt-10 uppercase hover:opacity-70 transition-opacity"
              style={{
                color: "#C9A97A",
                background: "none",
                border: "none",
                fontSize: "12px",
                letterSpacing: "0.1em",
                padding: 0,
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
          </div>
        </section>

        {/* SECTION 3 — ITEMS IN THIS SPACE */}
        <section
          className="reveal"
          style={{
            background: "#FFFFFF",
            padding: "60px",
            transitionDelay: "0.15s",
          }}
        >
          <h2
            className="serif font-light"
            style={{
              color: "#1A1A1A",
              fontSize: "28px",
              marginBottom: "40px",
            }}
          >
            Items in This Space
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(Math.max(displayItems.length, 1), 5)}, 1fr)`,
              gap: "20px",
            }}
          >
            {displayItems.map((name) => (
              <Link
                key={name}
                to={`/items/${slugifyItem(name)}${project.slug ? `?from=${project.slug}` : ""}`}
                className="item-card"
                style={{
                  background: "#FAFAF8",
                  border: "1px solid #E8E4DF",
                  borderRadius: "10px",
                  padding: "28px 16px 20px",
                  textAlign: "center",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                  transition: "all 0.3s ease",
                  textDecoration: "none",
                  display: "block",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    height: "120px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ItemIllustration name={name} />
                </div>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#1A1A1A",
                    letterSpacing: "0.05em",
                    marginTop: "16px",
                  }}
                >
                  {name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default ProjectDetail;
