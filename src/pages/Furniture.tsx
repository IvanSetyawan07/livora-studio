import { getAllThumbnails, subscribeThumbnails } from "@/lib/themeThumbnails";
import React, { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Armchair, Sofa as SofaIcon, Table2, LayoutGrid, ArrowLeft, Package, Search } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { PromoBadge, PromoPriceTag } from "@/components/livora/PromoPriceTag";
import { type Item } from "@/data/items";
import { useAllItems } from "@/lib/itemsApi";
import { api } from "@/lib/api";
import { getAllBanners, getBanners, subscribeBanners, type ThemeBanner } from "@/lib/themeBanners";

type ThemeKey = string;

type ThemeMeta = {
  icon: typeof Armchair;
  tagline: string;
  slugs: string[];
};

const themePresets: Record<string, ThemeMeta> = {
  Chair: {
    icon: Armchair,
    tagline: "Sculpted seating for quiet moments.",
    slugs: ["white-chair", "coco-chair", "work-chair"],
  },
  Sofa: {
    icon: SofaIcon,
    tagline: "Generous silhouettes built for slow living.",
    slugs: ["lounge-sofa", "modular-sofa"],
  },
  Table: {
    icon: Table2,
    tagline: "Considered surfaces in stone, brass, and wood.",
    slugs: ["coco-table", "coffee-table"],
  },
};

const defaultMeta = (name: string): ThemeMeta => ({
  icon: Package,
  tagline: `Curated ${name.toLowerCase()} pieces in our collection.`,
  slugs: [],
});

const getMeta = (name: string): ThemeMeta =>
  themePresets[name] ?? defaultMeta(name);

const allMeta: ThemeMeta = {
  icon: LayoutGrid,
  tagline: "Every piece in our collection, in one place.",
  slugs: [],
};
type FurnitureType = { id: number; name: string; slug: string; image?: string | null };

const findItem = (slug: string, all: Item[]): Item | undefined =>
  all.find((i) => i.slug === slug);

const ThemeCard = ({
  themeKey,
  onOpen,
  allItems,
  count,
  thumbnailImage,
}: {
  themeKey: ThemeKey;
  onOpen: (k: ThemeKey) => void;
  allItems: Item[];
  count: number;
  thumbnailImage?: string;
}) => {
  const { icon: Icon, tagline, slugs } =
    themeKey === "All" ? allMeta : getMeta(themeKey);

  const previewSlug = slugs[0];
  const previewItem = !thumbnailImage && previewSlug
    ? findItem(previewSlug, allItems)
    : undefined;

  return (
    <button
      onClick={() => onOpen(themeKey)}
      className="group text-left bg-card border border-border hover:border-foreground/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] flex flex-col"
    >
      <div className="relative aspect-[31/20] bg-secondary/60 overflow-hidden flex items-center justify-center">
        {thumbnailImage ? (
          <img
            src={thumbnailImage}
            alt={themeKey}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : previewItem ? (
          <div className="w-1/2 h-1/2 transition-transform duration-700 group-hover:scale-110">
            <ItemIllustration name={previewItem.name} size={240} />
          </div>
        ) : (
          <Icon className="w-20 h-20 text-foreground/30" strokeWidth={1} />
        )}
        <span className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.3em] text-foreground/60 bg-background/80 px-2.5 py-1">
          Theme
        </span>
      </div>
      <div className="p-6 flex flex-col gap-3 flex-1">
        <h3 className="serif text-2xl font-light leading-tight">{themeKey}</h3>
        <p className="text-sm text-foreground/65 font-light">{tagline}</p>
        <div className="mt-auto pt-4 flex items-end justify-between border-t border-border/60">
          <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/60">
            {count} {count === 1 ? "piece" : "pieces"}
          </p>
          <span className="text-[10px] uppercase tracking-[0.3em] text-foreground/60 group-hover:text-foreground transition-colors">
            Explore →
          </span>
        </div>
      </div>
    </button>
  );
};

