import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Phone } from "lucide-react";
import { useLocation } from "react-router-dom";

/* ────────── Design tokens (konsisten dengan komponen Livora lainnya) ────────── */
const BLACK = "#ffffff";
const WHITE = "#000000";
const ease = [0.22, 1, 0.36, 1] as const;

type Sender = "user" | "bot";

interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  needsEscalation?: boolean;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  sender: "bot",
  text: "Hi, saya Livora Concierge. Ada yang bisa saya bantu — soal furniture, project, atau koleksi kami?",
};

/**
 * Popup chat widget — tombol mengambang di landing page.
 * Ditaruh sejajar dengan Navbar/Footer di layout utama supaya muncul di semua halaman.
 *
 * Visibility rule (disamakan dengan WhatsAppButton):
 * - Disembunyikan total di halaman collection detail dan halaman auth (login/register)
 * - Di landing page, baru muncul setelah user scroll lewat 100px
 * - Di halaman lain, langsung terlihat
 *
 * Integrasi backend: ganti fungsi `sendToBackend` dengan panggilan ke
 * POST /api/chat milik kamu. Endpoint diharapkan mengembalikan
 * { reply: string, needs_escalation: boolean }.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { pathname } = useLocation();
  const isLanding = pathname === "/";
  // Sembunyikan di halaman collection detail (overlap dgn CategoryBar) dan halaman auth.
  const isHidden =
    /^\/collection\/[^/]+/.test(pathname) ||
    pathname === "/login" ||
    pathname === "/register";
  const [visible, setVisible] = useState(!isLanding && !isHidden);

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Show/hide tombol mengambang berdasarkan halaman + posisi scroll
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

  // Kalau tombol jadi hilang (mis. user scroll balik ke atas / pindah ke halaman hidden),
  // tutup juga panel chat-nya biar tidak "mengambang sendirian" tanpa tombol toggle.
  useEffect(() => {
    if (!visible && open) setOpen(false);
  }, [visible, open]);

  const sendToBackend = async (message: string, history: ChatMessage[]) => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversation_history: history.map((m) => ({ role: m.sender, text: m.text })),
        }),
      });
      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json();
      return {
        reply: data.reply as string,
        needsEscalation: Boolean(data.needs_escalation),
      };
    } catch {
      return {
        reply: "Maaf, saya sedang tidak bisa terhubung. Mau saya hubungkan langsung ke tim consultant kami?",
        needsEscalation: true,
      };
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), sender: "user", text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    const { reply, needsEscalation } = await sendToBackend(text, nextMessages);

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), sender: "bot", text: reply, needsEscalation },
    ]);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  const handleTalkToCS = () => {
    // Arahkan ke form Appointment yang sudah ada, atau trigger flow escalation
    // sendiri (mis. buka WhatsApp deep link / submit Consultation dari sini).
    window.location.href = "/appointment#appointment-form";
  };

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
                <p className="serif text-base font-light leading-none mb-1">Livora Concierge</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-light">
                  Design & product assistant
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
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-[#fafafa]"
            >
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[85%]">
                    <div
                      className="px-4 py-3 text-sm font-light leading-relaxed"
                      style={
                        m.sender === "user"
                          ? { backgroundColor: BLACK, color: WHITE }
                          : { backgroundColor: WHITE, color: BLACK, border: "1px solid #e5e5e5" }
                      }
                    >
                      {m.text}
                    </div>

                    {m.sender === "bot" && m.needsEscalation && (
                      <button
                        type="button"
                        onClick={handleTalkToCS}
                        className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-light border-b pb-0.5"
                        style={{ color: BLACK, borderColor: BLACK }}
                      >
                        <Phone size={12} strokeWidth={1.5} />
                        Bicara dengan tim kami
                      </button>
                    )}
                  </div>
                </div>
              ))}

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
              <button
                type="button"
                onClick={handleTalkToCS}
                className="text-[11px] uppercase tracking-[0.18em] font-light text-muted-foreground hover:text-black transition-colors"
              >
                Langsung bicara dengan CS →
              </button>
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-4 border-t border-[#e5e5e5] bg-white">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tulis pertanyaan kamu..."
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