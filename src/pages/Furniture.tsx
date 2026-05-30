import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

/* -------------------- Themes (only items that have illustrations) -------------------- */

type ThemeKey = "Chair" | "Sofa" | "Table" | "All";

const themeMap: Record<ThemeKey, { icon: typeof Armchair; slugs: string[]; tagline: string; image?: string }> = {
  Chair: {
    icon: Armchair,
    tagline: "Sculpted seating for quiet moments.",
    image: chairTheme,
    slugs: [
      "white-chair",
      "coco-chair",
      "work-chair",
      "accent-chair",
      "cozy-chair",
      "leather-lounge-chair",
      "olive-swivel-chair",
      "wooden-lounge-chair",
      "tan-leather-swivel-wingback-chair",
      "pleated-dining-chair",
      "barrel-chair",
      "swivel-accent-chair",
      "executive-lounge-chair",
    ],
  },
  Sofa: {
    icon: SofaIcon,
    tagline: "Generous silhouettes built for slow living.",
    image: sofaTheme,
    slugs: [
      "lounge-sofa",
      "modular-sofa",
      "boucle-sofa",
      "boucle-lounge-sofa",
      "freyja-sofa",
      "modular-sectional-sofa",
      "sage-modular-sectional-sofa",
      "tubular-curved-sofa",
    ],
  },
  Table: {
    icon: Table2,
    tagline: "Considered surfaces in stone, brass, and wood.",
    slugs: [
      "coco-table",
      "coffee-table",
      "marble-coffee-table",
      "brass-drum-coffee-table",
      "nesting-coffee-tables",
    ],
  },
  All: {
    icon: LayoutGrid,
    tagline: "Every piece in our collection, in one place.",
    slugs: [],
  },
};

const itemBySlug = (slug: string, all: Item[]): Item | undefined =>
  all.find((i) => i.slug === slug);

/* -------------------- Theme card -------------------- */

const ThemeCard = ({
  themeKey,
  onOpen,
}: {
  themeKey: ThemeKey;
  onOpen: (k: ThemeKey) => void;
}) => {
  const { icon: Icon, tagline, slugs, image } = themeMap[themeKey];
  const previewSlug = slugs[0];
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
        ) : previewSlug ? (
          <div className="w-1/2 h-1/2 transition-transform duration-700 group-hover:scale-110">
            <ItemIllustration name={itemBySlug(previewSlug)?.name ?? ""} size={240} />
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
            {slugs.length} {slugs.length === 1 ? "piece" : "pieces"}
          </p>
          <span className="text-[10px] uppercase tracking-[0.3em] text-foreground/60 group-hover:text-foreground transition-colors">
            Explore →
          </span>
        </div> 
      </div>
    </button>
  );
};

/* -------------------- Item card -------------------- */

const ItemCard = ({ item }: { item: Item }) => (
  <Link
    to={`/items/${item.slug}`}
    className="group text-left bg-card border border-border hover:border-foreground/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] flex flex-col"
  >
    <div className="relative aspect-[4/3] bg-secondary/60 overflow-hidden flex items-center justify-center">
      <div className="w-2/3 h-2/3 transition-transform duration-700 group-hover:scale-110">
        <ItemIllustration name={item.name} size={260} />
      </div>
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

/* -------------------- Page -------------------- */

const Furniture = () => {
  const [activeTheme, setActiveTheme] = useState<ThemeKey | null>(null);

  const themedItems = useMemo(() => {
    if (!activeTheme) return [];
    return themeMap[activeTheme].slugs
      .map(itemBySlug)
      .filter((i): i is Item => Boolean(i));
  }, [activeTheme]);

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
                <ThemeCard key={k} themeKey={k} onOpen={setActiveTheme} />
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

/* -------------------- Cart Drawer (mounted globally via Navbar) -------------------- */

export const CartDrawer = () => {
  const cart = useCart();
  return (
    <div
      className={`fixed inset-0 z-[1100] transition-opacity duration-300 ${
        cart.open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className="absolute inset-0 bg-foreground/40"
        onClick={() => cart.setOpen(false)}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-background border-l border-border flex flex-col transform transition-transform duration-500 ${
          cart.open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} />
            <h3 className="serif text-xl font-light">Your Cart</h3>
            <span className="text-[10px] uppercase tracking-[0.3em] text-foreground/60">
              {cart.count} {cart.count === 1 ? "item" : "items"}
            </span>
          </div>
          <button onClick={() => cart.setOpen(false)} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-foreground/60">
              <ShoppingBag size={32} strokeWidth={1} />
              <p className="text-sm font-light">Your cart is empty.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {cart.items.map((i) => (
                <li key={i.id} className="py-5 flex gap-4">
                  <div className="w-16 h-16 bg-secondary/60 shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex justify-between gap-3">
                      <p className="serif text-base font-light leading-tight">{i.name}</p>
                      <button
                        onClick={() => cart.remove(i.id)}
                        className="text-foreground/50 hover:text-foreground"
                        aria-label="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center border border-border">
                        <button
                          onClick={() => cart.setQty(i.id, i.qty - 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-secondary"
                          aria-label="Decrease"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs">{i.qty}</span>
                        <button
                          onClick={() => cart.setQty(i.id, i.qty + 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-secondary"
                          aria-label="Increase"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <p className="text-sm">{formatRupiah(i.price * i.qty)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="border-t border-border px-6 py-5 space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] uppercase tracking-[0.3em] text-foreground/60">Total</span>
              <span className="serif text-2xl font-light">{formatRupiah(cart.total)}</span>
            </div>
            <Button
              onClick={() => {
                toast.success("Checkout request received", {
                  description: "Our team will contact you shortly.",
                });
                cart.clear();
                cart.setOpen(false);
              }}
              className="w-full rounded-none h-12 text-xs uppercase tracking-[0.25em]"
            >
              Checkout
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
};
