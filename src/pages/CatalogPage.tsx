import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/livora/Navbar";
import { motion, useScroll, useTransform, easeOut } from "framer-motion";
import { CatalogCard } from "@/components/livora/CatalogCard";
import livingCatalog from "@/assets/catalo-livinroom.png";
import diningCatalog from "@/assets/catalo-dining.png";
import bedroomsCatalog from "@/assets/catalo-bedrooms.png";
import outdoorCatalog from "@/assets/catalo-outdoor.png";
import homeOfficeCatalog from "@/assets/catalo-homeoffice.png";
import publicCatalog from "@/assets/catalo-public.png";
import { WhatsAppButton } from "@/components/livora/WhatsAppButton";
import {
  CATALOG_CATEGORIES,
  CATALOG_TAXONOMIES,
  CatalogCategory,
  CatalogTaxonomy,
  CatalogItem,
  Catalog,
} from "@/types/catalog";
import { getAllCatalogs } from "@/lib/catalogApi";
import { imgUrl } from "@/lib/adminApi";

const ITEMS_PER_PAGE = 8;

// ─── CATEGORY IMAGES ───
const CATEGORY_IMAGES: Record<CatalogCategory, string> = {
  "living-rooms": livingCatalog,
  "dining-rooms": diningCatalog,
  "bedrooms": bedroomsCatalog,
  "outdoor-spaces": outdoorCatalog,
  "home-office": homeOfficeCatalog,
  "public-spaces": publicCatalog,
};

// ─────────────────────────────────────────────
// FIX: Normalise API response (snake_case → camelCase + full image URL)
// ─────────────────────────────────────────────
function normaliseCatalog(raw: any): CatalogItem {
  const categorySlug =
    typeof raw.category === "string" ? raw.category : raw.category?.slug;

  let taxonomyStr = "";
  if (typeof raw.taxonomy === "string") {
    taxonomyStr = raw.taxonomy;
  } else if (Array.isArray(raw.taxonomy)) {
    taxonomyStr = raw.taxonomy[0]?.name ?? "";
  } else if (raw.taxonomy && typeof raw.taxonomy === "object") {
    taxonomyStr = raw.taxonomy.name ?? "";
  }

  const coverImage: string | undefined = raw.cover_image
    ? imgUrl(raw.cover_image)
    : raw.coverImage
    ? imgUrl(raw.coverImage)
    : undefined;

  return {
    id: String(raw.id),
    slug: raw.slug,
    title: raw.title,
    category: categorySlug,
    taxonomy: taxonomyStr,
    description: raw.description ?? "",
    coverImage,
    galleryImages: raw.gallery_images ?? raw.galleryImages,
    featured: raw.featured,
  };
}

