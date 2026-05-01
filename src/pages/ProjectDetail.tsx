import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { getProjectBySlug } from "@/data/projects";

const items = [
  "Accent Chair",
  "Armless Sofa",
  "Ottoman",
  "Arm Rest Sofa",
  "2-Seater Sofa",
  "3-Seater Sofa",
  "Corner Sofa",
  "Sectional Sofa",
  "Dining Table",
  "Side Table",
  "Floor Lamp",
  "Console Table",
];

const ItemIcon = ({ name }: { name: string }) => (
  <svg
    viewBox="0 0 80 80"
    className="w-full h-20 text-[#C9A97A]"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-label={name}
  >
    {/* Generic furniture silhouette — minimal editorial line */}
    <rect x="14" y="34" width="52" height="22" rx="3" />
    <path d="M14 56v8M66 56v8" />
    <path d="M18 34v-6a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v6" />
  </svg>
);

const ProjectDetail = () => {
  const { slug } = useParams();
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

  return (
    <>
      <Navbar />
      <main className="bg-background">
        {/* TOP — split layout */}
        <section className="grid md:grid-cols-5 min-h-screen">
          {/* LEFT 60% */}
          <div className="md:col-span-3 relative h-[60vh] md:h-screen">
            <img
              src={project.img}
              alt={`${project.name} — ${project.category}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* RIGHT 40% */}
          <div
            className="md:col-span-2 flex flex-col justify-center"
            style={{ background: "#FAFAF8", padding: "60px 48px" }}
          >
            <Link
              to="/"
              className="text-[10px] uppercase tracking-[0.3em] text-[#1A1A1A]/60 hover:text-[#1A1A1A] mb-10 inline-block"
            >
              ← Back
            </Link>

            <p
              className="uppercase mb-5"
              style={{
                color: "#C9A97A",
                letterSpacing: "0.15em",
                fontSize: "11px",
              }}
            >
              {project.category}
            </p>

            <h1
              className="serif font-light leading-[1.05] text-balance text-5xl md:text-6xl mb-8"
              style={{ color: "#1A1A1A" }}
            >
              {project.name}
            </h1>

            <div className="h-px w-16 bg-[#1A1A1A]/20 mb-8" />

            <p
              className="mb-10 leading-[1.8]"
              style={{ color: "#4A4A4A", fontSize: "15px" }}
            >
              {project.description}
            </p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-7">
              {[
                { label: "Location", value: project.location },
                { label: "Year", value: project.year },
                { label: "Scope", value: project.scope },
                { label: "Area", value: project.area },
              ].map((d) => (
                <div key={d.label}>
                  <p
                    className="uppercase mb-2"
                    style={{
                      color: "#C9A97A",
                      letterSpacing: "0.15em",
                      fontSize: "10px",
                    }}
                  >
                    {d.label}
                  </p>
                  <p style={{ color: "#1A1A1A", fontSize: "15px" }}>{d.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM — Items */}
        <section className="py-24 md:py-32 container-livora">
          <h2
            className="serif font-light text-4xl md:text-5xl mb-12 md:mb-16"
            style={{ color: "#1A1A1A" }}
          >
            Items in <em className="italic">This Space.</em>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-5">
            {items.map((name) => (
              <div
                key={name}
                className="group cursor-default"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8E4DF",
                  borderRadius: "8px",
                  padding: "20px 16px",
                  textAlign: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(0,0,0,0.10)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 12px rgba(0,0,0,0.05)";
                }}
              >
                <div className="mb-4 flex items-center justify-center">
                  <ItemIcon name={name} />
                </div>
                <p
                  style={{
                    color: "#1A1A1A",
                    fontSize: "13px",
                    letterSpacing: "0.05em",
                  }}
                >
                  {name}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default ProjectDetail;
