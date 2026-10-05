import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShoppingBag, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { authStorage } from "@/lib/api";
import { rememberIntendedPath } from "@/lib/authGuard";
import { addToCart } from "@/lib/shop";

type Props = { itemId?: number; variantId: number | null; hasVariants: boolean; variantName?: string };

export default function AddToCartButton({ itemId, variantId, hasVariants, variantName }: Props) {
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  if (!itemId) return null;
  const needVariant = hasVariants && !variantId;

  const add = async () => {
    if (!authStorage.getToken()) {
      rememberIntendedPath();
      toast("Masuk dulu untuk menyimpan barang ke keranjang");
      navigate("/login");
      return;
    }
    if (needVariant) return toast.error("Pilih varian terlebih dahulu");
    setBusy(true);
    try {
      await addToCart({ item_id: itemId, variant_id: variantId, quantity: qty });
      toast.success("Ditambahkan ke keranjang", { action: { label: "Lihat", onClick: () => navigate("/cart") } });
    } catch (e: any) {
      toast.error(e?.message || "Gagal menambahkan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex h-12 items-center rounded-full border border-border bg-background">
          <button type="button" aria-label="Kurangi jumlah" disabled={qty <= 1} onClick={() => setQty(qty - 1)} className="h-12 w-11 disabled:opacity-40"><Minus className="mx-auto h-4 w-4" /></button>
          <span className="w-6 text-center text-sm" aria-live="polite">{qty}</span>
          <button type="button" aria-label="Tambah jumlah" onClick={() => setQty(Math.min(99, qty + 1))} className="h-12 w-11"><Plus className="mx-auto h-4 w-4" /></button>
        </div>
        <button type="button" onClick={add} disabled={busy}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
          Tambah ke Keranjang
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {needVariant ? "Pilih varian di atas untuk melanjutkan." : variantName ? `Varian: ${variantName}. ` : ""}
        Harga diberikan tim Livora lewat WhatsApp.
      </p>
    </div>
  );
}
