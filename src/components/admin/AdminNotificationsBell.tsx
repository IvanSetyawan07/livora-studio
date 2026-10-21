import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Notif = {
  id: number; type: string; kind: string; priority: string;
  title: string; body: string | null; link: string | null; read: boolean; created_at: string;
};

/**
 * Lonceng notifikasi admin N1–N16. Polling tiap 20 detik; prioritas Mendesak
 * juga muncul sebagai toast. Angka unread ditampilkan di badge.
 */
export default function AdminNotificationsBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const seenUrgent = useRef<Set<number>>(new Set());

  const load = () =>
    api.get<Notif[]>("/admin/notifications").then((r) => {
      const list = r.data ?? [];
      setItems(list);
      list.filter((n) => n.priority === "mendesak" && !n.read && !seenUrgent.current.has(n.id)).forEach((n) => {
        seenUrgent.current.add(n.id);
        toast.error(`${n.title}`, { description: n.body ?? undefined, duration: 8000 });
      });
      const unread = list.filter((n) => !n.read).length;
      document.title = unread > 0 ? `(${unread}) Admin Livora` : "Admin Livora";
    }).catch(() => {});

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  const openItem = async (n: Notif) => {
    if (!n.read) api.post(`/admin/notifications/${n.id}/read`).then(load).catch(() => {});
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="Notifikasi admin" onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-foreground/80 hover:bg-muted hover:text-foreground">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <p className="border-b border-border px-4 py-3 text-sm font-medium">Notifikasi</p>
          <ul className="max-h-96 overflow-y-auto">
            {!items.length && <li className="px-4 py-6 text-center text-xs text-muted-foreground">Belum ada notifikasi.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <Link to={n.link ?? "#"} onClick={() => openItem(n)}
                  className={`flex gap-3 border-b border-border/50 px-4 py-3 text-sm hover:bg-muted/50 ${n.read ? "opacity-60" : ""}`}>
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    n.priority === "mendesak" ? "bg-red-100 text-red-700" : n.kind === "perlu_tindakan" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                  }`}>
                    {n.priority === "mendesak" ? <AlertTriangle className="h-3 w-3" /> : n.type}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{n.title}</span>
                    {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>}
                    <span className="mt-1 block text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("id-ID")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
