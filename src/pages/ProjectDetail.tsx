import { useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { getProjectBySlug } from "@/data/projects";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { slugifyItem } from "@/data/items";

const items = [
  "Accent Chair",
  "Lounge Sofa",
  "Ottoman",
  "Side Table",
  "Floor Lamp",
  "Sectional Sofa",
  "Arm Chair",
  "Console Table",
  "Dining Table",
  "Pendant Light",
];

const ProjectDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const project = slug ? getProjectBySlug(slug) : undefined;

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

  return (
    <>
      <Navbar />
      <main>
        {/* SECTION 1 — HERO TITLE */}
        <section
          style={{
            background: "#FAFAF8",
            padding: "48px 60px 32px 60px",
          }}
        >
          <h1
            className="serif font-light leading-[1.05] text-balance mb-6"
            style={{ color: "#1A1A1A", fontSize: "56px" }}
          >
            {project.name}
          </h1>
          <div className="h-px w-full bg-[#1A1A1A]/15" />
        </section>

        {/* SECTION 2 — SPLIT CONTENT */}
        <section className="grid md:grid-cols-5">
          {/* LEFT 60% */}
          <div className="md:col-span-3">
            <img
              src={project.img}
              alt={`${project.name} — ${project.category}`}
              style={{
                width: "100%",
                height: "600px",
                objectFit: "cover",
                display: "block",
                borderRadius: 0,
              }}
            />
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
