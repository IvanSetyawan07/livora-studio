import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/livora/Navbar";
import { PageBreadcrumb } from "@/components/livora/Breadcrumb";
import { Footer } from "@/components/livora/Footer";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { getItemBySlug, items as staticItems } from "@/data/items";
import { getProjectBySlug } from "@/data/projects";
import { api } from "@/lib/api";
import { imgUrl, trackClick, trackView } from "@/lib/adminApi";

type ApiItem = {
  id: number; slug: string; title: string; code?: string; texture?: string; finish?: string;
  availability?: string; description?: string; image?: string;
  type?: { name: string; slug: string } | null;
  themes: { id: number; name: string; slug: string }[];
  categories: { id: number; name: string; slug: string }[];
};

const ItemDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectSlug = searchParams.get("from");
  const fromProject = projectSlug ? getProjectBySlug(projectSlug) : undefined;

  const [apiItem, setApiItem] = useState<ApiItem | null>(null);
  const [apiTried, setApiTried] = useState(false);
  const mountedAt = useRef<number>(Date.now());

  useEffect(() => {
    window.scrollTo(0, 0);
    setApiItem(null);
    setApiTried(false);
    mountedAt.current = Date.now();
    if (!slug) return;
    api.get(`/items/${slug}`)
      .then((r) => {
        setApiItem(r.data);
        trackClick("item", r.data.id);
      })
      .catch(() => {})
      .finally(() => setApiTried(true));

    return () => {
      if (apiItem?.id) {
        const dur = Math.round((Date.now() - mountedAt.current) / 1000);
        trackView("item", apiItem.id, dur);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ---- API render ----
  if (apiItem) {
    const it = apiItem;
    document.title = `${it.title} — LIVORA`;
    return (
      <>
        <Navbar />
        <main style={{ background: "#FFFFFF", paddingTop: "80px" }}>
          <PageBreadcrumb
            items={[
              { label: "Home", to: "/" },
              { label: "Furniture", to: "/furniture" },
              { label: it.title },
            ]}
          />
          <section className="grid md:grid-cols-2">
            <div className="flex items-center justify-center" style={{ background: "#FAFAF8", padding: "60px" }}>
              <div className="w-full aspect-square bg-white border border-[#E8E4DF] rounded-xl grid place-items-center overflow-hidden">
                {it.image
                  ? <img src={imgUrl(it.image)} alt={it.title} className="w-full h-full object-contain p-10" />
                  : <ItemIllustration name={it.title} size={280} strokeWidth={1.1} />}
              </div>
            </div>
            <div style={{ padding: "60px 48px" }}>
              <span className="inline-block uppercase text-[#C9A97A] bg-[#F5EFE8] px-3 py-1 rounded-full text-[10px] tracking-[0.15em]">
                {it.type?.name || "Furniture"}
              </span>
              <h1 className="serif font-light mt-5" style={{ fontSize: "40px", color: "#1A1A1A", lineHeight: 1.1 }}>{it.title}</h1>
              <p className="text-[#9A9A9A] text-xs tracking-[0.2em] mt-2">{it.code}</p>
              <div className="h-px w-full bg-[#1A1A1A]/10 my-7" />
              <Detail label="Texture" value={it.texture} />
              <Detail label="Finish" value={it.finish} />
              <Detail label="Availability" value={it.availability} />
              {it.description && <Detail label="Description" value={it.description} multiline />}
              <div className="h-px w-full bg-[#1A1A1A]/10 my-7" />
              <p className="uppercase text-[#C9A97A] text-[10px] tracking-[0.15em]">Themes</p>
              <div className="mt-3 mb-5 flex flex-wrap gap-2">
                {it.themes.map((t) => (
                  <Link key={t.id} to={`/furniture?theme=${t.slug}`}
                    className="bg-[#F5EFE8] text-[#8A7560] border border-[#E0D5C8] rounded-full px-4 py-1.5 text-xs hover:bg-[#C9A97A] hover:text-white transition">
                    {t.name}
                  </Link>
                ))}
                {it.themes.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              </div>
              <p className="uppercase text-[#C9A97A] text-[10px] tracking-[0.15em]">Categories</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {it.categories.map((c) => (
                  <Link key={c.id} to={`/furniture?category=${c.slug}`}
                    className="bg-[#F5EFE8] text-[#8A7560] border border-[#E0D5C8] rounded-full px-4 py-1.5 text-xs hover:bg-[#C9A97A] hover:text-white transition">
                    {c.name}
                  </Link>
                ))}
                {it.categories.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              </div>
              <button onClick={() => navigate(-1)} className="mt-10 uppercase text-[#C9A97A] text-xs tracking-[0.1em] hover:opacity-70">
                ← Back
              </button>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  // ---- Static fallback ----
  if (!apiTried) {
    return <main className="min-h-screen grid place-items-center"><p className="text-sm text-muted-foreground">Loading…</p></main>;
  }
  const item = slug ? getItemBySlug(slug) : undefined;
  if (!item) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="serif text-4xl font-light mb-4">Item not found</p>
          <Link to="/" className="text-xs uppercase tracking-[0.3em] underline-grow">Back to home</Link>
        </div>
      </main>
    );
  }
  const related = staticItems.filter((i) => i.slug !== item.slug).slice(0, 5);
  return (
    <>
      <Navbar />
      <main style={{ background: "#FFFFFF", paddingTop: "80px" }}>
        <PageBreadcrumb items={[
          { label: "Home", to: "/" }, { label: "Projects", to: "/projects" },
          ...(fromProject ? [{ label: fromProject.name, to: `/projects/${fromProject.slug}` }] : []),
          { label: item.name },
        ]} />
        <section className="grid md:grid-cols-2">
          <div className="flex items-center justify-center bg-[#FAFAF8] p-[60px]">
            <div className="w-full aspect-square bg-white border border-[#E8E4DF] rounded-xl grid place-items-center">
              <ItemIllustration name={item.name} size={280} strokeWidth={1.1} />
            </div>
          </div>
          <div style={{ padding: "60px 48px" }}>
            <h1 className="serif text-4xl">{item.name}</h1>
            <p className="text-xs text-muted-foreground tracking-[0.2em] mt-2">{item.code}</p>
            <Detail label="Texture" value={item.textures.join(", ")} />
            <Detail label="Finish" value={item.specs.finish} />
            <Detail label="Availability" value={item.specs.availability} />
          </div>
        </section>
        <section className="px-[60px] py-10 bg-white">
          <h2 className="serif text-2xl mb-6">You May Also Like</h2>
          <div className="flex gap-5 overflow-x-auto">
            {related.map((r) => (
              <Link key={r.slug} to={`/items/${r.slug}`}
                className="min-w-[180px] bg-[#FAFAF8] border border-[#E8E4DF] rounded-[10px] p-4 text-center">
                <div className="h-[120px] flex items-center justify-center"><ItemIllustration name={r.name} /></div>
                <p className="text-sm mt-3">{r.name}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

function Detail({ label, value, multiline }: { label: string; value?: string; multiline?: boolean }) {
  return (
    <div className="mb-5">
      <p className="uppercase text-[#C9A97A] text-[10px] tracking-[0.15em]">{label}</p>
      <p className={`text-[14px] text-[#1A1A1A] mt-1.5 ${multiline ? "whitespace-pre-wrap leading-relaxed" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

export default ItemDetail;
