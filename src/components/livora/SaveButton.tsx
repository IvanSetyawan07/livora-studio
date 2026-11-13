import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { addToWishlist, removeFromWishlist, getWishlist, type WishlistType } from "@/lib/wishlist";
import { authStorage } from "@/lib/api";

type Props = {
  type: WishlistType;
  id: number;
  className?: string;
  size?: number;
  variant?: "icon" | "pill" | "solid";
};

/**
 * Tombol simpan (Bookmark). State disimpan dari server wishlist user.
 * Kalau belum login -> toast + redirect ke /login.
 */
export default function SaveButton({ type, id, className = "", size = 22, variant = "icon" }: Props) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authStorage.getToken()) return;
    let alive = true;
    getWishlist()
      .then((rows) => {
        if (!alive) return;
        setSaved(rows.some((r) => r.type === type && r.entity_id === id));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [type, id]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!authStorage.getToken()) {
      toast.error("Login untuk menyimpan item ini");
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      if (saved) {
        await removeFromWishlist(type, id);
        setSaved(false);
        toast.success("Dihapus dari saved");
      } else {
        await addToWishlist(type, id);
        setSaved(true);
        toast.success("Disimpan ke profile");
      }
    } catch {
      toast.error("Gagal update saved");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-full border transition-all active:scale-95 text-xs uppercase tracking-[0.15em] ${
          saved
            ? "bg-foreground text-background border-foreground"
            : "bg-background/80 backdrop-blur border-border hover:border-foreground"
        } ${className}`}
      >
        <Bookmark size={Math.max(14, size - 6)} fill={saved ? "currentColor" : "none"} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }
  if (variant === "solid") {
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] text-[10px] uppercase tracking-[0.18em] bg-foreground text-background px-7 py-3.5 hover:bg-foreground/80 active:scale-95 transition-all duration-300 font-light disabled:opacity-60 ${className}`}
    >
      <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
  

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? "Remove from saved" : "Save"}
      className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2.5 rounded-full backdrop-blur bg-background/70 border border-border hover:border-foreground active:scale-90 transition-all ${className}`}
    >
      <Bookmark size={size} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
