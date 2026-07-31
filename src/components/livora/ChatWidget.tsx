import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Headset, ArrowRight, CalendarCheck, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  openSession,
  fetchMessages,
  sendMessage,
  requestCs,
  type SupportMessage,
  type SupportSessionInfo,
  type AskBotDetail,
} from "@/lib/supportChat";

/* ────────── Design tokens (konsisten dengan komponen Livora lainnya) ────────── */
const BLACK = "#ffffff";
const WHITE = "#000000";
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
  const scrollRef = useRef<HTMLDivElement>(null);
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

  /* Polling pesan baru saat menunggu / live chat dengan CS */
  useEffect(() => {
    if (!session) return;
    if (session.status !== "pending_cs" && session.status !== "active") return;

    let alive = true;
    const tick = async () => {
      try {
        const data = await fetchMessages(session.id, lastId);
        if (!alive) return;
        setSession(data.session);
        if (data.messages.length) {
          setMessages((prev) => [...prev, ...data.messages]);
          if (!open) setUnread((u) => u + data.messages.length);
        }
      } catch {
        /* ignore */
      }
    };
    const interval = window.setInterval(tick, open ? 4000 : 15000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [session, lastId, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

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

    setLoading(true);
    setMessages((prev) => [...prev, { id: Date.now(), sender: "user", text: trimmed }]);
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
    navigate(url);
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
          backgroundColor: BLACK,
          color: WHITE,
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
              style={{ backgroundColor: BLACK, color: WHITE }}
            >
              <div>
                <p className="serif text-base font-light leading-none mb-1">
                  {status === "active" ? "Livora Customer Service" : "Livora Concierge"}
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-light">
                  {statusLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup chat"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
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
                  <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[85%] w-full">
                      {m.sender === "admin" && (
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                          Customer Service
                        </p>
                      )}
                      <div
                        className="px-4 py-3 text-sm font-light leading-relaxed whitespace-pre-wrap"
                        style={
                          m.sender === "user"
                            ? { backgroundColor: BLACK, color: WHITE }
                            : { backgroundColor: WHITE, color: BLACK, border: "1px solid #e5e5e5" }
                        }
                      >
                        {m.text}
                      </div>

                      {/* Kartu rekomendasi produk/koleksi/katalog/project dari AI */}
                      {m.sender === "bot" && Array.isArray(m.meta?.recommendations) && m.meta.recommendations.length > 0 && (
                        <div className="mt-3">
                          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                            <Sparkles size={11} strokeWidth={1.5} />
                            Rekomendasi untuk Anda
                          </p>
                          <div className="space-y-2">
                            {(m.meta.recommendations as Recommendation[]).map((rec, i) => (
                              <button
                                key={`${m.id}-rec-${i}`}
                                type="button"
                                onClick={() => goToRecommendation(rec.url)}
                                className="w-full text-left border border-[#e5e5e5] bg-white hover:border-black transition-colors flex gap-3 overflow-hidden group"
                              >
                                {rec.image && (
                                  <div className="w-20 h-20 shrink-0 bg-[#f2f2f2] overflow-hidden">
                                    <img
                                      src={rec.image}
                                      alt={rec.title}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="py-2.5 pr-3 flex-1 min-w-0">
                                  <p className="text-sm font-light leading-snug truncate">{rec.title}</p>
                                  {rec.subtitle && (
                                    <p className="text-[11px] text-muted-foreground truncate">{rec.subtitle}</p>
                                  )}
                                  <span className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-light group-hover:gap-1.5 transition-all">
                                    {TYPE_CTA[rec.type] ?? "Lihat"}
                                    <ArrowRight size={11} strokeWidth={1.5} />
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
                          className="mt-2 w-full inline-flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] font-light px-4 py-2.5"
                          style={{ backgroundColor: BLACK, color: WHITE }}
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
                          style={{ color: BLACK, borderColor: BLACK }}
                        >
                          <Headset size={12} strokeWidth={1.5} />
                          Hubungkan ke customer service
                        </button>
                      )}
                    </div>
                  </div>
                ),
              )}

              {loading && (
                <div className="flex justify-start">
                  <div
                    className="px-4 py-3 text-sm font-light flex items-center gap-2"
                    style={{ backgroundColor: WHITE, color: BLACK, border: "1px solid #e5e5e5" }}
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
                className="flex-1 border border-[#e5e5e5] px-3 py-2.5 text-sm font-light outline-none focus:border-black transition-colors bg-white"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                aria-label="Kirim pesan"
                className="w-10 h-10 flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: BLACK, color: WHITE }}
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