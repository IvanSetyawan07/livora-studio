import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { WhatsAppButton } from "@/components/livora/WhatsAppButton";
import { Footer } from "@/components/livora/Footer";
import { CATALOG_ITEMS, CATALOG_CATEGORIES, CatalogItem } from "@/types/catalog";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface HotspotItem {
  id: string;
  label: string;
  x: number;
  y: number;
  itemSlug?: string;
  image?: string;
  description?: string;
}

interface GalleryScene {
  id: string;
  image?: string;
  alt: string;
  hotspots: HotspotItem[];
}

// ─────────────────────────────────────────────
// Scene Builder
// ─────────────────────────────────────────────
const buildScenes = (item: CatalogItem): GalleryScene[] => [
  {
    id: "scene-1",
    alt: `${item.title} scene 1`,
    image: `/catalog/${item.slug}/scene-1.jpg`,
    hotspots: [
      { id: "h1", label: "Lounge Chair", x: 28, y: 55, itemSlug: "lounge-chair-oslo" },
      { id: "h2", label: "Side Table",   x: 52, y: 68, itemSlug: "side-table-nero"   },
      { id: "h3", label: "Floor Lamp",   x: 72, y: 38, itemSlug: "floor-lamp-arc"    },
    ],
  },
  {
    id: "scene-2",
    alt: `${item.title} scene 2`,
    image: `/catalog/${item.slug}/scene-2.jpg`,
    hotspots: [
      { id: "h4", label: "Sofa",         x: 40, y: 60, itemSlug: "sofa-haven"        },
      { id: "h5", label: "Coffee Table", x: 60, y: 72, itemSlug: "coffee-table-slab" },
    ],
  },
];

