import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Plus } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import {
  getCollection,
  Collection,
  CATEGORY_TABS,
  CollectionPackage,
} from "@/lib/collectionsApi";

export default function CollectionDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePackage, setActivePackage] = useState<CollectionPackage | null>(null);

  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 800], [0, 120]);
  const heroScale = useTransform(scrollY, [0, 800], [1, 1.08]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getCollection(slug)
      .then((c) => {
        setCollection(c);
        if (c.packages && c.packages.length > 0) setActivePackage(c.packages[0]);
      })
      .catch(() => setCollection(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (collection) document.title = `${collection.name} Collection — LIVORA`;
  }, [collection]);

  const hero = collection?.hero_banner || collection?.featured_image ||
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1920&q=80";

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-40 text-center text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-40 text-center text-sm text-muted-foreground">
          Collection not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section ref={heroRef} className="relative w-full overflow-hidden" style={{ height: "85vh" }}>
        <motion.div style={{ y: heroY, scale: heroScale }} className="absolute inset-0">
          <img src={hero} alt={collection.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        </motion.div>

        <div className="relative z-10 h-full flex items-center">
          <div className="container-livora">
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="text-[11px] tracking-[0.35em] uppercase text-white/80 mb-6"
            >
              <Link to="/collection" className="hover:text-white transition-colors">
                Collection
              </Link>{" "}
              <span className="mx-2">›</span> {collection.name}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
              className="serif font-light text-white text-5xl md:text-7xl leading-[1.05] mb-6"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
            >
              {collection.name}
              <br />Collection
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35 }}
              className="text-white/85 text-sm md:text-base max-w-lg leading-relaxed mb-8"
            >
              {collection.short_description || collection.description || ""}
            </motion.p>
            {collection.cta_text && (
              <motion.button
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
                onClick={() => document.getElementById("collection-story")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-3 border border-white/70 text-white px-7 py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-white hover:text-foreground transition-colors duration-300"
              >
                {collection.cta_text}
                <ArrowRight size={14} />
              </motion.button>
            )}
          </div>
        </div>
      </section>

      {/* STICKY CATEGORY TABS */}
      <div className="sticky top-20 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="container-livora">
          <div className="flex gap-6 md:gap-8 overflow-x-auto py-4 no-scrollbar">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.slug}
                onClick={() =>
                  tab.slug === "all"
                    ? document.getElementById("collection-packages")?.scrollIntoView({ behavior: "smooth" })
                    : navigate(`/collection/${collection.slug}/${tab.slug}`)
                }
                className="relative text-[11px] tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap group"
              >
                {tab.label}
                <span className="absolute left-0 right-0 -bottom-1 h-px bg-foreground origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STORY */}
      {(collection.story?.story_description || collection.story?.story_banner) && (
        <section id="collection-story" className="container-livora py-24 md:py-32">
          <div className="relative rounded-2xl overflow-hidden bg-neutral-900">
            {collection.story.story_banner && (
              <div className="absolute inset-0">
                <img src={collection.story.story_banner} alt="" className="w-full h-full object-cover opacity-70" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
              </div>
            )}
            <div className="relative z-10 p-10 md:p-16 max-w-xl text-white">
              <p className="text-[11px] tracking-[0.3em] uppercase text-white/70 mb-4">The Story</p>
              <h2 className="serif font-light text-3xl md:text-5xl leading-tight mb-6">
                One Collection. Endless Possibilities.
              </h2>
              <p className="text-sm md:text-base text-white/85 leading-relaxed mb-8">
                {collection.story.story_description}
              </p>
              {collection.story.cta_text && collection.story.cta_link && (
                <a
                  href={collection.story.cta_link}
                  className="inline-flex items-center gap-3 border border-white/70 px-6 py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-white hover:text-foreground transition-colors duration-300"
                >
                  {collection.story.cta_text}
                  <ArrowRight size={14} />
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* PACKAGES */}
      {collection.packages && collection.packages.length > 0 && (
        <section id="collection-packages" className="container-livora pb-16">
          <div className="mb-10">
            <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-3">
              {collection.name} Packages
            </p>
            <h2 className="serif font-light text-3xl md:text-5xl">
              Curated Packages for Effortless Living
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {collection.packages.map((p, i) => {
              const isActive = activePackage?.id === p.id;
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  onClick={() => {
                    setActivePackage(p);
                    document.getElementById("package-items")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`group relative aspect-[4/3] rounded-xl overflow-hidden text-left transition-all duration-500 ${
                    isActive ? "ring-2 ring-foreground" : "hover:-translate-y-1"
                  }`}
                >
                  {p.banner ? (
                    <img src={p.banner} alt={p.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-110" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between text-white">
                    <div>
                      <h3 className="serif text-xl font-light">{p.name}</h3>
                      <p className="text-[11px] tracking-[0.15em] text-white/80 mt-1">
                        {(p.items?.length ?? 0)} Items Included
                      </p>
                    </div>
                    <span className="w-9 h-9 border border-white/70 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-foreground transition-colors">
                      <Plus size={14} />
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Items Included */}
          {activePackage && (activePackage.items?.length ?? 0) > 0 && (
            <div id="package-items" className="mt-16 bg-muted/40 rounded-xl p-6 md:p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <h3 className="serif text-2xl font-light">{activePackage.name}</h3>
                  <span className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground bg-background px-3 py-1 rounded-full border border-border">
                    {activePackage.items?.length} Items
                  </span>
                </div>
                <Link
                  to={`/collection/${collection.slug}/all`}
                  className="hidden md:inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-foreground hover:opacity-70 transition"
                >
                  View All Items <ArrowRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {activePackage.items?.map((it) => (
                  <Link
                    key={it.id}
                    to={`/items/${it.slug}`}
                    className="group block bg-background border border-border rounded-lg overflow-hidden hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="aspect-square bg-muted overflow-hidden">
                      {it.image && (
                        <img src={it.image} alt={it.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium truncate">{it.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">1 pc</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="py-16" />
      <Footer />
    </div>
  );
}