export default function CatalogPage() {
  const { category: categorySlug } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  const heroRef = useRef<HTMLElement>(null);
  const [heroHeight, setHeroHeight] = useState(800);

  const activeCat =
    CATALOG_CATEGORIES.find((c) => c.slug === categorySlug) ??
    CATALOG_CATEGORIES[0];

  const [activeTax, setActiveTax] = useState<CatalogTaxonomy>("All");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [carouselPos, setCarouselPos] = useState(0);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);

  const gridRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // FIX: Normalise setiap item sebelum disimpan ke state
  useEffect(() => {
    getAllCatalogs({ per_page: 100 }).then((res) => {
      const raw = res.data as unknown as any[];
      setCatalogItems(raw.map(normaliseCatalog));
    }).catch(console.error);
  }, []);

  // Reset state setiap ganti category
  useEffect(() => {
    setActiveTax("All");
    setVisibleCount(ITEMS_PER_PAGE);
    setCarouselPos(0);
  }, [categorySlug]);

  // Reveal animation observer
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-visible")),
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  });

  // Filtered items untuk grid
  const filteredItems = useMemo(() => {
    let items = catalogItems.filter((i) => i.category === activeCat.slug);
    if (activeTax !== "All") items = items.filter((i) => i.taxonomy === activeTax);
    return items;
  }, [catalogItems, activeCat.slug, activeTax]);

  // ─── NAVBAR SCROLL TRANSFORMS (sama persis dengan CatalogDetail) ───
  const navbarBgOpacity = useTransform(
    scrollY,
    [0, heroHeight * 0.3, heroHeight * 0.7],
    [0, 0.5, 1],
    { clamp: true }
  );

  const navbarBlur = useTransform(
    scrollY,
    [0, heroHeight * 0.7],
    [0, 12],
    { clamp: true }
  );

  // ─── MEASURE HERO HEIGHT ───
  useEffect(() => {
    if (heroRef.current) {
      setHeroHeight(heroRef.current.clientHeight);
    }

    const handleResize = () => {
      if (heroRef.current) {
        setHeroHeight(heroRef.current.clientHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;

  // Carousel — random dari semua category, exclude current
  const carouselItems = useMemo(() => {
    return [...catalogItems]
      .filter((i) => i.category !== activeCat.slug)
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
  }, [catalogItems, activeCat.slug]);

  // Carousel drag
  const drag = useRef({ active: false, startX: 0 });
  const handleDragStart = (e: React.MouseEvent) => {
    drag.current = { active: true, startX: e.clientX };
  };
  const handleDragEnd = (e: React.MouseEvent) => {
    if (!drag.current.active) return;
    const diff = e.clientX - drag.current.startX;
    drag.current.active = false;
    if (Math.abs(diff) > 60) moveCarousel(diff < 0 ? 1 : -1);
  };
  const moveCarousel = (dir: number) => {
    const pages = Math.ceil(carouselItems.length / 5);
    setCarouselPos((p) => Math.max(0, Math.min(pages - 1, p + dir)));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ─── NAVBAR (fixed, sama persis dengan CatalogDetail) ─── */}
      <motion.div
        style={{
          backgroundColor: navbarBgOpacity.get
            ? "rgba(0,0,0,0)"
            : "#000",
        } as any}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/0 transition-colors duration-300"
      >
        <motion.div
          style={{
            backdropFilter: navbarBlur.get
              ? `blur(${navbarBlur.get()}px)`
              : "blur(0px)",
          } as any}
          className="w-full"
        >
          <Navbar />
        </motion.div>
      </motion.div>

      {/* ── HERO (luxury editorial with scroll-driven exit animation) ── */}
      <CatalogHero
        activeCat={activeCat}
        heroRef={heroRef}
        scrollY={scrollY}
        index={CATALOG_CATEGORIES.findIndex((c) => c.slug === activeCat.slug)}
        total={CATALOG_CATEGORIES.length}
        bgImage={CATEGORY_IMAGES[activeCat.slug]}
        onExplore={() => {
          document.getElementById("catalog-grid")?.scrollIntoView({ behavior: "smooth" });
        }}
        onProjects={() => navigate("/projects")}
      />

      {/* ── FILTER BAR ── */}
      <div className="container-livora pt-8 pb-0" id="catalog-grid">
        <p className="text-[10px] uppercase tracking-[0.2em] text-foreground font-medium mb-3">
          {activeCat.label}
        </p>
        <div className="flex flex-wrap gap-2">
          {CATALOG_TAXONOMIES.map((tax) => (
            <button
              key={tax}
              onClick={() => { setActiveTax(tax); setVisibleCount(ITEMS_PER_PAGE); }}
              className={`text-[10px] uppercase tracking-[0.1em] px-3.5 py-1.5 border transition-all duration-300 font-light ${
                activeTax === tax
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"
              }`}
            >
              {tax}
            </button>
          ))}
        </div>
      </div>

      {/* ── CATALOG GRID ── */}
      <section className="container-livora py-8" ref={gridRef}>
        {visibleItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {visibleItems.map((item, i) => (
              <CatalogCard key={item.id} item={item} index={i} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
            <p className="serif text-2xl font-light text-muted-foreground italic">
              No collections found
            </p>
            <p className="text-xs text-muted-foreground mt-2 font-light">
              Try selecting a different style filter
            </p>
          </div>
        )}
        {hasMore && (
          <div className="flex justify-center mt-12">
            <button
              onClick={() => setVisibleCount((v) => v + ITEMS_PER_PAGE)}
              className="text-[10px] uppercase tracking-[0.18em] bg-foreground text-background px-10 py-3.5 hover:bg-foreground/80 transition-colors duration-300 font-light"
            >
              Load More Collections
            </button>
          </div>
        )}
      </section>

      {/* ── EXPLORE ANOTHER CATALOG ── */}
      <section className="bg-secondary/30 border-t border-border py-16 md:py-20">
        <div className="container-livora">
          <div className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3 font-light">
              Livora &nbsp;|&nbsp; Discover
            </p>
            <h2 className="serif text-3xl md:text-4xl font-light mb-3">
              Explore <em className="italic">Another</em> Catalog
            </h2>
            <p className="text-sm text-muted-foreground font-light max-w-sm mx-auto leading-relaxed">
              Explore additional collections curated from across the LIVORA catalog.
            </p>
          </div>
          {/* Mobile: horizontal snap scroll. Desktop: paged translate */}
          <div className="md:hidden -mx-5 px-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
            <div className="flex gap-3 pb-2">
              {carouselItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/catalog/${item.category}/${item.slug}`}
                  className="group flex-shrink-0 w-[65%] snap-start"
                  draggable={false}
                >
                  <div className="relative aspect-[3/4] bg-secondary overflow-hidden mb-2">
                    {item.coverImage && (
                      <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                    )}
                    <span className="absolute top-2 left-2 text-[9px] uppercase tracking-[0.1em] bg-background/85 text-muted-foreground px-1.5 py-0.5 font-light">
                      {item.taxonomy}
                    </span>
                  </div>
                  <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5 font-light">
                    {typeof item.category === "string" ? item.category.replace(/-/g, " ") : ""}
                  </p>
                  <p className="serif text-sm font-light text-foreground">{item.title}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:block overflow-hidden" ref={carouselRef}>
            <div
              className="flex gap-4 transition-transform duration-500 cursor-grab active:cursor-grabbing select-none"
              style={{ transform: `translateX(calc(-${carouselPos * 20}% - ${carouselPos * 16}px))` }}
              onMouseDown={handleDragStart}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
            >
              {carouselItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/catalog/${item.category}/${item.slug}`}
                  className="group flex-shrink-0 w-[calc(20%-13px)]"
                  draggable={false}
                >
                  <div className="hover-zoom relative aspect-[3/4] bg-secondary overflow-hidden mb-3">
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[hsl(var(--livora-stone))] flex items-center justify-center">
                        <svg viewBox="0 0 160 213" className="w-full h-full opacity-40">
                          <line x1="0" y1="0" x2="160" y2="213" stroke="hsl(var(--livora-taupe))" strokeWidth="1"/>
                          <line x1="160" y1="0" x2="0" y2="213" stroke="hsl(var(--livora-taupe))" strokeWidth="1"/>
                          <rect x="1" y="1" width="158" height="211" fill="none" stroke="hsl(var(--livora-taupe))" strokeWidth="1"/>
                        </svg>
                      </div>
                    )}
                    <span className="absolute top-2 left-2 text-[9px] uppercase tracking-[0.1em] bg-background/85 text-muted-foreground px-1.5 py-0.5 font-light">
                      {item.taxonomy}
                    </span>
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/8 transition-colors duration-500" />
                  </div>
                  <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5 font-light">
                    {typeof item.category === "string" ? item.category.replace(/-/g, " ") : ""}
                  </p>
                  <p className="serif text-sm font-light text-foreground group-hover:text-muted-foreground transition-colors duration-300">
                    {item.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden md:flex justify-center items-center gap-3 mt-6">
            <button
              onClick={() => moveCarousel(-1)}
              disabled={carouselPos === 0}
              className="w-8 h-8 border border-border flex items-center justify-center text-muted-foreground hover:border-foreground hover:text-foreground transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
            >
              ←
            </button>
            {Array.from({ length: Math.ceil(carouselItems.length / 5) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCarouselPos(i)}
                className={`h-px transition-all duration-300 ${
                  i === carouselPos ? "w-7 bg-foreground" : "w-5 bg-border"
                }`}
              />
            ))}
            <button
              onClick={() => moveCarousel(1)}
              disabled={carouselPos >= Math.ceil(carouselItems.length / 5) - 1}
              className="w-8 h-8 border border-border flex items-center justify-center text-muted-foreground hover:border-foreground hover:text-foreground transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
            >
              →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background/60 py-14">
        <div className="container-livora grid grid-cols-2 md:grid-cols-4 gap-8 mb-10 pb-10 border-b border-background/10">
          <div>
            <span className="serif text-lg tracking-[0.22em] uppercase text-background block mb-3 font-light">Livora</span>
            <p className="text-xs font-light leading-relaxed max-w-[200px]">
              A single point of contact for interior design, custom furniture supply, and construction.
            </p>
          </div>
          {[
            { title: "Catalog", links: CATALOG_CATEGORIES.map(c => c.label) },
            { title: "Company", links: ["About", "Projects", "Furniture", "Style", "Contact"] },
            { title: "Contact", links: ["Jakarta, Indonesia", "PT. Langgeng Cipta Ruang", "hello@livoralcr.com"] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-[9px] uppercase tracking-[0.2em] text-background/30 mb-4 font-light">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}><a href="#" className="text-xs text-background/55 hover:text-background transition-colors duration-200 font-light">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="container-livora flex justify-between text-[10px] text-background/25 font-light">
          <span>© 2025 Livora. All rights reserved.</span>
          <span>PT. Langgeng Cipta Ruang</span>
        </div>
      </footer>

      <WhatsAppButton />
    </div>
  );
}

// ─────────────────────────────────────────────
// CATALOG HERO — scroll-driven exit animation (sama seperti CatalogDetail)
// ─────────────────────────────────────────────
function CatalogHero({
  activeCat,
  heroRef,
  scrollY,
  index,
  total,
  bgImage,
  onExplore,
  onProjects,
}: {
  activeCat: any;
  heroRef: React.RefObject<HTMLElement>;
  scrollY: any;
  index: number;
  total: number;
  bgImage: string;
  onExplore: () => void;
  onProjects: () => void;
}) {
  const [heroHeight, setHeroHeight] = useState(800);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (heroRef.current) {
      setHeroHeight(heroRef.current.clientHeight);
    }
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Parallax: image moves slower than text, overlay darkens on scroll
  const imgY = useTransform(scrollY, [0, 800], [0, 140]);
  const imgScale = useTransform(scrollY, [0, 800], [1, 1.08]);
  
  // ← SCROLL-DRIVEN EXIT: text slides left + opacity fades as user scrolls
  const textX = useTransform(
    scrollY,
    [0, heroHeight * 0.3, heroHeight * 0.6, heroHeight * 0.95],
    [0, -40, -80, -120]
  );
  
  const textOpacity = useTransform(
    scrollY,
    [0, heroHeight * 0.5, heroHeight],
    [1, 0.5, 0],
    { clamp: true }
  );

  const textY = useTransform(
    scrollY,
    [0, heroHeight * 0.5, heroHeight],
    [0, -40, -80],
    { clamp: true }
  );

  const overlayOpacity = useTransform(scrollY, [0, 600], [0.55, 0.78]);

  const ease = [0.22, 1, 0.36, 1] as const;
  const counter = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  // ─── ENTRY ANIMATIONS ───
  const eyebrowAnimation = {
    initial: { opacity: 0, x: -40 },
    animate: mounted ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 },
    transition: { duration: 1, ease, delay: 0.2 },
  };

  const headingAnimation = {
    initial: { opacity: 0, x: -80, filter: "blur(8px)" },
    animate: mounted ? { opacity: 1, x: 0, filter: "blur(0px)" } : { opacity: 0, x: -80, filter: "blur(8px)" },
    transition: { duration: 1.2, ease, delay: 0.45 },
  };

  const headingItalicAnimation = {
    initial: { opacity: 0, x: -80, filter: "blur(8px)" },
    animate: mounted ? { opacity: 1, x: 0, filter: "blur(0px)" } : { opacity: 0, x: -80, filter: "blur(8px)" },
    transition: { duration: 1.2, ease, delay: 0.7 },
  };

  const descriptionAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    transition: { duration: 1, ease, delay: 1.0 },
  };

  const scrollIndicatorAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    transition: { delay: 1.6, duration: 0.9, ease },
  };

  return (
    <section
      ref={heroRef}
      className="relative h-screen w-full overflow-hidden border-b border-border"
    >
      {/* Background image (parallax + initial zoom from 105% → 100%) */}
      <motion.div
        key={`hero-bg-${activeCat.slug}`}
        className="absolute inset-0 will-change-transform"
        style={{ y: imgY, scale: imgScale }}
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.2, ease }}
      >
        <img
          src={bgImage}
          alt={activeCat.label}
          className="absolute inset-0 h-[115%] w-full object-cover"
        />
        <video
          key={activeCat.slug}
          className="absolute inset-0 h-[115%] w-full object-cover"
          src={`/videos/${activeCat.slug}.mp4`}
          autoPlay
          loop
          muted
          playsInline
        />
      </motion.div>

      {/* Cinematic layered gradients (darker on left, lighter right) */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: overlayOpacity }}
      >
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
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      </motion.div>

      {/* Vertical side label (left) */}
      <div className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-10 items-center gap-4">
        <div className="h-12 w-px bg-white/40" />
        <span
          className="text-[10px] tracking-[0.45em] uppercase text-white/70 font-light"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Curated Interiors
        </span>
        <div className="h-12 w-px bg-white/40" />
      </div>

      {/* Collection counter (bottom-left) */}
      <div className="absolute left-6 md:left-20 bottom-10 z-10 hidden md:flex flex-col items-start gap-1 text-white/70 font-light">
        <span className="text-xs tracking-[0.3em]">{String(index + 1).padStart(2, "0")}</span>
        <span className="h-8 w-px bg-white/40" />
        <span className="text-xs tracking-[0.3em]">{String(total).padStart(2, "0")}</span>
      </div>

      {/* Scroll indicator (bottom-left) */}
      <motion.button
        type="button"
        onClick={onExplore}
        className="hidden md:flex absolute left-32 bottom-10 z-10 items-center gap-3 text-white/70 hover:text-white transition-colors"
        initial={scrollIndicatorAnimation.initial}
        animate={scrollIndicatorAnimation.animate}
        transition={scrollIndicatorAnimation.transition}
      >
        <span className="flex items-center justify-center w-9 h-9 rounded-full border border-white/40">
          <span className="text-base leading-none">↓</span>
        </span>
        <span className="text-[10px] uppercase tracking-[0.35em] font-light">Scroll</span>
      </motion.button>

      {/* Thin horizontal accent line (top) */}
      <div className="absolute left-0 right-0 top-[88px] h-px bg-white/15 pointer-events-none" />

      {/* Content — left aligned, ~38% width */}
      <motion.div
        className="relative z-10 h-full container-livora flex items-center"
        style={{ x: textX, opacity: textOpacity, y: textY }}
      >
        <div className="max-w-[560px] w-full md:w-[40%] pt-24 md:pt-32">
          {/* Eyebrow */}
          <motion.p
            {...eyebrowAnimation}
            className="flex items-center gap-4 text-[10px] uppercase tracking-[0.45em] text-white/80 font-light mb-8"
          >
            <span className="inline-block h-px w-8 bg-white/50" />
            Livora Collection
          </motion.p>

          {/* Massive editorial heading */}
          <h1
            className="serif font-light text-white leading-[0.95] mb-8"
            style={{
              fontSize: "clamp(64px, 9vw, 140px)",
              textShadow: "1px 1px 12px rgba(0,0,0,0.45)",
            }}
          >
            <motion.span
              key={`t1-${activeCat.slug}`}
              {...headingAnimation}
              className="block"
            >
              {activeCat.title}
            </motion.span>
            <motion.em
              key={`t2-${activeCat.slug}`}
              {...headingItalicAnimation}
              className="block italic font-light"
            >
              {activeCat.titleItalic}
            </motion.em>
          </h1>

          {/* Description */}
          <motion.p
            {...descriptionAnimation}
            className="text-sm md:text-[15px] text-white/80 font-light leading-relaxed mb-10"
            style={{ maxWidth: 420 }}
          >
            {activeCat.description}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.12, delayChildren: 1.25 } },
            }}
            className="flex flex-wrap items-center gap-4"
          >
            <motion.button
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.8, ease }}
              onClick={onExplore}
              className="group inline-flex items-center gap-3 bg-[#f5f0e8] text-[#1a1a1a] px-7 py-3.5 text-[10px] uppercase tracking-[0.3em] font-light hover:bg-white transition-colors duration-300"
            >
              Explore Collection
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </motion.button>
            <motion.button
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.8, ease }}
              onClick={onProjects}
              className="inline-flex items-center gap-3 border border-white/60 text-white px-7 py-3.5 text-[10px] uppercase tracking-[0.3em] font-light hover:border-white hover:bg-white/10 transition-all duration-300"
            >
              View Projects
            </motion.button>
          </motion.div>
        </div>
      </motion.div> 

      {/* Counter on the right (mobile-friendly) */}
      <div className="md:hidden absolute right-5 bottom-6 z-10 text-white/70 text-[10px] tracking-[0.3em] font-light">
        {counter}
      </div>
    </section>
  );
}