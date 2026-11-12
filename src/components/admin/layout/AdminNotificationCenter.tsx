import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bell, CheckCheck, MonitorSmartphone, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { playChatSound, unlockChatSound } from "@/lib/chatSound";
import type { ConsultationActivity } from "@/lib/consultations";

type Notif = {
  id: number; type: string; kind: string; priority: string;
  title: string; body: string | null; link: string | null; read: boolean; created_at: string;
};

type Props = {
  activities: ConsultationActivity[];
  unreadActivities: number;
  /** dipanggil saat tab Konsultasi dibuka (untuk menandai sudah dibaca) */
  onOpenActivities: () => void;
  onActivityClick: (a: ConsultationActivity) => void;
};

const SOUND_KEY = "livora.admin.notif.sound";

/**
 * Satu pusat notifikasi untuk admin: tab "Sistem" (alert operasional) dan "Konsultasi".
 * Dilengkapi suara chime, notifikasi desktop browser, dan judul tab berkedip untuk alert mendesak.
 */
export default function AdminNotificationCenter({ activities, unreadActivities, onOpenActivities, onActivityClick }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"system" | "consult">("system");
  const [items, setItems] = useState<Notif[]>([]);
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try { return localStorage.getItem(SOUND_KEY) !== "0"; } catch { return true; }
  });
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied",
  );

  const ref = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<number>>(new Set());
  const firstLoaded = useRef(false);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  // Buka kunci AudioContext saat interaksi pertama admin di halaman
  useEffect(() => {
    const unlock = () => unlockChatSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    try { localStorage.setItem(SOUND_KEY, next ? "1" : "0"); } catch {}
    if (next) {
      unlockChatSound();
      playChatSound("incoming");
    }
  };

  const askDesktopNotif = async () => {
    if (!("Notification" in window)) return;
    try {
      const p = await Notification.requestPermission();
      setNotifPerm(p);
      if (p === "granted") {
        new Notification("Notifikasi Admin Livora aktif", { body: "Kamu akan mendapat pemberitahuan saat ada pelanggan butuh balasan." });
      }
    } catch { /* abaikan */ }
  };

  const load = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    api
      .get<Notif[]>("/admin/notifications")
      .then((r) => {
        const list = r.data ?? [];
        setItems(list);

        const fresh = list.filter((n) => !n.read && !seenIds.current.has(n.id));
        list.forEach((n) => seenIds.current.add(n.id));

        if (firstLoaded.current && fresh.length > 0) {
          const urgentFresh = fresh.filter((n) => n.priority === "mendesak" || n.priority === "tinggi");
          if (urgentFresh.length > 0 && soundOnRef.current) {
            playChatSound("alert");
          }
          urgentFresh
            .filter((n) => n.priority === "mendesak")
            .forEach((n) => {
              toast.error(n.title, { description: n.body ?? undefined, duration: 8000 });
              if ("Notification" in window && Notification.permission === "granted") {
                try {
                  const dn = new Notification(n.title, { body: n.body ?? undefined, tag: `livora-${n.id}` });
                  dn.onclick = () => {
                    window.focus();
                    if (n.link) navigate(n.link);
                    dn.close();
                  };
                } catch { /* abaikan */ }
              }
            });
        }
        firstLoaded.current = true;
      })
      .catch(() => {});
  }, [navigate]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 15000);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unreadSystem = items.filter((n) => !n.read).length;
  const unreadUrgent = items.filter((n) => !n.read && n.priority === "mendesak").length;
  const total = unreadSystem + unreadActivities;

  // Judul tab berkedip pelan bila ada alert mendesak yang belum dibaca.
  useEffect(() => {
    if (unreadUrgent === 0) {
      document.title = total > 0 ? `(${total}) Admin Livora` : "Admin Livora";
      return;
    }
    let flip = false;
    const update = () => {
      flip = !flip;
      document.title = flip ? `● (${unreadUrgent}) Butuh Respon! — Livora` : `(${total}) Admin Livora`;
    };
    update();
    const id = window.setInterval(update, 1600);
    return () => {
      window.clearInterval(id);
      document.title = total > 0 ? `(${total}) Admin Livora` : "Admin Livora";
    };
  }, [total, unreadUrgent]);

  const switchTab = (t: "system" | "consult") => {
    setTab(t);
    if (t === "consult") onOpenActivities();
  };

  const markAll = () => {
    const unread = items.filter((n) => !n.read);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    Promise.all(unread.map((n) => api.post(`/admin/notifications/${n.id}/read`))).catch(load);
  };

  const recent = [...activities]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Notifikasi${total ? `, ${total} belum dibaca` : ""}`}
        aria-expanded={open}
        onClick={() => {
          if (!open && tab === "consult") onOpenActivities();
          setOpen((v) => !v);
        }}
        className="relative rounded-full p-2 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className={`h-5 w-5 ${unreadUrgent > 0 ? "text-red-600 dark:text-red-400" : ""}`} />
        <AnimatePresence>
          {total > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white"
            >
              {total > 99 ? "99+" : total}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-[70] mt-2 w-[22rem] max-w-[92vw] origin-top-right overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          >
            <div className="flex border-b border-border">
              {(
                [
                  ["system", "Sistem", unreadSystem],
                  ["consult", "Konsultasi", unreadActivities],
                ] as const
              ).map(([key, label, n]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchTab(key)}
                  className={`relative flex-1 px-4 py-3 text-sm transition-colors ${tab === key ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                  {n > 0 && <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] leading-none text-white">{n}</span>}
                  {tab === key && <motion.span layoutId="notif-tab" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-foreground" />}
                </button>
              ))}
            </div>

            {/* Kontrol suara & desktop push */}
            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-1.5 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={toggleSound}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                {soundOn ? "Suara aktif" : "Suara mati"}
              </button>
              {notifPerm === "default" && (
                <button
                  type="button"
                  onClick={askDesktopNotif}
                  className="inline-flex items-center gap-1 text-[hsl(var(--livora-bronze))] hover:underline"
                >
                  <MonitorSmartphone className="h-3.5 w-3.5" /> Aktifkan notif desktop
                </button>
              )}
              {notifPerm === "granted" && <span className="text-[11px] opacity-75">Desktop aktif</span>}
            </div>

            {tab === "system" ? (
              <>
                {unreadSystem > 0 && (
                  <button
                    type="button"
                    onClick={markAll}
                    className="flex w-full items-center justify-end gap-1.5 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Tandai semua dibaca
                  </button>
                )}
                <ul className="max-h-96 overflow-y-auto">
                  {!items.length && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada notifikasi.</li>}
                  {items.map((n) => (
                    <li key={n.id}>
                      <Link
                        to={n.link ?? "#"}
                        onClick={() => {
                          if (!n.read) api.post(`/admin/notifications/${n.id}/read`).then(load).catch(() => {});
                          setOpen(false);
                        }}
                        className={`flex gap-3 border-b border-border/50 px-4 py-3 text-sm transition-colors hover:bg-muted/50 ${n.read ? "opacity-60" : ""}`}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            n.priority === "mendesak"
                              ? "bg-red-500/15 text-red-600 dark:text-red-300"
                              : n.kind === "perlu_tindakan"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {n.priority === "mendesak" ? <AlertTriangle className="h-3 w-3" /> : n.type}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{n.title}</span>
                          {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>}
                          <span className="mt-1 block text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("id-ID")}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <ul className="max-h-96 overflow-y-auto">
                {recent.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada aktivitas konsultasi.</li>}
                {recent.map((a) => {
                  const unread = !a.admin_read_at;
                  const who = a.consultation ? `${a.consultation.first_name} ${a.consultation.last_name ?? ""}`.trim() : null;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onActivityClick(a);
                        }}
                        className={`w-full border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50 ${unread ? "bg-muted/30" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          {unread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />}
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm ${unread ? "font-medium" : ""}`}>{a.title}</p>
                            {a.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>}
                            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              {who && <span className="truncate uppercase tracking-wider">{who}</span>}
                              <span className="shrink-0">{new Date(a.created_at).toLocaleString("id-ID")}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
