import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { getProjectBySlug } from "@/data/projects";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { slugifyItem } from "@/data/items";

const ProjectDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const project = slug ? getProjectBySlug(slug) : undefined;
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    setSlideIndex(0);
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

  const goPrev = () =>
    setSlideIndex((i) => (i - 1 + slides.length) % slides.length);
  const goNext = () => setSlideIndex((i) => (i + 1) % slides.length);

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: "80px", background: "#FAFAF8" }}>
        {/* SECTION 1 — BREADCRUMB + HERO TITLE */}
        <nav
          style={{
            padding: "100px 60px 0px 60px",
            fontSize: "12px",
            color: "#C9A97A",
            letterSpacing: "0.1em",
          }}
        >
          <Link to="/projects" className="hover:opacity-70">Projects</Link>
          <span style={{ margin: "0 10px" }}>/</span>
          <span style={{ color: "#1A1A1A" }}>{project.name}</span>
        </nav>

        <section
          style={{
            background: "#FAFAF8",
            padding: "0 60px 32px 60px",
          }}
        >
          <h1
            className="serif font-light leading-[1.05] text-balance mb-6 transition-opacity duration-500"
            style={{ color: "#1A1A1A", fontSize: "56px", marginTop: "16px" }}
            key={displayTitle}
          >
            {displayTitle}
          </h1>
          <div className="h-px w-full bg-[#1A1A1A]/15" />
        </section>

        {/* SECTION 2 — SPLIT CONTENT */}
        <section className="grid md:grid-cols-5">
          {/* LEFT 60% — slideshow */}
          <div
            className="md:col-span-3 relative group"
            style={{ paddingLeft: "60px", background: "#FAFAF8" }}
          >
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
                        background:
                          i === slideIndex ? "#C9A97A" : "rgba(255,255,255,0.7)",
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
                { label: "AREA", value: project.area },
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
          style={{
            background: "#FFFFFF",
            padding: "60px",
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
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "20px",
            }}
          >
            {items.map((name) => (
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
