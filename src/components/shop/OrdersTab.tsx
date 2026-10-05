import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Package, ChevronRight } from "lucide-react";
import { getOrders, rupiah, type ShopOrder } from "@/lib/shop";
import StatusBadge from "./StatusBadge";

export default function OrdersTab() {
  const [orders, setOrders] = useState<ShopOrder[] | null>(null);
  useEffect(() => { getOrders().then(setOrders).catch(() => setOrders([])); }, []);

  if (!orders) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat pesanan…</div>;
  if (!orders.length)
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Package className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="serif mt-3 text-xl">Belum ada pesanan</p>
        <Link to="/furniture" className="mt-4 inline-block text-sm underline underline-offset-4">Jelajahi furnitur</Link>
      </div>
    );

  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.code}>
          <Link to={`/profile/orders/${o.code}`} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-foreground/30">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm">{o.code}</span>
                <StatusBadge status={o.status} label={o.status_label} />
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">{o.items.map((i) => `${i.title} ×${i.quantity}`).join(", ")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}{o.grand_total ? ` · ${rupiah(o.grand_total)}` : ""}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
