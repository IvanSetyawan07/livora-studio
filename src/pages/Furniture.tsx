import React, { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Armchair, Sofa as SofaIcon, Table2, LayoutGrid, ArrowLeft, Package } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { type Item } from "@/data/items";
import { useAllItems } from "@/lib/itemsApi";
import { api } from "@/lib/api";
import { getAllBanners, subscribeBanners } from "@/lib/themeBanners";
import chairTheme from "@/assets/furniture/chair-theme.png";
import sofaTheme from "@/assets/furniture/sofa-theme.png";

// Theme = "All" atau nama Furniture Type (dinamis dari backend).
type ThemeKey = string;

type ThemeMeta = {
  icon: typeof Armchair;
  tagline: string;
  image?: string;
  slugs: string[];
};

// Preset tampilan untuk type bawaan. Type baru otomatis pakai default.
const themePresets: Record<string, ThemeMeta> = {
  Chair: {
    icon: Armchair,
    tagline: "Sculpted seating for quiet moments.",
    image: chairTheme,
    slugs: ["white-chair", "coco-chair", "work-chair"],
  },
  Sofa: {
    icon: SofaIcon,
    tagline: "Generous silhouettes built for slow living.",
    image: sofaTheme,
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

type FurnitureType = { id: number; name: string; slug: string };

const findItem = (slug: string, all: Item[]): Item | undefined =>
  all.find((i) => i.slug === slug);

const ThemeCard = ({
  themeKey,
  onOpen,
  allItems,
  count,
}: {
  themeKey: ThemeKey;
  onOpen: (k: ThemeKey) => void;
  allItems: Item[];
  count: number;
}) => {
  const { icon: Icon, tagline, slugs, image } = themeMap[themeKey];
  const previewSlug = slugs[0];
  const previewItem = previewSlug ? findItem(previewSlug, allItems) : undefined;
  return (
    <button
      onClick={() => onOpen(themeKey)}
      className="group text-left bg-card border border-border hover:border-foreground/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] flex flex-col"
    >
      <div className="relative aspect-[31/20] bg-secondary/60 overflow-hidden flex items-center justify-center">
        {image ? (
          <img
            src={image}
            alt={themeKey}
            className="w-full h-full object-contain p-6 transition-transform duration-700 group-hover:scale-110"
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
    {/* Card (image only, BoConcept-style) */}
    <div
      className="item-card"
      style={{
        background: "#FAFAF8",
        border: "1px solid #E8E4DF",
        borderRadius: "10px",
        overflow: "hidden",
        aspectRatio:  "31 / 20",
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        transition: "all 0.3s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#C9A97A";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(201,169,122,0.12)";
        e.currentTarget.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E8E4DF";
        e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.04)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
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

    {/* Caption OUTSIDE the card (BoConcept style) */}
    <div className="mt-4 px-1">
      <h3 className="text-sm font-normal text-foreground leading-snug">
        {item.name}
      </h3>
      <p className="text-xs text-foreground/60 mt-1.5">
        Material · {item.specs.material}
      </p>
      <p className="text-[11px] uppercase tracking-[0.15em] text-foreground/50 mt-1">
        {item.code}
      </p>
    </div>
  </Link>
);


const Furniture = () => {
  const allItems = useAllItems();
  const [searchParams] = useSearchParams(); // ← ADD THIS
  const [activeTheme, setActiveTheme] = useState<ThemeKey | null>(null);

  // ✅ READ CATEGORY FROM URL
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      // Map URL slug ke ThemeKey
      const themeKeyMap: Record<string, ThemeKey> = {
        "new-arrivals": "All",
        "sofas": "Sofa",
        "chairs": "Chair",
        "tables": "Table",
        "beds": "Chair", // atau buat theme baru untuk Beds
      };
      
      const theme = themeKeyMap[categoryParam];
      if (theme) {
        setActiveTheme(theme);
      }
    }
  }, [searchParams]);

  const itemsForTheme = (key: ThemeKey): Item[] => {
    if (key === "All") return allItems;
    // Match by item name containing the theme keyword (Sofa / Chair / Table).
    // This ensures every sofa/chair/table appears in its category, regardless
    // of the legacy `category` field (which is "SEATING" for sofas & chairs).
    const keyword = key.toLowerCase();
    const matched = allItems.filter((i) => i.name.toLowerCase().includes(keyword));
    // Preserve curated order from themeMap.slugs first, then append the rest.
    const ordered = themeMap[key].slugs
      .map((s) => matched.find((i) => i.slug === s))
      .filter((i): i is Item => Boolean(i));
    const rest = matched.filter((i) => !ordered.includes(i));
    return [...ordered, ...rest];
  };

  const themedItems = useMemo(
    () => (activeTheme ? itemsForTheme(activeTheme) : []),
    [activeTheme, allItems],
  );

  // Admin-managed banner image for this theme (localStorage-backed CRUD)
 const [banners, setBanners] = useState(() => getAllBanners()); // lazy init

useEffect(() => {
  // Pastikan data fresh setiap mount (misal: balik dari admin page)
  setBanners(getAllBanners());

  // Subscribe cross-component changes
  const unsub = subscribeBanners(() => setBanners(getAllBanners()));

  // Safety net: refresh saat user kembali ke tab ini
  const onFocus = () => setBanners(getAllBanners());
  window.addEventListener("focus", onFocus);

  return () => {
    unsub();
    window.removeEventListener("focus", onFocus);
  };
}, []);

// Refresh setiap activeTheme berubah (user klik kategori)
useEffect(() => {
  setBanners(getAllBanners());
}, [activeTheme]);

const activeBanner = activeTheme ? banners[activeTheme] : undefined;
  console.log("localStorage raw:", localStorage.getItem("livora.themeBanners.v1"));
  console.log("banners state:", banners);
  console.log("activeTheme:", activeTheme);
  console.log("activeBanner:", activeBanner)
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-40 pb-16 md:pt-48 md:pb-24 border-b border-border">
        <div className="container-livora text-center max-w-4xl">
          
          <p className="text-[10px] uppercase tracking-[0.45em] text-foreground/60 mb-6">
            Livora | Furniture
          </p>
          <h1 className="serif text-5xl md:text-7xl font-light leading-[1.05] text-balance">
            {activeTheme ? (
              <>
                <em className="italic">{activeTheme}</em> Collection
              </>
            ) : (
              <>
                Our Furniture <em className="italic">Collection</em>
              </>
            )}
          </h1>
          <p className="mt-6 text-foreground/70 font-light max-w-xl mx-auto">
            {activeTheme
              ? themeMap[activeTheme].tagline
              : "Browse by theme — choose a category to explore the curated pieces inside."}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-24">
        <div className="w-full px-6 md:px-10 lg:px-16">
          {!activeTheme ? (
            //tampilan 4 
            // <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 animate-fade-in">
              {(Object.keys(themeMap) as ThemeKey[]).map((k) => (
                <ThemeCard
                  key={k}
                  themeKey={k}
                  onOpen={setActiveTheme}
                  allItems={allItems}
                  count={itemsForTheme(k).length}
                />
              ))}
            </div>
          ) : (
            <div className="animate-fade-in">
              <button
                onClick={() => setActiveTheme(null)}
                className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-foreground/65 hover:text-foreground transition-colors mb-10"
              >
                <ArrowLeft size={14} /> Back to Themes
              </button>
              <div
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10"
              >
                {(() => {
                  const nodes: React.ReactNode[] = themedItems.map((item) => (
                    <ItemCard key={item.slug} item={item} />
                  ));
                  if (activeBanner) {
                    const bannerIndex = themedItems.length >= 5 ? 4 : themedItems.length;
                    const banner = (
                      <div
                        key="__banner__"
                        className="col-span-2 row-span-2 bg-secondary/40 border border-border rounded-[10px] overflow-hidden relative h-full w-full"
                      >
                        <img
                          src={activeBanner.image}
                          alt={activeBanner.title || `${activeTheme} banner`}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {activeBanner.title && (
                          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/60 to-transparent">
                            <p className="serif text-2xl text-white font-light">
                              {activeBanner.title}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                    nodes.splice(bannerIndex, 0, banner);
                  }
                  return nodes;
                })()}
              </div>
            </div>
          )}
          {/* <p className="text-center text-[10px] uppercase tracking-[0.35em] text-foreground/55 mt-20">
            Lember berkualitas <span className="mx-2">·</span> Lumber yg dibuat dengan baik
          </p> */}
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Furniture;