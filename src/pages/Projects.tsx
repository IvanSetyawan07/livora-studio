import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { projects } from "@/data/projects";

const categories = ["All", "Hotel", "Residential", "Office"];

const ProjectsPage = () => {
  const [filter, setFilter] = useState("All");
  const filtered = projects.filter((p) => filter === "All" || p.category === filter);

  useEffect(() => {
    document.title = "Projects — LIVORA";
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
      "Explore the full collection of LIVORA interior design projects across hospitality, residential, and office spaces.",
    );
  }, []);

  return (
    <>
      <Navbar />
      <main className="bg-background">
        <section className="container-livora pt-32 md:pt-40 pb-20">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.45em] text-foreground/60 mb-5">
            <span className="divider-line" />
            All Projects
          </p>
          <h1 className="serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.05] text-balance mb-10">
            A complete <em className="italic">portfolio.</em>
          </h1>

          <div className="flex gap-2 mb-12 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filtered.map((p) => (
              <Link
                key={p.slug}
                to={`/projects/${p.slug}`}
                className="group block hover-zoom"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={p.img}
                    alt={`${p.name} — ${p.category}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 px-5 py-4 flex justify-end items-end opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)",
                    }}
                  >
                    <span
                      className="uppercase text-white"
                      style={{ fontSize: "12px", letterSpacing: "0.1em" }}
                    >
                      View Project →
                    </span>
                  </div>
                </div>
                <div className="pt-5">
                  <p
                    className="uppercase mb-2"
                    style={{
                      color: "#C9A97A",
                      fontSize: "10px",
                      letterSpacing: "0.2em",
                    }}
                  >
                    {p.category}
                  </p>
                  <h3 className="serif text-2xl md:text-3xl font-light text-foreground">
                    {p.name}
                  </h3>
                  <p className="text-xs text-foreground/60 mt-1">{p.location}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-20">
            <Link
              to="/"
              className="text-[11px] uppercase tracking-[0.3em] text-foreground/70 hover:text-foreground underline-grow"
            >
              ← Back to home
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default ProjectsPage;
