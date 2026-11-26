import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  MessageCircle,
  MonitorSmartphone,
  ShoppingBag,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { playChatSound, unlockChatSound } from "@/lib/chatSound";
import type { ConsultationActivity } from "@/lib/consultations";

type Notif = {
  id: number;
  type: string;
  kind: string;
  priority: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

type Props = {
  activities: ConsultationActivity[];
  unreadActivities: number;
  pageTitle?: string;
  /** Dipanggil hanya saat admin klik "Tandai semua dibaca" di tab Konsultasi. */
  onMarkAllActivitiesRead: () => void;
  onActivityClick: (a: ConsultationActivity) => void;
};

const SOUND_KEY = "livora.admin.notif.sound";

function NotifIcon({ type, priority }: { type: string; priority: string }) {
  if (priority === "mendesak") return <AlertTriangle className="h-3.5 w-3.5" />;
  const t = String(type || "").toLowerCase();
  if (t.includes("pay") || t.includes("bayar") || t.includes("refund")) return <Wallet className="h-3.5 w-3.5" />;
  if (t.includes("order") || t.includes("pesanan")) return <ShoppingBag className="h-3.5 w-3.5" />;
  if (t.includes("chat") || t.includes("wa") || t.includes("inbox") || t.includes("pesan")) {
    return <MessageCircle className="h-3.5 w-3.5" />;
  }
  return <Bell className="h-3.5 w-3.5" />;
}

/**
 * Satu pusat notifikasi untuk admin: tab "Sistem" (alert operasional) dan "Konsultasi".
 * Tidak otomatis menandai semua konsultasi sebagai dibaca hanya karena tab dibuka.
 */
export default function AdminNotificationCenter({
  activities,
  unreadActivities,
  pageTitle = "Admin LIVORA",
  onMarkAllActivitiesRead,
  onActivityClick,
}: Props) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"system" | "consult">("system");
  const [items, setItems] = useState<Notif[]>([]);
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied",
  );

  const ref = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<number>>(new Set());
  const firstLoaded = useRef(false);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

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
    try {
      localStorage.setItem(SOUND_KEY, next ? "1" : "0");
    } catch {
      /* abaikan */
    }
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
        new Notification("Notifikasi Admin Livora aktif", {
          body: "Kamu akan mendapat pemberitahuan saat ada pelanggan butuh balasan.",
        });
      }
    } catch {
      /* abaikan */
    }
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
                    if (n.link) navigateRef.current(n.link);
                    dn.close();
                  };
                } catch {
                  /* abaikan */
                }
              }
            });
        }
        firstLoaded.current = true;
      })
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    const baseTitle = `${pageTitle} — Admin LIVORA`;
    if (unreadUrgent === 0) {
      document.title = total > 0 ? `(${total}) ${baseTitle}` : baseTitle;
      return;
    }
    let flip = false;
    const update = () => {
      flip = !flip;
      document.title = flip ? `● (${unreadUrgent}) Butuh Respon! — LIVORA` : `(${total}) ${baseTitle}`;
    };
    update();
    const id = window.setInterval(update, 1600);
    return () => {
      window.clearInterval(id);
      document.title = total > 0 ? `(${total}) ${baseTitle}` : baseTitle;
    };
  }, [total, unreadUrgent, pageTitle]);

  const markAllSystem = () => {
    const unread = items.filter((n) => !n.read);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    Promise.all(unread.map((n) => api.post(`/admin/notifications/${n.id}/read`))).catch(load);
  };

  const recent = [...activities]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Notifikasi${total ? `, ${total} belum dibaca` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-[#232528]/80 transition-colors hover:bg-black/5 hover:text-[#232528]"
      >
        <Bell className={`h-5 w-5 ${unreadUrgent > 0 ? "text-red-600" : ""}`} />
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
            className="absolute right-0 top-full z-[70] mt-2 w-[22rem] max-w-[92vw] origin-top-right overflow-hidden rounded-2xl border border-[#E5DFD5] bg-white shadow-xl"
          >
            <div className="flex border-b border-[#EAE4DA]">
              {(
                [
                  ["system", "Sistem", unreadSystem],
                  ["consult", "Konsultasi", unreadActivities],
                ] as const
              ).map(([key, label, n]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`relative flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    tab === key ? "text-[#232528]" : "text-[#656B73] hover:text-[#232528]"
                  }`}
                >
                  {label}
                  {n > 0 && (
                    <span className="ml-1.5 rounded-full bg-[#5E93B8] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                      {n}
                    </span>
                  )}
                  {tab === key && (
                    <motion.span layoutId="notif-tab" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#5E93B8]" />
                  )}
                </button>
              ))}
            </div>

            {/* Kontrol suara & desktop push */}
            <div className="flex items-center justify-between gap-2 border-b border-[#F0EAE0] bg-[#FAF8F4]/70 px-4 py-1.5 text-xs text-[#656B73]">
              <button
                type="button"
                onClick={toggleSound}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-[#232528]"
              >
                {soundOn ? <Volume2 className="h-3.5 w-3.5 text-[#5E93B8]" /> : <VolumeX className="h-3.5 w-3.5" />}
                {soundOn ? "Suara aktif" : "Suara mati"}
              </button>
              {notifPerm === "default" && (
                <button
                  type="button"
                  onClick={askDesktopNotif}
                  className="inline-flex items-center gap-1 font-medium text-[#467A9E] hover:underline"
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
                    onClick={markAllSystem}
                    className="flex w-full items-center justify-end gap-1.5 border-b border-[#F0EAE0] px-4 py-2 text-xs text-[#5E93B8] transition-colors hover:text-[#3A6D91]"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Tandai semua dibaca
                  </button>
                )}
                <ul className="max-h-96 overflow-y-auto">
                  {!items.length && (
                    <li className="px-4 py-8 text-center text-sm text-[#656B73]">Belum ada notifikasi sistem.</li>
                  )}
                  {items.map((n) => (
                    <li key={n.id}>
                      <Link
                        to={n.link ?? "#"}
                        onClick={() => {
                          if (!n.read) api.post(`/admin/notifications/${n.id}/read`).then(load).catch(() => {});
                          setOpen(false);
                        }}
                        className={`flex gap-3 border-b border-[#F2EDE5] px-4 py-3 text-sm transition-colors hover:bg-[#FAF8F4] ${
                          n.read ? "opacity-65" : ""
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            n.priority === "mendesak"
                              ? "bg-red-50 text-red-600"
                              : n.kind === "perlu_tindakan"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-[#EDF4F8] text-[#5E93B8]"
                          }`}
                        >
                          <NotifIcon type={n.type} priority={n.priority} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-[#232528]">{n.title}</span>
                          {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-[#656B73]">{n.body}</span>}
                          <span className="mt-1 block text-[11px] text-[#656B73]/80">
                            {new Date(n.created_at).toLocaleString("id-ID")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                {unreadActivities > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllActivitiesRead}
                    className="flex w-full items-center justify-end gap-1.5 border-b border-[#F0EAE0] px-4 py-2 text-xs text-[#5E93B8] transition-colors hover:text-[#3A6D91]"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Tandai semua dibaca
                  </button>
                )}
                <ul className="max-h-96 overflow-y-auto">
                  {recent.length === 0 && (
                    <li className="px-4 py-8 text-center text-sm text-[#656B73]">Belum ada aktivitas konsultasi.</li>
                  )}
                  {recent.map((a) => {
                    const unread = !a.admin_read_at;
                    const who = a.consultation
                      ? `${a.consultation.first_name} ${a.consultation.last_name ?? ""}`.trim()
                      : null;
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            onActivityClick(a);
                          }}
                          className={`w-full border-b border-[#F2EDE5] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[#FAF8F4] ${
                            unread ? "bg-[#EDF4F8]/40" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5E93B8]" />}
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-sm text-[#232528] ${unread ? "font-medium" : ""}`}>{a.title}</p>
                              {a.body && <p className="mt-0.5 line-clamp-2 text-xs text-[#656B73]">{a.body}</p>}
                              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-[#656B73]">
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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
