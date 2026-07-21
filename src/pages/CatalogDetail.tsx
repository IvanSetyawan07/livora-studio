// UPDATED: Add tagline dan aboutTitle ke normaliseCatalog + About section JSX
// Base: Document 6 (Framer Motion version)

// src/pages/CatalogDetail.tsx
import SaveButton from "@/components/livora/SaveButton";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { motion, useScroll, useTransform, easeOut } from "framer-motion";
import { Navbar } from "@/components/livora/Navbar";
import { WhatsAppButton } from "@/components/livora/WhatsAppButton";
import { Footer } from "@/components/livora/Footer";
import { BookConsultation } from "@/components/livora/BookConsultation";
import { api } from "@/lib/api";
import {
  CATALOG_CATEGORIES,
  CatalogItem,
  CatalogCategory,
  Catalog,
} from "@/types/catalog";
import { getCatalogBySlug, getAllCatalogs, getPublicHotspots } from "@/lib/catalogApi";
import { imgUrl } from "@/lib/adminApi";

// ─────────────────────────────────────────────
// Helper: normalise API Catalog → CatalogItem
// ─────────────────────────────────────────────
function normaliseCatalog(raw: Catalog): CatalogItem {
  const categorySlug: CatalogCategory =
    typeof raw.category === "string"
      ? (raw.category as CatalogCategory)
      : ((raw.category as any)?.slug as CatalogCategory);

  let taxonomyStr = "";
  if (typeof raw.taxonomy === "string") {
    taxonomyStr = raw.taxonomy;
  } else if (Array.isArray(raw.taxonomy)) {
    taxonomyStr = (raw.taxonomy[0] as any)?.name ?? "";
  } else if (raw.taxonomy && typeof raw.taxonomy === "object") {
    taxonomyStr = (raw.taxonomy as any).name ?? "";
  }
  
  const r = raw as any;
  const coverImage: string | undefined = r.cover_image
    ? imgUrl(r.cover_image)
    : raw.coverImage
    ? imgUrl(raw.coverImage)
    : undefined;

  return {
    id: String(raw.id),
    slug: raw.slug,
    title: raw.title,
    tagline: r.tagline ?? "",           // ← ADD
    aboutTitle: r.about_title ?? "",    // ← ADD
    category: categorySlug,
    taxonomy: taxonomyStr,
    description: raw.description ?? "",
    coverImage,
    galleryImages: r.gallery_images ?? raw.galleryImages,
    featured: raw.featured,
  };
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface HotspotItem {
  id: string | number;
  scene_number: string;
  label: string;
  x: number;
  y: number;
  itemSlug?: string;
  item_slug?: string;
  image?: string;
  description?: string;
}

interface GalleryScene {
  id: string;
  image: string;
  alt: string;
  hotspots: HotspotItem[];
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function CatalogDetail() {
  const { category: categoryParam, slug } = useParams<{ category: string; slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const preload = (location.state as { preload?: CatalogItem } | null)?.preload;
  const preloadForSlug = preload && preload.slug === slug ? preload : null;
  const { scrollY } = useScroll();
  const heroRef = useRef<HTMLDivElement>(null);

  // ── API State (seed from router state so we skip the loading flash)
  const [item, setItem] = useState<CatalogItem | null>(preloadForSlug ?? null);
  const [loading, setLoading] = useState(!preloadForSlug);
  const [notFound, setNotFound] = useState(false);
  const [exploreItems, setExploreItems] = useState<CatalogItem[]>([]);
  const [rawCatalog, setRawCatalog] = useState<any>(null);
  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  // Tambah ini — map item_slug → item detail untuk lookup gambar
  const [itemMap, setItemMap] = useState<Record<string, { title: string; image?: string; code?: string }>>({});
  const [heroHeight, setHeroHeight] = useState(800);

  useEffect(() => {
  if (item) {
    console.log("tagline:", item.tagline);
    console.log("aboutTitle:", item.aboutTitle);
    console.log("description:", item.description);
  }
}, [item]);
  // ── Fetch catalog by slug + hotspots
  useEffect(() => {
    if (!slug) return;

    // Only show full loading state if we don't already have a preload for this slug
    if (!preloadForSlug) {
      setLoading(true);
      setItem(null);
    } else {
      setItem(preloadForSlug);
      setLoading(false);
    }
    setNotFound(false);
    setHotspots([]);

    const fetchData = async () => {
      try {
        const catalogData = await getCatalogBySlug(slug);
        setRawCatalog(catalogData);

        const normalised = normaliseCatalog(catalogData as Catalog);
        setItem(normalised);

        if (catalogData.id) {
  try {
    const hotspotsData = await getPublicHotspots(String(catalogData.id));
    setHotspots(hotspotsData as unknown as HotspotItem[]);

    // ── Fetch item details untuk gambar di Items Grid & HotspotPanel
    const slugs = (hotspotsData as any[])
      .map((h: any) => h.item_slug)
      .filter(Boolean) as string[];

    if (slugs.length > 0) {
      try {
        const { data: allItemsRes } = await api.get<any>('/items');'/items'

        const allItems: any[] = Array.isArray(allItemsRes)
          ? allItemsRes
          : (allItemsRes.data ?? []);

        const map: Record<string, { title: string; image?: string; code?: string }> = {};
        allItems.forEach((item: any) => {
          if (slugs.includes(item.slug)) {
            map[item.slug] = {
              title: item.title,
              image: item.image ?? item.cover_image ?? undefined,
              code: item.code,
            };
          }
        });
        setItemMap(map);
      } catch (err) {
        console.warn('Failed to fetch item details for hotspots:', err);
      }
    }

  } catch (err) {
    console.warn("Failed to fetch hotspots:", err);
    setHotspots([]);
  }
}

        const allRes = await getAllCatalogs({ per_page: 100 });
        const allRaw = allRes.data as unknown as any[];
        const siblings = allRaw
          .filter((i) => i.category === catalogData.category && i.slug !== catalogData.slug)
          .map((i) => normaliseCatalog(i as Catalog))
          .slice(0, 1);
        setExploreItems(siblings);
      } catch (err) {
        console.error("Failed to load catalog:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  // ── Derived
  const catMeta = useMemo(
    () => (item ? CATALOG_CATEGORIES.find((c) => c.slug === item.category) ?? null : null),
    [item]
  );

  const scenes = useMemo(() => {
    if (!rawCatalog) return [];

    const sceneHotspots1 = hotspots.filter((h) => h.scene_number === "scene-1");
    const sceneHotspots2 = hotspots.filter((h) => h.scene_number === "scene-2");

    return [
      {
        id: "scene-1",
        image: rawCatalog.scene_1_image ? imgUrl(rawCatalog.scene_1_image) : "",
        alt: `${item?.title} scene 1`,
        hotspots: sceneHotspots1,
      },
      {
        id: "scene-2",
        image: rawCatalog.scene_2_image ? imgUrl(rawCatalog.scene_2_image) : "",
        alt: `${item?.title} scene 2`,
        hotspots: sceneHotspots2,
      },
    ];
  }, [rawCatalog, hotspots, item]);

  // ── UI State
  const [sceneIdx, setSceneIdx] = useState(0);
  const [activeSpot, setActiveSpot] = useState<HotspotItem | null>(null);
  const [carouselPos, setCarouselPos] = useState(0);
  const [heroReady, setHeroReady] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const carouselPages = Math.ceil(exploreItems.length / 4);

  // ── Measure hero height on mount
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

  // ── Reset on slug change
  useEffect(() => {
    window.scrollTo(0, 0);
    setSceneIdx(0);
    setActiveSpot(null);
    setCarouselPos(0);
    setHeroReady(false);
    setImgReady(false);
    setMounted(false);

    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, [slug]);

  // ── Reveal on scroll
  useEffect(() => {
    const els = document.querySelectorAll<Element>(".reveal");
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-visible")),
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [slug]);

  // ─────────────────────────────────────────────
  // FRAMER MOTION TRANSFORMS
  // ─────────────────────────────────────────────
  
  const imageParallax = useTransform(
    scrollY,
    [0, heroHeight],
    [0, 50],
    { clamp: false }
  );

  const gradientOpacity = useTransform(
    scrollY,
    [0, heroHeight * 0.7, heroHeight * 0.95],
    [0, 0.3, 1],
    { clamp: true }
  );

  const shadowOpacity = useTransform(
    scrollY,
    [0, heroHeight],
    [0.2, 0.7],
    { clamp: true }
  );

  const textX = useTransform(
    scrollY,
    [0, heroHeight * 0.3, heroHeight * 0.6, heroHeight * 0.95],
    [0, -40, -80, -120]
  );

  const luxuryCubic = [0.22, 1, 0.36, 1] as const;

  const labelAnimation = {
    initial: { opacity: 0, x: -100, filter: "blur(10px)" },
    animate: mounted ? { opacity: 1, x: 0, filter: "blur(0px)" } : { opacity: 0, x: -100, filter: "blur(10px)" },
    transition: { duration: 1.3, ease: luxuryCubic, delay: 0 },
  };

  const titleAnimation = {
    initial: { opacity: 0, x: -100, filter: "blur(10px)" },
    animate: mounted ? { opacity: 1, x: 0, filter: "blur(0px)" } : { opacity: 0, x: -100, filter: "blur(10px)" },
    transition: { duration: 1.3, ease: luxuryCubic, delay: 0.18 },
  };

  const descriptionAnimation = {
    initial: { opacity: 0, x: -100, filter: "blur(10px)" },
    animate: mounted ? { opacity: 1, x: 0, filter: "blur(0px)" } : { opacity: 0, x: -100, filter: "blur(10px)" },
    transition: { duration: 1.3, ease: luxuryCubic, delay: 0.36 },
  };

  const ctaAnimation = {
    initial: { opacity: 0, x: -100, filter: "blur(10px)" },
    animate: mounted ? { opacity: 1, x: 0, filter: "blur(0px)" } : { opacity: 0, x: -100, filter: "blur(10px)" },
    transition: { duration: 1.3, ease: luxuryCubic, delay: 0.54 },
  };

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

  // ── Loading state (only if we have no preloaded item to show)
  if (loading && !item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-light animate-pulse">
          Loading…
        </p>
      </div>
    );
  }

  // ── 404 — only when API confirmed not found (never while still fetching)
  if (notFound || (!loading && (!item || !catMeta))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="serif text-3xl font-light mb-4">Catalog not found</p>
          <Link
            to={`/catalog/${categoryParam ?? "living-rooms"}`}
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  // From here we know we have an item (either preload or fetched). catMeta may
  // still be null for one paint if preload has an unusual category — guard.
  if (!item || !catMeta) {
    return <div className="min-h-screen bg-background" />;
  }

  const currentScene = scenes[sceneIdx] ?? { id: "", image: "", alt: "", hotspots: [] };
  const coverImage = item.coverImage ?? "/images/placeholder.jpg";

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar with scroll response */}
      <motion.div
        style={{
          backgroundColor: navbarBgOpacity.get ? "rgba(0,0,0,0)" : "#000",
        } as any}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/0 transition-colors duration-300"
      >
        <motion.div
          style={{
            backdropFilter: navbarBlur.get ? `blur(${navbarBlur.get()}px)` : "blur(0px)",
          } as any}
          className="w-full"
        >
          <Navbar />
        </motion.div>
      </motion.div>

      {/* ════════════════════════════════════════
          HERO SECTION — Premium, Cinematic
      ════════════════════════════════════════ */}
      <motion.section
        ref={heroRef}
        className="relative min-h-screen flex items-end pb-16 md:pb-24 overflow-hidden"
      >
        {/* Cover image with parallax */}
        <motion.div
          className="absolute inset-0"
          style={{ y: imageParallax }}
        >
          <div
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              imgReady ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${coverImage})` }}
          >
            <img src={coverImage} alt="" className="sr-only" onLoad={() => setImgReady(true)} />
          </div>

          {!heroReady && !imgReady && (
            <div className="absolute inset-0 bg-[hsl(var(--livora-stone))]" />
          )}

          {/* Video background */}
          <video
            ref={videoRef}
            key={item.slug}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              heroReady ? "opacity-100" : "opacity-0"
            }`}
            src={`/videos/${item.category}.mp4`}
            autoPlay loop muted playsInline
            onCanPlay={() => setHeroReady(true)}
          />
        </motion.div>

        {/* Scroll-driven gradient (appears as user scrolls) */}
        <motion.div
          className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none bg-gradient-to-t from-background via-background/40 to-transparent"
          style={{ opacity: gradientOpacity }}
        />

        {/* Dynamic shadow overlay (intensifies on scroll) */}
        <motion.div
          className="absolute inset-0 bg-black pointer-events-none"
          style={{ opacity: shadowOpacity }}
        />

        {/* Content with scroll-driven text motion (horizontal parallax) */}
        <motion.div
          className="relative z-10 container-livora w-full"
          style={{ x: textX, opacity: textOpacity, y: textY }}
        >
          {/* Navigation breadcrumb */}
          <motion.nav
            className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-white/70 mb-8 font-light"
            initial={labelAnimation.initial}
            animate={labelAnimation.animate}
            transition={labelAnimation.transition}
          >
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link to={`/catalog/${item.category}`} className="hover:text-white transition-colors">
              {catMeta.label}
            </Link>
            <span>/</span>
            <span className="text-white/90">{item.title}</span>
          </motion.nav>

          <div className="max-w-2xl">
            {/* Category label with staggered animation */}
            <motion.p
              className="text-[9px] uppercase tracking-[0.3em] text-white/60 mb-4 font-light"
              initial={labelAnimation.initial}
              animate={labelAnimation.animate}
              transition={labelAnimation.transition}
            >
              {catMeta.label}
            </motion.p>

              <div className="flex items-start justify-between gap-4 mb-2">
              <motion.h1
                className="serif text-5xl sm:text-6xl md:text-8xl font-light leading-[0.95] md:leading-[0.9] text-white break-words"
                initial={titleAnimation.initial}
                animate={titleAnimation.animate}
                transition={titleAnimation.transition}
              >
                {item.title}
              </motion.h1>
              
            </div>

            {/* Tagline with staggered animation */}
            <motion.p
              className="text-sm md:text-base text-white/70 font-light leading-relaxed max-w-md mb-10"
              initial={descriptionAnimation.initial}
              animate={descriptionAnimation.animate}
              transition={descriptionAnimation.transition}
            >
              {item.tagline}
            </motion.p>

            {/* CTA buttons with staggered animation */}
            <motion.div
              className="flex flex-wrap items-center gap-4"
              initial={ctaAnimation.initial}
              animate={ctaAnimation.animate}
              transition={ctaAnimation.transition}
            >
              <a
                href="#gallery"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-[10px] uppercase tracking-[0.18em] bg-foreground text-background px-8 py-3.5 hover:bg-foreground/80 transition-colors duration-300 font-light"
              >
                Explore Spaces
              </a>
              <Link
                to={`/catalog/${item.category}`}
                className="text-[10px] uppercase tracking-[0.18em] text-white/70 hover:text-white transition-colors duration-300 font-light flex items-center gap-1.5"
              >
                <div className="!rounded-none [&_button]:!rounded-none [&_button]:!border-0 [&_button]:!bg-foreground [&_button]:!text-background [&_button]:!px-8 [&_button]:!py-3.5 [&_button]:!text-[10px] [&_button]:!uppercase [&_button]:!tracking-[0.18em] [&_button]:!font-light hover:[&_button]:!bg-foreground/80 [&_button]:transition-colors [&_button]:duration-300">
  <SaveButton type="catalog" id={Number(item.id)} variant="pill" />
</div>
              </Link>
              
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

      {/* ════════════════════════════════════════
          2. DESCRIPTION SECTION — UPDATED
      ════════════════════════════════════════ */}
      <section className="py-24 md:py-32 border-b border-border">
        <div className="container-livora">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 md:gap-24 items-start">
            {/* LEFT COLUMN */}
            <div className="md:pt-2">
              <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-light mb-3">
                About this Collection
              </p>
              <div className="w-8 h-px bg-border" />
              
              {/* About Title (NEW) */}
              {item.aboutTitle && (
                <p className="serif text-2xl md:text-3xl font-light text-foreground mt-8 leading-[1.25]">
                  {item.aboutTitle}
                </p>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div>
              <p className="serif text-3xl md:text-4xl font-light text-foreground leading-[1.25] mb-8">
                {item.description}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-10">
                {[
                  { label: "Style", value: item.taxonomy },
                  { label: "Category", value: catMeta.label },
                  { label: "Collection", value: item.title },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 font-light">{s.label}</p>
                    <p className="text-sm text-foreground font-light">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          3. INTERACTIVE GALLERY
      ════════════════════════════════════════ */}
      <section id="gallery" className="py-16 md:py-20 border-b border-border bg-secondary/20">
        <div className="container-livora">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2 font-light">
                Livora &nbsp;|&nbsp; Spaces
              </p>
              <h2 className="serif text-3xl md:text-4xl font-light text-foreground">
                Inside the <em className="italic">Space</em>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {scenes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSceneIdx(i);
                    setActiveSpot(null);
                  }}
                  className={`text-[9px] uppercase tracking-[0.15em] px-3 py-1.5 border transition-all duration-300 font-light ${
                    i === sceneIdx
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/50"
                  }`}
                >
                  Scene {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="relative aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] bg-secondary overflow-hidden">
            {currentScene.image ? (
              <img
                src={currentScene.image}
                alt={currentScene.alt}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[hsl(var(--livora-stone))] flex items-center justify-center">
                <svg viewBox="0 0 800 450" className="w-full h-full opacity-30">
                  <line x1="0" y1="0" x2="800" y2="450" stroke="hsl(var(--livora-taupe))" strokeWidth="1" />
                  <line x1="800" y1="0" x2="0" y2="450" stroke="hsl(var(--livora-taupe))" strokeWidth="1" />
                  <rect x="1" y="1" width="798" height="448" fill="none" stroke="hsl(var(--livora-taupe))" strokeWidth="1" />
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-foreground/10" />

      {currentScene.hotspots.map((spot) => (
  <HotspotDot
    key={spot.id}
    spot={spot}
    active={activeSpot?.id === spot.id}
    onClick={(e) => {
      e.stopPropagation();
      setActiveSpot(activeSpot?.id === spot.id ? null : spot);
    }}
  />
))}

            {activeSpot && (
              <>
                {/* Click-outside overlay */}
                <div
                  className="absolute inset-0 z-20"
                  onClick={() => setActiveSpot(null)}
                />
                <HotspotPanel
                  spot={activeSpot}
                  onClose={() => setActiveSpot(null)}
                  itemMap={itemMap}
                />
              </>
            )}
            {!activeSpot && currentScene.hotspots.length > 0 && (
              <div className="hidden sm:block absolute bottom-4 right-4 text-[9px] uppercase tracking-[0.15em] text-white/60 font-light">
                Tap the dots to explore items
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          4. ITEMS GRID
      ════════════════════════════════════════ */}
      <section className="py-20 md:py-28 border-b border-border">
        <div className="container-livora">
          <div className="mb-12">
            <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2 font-light">
              Livora &nbsp;|&nbsp; Pieces
            </p>
            <h2 className="serif text-3xl md:text-4xl font-light text-foreground">
              Items in this <em className="italic">Collection</em>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {scenes.flatMap((s) => s.hotspots).slice(0, 7).map((spot, i) => {
              const itemSlug = (spot as any).item_slug || (spot as any).itemSlug;
              const itemDetail = itemSlug ? itemMap[itemSlug] : undefined;
              return (
                <Link
                  key={spot.id}
                  to={itemSlug ? `/items/${itemSlug}` : "#"}
                  className={`group relative bg-secondary overflow-hidden ${i === 0 ? "md:col-span-2 md:row-span-2" : ""}`}
                  style={{ aspectRatio: i === 0 ? "auto" : "3/4", minHeight: i === 0 ? "360px" : undefined }}
                >
                  <div className="absolute inset-0 bg-[hsl(var(--livora-stone))]">
        {itemDetail?.image && (                                   // ← CHANGED
          <img src={imgUrl(itemDetail.image)} alt={spot.label} className="w-full h-full object-cover" />
        )}
      </div>
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                    <p className="text-[9px] uppercase tracking-[0.15em] text-foreground/60 mb-0.5 font-light">{item.taxonomy}</p>
                    <div className="flex items-center justify-between">
                      <p className="serif text-sm font-light text-foreground">{spot.label}</p>
                      <ArrowUpRight size={14} className="text-foreground/60" />
                    </div>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="text-[8px] uppercase tracking-[0.1em] bg-background/80 text-muted-foreground px-2 py-0.5 font-light">
                      {spot.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          5. EXPLORE MORE CAROUSEL
      ════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-secondary/20">
        <div className="container-livora">
          <div className="text-center mb-12">
            <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-3 font-light">
              Livora &nbsp;|&nbsp; Discover
            </p>
            <h2 className="serif text-3xl md:text-4xl font-light mb-3 text-foreground reveal">
              More from <em className="italic">{catMeta.label}</em>
            </h2>
            <p className="text-sm text-muted-foreground font-light max-w-xs mx-auto leading-relaxed">
              Continue exploring our curated {catMeta.label.toLowerCase()} collection.
            </p>
          </div>

          <div className="overflow-hidden">
            <div
              className="flex gap-4 transition-transform duration-500 select-none"
              style={{ transform: `translateX(calc(-${carouselPos * 25}% - ${carouselPos * 16}px))` }}
            >
              {exploreItems.map((ei) => (
                <Link
                  key={ei.id}
                  to={`/catalog/${ei.category}/${ei.slug}`}
                  className="group flex-shrink-0 w-[calc(100%-12px)] sm:w-[calc(50%-12px)] lg:w-[calc(25%-12px)]"
                  draggable={false}
                >
                  <div className="relative aspect-[3/4] bg-secondary overflow-hidden mb-3">
                    {ei.coverImage ? (
                      <img src={ei.coverImage} alt={ei.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[hsl(var(--livora-stone))] flex items-center justify-center">
                        <svg viewBox="0 0 160 213" className="w-full h-full opacity-30">
                          <line x1="0" y1="0" x2="160" y2="213" stroke="hsl(var(--livora-taupe))" strokeWidth="1" />
                          <line x1="160" y1="0" x2="0" y2="213" stroke="hsl(var(--livora-taupe))" strokeWidth="1" />
                          <rect x="1" y="1" width="158" height="211" fill="none" stroke="hsl(var(--livora-taupe))" strokeWidth="1" />
                        </svg>
                      </div>
                    )}
                    <span className="absolute top-2 left-2 text-[8px] uppercase tracking-[0.1em] bg-background/85 text-muted-foreground px-1.5 py-0.5 font-light">
                      {ei.taxonomy}
                    </span>
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/8 transition-colors duration-500" />
                  </div>
                  <p className="serif text-sm font-light text-foreground group-hover:text-muted-foreground transition-colors duration-300">
                    {ei.title}
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground mt-0.5 font-light">
                    {ei.taxonomy}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {carouselPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                onClick={() => setCarouselPos((p) => Math.max(0, p - 1))}
                disabled={carouselPos === 0}
                className="w-8 h-8 border border-border flex items-center justify-center text-muted-foreground hover:border-foreground hover:text-foreground transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: carouselPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCarouselPos(i)}
                  className={`h-px transition-all duration-300 ${i === carouselPos ? "w-7 bg-foreground" : "w-4 bg-border"}`}
                />
              ))}
              <button
                onClick={() => setCarouselPos((p) => Math.min(carouselPages - 1, p + 1))}
                disabled={carouselPos >= carouselPages - 1}
                className="w-8 h-8 border border-border flex items-center justify-center text-muted-foreground hover:border-foreground hover:text-foreground transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to={`/catalog/${item.category}`}
              className="text-[10px] uppercase tracking-[0.2em] border border-border px-8 py-3 text-foreground hover:bg-foreground hover:text-background transition-all duration-500 font-light inline-block"
            >
              View All {catMeta.label}
            </Link>
          </div>
        </div>
      </section>

      <BookConsultation />

      <Footer />
      <WhatsAppButton />
    </div>
  );
}

// ─────────────────────────────────────────────
// HotspotDot Component
// ─────────────────────────────────────────────
const HotspotDot = ({
  spot,
  onClick,
  active,
}: {
  spot: HotspotItem;
  onClick: (e: React.MouseEvent) => void;
  active: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 group z-20 transition-all duration-300 ${
        active ? "scale-110" : ""
      }`}
      aria-label={spot.label}
    >
      <span
        className={`absolute inset-0 rounded-full border border-white/70 animate-ping opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
          active ? "opacity-100" : ""
        }`}
      />
      <span
        className={`block w-6 h-6 rounded-full border-2 border-white shadow-lg transition-all duration-300 flex items-center justify-center ${
          active
            ? "bg-white"
            : "bg-white/20 backdrop-blur-sm group-hover:bg-white/60"
        }`}
      >
        <span
          className={`block w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
            active ? "bg-foreground" : "bg-white"
          }`}
        />
      </span>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap text-[9px] uppercase tracking-[0.15em] bg-background/90 text-foreground px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none font-light">
        {spot.label}
      </span>
    </button>
  );
};
// ─────────────────────────────────────────────
// HotspotPanel Component
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// HotspotPanel Component
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// HotspotPanel Component
// ─────────────────────────────────────────────
const HotspotPanel = ({
  spot,
  onClose,
  itemMap,
}: {
  spot: HotspotItem;
  onClose: () => void;
  itemMap: Record<string, { title: string; image?: string; code?: string }>;
}) => {
  const itemSlug = spot.itemSlug || spot.item_slug;
  const itemDetail = itemSlug ? itemMap[itemSlug] : undefined;
  const displayImage = itemDetail?.image || spot.image;

  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 639px)").matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Desktop: place near dot, flipping to keep inside container.
  // Mobile: pin to safe left/right margins, flip vertically based on dot Y.
  const placeRight = spot.x < 55;
  const placeBelow = spot.y < 45;
  const horizontalOffset = 3;
  const verticalOffset = 3;

  const style: React.CSSProperties = isMobile
    ? {
        left: 16,
        right: 16,
        top: placeBelow ? `calc(${spot.y}% + ${verticalOffset}%)` : undefined,
        bottom: !placeBelow ? `calc(${100 - spot.y}% + ${verticalOffset}%)` : undefined,
      }
    : {
        left: placeRight ? `calc(${spot.x}% + ${horizontalOffset}%)` : undefined,
        right: !placeRight ? `calc(${100 - spot.x}% + ${horizontalOffset}%)` : undefined,
        top: placeBelow ? `calc(${spot.y}% + ${verticalOffset}%)` : undefined,
        bottom: !placeBelow ? `calc(${100 - spot.y}% + ${verticalOffset}%)` : undefined,
        maxWidth: "calc(100% - 24px)",
      };

  return (
    <div
      style={style}
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-30 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.14)] p-4 flex items-center gap-4 ${
        isMobile ? "w-auto" : "w-[270px] sm:w-[310px]"
      }`}
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl bg-secondary/60 overflow-hidden flex items-center justify-center">
        {displayImage ? (
          <img
            src={imgUrl(displayImage)}
            alt={spot.label}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground font-light">N/A</span>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <p className="text-[15px] sm:text-[16px] font-medium text-foreground leading-tight truncate">
          {spot.label}
        </p>
        {(itemDetail?.code || spot.description) && (
          <p className="text-[12px] sm:text-[13px] text-muted-foreground font-light leading-tight truncate mt-1">
            {itemDetail?.code || spot.description}
          </p>
        )}
        {(spot.itemSlug || spot.item_slug) && (
          <Link
            to={`/items/${spot.itemSlug || spot.item_slug}`}
            className="inline-flex items-center gap-1 mt-2 text-[12px] sm:text-[13px] text-foreground font-normal hover:text-muted-foreground transition-colors leading-tight"
          >
            View Product <ArrowUpRight size={12} strokeWidth={2} />
          </Link>
        )}
      </div>

      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full hover:bg-secondary/60"
      >
        <X size={14} />
      </button>
    </div>
  );
};