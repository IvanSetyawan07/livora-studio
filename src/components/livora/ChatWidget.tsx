import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Headset, ArrowRight, CalendarCheck, Sparkles, Check } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  openSession,
  fetchMessages,
  sendMessage,
  requestCs,
  resumeBot,
  type SupportMessage,
  type SupportSessionInfo,
  type AskBotDetail,
  touchActivity,
  resetVisitor,
  shouldResetSession,
  IDLE_RESET_MS,
  LIVE_IDLE_WARN_MS,
  LIVE_IDLE_GRACE_MS,
} from "@/lib/supportChat";
import { playChatSound, unlockChatSound } from "@/lib/chatSound";
import { imgUrl } from "@/lib/adminApi";

/* ────────── Design tokens (konsisten dengan komponen Livora lainnya) ────────── */
const INK = "#000000";
const PAPER = "#ffffff";
const GOLD = "#C9974A";
const USER_BUBBLE = "#f0ede7";
const ease = [0.22, 1, 0.36, 1] as const;

/** Satu kartu rekomendasi (item/collection/catalog/project) yang dikirim backend. */
interface Recommendation {
  type: "item" | "collection" | "catalog" | "project";
  title: string;
  subtitle?: string | null;
  description?: string | null;
  image?: string | null;
  url: string;
}

