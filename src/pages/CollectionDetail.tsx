import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Plus } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { BookConsultation } from "@/components/livora/BookConsultation";
import { CategoryBar } from "@/components/livora/CategoryBar";
import {
  getCollection,
  Collection,
  CATEGORY_TABS,
  CollectionPackage,
  CollectionItemRef,
} from "@/lib/collectionsApi";

export default function CollectionDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePackage, setActivePackage] = useState<CollectionPackage | null>(null);
  const [mounted, setMounted] = useState(false);

  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const heroHeight = 800;

  // Match CatalogPage hero motion: image parallax + scroll-driven text slide/fade/blur.
  const imgY = useTransform(scrollY, [0, heroHeight], [0, 140]);
  const imgScale = useTransform(scrollY, [0, heroHeight], [1, 1.08]);
  const textX = useTransform(
    scrollY,
    [0, heroHeight * 0.3, heroHeight * 0.6, heroHeight * 0.95],
    [0, -40, -80, -120],
  );
  const textY = useTransform(scrollY, [0, heroHeight * 0.5, heroHeight], [0, -40, -80], { clamp: true });
  const textOpacity = useTransform(scrollY, [0, heroHeight * 0.5, heroHeight], [1, 0.5, 0], { clamp: true });
  const overlayOpacity = useTransform(scrollY, [0, 600], [0.55, 0.78]);

  const ease = [0.22, 1, 0.36, 1] as const;

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setMounted(false);
    getCollection(slug)
      .then((c) => {
        setCollection(c);
        if (c.packages && c.packages.length > 0) setActivePackage(c.packages[0]);
      })
      .catch(() => setCollection(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!collection) return;
    document.title = `${collection.name} Collection — LIVORA`;
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, [collection]);

  // Group active package items by TYPE (Sofa, Chair, Table, …). Each card
  // represents one furniture type in the package and shows how many pieces of
  // that type the package contains. Clicking opens the category view scoped to
  // the active package.
  const groupedByType = useMemo(() => {
    const map = new Map<
      string,
      { typeSlug: string; typeName: string; sample: CollectionItemRef; count: number }
    >();
    (activePackage?.items ?? []).forEach((it) => {
      const key = it.type?.slug ?? "other";
      const name = it.type?.name ?? "Other";
      const entry = map.get(key);
      if (entry) entry.count += 1;
      else map.set(key, { typeSlug: key, typeName: name, sample: it, count: 1 });
    });
    return Array.from(map.values());
  }, [activePackage]);

  const hero =
    collection?.hero_banner ||
    collection?.featured_image ||
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
        <div className="pt-40 text-center text-sm text-muted-foreground">Collection not found.</div>
      </div>
    );
  }

  const eyebrowAnim = {
    initial: { opacity: 0, x: -40 },
    animate: mounted ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 },
    transition: { duration: 1, ease, delay: 0.2 },
  };
  const headingAnim = {
    initial: { opacity: 0, x: -80, filter: "blur(8px)" },
    animate: mounted
      ? { opacity: 1, x: 0, filter: "blur(0px)" }
      : { opacity: 0, x: -80, filter: "blur(8px)" },
    transition: { duration: 1.2, ease, delay: 0.45 },
  };
  const headingItalicAnim = {
    initial: { opacity: 0, x: -80, filter: "blur(8px)" },
    animate: mounted
      ? { opacity: 1, x: 0, filter: "blur(0px)" }
      : { opacity: 0, x: -80, filter: "blur(8px)" },
    transition: { duration: 1.2, ease, delay: 0.7 },
  };
  const descAnim = {
    initial: { opacity: 0, y: 20 },
    animate: mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    transition: { duration: 1, ease, delay: 1.0 },
  };
  const ctaAnim = {
    initial: { opacity: 0, y: 16 },
    animate: mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    transition: { duration: 0.8, ease, delay: 1.25 },
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO — cinematic parity with CatalogPage */}
      <section ref={heroRef} className="relative h-screen w-full overflow-hidden border-b border-border">
        <motion.div
          key={`hero-bg-${collection.slug}`}
          className="absolute inset-0 will-change-transform"
          style={{ y: imgY, scale: imgScale }}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.2, ease }}
        >
          <img src={hero} alt={collection.name} className="absolute inset-0 h-[115%] w-full object-cover" />
        </motion.div>

        <motion.div className="absolute inset-0 pointer-events-none" style={{ opacity: overlayOpacity }}>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.15) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)",
            }}
          />
        </motion.div>

        <div className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-10 items-center gap-4">
          <div className="h-12 w-px bg-white/40" />
          <span
            className="text-[10px] tracking-[0.45em] uppercase text-white/70 font-light"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Livora Collection
          </span>
          <div className="h-12 w-px bg-white/40" />
        </div>

        <motion.div
          className="relative z-10 h-full container-livora flex items-center"
          style={{ x: textX, opacity: textOpacity, y: textY }}
        >
          <div className="max-w-[560px] w-full md:w-[46%] pt-24 md:pt-32 pr-4 md:pr-0">
            <motion.p
              {...eyebrowAnim}
              className="flex items-center gap-4 text-[10px] uppercase tracking-[0.45em] text-white/80 font-light mb-8"
            >
              <span className="inline-block h-px w-8 bg-white/50" />
              <Link to="/collection" className="hover:text-white transition-colors">
                Collection
              </Link>
            </motion.p>

            <h1
              className="serif font-light text-white leading-[0.95] mb-6 md:mb-8"
              style={{ fontSize: "clamp(44px, 10vw, 128px)", textShadow: "1px 1px 12px rgba(0,0,0,0.45)" }}
            >
              <motion.span {...headingAnim} className="block">
                {collection.name}
              </motion.span>
              <motion.em {...headingItalicAnim} className="block italic font-light">
                Collection
              </motion.em>
            </h1>

            <motion.p
              {...descAnim}
              className="text-sm md:text-[15px] text-white/80 font-light leading-relaxed mb-10"
              style={{ maxWidth: 460 }}
            >
              {collection.short_description || collection.description || ""}
            </motion.p>

            {collection.cta_text && (
              <motion.button
                {...ctaAnim}
                onClick={() => document.getElementById("collection-story")?.scrollIntoView({ behavior: "smooth" })}
                className="group inline-flex items-center gap-3 bg-[#f5f0e8] text-[#1a1a1a] px-7 py-3.5 text-[10px] uppercase tracking-[0.3em] font-light hover:bg-white transition-colors duration-300"
              >
                {collection.cta_text}
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </motion.button>
            )}
          </div>
        </motion.div>
      </section>

      {/* CATEGORY BAR — icon dock */}
      <div className="py-8 flex justify-center">
        <CategoryBar
          tabs={CATEGORY_TABS}
          activeSlug="all"
          onSelect={(s) =>
            s === "all"
              ? document.getElementById("collection-packages")?.scrollIntoView({ behavior: "smooth" })
              : navigate(`/collection/${collection.slug}/${s}`)
          }
        />
      </div>

      {/* STORY — cleaned up: no eyebrow, no title, no CTA button */}
      {(collection.story?.story_description || collection.story?.story_banner) && (
        <section id="collection-story" className="container-livora py-16 md:py-24">
          <div className="relative rounded-2xl overflow-hidden bg-neutral-900">
            {collection.story?.story_banner && (
              <div className="absolute inset-0">
                <img
                  src={collection.story.story_banner}
                  alt=""
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
              </div>
            )}
            <div className="relative z-10 p-10 md:p-16 max-w-xl text-white">
              <p className="text-sm md:text-base text-white/85 leading-relaxed">
                {collection.story?.story_description}
              </p>
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
                    <img
                      src={p.banner}
                      alt={p.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-110"
                    />
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

          {/* Items Included — grouped by furniture type. Card = 1 type in the package. */}
          {activePackage && groupedByType.length > 0 && (
            <div id="package-items" className="mt-12 md:mt-16">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 md:mb-8">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="serif text-xl md:text-2xl font-light">{activePackage.name}</h3>
                  <span className="text-[10px] md:text-[11px] tracking-[0.15em] uppercase text-muted-foreground bg-background px-3 py-1 rounded-full border border-border">
                    {activePackage.items?.length ?? 0} Items
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {groupedByType.map(({ typeSlug, typeName, sample, count }, i) => (
                  <motion.button
                    key={typeSlug}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/collection/${collection.slug}/${typeSlug}?package=${activePackage.slug}`,
                      )
                    }
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: (i % 8) * 0.05 }}
                    className="group block text-left"
                  >
                    <div className="relative aspect-square overflow-hidden bg-white rounded-md">
                      {sample.image ? (
                        <img
                          src={sample.image}
                          alt={typeName}
                          className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted/40" />
                      )}
                      <span className="absolute top-3 right-3 text-[10px] tracking-[0.15em] uppercase bg-foreground text-background px-2.5 py-1 rounded-full">
                        {count} {count === 1 ? "pc" : "pcs"}
                      </span>
                    </div>
                    <div className="pt-3 md:pt-4 text-center">
                      <p className="text-sm font-medium text-foreground group-hover:text-foreground/70 transition-colors">
                        {typeName}
                      </p>
                      <p className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground mt-1">
                        {count} {count === 1 ? "piece" : "pieces"}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <BookConsultation />

      <div className="py-8" />
      <Footer />
    </div>
  );
}
