import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { getCartCount } from "@/lib/shop";

export default function CartNavButton({ light }: { light?: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = () => getCartCount().then(setCount).catch(() => {});
    load();
    window.addEventListener("livora:cart-changed", load);
    return () => window.removeEventListener("livora:cart-changed", load);
  }, []);
  return (
    <Link to="/cart" aria-label={`Keranjang${count ? `, ${count} barang` : ""}`}
      className={`relative p-2 transition-colors duration-500 ${light ? "text-white/90 hover:text-white" : "text-foreground/80 hover:text-foreground"}`}>
      <ShoppingBag size={20} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
