import { useMemo, useState } from "react";
import { Armchair, Sofa, BedDouble, Table2, Library, Sparkles, Plus, Minus, Trash2, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  categories,
  formatRupiah,
  furnitureProducts,
  type FurnitureCategory,
  type FurnitureProduct,
} from "@/data/furniture";
import { useCart } from "@/context/CartContext";

const iconFor = (cat: FurnitureCategory) => {
  switch (cat) {
    case "Chair":
      return Armchair;
    case "Sofa":
      return Sofa;
    case "Bed":
      return BedDouble;
    case "Table":
      return Table2;
    case "Accessories":
      return Library;
    case "Custom":
      return Sparkles;
  }
};

const ProductCard = ({
  product,
  onOpen,
}: {
  product: FurnitureProduct;
  onOpen: (p: FurnitureProduct) => void;
}) => {
  const Icon = iconFor(product.category);
  return (
    <button
      onClick={() => onOpen(product)}
      className="group text-left bg-card border border-border hover:border-foreground/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-secondary/60 overflow-hidden flex items-center justify-center">
        <Icon
          className="w-20 h-20 text-foreground/30 transition-transform duration-700 group-hover:scale-110"
          strokeWidth={1}
        />
        <span className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.3em] text-foreground/60 bg-background/80 px-2.5 py-1">
          {product.category}
        </span>
      </div>
      <div className="p-6 flex flex-col gap-3 flex-1">
        <h3 className="serif text-2xl font-light leading-tight">{product.name}</h3>
        <p className="text-sm text-foreground/65 font-light">{product.short}</p>
        <div className="mt-auto pt-4 flex items-end justify-between border-t border-border/60">
          <p className="serif text-lg font-light">
            {product.isCustom ? "By Inquiry" : formatRupiah(product.price)}
          </p>
          <span className="text-[10px] uppercase tracking-[0.3em] text-foreground/60 group-hover:text-foreground transition-colors">
            {product.isCustom ? "Request →" : "View →"}
          </span>
        </div>
      </div>
    </button>
  );
};

const ProductModal = ({
  product,
  onClose,
  onCustomRequest,
}: {
  product: FurnitureProduct | null;
  onClose: () => void;
  onCustomRequest: () => void;
}) => {
  const cart = useCart();
  if (!product) return null;
  const Icon = iconFor(product.category);

  const handleAdd = () => {
    cart.add({ id: product.id, name: product.name, price: product.price });
    toast.success("Item added to cart!", { description: product.name });
    onClose();
  };

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-square bg-secondary/60 flex items-center justify-center">
            <Icon className="w-32 h-32 text-foreground/30" strokeWidth={1} />
            <span className="absolute top-5 left-5 text-[10px] uppercase tracking-[0.3em] text-foreground/60 bg-background/80 px-2.5 py-1">
              {product.category}
            </span>
          </div>
          <div className="p-8 md:p-10 flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle className="serif text-3xl font-light leading-tight text-left">
                {product.name}
              </DialogTitle>
            </DialogHeader>
            <p className="text-foreground/70 font-light leading-relaxed text-sm">
              {product.description}
            </p>
            <div className="space-y-3 text-xs border-t border-b border-border py-5">
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="uppercase tracking-[0.25em] text-foreground/60">Dimensions</span>
                <span className="text-foreground/85">{product.dimensions}</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="uppercase tracking-[0.25em] text-foreground/60">Material</span>
                <span className="text-foreground/85">{product.material}</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="uppercase tracking-[0.25em] text-foreground/60">Price</span>
                <span className="serif text-lg">
                  {product.isCustom ? "By Inquiry" : formatRupiah(product.price)}
                </span>
              </div>
            </div>
            {product.isCustom ? (
              <Button
                onClick={() => {
                  onClose();
                  onCustomRequest();
                }}
                className="rounded-none h-12 text-xs uppercase tracking-[0.25em]"
              >
                Request Custom
              </Button>
            ) : (
              <Button
                onClick={handleAdd}
                className="rounded-none h-12 text-xs uppercase tracking-[0.25em]"
              >
                Add to Cart
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CustomInquiryModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Inquiry sent", { description: "We'll get back to you within 24 hours." });
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="p-8 md:p-10">
          <DialogHeader>
            <DialogTitle className="serif text-3xl font-light text-left">
              Request a Custom Piece
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/65 font-light mt-2">
            Share your brief — dimensions, materials, references — and we'll respond with a proposal.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.3em] text-foreground/60">Name</Label>
              <Input required className="rounded-none mt-2 h-11" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.3em] text-foreground/60">Email</Label>
              <Input required type="email" className="rounded-none mt-2 h-11" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.3em] text-foreground/60">Brief</Label>
              <Textarea required rows={4} className="rounded-none mt-2" />
            </div>
            <Button type="submit" className="w-full rounded-none h-12 text-xs uppercase tracking-[0.25em]">
              Send Inquiry
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Furniture = () => {
  const [active, setActive] = useState<(typeof categories)[number]>("All");
  const [selected, setSelected] = useState<FurnitureProduct | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  const filtered = useMemo(
    () =>
      active === "All" ? furnitureProducts : furnitureProducts.filter((p) => p.category === active),
    [active]
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
            Our Furniture <em className="italic">Collection</em>
          </h1>
          <p className="mt-6 text-foreground/70 font-light max-w-xl mx-auto">
            Handcrafted pieces curated for considered living — from quiet seating to statement tables.
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="sticky top-[72px] z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="container-livora py-5 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {categories.map((c) => {
            const isActive = c === active;
            return (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`text-[10px] md:text-xs uppercase tracking-[0.25em] px-4 py-2.5 border transition-all duration-300 ${
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-foreground/70 hover:border-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      {/* Grid */}
      <section className="py-16 md:py-24">
        <div className="container-livora">
          <div
            key={active}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 animate-fade-in"
          >
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={setSelected} />
            ))}
          </div>
          <p className="text-center text-[10px] uppercase tracking-[0.35em] text-foreground/55 mt-20">
            Lember berkualitas <span className="mx-2">·</span> Lumber yg dibuat dengan baik
          </p>
        </div>
      </section>

      <ProductModal
        product={selected}
        onClose={() => setSelected(null)}
        onCustomRequest={() => setCustomOpen(true)}
      />
      <CustomInquiryModal open={customOpen} onClose={() => setCustomOpen(false)} />

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
