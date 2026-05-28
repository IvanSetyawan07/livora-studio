import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/livora/Navbar";
import { PageBreadcrumb } from "@/components/livora/Breadcrumb";
import { Footer } from "@/components/livora/Footer";
import { getProjectBySlug } from "@/data/projects";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { slugifyItem } from "@/data/items";
import { useReveal } from "@/hooks/useReveal";
import { api } from "@/lib/api";
import { imgUrl, trackClick, trackView } from "@/lib/adminApi";

type ApiPhoto = { id: number; title?: string; image: string; caption?: string; items: ApiItem[] };
type ApiItem = { id: number; slug: string; title: string; image?: string; type?: { name: string } | null };
type ApiProject = {
  id: number; slug: string; title: string; subtitle?: string; description?: string;
  location?: string; year?: string; hero_image?: string;
  scope?: { name: string } | null;
  photos: ApiPhoto[];
};

const ProjectDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [apiProject, setApiProject] = useState<ApiProject | null>(null);
  const [apiTried, setApiTried] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const mountedAt = useRef<number>(Date.now());
  useReveal([apiProject?.id, apiTried]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    setSlideIndex(0);
    setApiProject(null);
    setApiTried(false);
    mountedAt.current = Date.now();
    if (!slug) return;
    api.get(`/projects/${slug}`)
      .then((r) => {
        setApiProject(r.data);
        trackClick("project", r.data.id);
      })
      .catch(() => {})
      .finally(() => setApiTried(true));

    return () => {
      // record view duration when leaving
      if (apiProject?.id) {
        const dur = Math.round((Date.now() - mountedAt.current) / 1000);
        trackView("project", apiProject.id, dur);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ---- API render path ----
  if (apiProject) {
    const p = apiProject;
    document.title = `${p.title} — LIVORA`;
    const slides = p.photos ?? [];
    const hasSlides = slides.length > 0;
    const current = hasSlides ? slides[slideIndex % slides.length] : null;
    const displayTitle = current?.title || p.title;
    const displayImage = current?.image || p.hero_image;
    const items = current?.items ?? [];

    return (
      <>
        <Navbar />
        <main style={{ background: "#FAFAF8" }}>
          <section className="relative w-full overflow-hidden" style={{ height: "100vh" }}>
            {p.hero_image && (
              <img src={imgUrl(p.hero_image)} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
              <h1 className="serif font-light text-white leading-[1.05]" style={{ fontSize: "clamp(48px, 8vw, 112px)" }}>
                {p.title}
              </h1>
              <p className="text-white/85 mt-6" style={{ fontSize: "16px", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                {p.subtitle || p.location || ""}
              </p>
            </div>
          </section>

          <PageBreadcrumb items={[{ label: "Home", to: "/" }, { label: "Projects", to: "/projects" }, { label: p.title }]} />

          <section className="reveal" style={{ background: "#FAFAF8", padding: "0 60px 32px 60px" }}>
            <h2 className="serif font-light leading-[1.05] mb-6" style={{ color: "#1A1A1A", fontSize: "56px", marginTop: "16px" }}>
              {displayTitle}
            </h2>
            <div className="h-px w-full bg-[#1A1A1A]/15" />
          </section>

          <section className="grid md:grid-cols-5 reveal">
            <div className="md:col-span-3 relative group" style={{ paddingLeft: "60px", background: "#FAFAF8" }}>
              {displayImage && (
                <img key={displayImage} src={imgUrl(displayImage)} alt={displayTitle}
                  className="transition-opacity duration-500"
                  style={{ width: "100%", height: "600px", objectFit: "cover", display: "block" }} />
              )}
              {hasSlides && slides.length > 1 && (
                <>
                  <button onClick={() => setSlideIndex((i) => (i - 1 + slides.length) % slides.length)}
                    className="absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 grid place-items-center opacity-0 group-hover:opacity-100 transition"
                    style={{ left: "76px" }}>←</button>
                  <button onClick={() => setSlideIndex((i) => (i + 1) % slides.length)}
                    className="absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 grid place-items-center opacity-0 group-hover:opacity-100 transition"
                    style={{ right: "16px" }}>→</button>
                </>
              )}
            </div>

            <div className="md:col-span-2 flex flex-col" style={{ background: "#FAFAF8", padding: "48px" }}>
              <p className="uppercase mb-4" style={{ color: "#C9A97A", fontSize: "11px", letterSpacing: "0.2em" }}>
                {p.scope?.name || ""}
              </p>
              <p style={{ color: "#4A4A4A", lineHeight: 1.8, fontSize: "15px", whiteSpace: "pre-wrap" }}>
                {p.description}
              </p>
              <div className="h-px w-full bg-[#1A1A1A]/15 my-8" />
              <div className="grid grid-cols-2 gap-x-6 gap-y-7">
                {[
                  { label: "LOCATION", value: p.location },
                  { label: "YEAR", value: p.year },
                  { label: "SCOPE", value: p.scope?.name },
                ].map((d) => (
                  <div key={d.label}>
                    <p className="uppercase" style={{ color: "#C9A97A", fontSize: "10px", letterSpacing: "0.15em" }}>{d.label}</p>
                    <p style={{ color: "#1A1A1A", fontSize: "14px", marginTop: "4px" }}>{d.value || "—"}</p>
                  </div>
                ))}
              </div>
              <div className="flex-1" />
              <button onClick={() => navigate("/projects")} className="self-start mt-10 uppercase hover:opacity-70"
                style={{ color: "#C9A97A", background: "none", border: "none", fontSize: "12px", letterSpacing: "0.1em" }}>
                ← Back
              </button>
            </div>
          </section>

          <section className="reveal" style={{ background: "#FFFFFF", padding: "60px" }}>
            <h2 className="serif font-light mb-10" style={{ color: "#1A1A1A", fontSize: "28px" }}>Items in This Space</h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada item ditandai untuk foto ini.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
                {items.map((it) => (
                  <Link key={it.id} to={`/items/${it.slug}`} onClick={() => trackClick("item", it.id)}
                    className="bg-[#FAFAF8] border border-[#E8E4DF] rounded-[10px] p-4 text-center hover:-translate-y-1 transition">
                    <div className="aspect-square bg-white grid place-items-center rounded">
                      {it.image
                        ? <img src={imgUrl(it.image)} className="max-w-[80%] max-h-[80%] object-contain" alt={it.title} />
                        : <ItemIllustration name={it.title} />}
                    </div>
                    <p className="text-sm mt-3">{it.title}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 mt-1">{it.type?.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </main>
        <Footer />
      </>
    );
  }

  // ---- Static fallback (legacy) ----
  if (!apiTried) {
    return <main className="min-h-screen grid place-items-center"><p className="text-sm text-muted-foreground">Loading…</p></main>;
  }
  const project = slug ? getProjectBySlug(slug) : undefined;
  if (!project) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="serif text-4xl font-light mb-4">Project not found</p>
          <Link to="/" className="text-xs uppercase tracking-[0.3em] underline-grow">Back to home</Link>
        </div>
      </main>
    );
  }
  return (
    <>
      <Navbar />
      <main style={{ background: "#FAFAF8" }}>
        <section className="relative w-full overflow-hidden" style={{ height: "100vh" }}>
          <img src={project.img} alt={project.name} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <h1 className="serif font-light text-white" style={{ fontSize: "clamp(48px, 8vw, 112px)" }}>{project.name}</h1>
            <p className="text-white/85 mt-6 uppercase" style={{ letterSpacing: "0.18em" }}>{project.location}</p>
          </div>
        </section>
        <PageBreadcrumb items={[{ label: "Home", to: "/" }, { label: "Projects", to: "/projects" }, { label: project.name }]} />
        <section className="px-[60px] py-10">
          <p className="text-foreground/70 max-w-3xl">{project.description}</p>
          <div className="mt-8 grid grid-cols-3 gap-6 max-w-3xl">
            <Stat label="Location" value={project.location} />
            <Stat label="Year" value={project.year} />
            <Stat label="Scope" value={project.scope} />
          </div>
        </section>
        <section style={{ background: "#FFFFFF", padding: "60px" }}>
          <h2 className="serif text-2xl mb-8">Items in This Space</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
            {(project.slides?.[0]?.items ?? []).map((name) => (
              <Link key={name} to={`/items/${slugifyItem(name)}?from=${project.slug}`}
                className="bg-[#FAFAF8] border border-[#E8E4DF] rounded-[10px] p-4 text-center">
                <div className="h-[120px] flex items-center justify-center"><ItemIllustration name={name} /></div>
                <p className="text-sm mt-3">{name}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

function Stat({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="uppercase" style={{ color: "#C9A97A", fontSize: "10px", letterSpacing: "0.15em" }}>{label}</p>
      <p style={{ color: "#1A1A1A", fontSize: "14px", marginTop: "4px" }}>{value || "—"}</p>
    </div>
  );
}

export default ProjectDetail;
