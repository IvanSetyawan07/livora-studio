import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/data/furniture";
import { toast } from "sonner";

export const CartDrawer = () => {
  const { items, count, total, open, setOpen, remove, setQty, clear } = useCart();

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-[60]"
        onClick={() => setOpen(false)}
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-background z-[70] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-foreground/70" strokeWidth={1.5} />
            <h2 className="serif text-xl font-light">Your Cart</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-12 h-12 text-foreground/25 mb-4" strokeWidth={1} />
              <p className="text-foreground/60 font-light">Your cart is empty.</p>
              <p className="text-sm text-foreground/40 mt-1">Start exploring our collection.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 py-3 border-b border-border/50"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{item.name}</h4>
                  <p className="text-xs text-foreground/60 mt-0.5">
                    {item.price === 0 ? "Inquiry" : formatRupiah(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty(item.id, item.qty - 1)}
                    className="p-1.5 hover:bg-secondary rounded-full transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm w-6 text-center tabular-nums">{item.qty}</span>
                  <button
                    onClick={() => setQty(item.id, item.qty + 1)}
                    className="p-1.5 hover:bg-secondary rounded-full transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    remove(item.id);
                    toast.success("Removed from cart");
                  }}
                  className="p-2 hover:bg-red-50 text-foreground/40 hover:text-red-500 rounded-full transition-colors"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/70">Subtotal</span>
              <span className="serif text-lg font-light">{formatRupiah(total)}</span>
            </div>
            <Button
              className="w-full bg-foreground text-background hover:bg-foreground/90"
              onClick={() => {
                toast.success("Inquiry sent! We will contact you shortly.");
                clear();
                setOpen(false);
              }}
            >
              Send Inquiry
            </Button>
            <button
              onClick={clear}
              className="w-full text-center text-xs uppercase tracking-[0.25em] text-foreground/50 hover:text-foreground transition-colors py-2"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
};