const ItemCard = ({ item }: { item: Item }) => (
  <Link
    to={`/items/${item.slug}`}
    className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <div
      className="item-card active:scale-[0.98] relative"
      style={{
        background: "#FAFAF8",
        border: "1px solid #E8E4DF",
        borderRadius: "10px",
        overflow: "hidden",
        aspectRatio: "31 / 20",
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        transition: "all 0.3s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {item.is_on_promo && (
        <div className="absolute top-2.5 left-2.5 z-10">
          <PromoBadge text={item.promo_badge_text || "PROMO"} />
        </div>
      )}
      {item.image ? (
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="w-2/3 h-2/3 transition-transform duration-500 group-hover:scale-105">
          <ItemIllustration name={item.name} size={260} />
        </div>
      )}
    </div>
    <div className="mt-4 px-1">
      <h3 className="text-sm font-normal text-foreground leading-snug">{item.name}</h3>
      <p className="text-[11px] uppercase tracking-[0.15em] text-foreground/50 mt-1">{item.code}</p>
    </div>
  </Link>
);

const Furniture = () => {
  const allItems = useAllItems();
  const [searchParams] = useSearchParams();
  const [activeTheme, setActiveTheme] = useState<ThemeKey | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [types, setTypes] = useState<FurnitureType[]>([]);
  const [banners, setBanners] = useState(() => getAllBanners());
  const [thumbnails, setThumbnails] = useState<Record<string, any>>({});

  useEffect(() => {
    api
      .get<FurnitureType[]>("/taxonomies/furniture-types")
      .then((r) => setTypes(r.data ?? []))
      .catch(() => setTypes([]));
  }, []);

  useEffect(() => {
    setBanners(getAllBanners());
    const unsub = subscribeBanners(() => setBanners(getAllBanners()));
    const onFocus = () => setBanners(getAllBanners());
    window.addEventListener("focus", onFocus);
    return () => {
      unsub();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Load thumbnails awal
  useEffect(() => {
    getAllThumbnails().then(setThumbnails);
  }, []);

  // Subscribe thumbnails dengan focus listener
  useEffect(() => {
    const unsub = subscribeThumbnails(() => getAllThumbnails().then(setThumbnails));
    const onFocus = () => getAllThumbnails().then(setThumbnails);
    window.addEventListener("focus", onFocus);
    return () => {
      unsub();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    setBanners(getAllBanners());
    getAllThumbnails().then(setThumbnails);
  }, [activeTheme]);

  const themeKeys: ThemeKey[] = useMemo(() => {
    const names = types.length
      ? types.map((t) => t.name)
      : Object.keys(themePresets);
    return ["All", ...names];
  }, [types]);

  const typeImageByName = useMemo(() => {
  const m: Record<string, string> = {};
  types.forEach((t) => { if (t.image) m[t.name] = t.image; });
  return m;
}, [types]);

  const slugToName = useMemo(() => {
    const m: Record<string, string> = {
      "new-arrivals": "All",
      sofas: "Sofa",
      chairs: "Chair",
      tables: "Table",
      beds: "Bed",
    };
    for (const t of types) m[t.slug] = t.name;
    return m;
  }, [types]);

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (!categoryParam) return;
    const theme = slugToName[categoryParam];
    if (theme) setActiveTheme(theme);
  }, [searchParams, slugToName]);

  const itemsForTheme = (key: ThemeKey): Item[] => {
    if (key === "All") return allItems;
    const keyword = key.toLowerCase();
    const matched = allItems.filter(
      (i) =>
        i.category?.toLowerCase() === keyword ||
        i.name.toLowerCase().includes(keyword),
    );
    const meta = getMeta(key);
    const ordered = meta.slugs
      .map((s) => matched.find((i) => i.slug === s))
      .filter((i): i is Item => Boolean(i));
    const rest = matched.filter((i) => !ordered.includes(i));
    return [...ordered, ...rest];
  };

  const themedItems = useMemo(() => {
    if (!activeTheme) return [];
    const base = itemsForTheme(activeTheme);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.code ?? "").toLowerCase().includes(q) ||
        (i.category ?? "").toLowerCase().includes(q),
    );
  }, [activeTheme, allItems, types, searchQuery]);

  const activeBanners: ThemeBanner[] = activeTheme ? getBanners(activeTheme) : [];

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-12 md:pt-48 md:pb-24 border-b border-border">
        <div className="container-livora text-center max-w-4xl">
          <p className="text-[10px] uppercase tracking-[0.45em] text-foreground/60 mb-4 md:mb-6">
            Livora | Furniture
          </p>
          <h1 className="serif text-4xl sm:text-5xl md:text-7xl font-light leading-[1.08] text-balance">
            {activeTheme ? (
              <><em className="italic">{activeTheme}</em> Collection</>
            ) : (
              <>Our Furniture <em className="italic">Collection</em></>
            )}
          </h1>
          <p className="mt-4 md:mt-6 text-sm sm:text-base text-foreground/70 font-light max-w-xl mx-auto">
            {activeTheme
              ? (activeTheme === "All" ? allMeta : getMeta(activeTheme)).tagline
              : "Browse by theme — choose a category to explore the curated pieces inside."}
          </p>
        </div>
      </section>

      <section className="py-10 md:py-24">
        <div className="container-livora">
          {!activeTheme ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 animate-fade-in">
              {themeKeys.map((k) => (
                <ThemeCard
                  key={k}
                  themeKey={k}
                  onOpen={(k2) => { setSearchQuery(""); setActiveTheme(k2); }}
                  allItems={allItems}
                  count={itemsForTheme(k).length}
                  thumbnailImage={typeImageByName[k] || thumbnails[k]?.image}
                />
              ))}
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 md:mb-10">
                <button
                  onClick={() => { setActiveTheme(null); setSearchQuery(""); }}
                  className="inline-flex items-center gap-2 min-h-[44px] py-2 text-[10px] uppercase tracking-[0.3em] text-foreground/75 hover:text-foreground transition-colors self-start"
                >
                  <ArrowLeft size={14} /> Back to Themes
                </button>
                <div className="relative w-full sm:w-64">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Filter ${activeTheme.toLowerCase()}...`}
                    aria-label="Filter furniture"
                    className="w-full h-11 pl-10 pr-3 border border-border rounded bg-background text-base sm:text-sm font-light outline-none focus:border-foreground transition-colors"
                  />
                </div>
              </div>
              <style>{`
                .furniture-grid { grid-auto-flow: dense; }
                @media (min-width: 1024px) {
                  ${activeBanners.map((_, i) => {
                    const n = i + 1;
                    const colStart = n % 2 === 1 ? 1 : 3;
                    const rowStart = 1 + i * 5;
                    return `.furniture-grid [data-banner="${n}"]{grid-column:${colStart} / span 2;grid-row:${rowStart} / span 2;}`;
                  }).join("\n")}
                }
              `}</style>
              <div className="furniture-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-5 gap-y-8 sm:gap-y-10">
                {(() => {
                  const nodes: React.ReactNode[] = themedItems.map((item) => (
                    <ItemCard key={item.slug} item={item} />
                  ));
                  activeBanners.forEach((b, i) => {
                    const insertIdx = Math.min(i * 12, nodes.length);
                    const banner = (
                      <div
                        key={`__banner_${i}__`}
                        data-banner={i + 1}
                        className="col-span-2 row-span-2 bg-secondary/40 border border-border rounded-[10px] overflow-hidden relative h-full w-full min-h-[300px]"
                      >
                        <img
                          src={b.image}
                          alt={b.title || `${activeTheme} banner ${i + 1}`}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {b.title && (
                          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/60 to-transparent">
                            <p className="serif text-2xl text-white font-light">
                              {b.title}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                    nodes.splice(insertIdx, 0, banner);
                  });
                  return nodes;
                })()}
              </div>

            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Furniture;