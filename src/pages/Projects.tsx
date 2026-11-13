import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { useAllProjects } from "@/lib/projectsApi";

const ProjectsPage = () => {
  const projects = useAllProjects();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(projects.map((p) => p.category).filter(Boolean)))],
    [projects],
  );
  const filtered = projects.filter((p) => {
    const matchCat = filter === "All" || p.category === filter;
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.location ?? "").toLowerCase().includes(q) ||
      (p.category ?? "").toLowerCase().includes(q);
    return matchCat && matchQ;
  });

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
        <section className="container-livora pt-28 md:pt-40 pb-16 md:pb-20">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.45em] text-foreground/60 mb-4 md:mb-5">
            <span className="divider-line" />
            All Projects
          </p>
          <h1 className="serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.08] text-balance mb-8 md:mb-10">
            A complete <em className="italic">portfolio.</em>
          </h1>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10 md:mb-12">
            <div className="flex gap-2 flex-wrap">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={`min-h-[44px] text-[10px] uppercase tracking-[0.28em] px-5 py-2.5 border transition-all duration-300 ${
                    filter === c
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-foreground/75 hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects..."
                aria-label="Search projects"
                className="w-full h-11 pl-10 pr-3 border border-border bg-background text-base sm:text-sm font-light outline-none focus:border-foreground transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filtered.map((p) => (
              <Link
                key={p.slug}
                to={`/projects/${p.slug}`}
                className="group block hover-zoom active:scale-[0.99] transition-transform"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={p.img}
                    alt={`${p.name} — ${p.category}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 px-5 py-4 flex justify-end items-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
                    }}
                  >
                    <span
                      className="uppercase text-white"
                      style={{ fontSize: "11px", letterSpacing: "0.14em" }}
                    >
                      View Project →
                    </span>
                  </div>
                </div>
                <div className="pt-4 md:pt-5">
                  <p
                    className="uppercase mb-1.5 md:mb-2"
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

          <div className="mt-14 md:mt-20">
            <Link
              to="/"
              className="inline-flex items-center min-h-[44px] py-2 text-[11px] uppercase tracking-[0.3em] text-foreground/70 hover:text-foreground underline-grow"
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