const TYPE_CTA: Record<Recommendation["type"], string> = {
  item: "Lihat Produk",
  collection: "Lihat Koleksi",
  catalog: "Lihat Katalog",
  project: "Lihat Project",
};
/** Perbaiki path lama/legacy dari backend supaya tidak jatuh ke halaman 404. */
const normalizeRecUrl = (url?: string | null): string => {
  if (!url) return "/";
  let u = url.trim();
  if (/^https?:\/\//i.test(u)) {
    try { u = new URL(u).pathname; } catch { /* noop */ }
  }
  if (!u.startsWith("/")) u = `/${u}`;
  u = u.replace(/^\/item\//, "/items/").replace(/^\/project\//, "/projects/");
  u = u.replace(/^\/collections\//, "/collection/");
  return u;
};

const formatTime = (iso?: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

/**
 * Popup chat widget — Livora Concierge.
 *
 * Flow:
 *  - status "bot"        : AI menjawab (profil perusahaan + product knowledge)
 *  - status "pending_cs" : user minta CS, menunggu admin approve
 *  - status "active"     : live chat dengan customer service
 *  - status "closed"     : ditutup admin, chat berikutnya kembali ke AI
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SupportSessionInfo | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(false);
  const [unread, setUnread] = useState(0);
  const [idleCountdown, setIdleCountdown] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const contextRef = useRef<{ item_slug?: string; item_name?: string }>({});
  const navigate = useNavigate();

  const { pathname } = useLocation();
  const isLanding = pathname === "/";
  const isHidden =
    /^\/collection\/[^/]+/.test(pathname) ||
    pathname === "/login" ||
    pathname === "/register";
  const [visible, setVisible] = useState(!isLanding && !isHidden);

  const lastId = messages.length ? messages[messages.length - 1].id : 0;

  /* Auto-scroll ke pesan terbaru */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, loading]);

  /* Show/hide tombol mengambang */
  useEffect(() => {
    if (isHidden) {
      setVisible(false);
      return;
    }
    if (!isLanding) {
      setVisible(true);
      return;
    }
    setVisible(window.scrollY > 100);
    const onScroll = () => {
      if (window.scrollY === 0) setVisible(false);
      else if (window.scrollY > 100) setVisible(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLanding, isHidden]);

  useEffect(() => {
    if (!visible && open) setOpen(false);
  }, [visible, open]);

  /* Boot session saat pertama kali dibuka */
  const boot = useCallback(async () => {
    if (session || booting) return;
    setBooting(true);
    try {
      if (shouldResetSession()) resetVisitor();
      touchActivity();
      const data = await openSession();
      setSession(data.session);
      setMessages(data.messages);
    } catch {
      setMessages([
        {
          id: -1,
          sender: "bot",
          text: "Maaf, saya sedang tidak bisa terhubung. Coba lagi sebentar lagi ya.",
        },
      ]);
    } finally {
      setBooting(false);
    }
  }, [session, booting]);

  useEffect(() => {
    if (open) boot();
  }, [open, boot]);

  /* Polling pesan baru saat menunggu / live chat dengan CS (cepat: 1.5 detik) */
  useEffect(() => {
    if (!session) return;
    if (session.status !== "pending_cs" && session.status !== "active") return;

    let alive = true;
    const tick = async () => {
      if (document.hidden && open) return;
      try {
        const data = await fetchMessages(session.id, lastId);
        if (!alive) return;
        setSession(data.session);
        if (data.messages.length) {
          setMessages((prev) => [...prev, ...data.messages]);
          if (data.messages.some((m) => m.sender === "admin" || m.sender === "bot")) {
            playChatSound("incoming");
          }
          if (!open) setUnread((u) => u + data.messages.length);
        }
      } catch {
        /* ignore */
      }
    };
    void tick();
    const interval = window.setInterval(tick, open ? 1500 : 8000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [session, lastId, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      touchActivity();
      unlockChatSound();
      lastInteractionRef.current = Date.now();
    }
  }, [open]);

  /* Idle reset: 10 menit tanpa interaksi -> sesi & cache visitor dibuang. */
  useEffect(() => {
    const check = () => {
      if (!shouldResetSession()) return;
      resetVisitor();
      setSession(null);
      setMessages([]);
      setUnread(0);
      setOpen(false);
    };
    const id = window.setInterval(check, 30000);
    return () => window.clearInterval(id);
  }, []);

  /**
   * Live chat idle guard: 3 menit tanpa interaksi -> notifikasi + hitung mundur
   * 30 detik; kalau tetap tidak ada aktivitas, sesi dikembalikan ke AI.
   */
  useEffect(() => {
    if (!session || session.status !== "active") {
      setIdleCountdown(null);
      return;
    }
    const id = window.setInterval(async () => {
      const idleFor = Date.now() - lastInteractionRef.current;
      if (idleFor < LIVE_IDLE_WARN_MS) {
        setIdleCountdown(null);
        return;
      }
      const remaining = Math.ceil((LIVE_IDLE_WARN_MS + LIVE_IDLE_GRACE_MS - idleFor) / 1000);
      if (remaining > 0) {
        setIdleCountdown((prev) => {
          if (prev === null) playChatSound("alert");
          return remaining;
        });
        return;
      }
      setIdleCountdown(null);
      try {
        const data = await resumeBot(session.id);
        setSession(data.session);
        setMessages(data.messages);
        playChatSound("incoming");
      } catch {
        /* ignore */
      }
      lastInteractionRef.current = Date.now();
    }, 1000);
    return () => window.clearInterval(id);
  }, [session]);



  /* Trigger dari halaman lain, mis. tombol "Tanya tentang produk ini" di ItemDetail */
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent<AskBotDetail>).detail;
      if (!detail) return;
      contextRef.current = { item_slug: detail.item_slug, item_name: detail.item_name };
      setVisible(true);
      setOpen(true);
      await boot();
      submit(detail.text, { item_slug: detail.item_slug, item_name: detail.item_name });
    };
    window.addEventListener("livora:ask-concierge", handler as EventListener);
    return () => window.removeEventListener("livora:ask-concierge", handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boot, session]);

  const submit = async (text: string, ctx?: { item_slug?: string; item_name?: string }) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    let active = session;
    if (!active) {
      try {
        const data = await openSession();
        active = data.session;
        setSession(data.session);
        setMessages(data.messages);
      } catch {
        return;
      }
    }

    touchActivity();
    unlockChatSound();
    lastInteractionRef.current = Date.now();
    setIdleCountdown(null);
    playChatSound("sent");
    setLoading(true);
    setMessages((prev) => [
  ...prev,
  { id: Date.now(), sender: "user", text: trimmed, created_at: new Date().toISOString() },
]);
    try {
      const data = await sendMessage(active.id, trimmed, ctx ?? contextRef.current);
      setSession(data.session);
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => !(m.sender === "user" && m.text === trimmed && m.id > 1e12));
        return [...withoutOptimistic, ...data.messages];
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: "Maaf, pesan gagal terkirim. Coba lagi ya.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input;
    setInput("");
    await submit(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  const handleTalkToCS = async () => {
    let active = session;
    if (!active) {
      await boot();
      active = session;
    }
    if (!active) return;
    try {
      const data = await requestCs(active.id, { reason: contextRef.current.item_name });
      setSession(data.session);
      setMessages(data.messages);
    } catch {
      /* ignore */
    }
  };

  /** Navigasi ke halaman produk/koleksi/katalog/project — tetap di dalam SPA. */
  const goToRecommendation = (url: string) => {
    setOpen(false);
    navigate(normalizeRecUrl(url));
  };

  const status = session?.status ?? "bot";
  const statusLabel =
    status === "pending_cs"
      ? "Menunggu customer service..."
      : status === "active"
      ? `Terhubung dengan ${session?.admin_name ?? "customer service"}`
      : "Design & product assistant";

  return (
    <>
      {/* Floating toggle button */}
      <motion.button
  type="button"
  onClick={() => setOpen((v) => !v)}
  aria-label={open ? "Tutup chat" : "Buka chat"}
  className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ease-out hover:scale-110"
  style={{
    backgroundColor: PAPER,
    color: INK,
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(16px)",
    pointerEvents: visible ? "auto" : "none",
  }}
        initial={false}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, rotate: -45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 45 }}
              transition={{ duration: 0.2 }}
            >
              <X size={22} strokeWidth={1.5} />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ opacity: 0, rotate: 45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -45 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle size={22} strokeWidth={1.5} />
            </motion.span>
          )}
        </AnimatePresence>

        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#B08D57] text-white text-[10px] flex items-center justify-center">
            {unread}
          </span>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && visible && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.35, ease }}
            className="fixed bottom-24 right-6 z-[60] w-[92vw] max-w-[380px] h-[70vh] max-h-[560px] flex flex-col bg-white border border-[#e5e5e5] shadow-2xl"
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ backgroundColor: PAPER, color: INK }}
            >
              <div>
                <p className="serif text-base font-light leading-none mb-1">
                  {status === "active" ? "Livora Customer Service" : "Livora Concierge"}
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-light">
                  {statusLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup chat"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4 bg-[#fafafa]">
              {booting && (
                <div className="flex justify-center">
                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                </div>
              )}

              {messages.map((m) =>
                m.sender === "system" ? (
                  <p
                    key={m.id}
                    className="text-[11px] text-center text-muted-foreground font-light leading-relaxed px-4"
                  >
                    {m.text}
                  </p>
                ) : (
                  <div key={m.id} className={`flex gap-2 ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                    {m.sender !== "user" && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 serif text-xs font-medium"
                        style={{ backgroundColor: INK, color: PAPER }}
                      >
                        L
                      </div>
                    )}
                    <div className="max-w-[85%] w-fit">
                      {m.sender === "admin" && (
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                          Customer Service
                        </p>
                      )}

                     <div
                      className={`px-4 py-3 text-sm font-light leading-relaxed whitespace-pre-wrap rounded-2xl ${
                        m.sender === "user" ? "rounded-br-md" : ""
                      }`}
                      style={
                        m.sender === "user"
                          ? { backgroundColor: USER_BUBBLE, color: INK }
                          : { backgroundColor: "#f5f2ec", color: INK, border: "1px solid #eee8de" }
                      }
                    >
                      {m.text}
                    </div>

                      {/* Kartu rekomendasi produk/koleksi/katalog/project dari AI */}
                      {m.sender === "bot" && Array.isArray(m.meta?.recommendations) && m.meta.recommendations.length > 0 && (
                        <div className="mt-3">
                          <p
                            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] mb-2"
                            style={{ color: GOLD }}
                          >
                            <Sparkles size={11} strokeWidth={1.5} />
                            Rekomendasi untuk Anda
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {(m.meta.recommendations as Recommendation[]).map((rec, i) => (
                              <button
                                key={`${m.id}-rec-${i}`}
                                type="button"
                                onClick={() => goToRecommendation(rec.url)}
                                className="text-left bg-white flex flex-col overflow-hidden group"
                              >
                                <div className="w-full aspect-square bg-[#f2f2f2] overflow-hidden rounded-lg relative">
                                  {rec.image ? (
                                    <img
                                      src={imgUrl(rec.image)}
                                      alt={rec.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                      loading="lazy"
                                      onError={(e) => {
                                        const el = e.currentTarget as HTMLImageElement;
                                        el.style.display = "none";
                                        el.parentElement?.classList.add("rec-fallback");
                                      }}
                                    />
                                  ) : null}
                                  <span className="absolute inset-0 -z-0 flex items-center justify-center serif text-lg text-[#b9b0a4] pointer-events-none">
                                    {rec.title?.charAt(0)?.toUpperCase() ?? "L"}
                                  </span>
                                </div>
                                <div className="pt-2">
                                  <p className="text-[12px] font-light leading-snug line-clamp-2">{rec.title}</p>
                                  {rec.subtitle && (
                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{rec.subtitle}</p>
                                  )}
                                  <span
                                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] tracking-[0.08em] font-light transition-colors"
                                   
                                    style={{ color: GOLD }}
                                  >
                                    {TYPE_CTA[rec.type] ?? "Lihat"}
                                    <ArrowRight size={10} strokeWidth={1.5} />
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* CTA konsultasi */}
                      {m.sender === "bot" && m.meta?.show_consultation && (
                        <button
                          type="button"
                          onClick={() => goToRecommendation(m.meta?.consultation_url ?? "/appointment")}
                          className="mt-2 w-full inline-flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] font-light px-4 py-2.5 rounded-full"
                          style={{ backgroundColor: INK, color: PAPER }}
                        >
                          <CalendarCheck size={13} strokeWidth={1.5} />
                          Jadwalkan Konsultasi
                        </button>
                      )}

                      {m.sender === "bot" && m.meta?.needs_escalation && status === "bot" && (
                        <button
                          type="button"
                          onClick={handleTalkToCS}
                          className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-light border-b pb-0.5"
                          style={{ color: INK, borderColor: INK }}
                        >
                          <Headset size={12} strokeWidth={1.5} />
                          Hubungkan ke customer service
                        </button>
                      )}
                      {formatTime(m.created_at) && (
                        <p
                          className={`mt-1 flex items-center gap-1 text-[10px] text-muted-foreground font-light ${
                            m.sender === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {formatTime(m.created_at)}
                          {m.sender === "user" && <Check size={11} strokeWidth={1.5} style={{ color: "#1E3A8A" }} />}
                        </p>
                      )}
                    </div>
                  </div>
                ),
              )}

              {loading && (
                <div className="flex justify-start gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 serif text-xs font-medium"
                    style={{ backgroundColor: INK, color: PAPER }}
                  >
                    L
                  </div>
                  <div
                    className="text-sm font-light flex items-center gap-2"
                    style={{ color: INK }}
                  >
                    <Loader2 size={14} className="animate-spin" strokeWidth={1.5} />
                    Mengetik...
                  </div>
                </div>
              )}
            </div>

            {/* Quick action */}
            <div className="px-5 pt-3 pb-1 bg-[#fafafa]">
              {status === "bot" && (
                <button
                  type="button"
                  onClick={handleTalkToCS}
                  className="text-[11px] uppercase tracking-[0.18em] font-light text-muted-foreground hover:text-black transition-colors"
                >
                  Minta bicara dengan customer service →
                </button>
              )}
              {status === "pending_cs" && (
                <p className="text-[11px] uppercase tracking-[0.18em] font-light text-muted-foreground">
                  Menunggu persetujuan customer service...
                </p>
              )}
              {status === "active" && (
                <p className="text-[11px] uppercase tracking-[0.18em] font-light text-muted-foreground">
                  Live chat aktif
                </p>
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-4 border-t border-[#e5e5e5] bg-white">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  status === "active" ? "Tulis pesan untuk CS..." : "Tulis pertanyaan kamu..."
                }
                className="flex-1 border border-[#e5e5e5] rounded-full px-4 py-2.5 text-sm font-light outline-none focus:border-black transition-colors bg-white"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                aria-label="Kirim pesan"
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: INK, color: PAPER }}
              >
                <Send size={15} strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}