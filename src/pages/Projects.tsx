import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { useAllProjects } from "@/lib/projectsApi";
import { getLocalLandingPreview } from "@/lib/localLandingPreview";
import type { Project } from "@/data/projects";

const ROW_ASPECT_PATTERNS = [
  ["aspect-[3/4]", "aspect-[4/3]", "aspect-[3/4.6]"],
  ["aspect-[4/3.1]", "aspect-[3/4.4]", "aspect-[3/3.7]"],
];

const ProjectsPage = () => {
  const liveProjects = useAllProjects();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  const { projects, isLocalPreview } = useMemo(() => {
    const valid = liveProjects.filter(
      (p) => Boolean(p.img && p.img !== "/placeholder.svg"),
    );
    const localPreview = getLocalLandingPreview();
    if (valid.length < 3 && localPreview?.PREVIEW_PROJECTS?.length) {
      return {
        projects: [...liveProjects, ...localPreview.PREVIEW_PROJECTS],
        isLocalPreview: true,
      };
    }
    return { projects: liveProjects, isLocalPreview: false };
  }, [liveProjects]);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(projects.map((p) => p.category).filter(Boolean))),
    ],
    [projects],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      const matchCat = filter === "All" || p.category === filter;
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.location ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [projects, filter, query]);

  const rows = useMemo(() => {
    const out: Project[][] = [];
    for (let i = 0; i < filtered.length; i += 3) {
      out.push(filtered.slice(i, i + 3));
    }
    return out;
  }, [filtered]);

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
      <main className="bg-[#FAF8F4] text-[#232528] min-h-screen">
        <section className="container-livora pt-28 md:pt-36 pb-20 md:pb-28">
          {/* Monumental Hanna Stína Staggered Header */}
          <p className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-[#5E93B8] font-medium mb-5">
            <span className="h-px w-8 bg-[#5E93B8]/60" />
            All Projects
            {isLocalPreview && (
              <span className="rounded-full border border-[#5E93B8]/30 bg-white px-2.5 py-0.5 text-[9px] tracking-[0.2em] text-[#5E93B8]">
                Local Preview
              </span>
            )}
          </p>

          <h1 className="serif text-5xl sm:text-6xl md:text-7xl lg:text-[84px] font-light leading-[0.94] tracking-[-0.02em] text-[#232528] mb-10 md:mb-14">
            EXPLORE THE
            <span className="block sm:pl-16 lg:pl-28 italic font-light text-[#5E93B8]">
              SELECTED WORKS
            </span>
          </h1>

          {/* Minimalist Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-10 mb-14 border-b border-[#232528]/12">
            <div className="flex gap-2 flex-wrap">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  className={`min-h-[40px] text-[10px] uppercase tracking-[0.26em] px-5 py-2 border transition-all duration-300 ${
                    filter === c
                      ? "bg-[#232528] text-[#FAF8F4] border-[#232528]"
                      : "bg-white/75 border-[#232528]/14 text-[#656B73] hover:border-[#232528] hover:text-[#232528]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#656B73]"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects..."
                aria-label="Search projects"
                className="w-full h-10 pl-10 pr-3 border border-[#232528]/15 bg-white text-sm font-light text-[#232528] placeholder:text-[#656B73]/70 outline-none focus:border-[#5E93B8] transition-colors"
              />
            </div>
          </div>

          {/* 3-Column Bottom-Aligned Staggered Gallery Wall (`items-end`) */}
          {rows.length === 0 ? (
            <p className="text-sm text-[#656B73] py-16 text-center">
              No projects matched your search.
            </p>
          ) : (
            <div className="space-y-16 lg:space-y-24">
              {rows.map((row, rowIdx) => {
                const pattern =
                  ROW_ASPECT_PATTERNS[rowIdx % ROW_ASPECT_PATTERNS.length];
                return (
                  <div
                    key={`page-row-${rowIdx}`}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 items-end"
                  >
                    {row.map((p, colIdx) => {
                      const num = String(rowIdx * 3 + colIdx + 1).padStart(2, "0");
                      const aspectClass = pattern[colIdx % 3];
                      const href =
                        p.apiId != null && p.apiId < 0
                          ? "/projects"
                          : `/projects/${p.slug}`;
                      return (
                        <article key={p.slug}>
                          <Link
                            to={href}
                            className="group block focus:outline-none"
                          >
                            <div
                              className={`relative overflow-hidden bg-[#F1EFEA] ${aspectClass}`}
                            >
                              <img
                                src={p.img}
                                alt={`${p.name} — ${p.category}`}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045]"
                              />
                              <span className="pointer-events-none absolute bottom-4 right-4 inline-flex items-center gap-1.5 bg-white/94 px-3.5 py-1.5 text-[9px] uppercase tracking-[0.26em] text-[#232528] opacity-0 translate-y-1.5 transition-all duration-400 group-hover:opacity-100 group-hover:translate-y-0 shadow-sm">
                                View <ArrowUpRight className="h-3 w-3 text-[#5E93B8]" />
                              </span>
                            </div>

                            <div className="mt-3.5 pt-3 border-t border-[#232528]/12 flex items-baseline justify-between gap-4">
                              <div className="flex items-baseline gap-2.5 min-w-0">
                                <span className="text-[10px] font-mono text-[#5E93B8] shrink-0">
                                  [{num}]
                                </span>
                                <h2 className="text-xs sm:text-[13px] uppercase tracking-[0.18em] font-medium text-[#232528] group-hover:text-[#5E93B8] transition-colors truncate">
                                  {p.name}
                                </h2>
                              </div>
                              <span className="text-[10px] font-mono tracking-[0.16em] text-[#656B73] shrink-0">
                                {p.year || p.location || p.category}
                              </span>
                            </div>
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-16 md:mt-24 pt-8 border-t border-[#232528]/12 flex items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex items-center min-h-[44px] py-2 text-[10px] uppercase tracking-[0.3em] text-[#656B73] hover:text-[#232528] underline-grow"
            >
              ← Back to home
            </Link>
            <Link
              to="/appointment"
              className="inline-flex items-center gap-2 bg-[#232528] text-[#FAF8F4] px-6 py-3 text-[10px] uppercase tracking-[0.26em] hover:bg-[#5E93B8] transition-colors"
            >
              Start a Project <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default ProjectsPage;
