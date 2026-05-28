import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { projects as staticProjects } from "@/data/projects";
import { api } from "@/lib/api";
import { imgUrl, trackClick } from "@/lib/adminApi";

type ApiProject = {
  id: number; slug: string; title: string; subtitle?: string; location?: string;
  hero_image?: string; scope?: { name: string; slug: string } | null;
};

const ProjectsPage = () => {
  const [scopeSlug, setScopeSlug] = useState<string>("all");
  const [scopes, setScopes] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [apiProjects, setApiProjects] = useState<ApiProject[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Projects — LIVORA";
    api.get("/taxonomies/scopes").then((r) => setScopes(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get("/projects", { params: scopeSlug !== "all" ? { scope: scopeSlug } : {} })
      .then((r) => setApiProjects(r.data))
      .catch(() => setApiProjects([]))
      .finally(() => setLoading(false));
  }, [scopeSlug]);

  const useApi = apiProjects && apiProjects.length > 0;
  // Fallback: static dataset uses 'category' field
  const staticFiltered = staticProjects;

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

          {/* Scope filter from backend */}
          <div className="flex gap-2 mb-12 flex-wrap">
            <FilterBtn active={scopeSlug === "all"} onClick={() => setScopeSlug("all")}>All</FilterBtn>
            {scopes.map((s) => (
              <FilterBtn key={s.id} active={scopeSlug === s.slug} onClick={() => setScopeSlug(s.slug)}>
                {s.name}
              </FilterBtn>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : useApi ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {apiProjects!.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.slug}`}
                  onClick={() => trackClick("project", p.id)}
                  className="group block hover-zoom"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                    {p.hero_image && (
                      <img src={imgUrl(p.hero_image)} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="pt-5">
                    <p className="uppercase mb-2" style={{ color: "#C9A97A", fontSize: "10px", letterSpacing: "0.2em" }}>
                      {p.scope?.name || ""}
                    </p>
                    <h3 className="serif text-2xl md:text-3xl font-light text-foreground">{p.title}</h3>
                    <p className="text-xs text-foreground/60 mt-1">{p.subtitle || p.location}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : scopeSlug !== "all" ? (
            <p className="text-sm text-muted-foreground">Belum ada project di scope ini.</p>
          ) : (
            // Legacy fallback when backend kosong
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {staticFiltered.map((p) => (
                <Link key={p.slug} to={`/projects/${p.slug}`} className="group block hover-zoom">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img src={p.img} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <div className="pt-5">
                    <p className="uppercase mb-2" style={{ color: "#C9A97A", fontSize: "10px", letterSpacing: "0.2em" }}>{p.category}</p>
                    <h3 className="serif text-2xl md:text-3xl font-light text-foreground">{p.name}</h3>
                    <p className="text-xs text-foreground/60 mt-1">{p.location}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-20">
            <Link to="/" className="text-[11px] uppercase tracking-[0.3em] text-foreground/70 hover:text-foreground underline-grow">
              ← Back to home
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

function FilterBtn({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] uppercase tracking-[0.3em] px-5 py-2.5 border transition-all duration-500 ${
        active
          ? "bg-foreground text-background border-foreground"
          : "border-border text-foreground/70 hover:border-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default ProjectsPage;
