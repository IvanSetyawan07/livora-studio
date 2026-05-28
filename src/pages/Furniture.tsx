import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { imgUrl, trackClick } from "@/lib/adminApi";
import { toast } from "sonner";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { Button } from "@/components/ui/button";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { useCart } from "@/context/CartContext";
import { formatRupiah } from "@/data/furniture";

/* -------------------- Page -------------------- */

const Furniture = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [allItems, setAllItems] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);

  const themeQ = searchParams.get("theme") || "";
  const catQ = searchParams.get("category") || "";
  const typeQ = searchParams.get("type") || "";

  useEffect(() => {
    api.get("/taxonomies/themes").then((r) => setThemes(r.data)).catch(() => {});
    api.get("/taxonomies/categories").then((r) => setCats(r.data)).catch(() => {});
    api.get("/taxonomies/furniture-types").then((r) => setTypes(r.data)).catch(() => {});
    api.get("/items").then((r) => setAllItems(r.data)).catch(() => setAllItems([]));
  }, []);

  const setFilter = (key: "theme" | "category" | "type", val: string) => {
    const sp = new URLSearchParams(searchParams);
    if (sp.get(key) === val) sp.delete(key);
    else sp.set(key, val);
    setSearchParams(sp);
  };

  const clearType = () => {
    const sp = new URLSearchParams(searchParams);
    sp.delete("type");
    setSearchParams(sp);
  };

  // Compute item counts per type
  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of allItems) {
      const slug = it.type?.slug;
      if (slug) map[slug] = (map[slug] || 0) + 1;
    }
    return map;
  }, [allItems]);

  // Preview image per type (first item with image)
  const typePreview = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const it of allItems) {
      const slug = it.type?.slug;
      if (slug && !map[slug] && it.image) map[slug] = it.image;
    }
    return map;
  }, [allItems]);

  const taglineForType = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("chair")) return "Sculpted seating for quiet moments.";
    if (n.includes("sofa")) return "Generous silhouettes built for slow living.";
    if (n.includes("table")) return "Considered surfaces in stone, brass, and wood.";
    if (n.includes("lamp") || n.includes("light")) return "Warm light for thoughtful spaces.";
    if (n.includes("bed")) return "Restful forms for the quiet hours.";
    return "Curated pieces from the Livora studio.";
  };

  const activeType = types.find((t) => t.slug === typeQ) || null;

  // Filtered items
  const filteredItems = useMemo(() => {
    return allItems.filter((it) => {
      if (typeQ && it.type?.slug !== typeQ) return false;
      if (themeQ && !(it.themes || []).some((x: any) => x.slug === themeQ)) return false;
      if (catQ && !(it.categories || []).some((x: any) => x.slug === catQ)) return false;
      return true;
    });
  }, [allItems, typeQ, themeQ, catQ]);

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
            {activeType ? (
              <>
                <em className="italic">{activeType.name}</em> Collection
              </>
            ) : (
              <>
                Our Furniture <em className="italic">Collection</em>
              </>
            )}
          </h1>
          <p className="mt-6 text-foreground/70 font-light max-w-xl mx-auto">
            {activeType
              ? taglineForType(activeType.name)
              : "Browse by type — choose a category to explore the curated pieces inside."}
          </p>
        </div>
      </section>

      {/* TYPE CARDS (top of page) */}
      {!activeType && (
        <section className="py-14 md:py-20 border-b border-border">
          <div className="container-livora">
            <p className="text-[10px] uppercase tracking-[0.45em] text-foreground/60 mb-3">Browse by Type</p>
            <h2 className="serif text-3xl md:text-5xl font-light leading-[1.05] mb-10">
              Pick a <em className="italic">furniture type.</em>
            </h2>

            {types.length === 0 ? (
              <p className="text-sm text-muted-foreground">No furniture types yet. Add some in the admin dashboard.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {types.map((t) => {
                  const count = typeCounts[t.slug] || 0;
                  const preview = typePreview[t.slug];
                  return (
                    <button
                      key={t.id}
                      onClick={() => setFilter("type", t.slug)}
                      className="group text-left bg-card border border-border hover:border-foreground/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] flex flex-col"
                    >
                      <div className="relative aspect-[4/3] bg-secondary/60 overflow-hidden flex items-center justify-center">
                        {preview ? (
                          <img
                            src={imgUrl(preview)}
                            alt={t.name}
                            className="w-full h-full object-contain p-6 transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-1/2 h-1/2 transition-transform duration-700 group-hover:scale-110">
                            <ItemIllustration name={t.name} size={240} />
                          </div>
                        )}
                        <span className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.3em] text-foreground/60 bg-background/80 px-2.5 py-1">
                          Type
                        </span>
                      </div>
                      <div className="p-6 flex flex-col gap-3 flex-1">
                        <h3 className="serif text-2xl font-light leading-tight">{t.name}</h3>
                        <p className="text-sm text-foreground/65 font-light">{taglineForType(t.name)}</p>
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
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ITEMS LIST (shown when a type is selected, or always below as full catalog) */}
      <section className="py-14 md:py-20">
        <div className="container-livora">
          {activeType && (
            <button
              onClick={clearType}
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-foreground/65 hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft size={14} /> Back to Types
            </button>
          )}

          <p className="text-[10px] uppercase tracking-[0.45em] text-foreground/60 mb-3">
            {activeType ? `${activeType.name} Pieces` : "Studio Collection"}
          </p>
          <h2 className="serif text-3xl md:text-5xl font-light leading-[1.05] mb-10">
            From the <em className="italic">Livora studio.</em>
          </h2>

          {/* Theme & Category Filters */}
          <div className="space-y-3 mb-10">
            {themes.length > 0 && (
              <Chips label="Theme" options={themes} active={themeQ} onClick={(v) => setFilter("theme", v)} />
            )}
            {cats.length > 0 && (
              <Chips label="Category" options={cats} active={catQ} onClick={(v) => setFilter("category", v)} />
            )}
          </div>

          {filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items match these filters.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredItems.map((it: any) => (
                <Link
                  key={it.id}
                  to={`/items/${it.slug}`}
                  onClick={() => trackClick("item", it.id)}
                  className="bg-card border border-border hover:border-foreground/40 transition rounded overflow-hidden"
                >
                  <div className="aspect-[4/3] bg-secondary/60 grid place-items-center overflow-hidden">
                    {it.image ? (
                      <img src={imgUrl(it.image)} alt={it.title} className="w-full h-full object-contain p-6" />
                    ) : (
                      <ItemIllustration name={it.title} size={200} />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/60">{it.type?.name || "Item"}</p>
                    <h3 className="serif text-lg mt-1">{it.title}</h3>
                    <p className="text-xs text-muted-foreground">{it.code}</p>
                  </div>
                </Link>
              ))}
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

function Chips({ label, options, active, onClick }: { label: string; options: any[]; active: string; onClick: (slug: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-[0.3em] text-foreground/60 mr-2">{label}</span>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onClick(o.slug)}
          className={`text-[10px] uppercase tracking-[0.25em] px-4 py-2 border transition-all ${
            active === o.slug
              ? "bg-foreground text-background border-foreground"
              : "border-border text-foreground/70 hover:border-foreground hover:text-foreground"
          }`}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

/* -------------------- Cart Drawer (mounted globally via Navbar) -------------------- */

export const CartDrawer = () => {
  const cart = useCart();
  return (
    <div
      className={`fixed inset-0 z-[1100] transition-opacity duration-300 ${
        cart.open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="absolute inset-0 bg-foreground/40" onClick={() => cart.setOpen(false)} />
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