// ─────────────────────────────────────────────
// HotspotDot Component
// ─────────────────────────────────────────────
const HotspotDot = ({
  spot,
  onClick,
  active,
}: {
  spot: HotspotItem;
  onClick: () => void;
  active: boolean;
}) => (
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

// ─────────────────────────────────────────────
// HotspotPanel Component
// ─────────────────────────────────────────────
const HotspotPanel = ({
  spot,
  onClose,
}: {
  spot: HotspotItem;
  onClose: () => void;
}) => (
  <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-72 z-30 bg-background/95 backdrop-blur-sm border border-border shadow-xl p-5">
    <button
      onClick={onClose}
      className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
    >
      <X size={14} />
    </button>
    <div className="aspect-[4/3] bg-secondary/60 mb-4 flex items-center justify-center">
      {spot.image ? (
        <img
          src={spot.image}
          alt={spot.label}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-light">
          No preview
        </span>
      )}
    </div>
    <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1 font-light">
      Featured Item
    </p>
    <p className="serif text-base font-light text-foreground mb-2">
      {spot.label}
    </p>
    {spot.description && (
      <p className="text-xs text-muted-foreground font-light leading-relaxed mb-4">
        {spot.description}
      </p>
    )}
    {spot.itemSlug && (
      <Link
        to={`/items/${spot.itemSlug}`}
        className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-foreground hover:text-muted-foreground transition-colors font-light"
      >
        View Item Details <ArrowUpRight size={10} />
      </Link>
    )}
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function CatalogDetail() {
  const { slug } = useParams<{ slug: string }>();
  console.log("slug =", slug);
  console.log("catalog items =", CATALOG_ITEMS);
  const navigate = useNavigate();

  // ── Data
  const item    = useMemo(() => CATALOG_ITEMS.find((i) => i.slug === slug), [slug]);
  const catMeta = useMemo(() => item ? CATALOG_CATEGORIES.find((c) => c.slug === item.category) : null, [item]);
  const scenes  = useMemo(() => item ? buildScenes(item) : [], [item]);

  // ── UI State
  const [sceneIdx,    setSceneIdx]    = useState(0);
  const [activeSpot,  setActiveSpot]  = useState<HotspotItem | null>(null);
  const [carouselPos, setCarouselPos] = useState(0);
  const [heroReady,   setHeroReady]   = useState(false);
  const [imgReady,    setImgReady]    = useState(false);
  const [mounted,     setMounted]     = useState(false);
  const [scrollY,     setScrollY]     = useState(0);
  const [windowH,     setWindowH]     = useState(800);

  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Explore items for carousel
  const exploreItems = useMemo(
    () => item ? CATALOG_ITEMS.filter((i) => i.category === item.category && i.slug !== item.slug).slice(0, 8) : [],
    [item]
  );
  const carouselPages = Math.ceil(exploreItems.length / 4);

  // ── Reset on slug change
  useEffect(() => {
    window.scrollTo(0, 0);
    setSceneIdx(0);
    setActiveSpot(null);
    setCarouselPos(0);
    setHeroReady(false);
    setImgReady(false);
    setScrollY(0);
    setMounted(false);

    // Slight delay so DOM is ready before animating
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, [slug]);

  // ── Track scroll position
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // ── Track window height (reactive to resize)
  useEffect(() => {
    const fn = () => setWindowH(window.innerHeight);
    fn(); // set initial
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // ── Reveal on scroll (IntersectionObserver) — FIX: stable deps
  useEffect(() => {
    const els = document.querySelectorAll<Element>(".reveal");
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-visible")),
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [slug]); // re-run when page changes

  // ── 404
  if (!item || !catMeta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="serif text-3xl font-light mb-4">Catalog not found</p>
          <Link
            to="/catalog/living-rooms"
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const currentScene = scenes[sceneIdx];

  // ── Scroll-driven values
  const scrollRatio    = Math.min(scrollY / (windowH * 0.65), 1);
  const overlayOpacity = Math.max(0.48 - scrollRatio * 0.46, 0.02);

  // Per-element style — sama dengan animasi Hero.tsx:
  // Entry  : translateX(-100px) + blur(10px) + opacity 0  →  normal, spring easing
  // Scroll turun : geser ke kiri + blur + fade out (reversible)
  // Scroll naik  : balik ke posisi normal + fade in
  const getItemStyle = (
    delay: number   // stagger delay saat entry (ms)
  ): React.CSSProperties => {
    if (!mounted) {
      // Belum entry — sama persis pola Hero.tsx
      return {
        opacity: 0,
        transform: "translateX(-100px)",
        filter: "blur(10px)",
        transition: `all 1.3s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      };
    }
    // Setelah entry: dikontrol scroll
    // scrollRatio 0 → normal | scrollRatio 1 → kiri + blur + transparan
    const tx      = -(scrollRatio * 60);
    const opacity = Math.max(1 - scrollRatio * 1.8, 0);
    const blur    = scrollRatio * 8;
    return {
      opacity,
      transform: `translateX(${tx}px)`,
      filter: `blur(${blur}px)`,
      transition: "opacity 0.15s ease-out, transform 0.15s ease-out, filter 0.15s ease-out",
      pointerEvents: opacity < 0.05 ? "none" : "auto",
    };
  };

  // ── Hero background: try video first, then fallback to cover image
  const coverImage = item.coverImage ?? `/catalog/${item.slug}/cover.jpg`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ════════════════════════════════════════
          1. HERO SECTION
      ════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-end pb-16 md:pb-24 overflow-hidden">

        {/* Fallback cover image — always rendered below video */}
        <div
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
            imgReady ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url(${coverImage})` }}
        >
          {/* Preload trigger */}
          <img
            src={coverImage}
            alt=""
            className="sr-only"
            onLoad={() => setImgReady(true)}
          />
        </div>

        {/* Stone placeholder while nothing is ready */}
        {!heroReady && !imgReady && (
          <div className="absolute inset-0 bg-[hsl(var(--livora-stone))]" />
        )}

        {/* Video (primary background) */}
        <video
          ref={videoRef}
          key={item.slug}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            heroReady ? "opacity-100" : "opacity-0"
          }`}
          src={`/videos/${item.category}.mp4`}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={() => setHeroReady(true)}
        />

        {/* ── Reactive dark overlay: dark on entry → fades on scroll */}
        <div
          className="absolute inset-0 pointer-events-none bg-background"
          style={{ opacity: overlayOpacity, transition: "none" }}
        />

        {/* ── Bottom gradient (permanent) */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background via-background/20 to-transparent" />

        {/* ── Content: fade+slide dari kiri saat entry, fade+slide ke kanan saat scroll turun, reversible */}
        <div className="relative z-10 container-livora w-full">

          {/* Breadcrumb — entry dari -32px kiri, exit ke +24px kanan */}
          <nav
            className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-foreground/50 mb-8 font-light"
            style={getItemStyle(0)}
          >
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <Link to={`/catalog/${item.category}`} className="hover:text-foreground transition-colors">
              {catMeta.label}
            </Link>
            <span>/</span>
            <span className="text-foreground/80">{item.title}</span>
          </nav>

          <div className="max-w-2xl">
            {/* Category · Taxonomy label */}
            <p
              className="text-[9px] uppercase tracking-[0.3em] text-foreground/50 mb-4 font-light"
              style={getItemStyle(80)}
            >
              {catMeta.label} &nbsp;·&nbsp; {item.taxonomy}
            </p>

            {/* Title — entry dari -56px, exit ke +40px (lebih dramatis) */}
            <h1
              className="serif text-6xl md:text-8xl font-light leading-[0.9] mb-6 text-foreground"
              style={getItemStyle(180)}
            >
              {item.title}
            </h1>

            {/* Description */}
            <p
              className="text-sm md:text-base text-foreground/70 font-light leading-relaxed max-w-md mb-10"
              style={getItemStyle(300)}
            >
              {item.description}
            </p>

            {/* Buttons */}
            <div
              className="flex items-center gap-4"
              style={getItemStyle(420)}
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
                className="text-[10px] uppercase tracking-[0.18em] text-foreground/60 hover:text-foreground transition-colors duration-300 font-light flex items-center gap-1.5"
              >
                <ChevronLeft size={12} /> All {catMeta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          2. DESCRIPTION SECTION
      ════════════════════════════════════════ */}
      <section className="py-24 md:py-32 border-b border-border">
        <div className="container-livora">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 md:gap-24 items-start">
            <div className="md:pt-2">
              <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-light mb-3">
                About this Collection
              </p>
              <div className="w-8 h-px bg-border" />
            </div>
            <div>
              <p className="serif text-3xl md:text-4xl font-light text-foreground leading-[1.25] mb-8 reveal">
                {item.description}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-10">
                {[
                  { label: "Style",      value: item.taxonomy  },
                  { label: "Category",   value: catMeta.label  },
                  { label: "Collection", value: item.title     },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 font-light">
                      {s.label}
                    </p>
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
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2 font-light">
                Livora &nbsp;|&nbsp; Spaces
              </p>
              <h2 className="serif text-3xl md:text-4xl font-light text-foreground reveal">
                Inside the <em className="italic">Space</em>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {scenes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setSceneIdx(i); setActiveSpot(null); }}
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

          <div className="relative aspect-[16/9] bg-secondary overflow-hidden">
            {currentScene.image ? (
              <img
                src={currentScene.image}
                alt={currentScene.alt}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[hsl(var(--livora-stone))] flex items-center justify-center">
                <svg viewBox="0 0 800 450" className="w-full h-full opacity-30">
                  <line x1="0"   y1="0"   x2="800" y2="450" stroke="hsl(var(--livora-taupe))" strokeWidth="1" />
                  <line x1="800" y1="0"   x2="0"   y2="450" stroke="hsl(var(--livora-taupe))" strokeWidth="1" />
                  <rect x="1"    y="1"    width="798" height="448" fill="none" stroke="hsl(var(--livora-taupe))" strokeWidth="1" />
                </svg>
              </div>
            )}

            <div className="absolute inset-0 bg-foreground/10" />

            {currentScene.hotspots.map((spot) => (
              <HotspotDot
                key={spot.id}
                spot={spot}
                active={activeSpot?.id === spot.id}
                onClick={() => setActiveSpot(activeSpot?.id === spot.id ? null : spot)}
              />
            ))}

            {activeSpot && (
              <HotspotPanel spot={activeSpot} onClose={() => setActiveSpot(null)} />
            )}

            {!activeSpot && (
              <div className="absolute bottom-4 right-4 text-[9px] uppercase tracking-[0.15em] text-white/60 font-light">
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
            <h2 className="serif text-3xl md:text-4xl font-light text-foreground reveal">
              Items in this <em className="italic">Collection</em>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {scenes
              .flatMap((s) => s.hotspots)
              .slice(0, 7)
              .map((spot, i) => (
                <Link
                  key={spot.id}
                  to={spot.itemSlug ? `/items/${spot.itemSlug}` : "#"}
                  className={`group relative bg-secondary overflow-hidden ${
                    i === 0 ? "md:col-span-2 md:row-span-2" : ""
                  }`}
                  style={{
                    aspectRatio: i === 0 ? "auto" : "3/4",
                    minHeight: i === 0 ? "360px" : undefined,
                  }}
                >
                  <div className="absolute inset-0 bg-[hsl(var(--livora-stone))]">
                    {spot.image && (
                      <img src={spot.image} alt={spot.label} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                    <p className="text-[9px] uppercase tracking-[0.15em] text-foreground/60 mb-0.5 font-light">
                      {item.taxonomy}
                    </p>
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
              ))}
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

          {/* Carousel track */}
          <div className="overflow-hidden">
            <div
              className="flex gap-4 transition-transform duration-500 select-none"
              style={{
                transform: `translateX(calc(-${carouselPos * 25}% - ${carouselPos * 16}px))`,
              }}
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
                      <img
                        src={ei.coverImage}
                        alt={ei.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[hsl(var(--livora-stone))] flex items-center justify-center">
                        <svg viewBox="0 0 160 213" className="w-full h-full opacity-30">
                          <line x1="0"   y1="0"   x2="160" y2="213" stroke="hsl(var(--livora-taupe))" strokeWidth="1" />
                          <line x1="160" y1="0"   x2="0"   y2="213" stroke="hsl(var(--livora-taupe))" strokeWidth="1" />
                          <rect x="1"    y="1"    width="158" height="211" fill="none" stroke="hsl(var(--livora-taupe))" strokeWidth="1" />
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

          {/* Carousel controls */}
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
                  className={`h-px transition-all duration-300 ${
                    i === carouselPos ? "w-7 bg-foreground" : "w-4 bg-border"
                  }`}
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

      <Footer />
      <WhatsAppButton />
    </div>
  );
}