import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom"; // ← ADD useSearchParams
import { Armchair, Sofa as SofaIcon, Table2, LayoutGrid, ArrowLeft, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { Button } from "@/components/ui/button";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { type Item } from "@/data/items";
import { useAllItems } from "@/lib/itemsApi";
import { useCart } from "@/context/CartContext";
import { formatRupiah } from "@/data/furniture";
import chairTheme from "@/assets/furniture/chair-theme.png";
import sofaTheme from "@/assets/furniture/sofa-theme.png";

type ThemeKey = "Chair" | "Sofa" | "Table" | "All";

const themeMap: Record<ThemeKey, { icon: typeof Armchair; slugs: string[]; tagline: string; image?: string }> = {
  Chair: {
    icon: Armchair,
    tagline: "Sculpted seating for quiet moments.",
    image: chairTheme,
    slugs: ["white-chair", "coco-chair", "work-chair", /* ... rest */],
  },
  Sofa: {
    icon: SofaIcon,
    tagline: "Generous silhouettes built for slow living.",
    image: sofaTheme,
    slugs: ["lounge-sofa", "modular-sofa", /* ... rest */],
  },
  Table: {
    icon: Table2,
    tagline: "Considered surfaces in stone, brass, and wood.",
    slugs: ["coco-table", "coffee-table", /* ... rest */],
  },
  All: {
    icon: LayoutGrid,
    tagline: "Every piece in our collection, in one place.",
    slugs: [],
  },
};

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
      <div className="relative aspect-[4/3] bg-secondary/60 overflow-hidden flex items-center justify-center">
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
    className="group text-left bg-card border border-border hover:border-foreground/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] flex flex-col"
  >
    <div className="relative aspect-[4/3] bg-secondary/60 overflow-hidden flex items-center justify-center">
      {item.image ? (
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      ) : (
        <div className="w-2/3 h-2/3 transition-transform duration-700 group-hover:scale-110">
          <ItemIllustration name={item.name} size={260} />
        </div>
      )}
      <span className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.3em] text-foreground/60 bg-background/80 px-2.5 py-1">
        {item.category}
      </span>
    </div>
    <div className="p-6 flex flex-col gap-3 flex-1">
      <h3 className="serif text-2xl font-light leading-tight">{item.name}</h3>
      <p className="text-sm text-foreground/65 font-light">{item.specs.material}</p>
      <div className="mt-auto pt-4 flex items-end justify-between border-t border-border/60">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/60">{item.code}</p>
        <span className="text-[10px] uppercase tracking-[0.3em] text-foreground/60 group-hover:text-foreground transition-colors">
          View →
        </span>
      </div>
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
        "storage": "All",
      };
      
      const theme = themeKeyMap[categoryParam];
      if (theme) {
        setActiveTheme(theme);
      }
    }
  }, [searchParams]);

  const itemsForTheme = (key: ThemeKey): Item[] => {
    if (key === "All") return allItems;
    const staticOnes = themeMap[key].slugs
      .map((s) => findItem(s, allItems))
      .filter((i): i is Item => Boolean(i));
    const extra = allItems.filter(
      (i) =>
        !themeMap[key].slugs.includes(i.slug) &&
        i.category.toUpperCase().includes(key.toUpperCase()),
    );
    return [...staticOnes, ...extra];
  };

  const themedItems = useMemo(
    () => (activeTheme ? itemsForTheme(activeTheme) : []),
    [activeTheme, allItems],
  );

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
        <div className="container-livora">
          {!activeTheme ? (
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
                key={activeTheme}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
              >
                {themedItems.map((item) => (
                  <ItemCard key={item.slug} item={item} />
                ))}
              </div>
            </div>
          )}
          <p className="text-center text-[10px] uppercase tracking-[0.35em] text-foreground/55 mt-20">
            Lember berkualitas <span className="mx-2">·</span> Lumber yg dibuat dengan baik
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Furniture;

export const CartDrawer = () => {
  // ... rest of CartDrawer code remains the same
};