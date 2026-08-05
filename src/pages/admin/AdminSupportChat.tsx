import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, Check, X, Headset } from "lucide-react";
import {
  getSupportSessions,
  getSupportMessages,
  acceptSupportSession,
  replySupportSession,
  closeSupportSession,
  type AdminSupportSession,
} from "@/lib/adminSupportChat";
import type { SupportMessage } from "@/lib/supportChat";
import { playChatSound, unlockChatSound } from "@/lib/chatSound";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "pending_cs", label: "Menunggu CS" },
  { key: "active", label: "Live" },
  { key: "bot", label: "AI" },
  { key: "closed", label: "Selesai" },
];

const STATUS_LABEL: Record<string, string> = {
  bot: "AI Concierge",
  pending_cs: "Menunggu CS",
  active: "Live chat",
  closed: "Ditutup",
};

export default function AdminSupportChat() {
  const [filter, setFilter] = useState("all");
  const [sessions, setSessions] = useState<AdminSupportSession[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevPendingRef = useRef(0);

  const active = useMemo(() => sessions.find((s) => s.id === activeId) ?? null, [sessions, activeId]);
  const lastId = messages.length ? messages[messages.length - 1].id : 0;

  const loadSessions = async () => {
    try {
      const data = await getSupportSessions(filter);
      setSessions(data.sessions);
      setPending(data.pending);
    } catch {
      toast.error("Gagal memuat sesi chat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadSessions();
    const i = window.setInterval(loadSessions, 4000);
    return () => window.clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  /* Nada dering saat ada permintaan CS baru masuk. */
  useEffect(() => {
    if (pending > prevPendingRef.current) playChatSound("alert");
    prevPendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    setMessages([]);
    getSupportMessages(activeId).then((d) => alive && setMessages(d.messages)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const i = window.setInterval(async () => {
      try {
        const d = await getSupportMessages(activeId, lastId);
        if (d.messages.length) {
          setMessages((prev) => [...prev, ...d.messages]);
          if (d.messages.some((m) => m.sender === "user")) playChatSound("incoming");
        }
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => window.clearInterval(i);
  }, [activeId, lastId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const accept = async () => {
    if (!activeId) return;
    try {
      await acceptSupportSession(activeId);
      toast.success("Sesi diterima — kamu sekarang terhubung dengan user");
      loadSessions();
      const d = await getSupportMessages(activeId, lastId);
      if (d.messages.length) setMessages((prev) => [...prev, ...d.messages]);
    } catch {
      toast.error("Gagal menerima sesi");
    }
  };

  const close = async () => {
    if (!activeId) return;
    try {
      await closeSupportSession(activeId);
      toast.success("Percakapan ditutup");
      loadSessions();
      const d = await getSupportMessages(activeId, lastId);
      if (d.messages.length) setMessages((prev) => [...prev, ...d.messages]);
    } catch {
      toast.error("Gagal menutup percakapan");
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    setText("");
    try {
      const msg = await replySupportSession(activeId, body);
      setMessages((prev) => [...prev, msg]);
      loadSessions();
    } catch {
      toast.error("Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground mb-1">Livora | Support</p>
        <h1 className="serif text-2xl">
          Chat Support {pending > 0 && <span className="text-sm text-[#B08D57]">({pending} menunggu)</span>}
        </h1>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[11px] uppercase tracking-[0.18em] px-3 py-1.5 border transition-colors ${
              filter === f.key ? "bg-foreground text-background border-foreground" : "border-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Session list */}
        <div className="border border-border rounded-lg divide-y divide-border max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="animate-spin" size={18} />
            </div>
          ) : sessions.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Belum ada percakapan.</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`w-full text-left p-4 hover:bg-secondary/60 transition-colors ${
                  activeId === s.id ? "bg-secondary" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm">{s.display_name}</span>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      s.status === "pending_cs"
                        ? "bg-amber-100 text-amber-700"
                        : s.status === "active"
                        ? "bg-green-50 text-green-700"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{s.last_message}</p>
                {s.unread_admin > 0 && (
                  <span className="mt-1 inline-block text-[10px] text-[#B08D57]">
                    {s.unread_admin} pesan baru
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Conversation */}
        <div className="border border-border rounded-lg flex flex-col h-[70vh]">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Pilih percakapan di sebelah kiri.
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm">{active.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {STATUS_LABEL[active.status]} {active.admin_name ? `· ${active.admin_name}` : ""}
                    {active.request_reason ? ` · ${active.request_reason}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {active.status === "pending_cs" && (
                    <button
                      onClick={accept}
                      className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] bg-foreground text-background px-3 py-2"
                    >
                      <Check size={13} /> Terima
                    </button>
                  )}
                  {active.status === "active" && (
                    <button
                      onClick={close}
                      className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] border border-border px-3 py-2"
                    >
                      <X size={13} /> Tutup
                    </button>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fafafa]">
                {messages.map((m) =>
                  m.sender === "system" ? (
                    <p key={m.id} className="text-[11px] text-center text-muted-foreground">
                      {m.text}
                    </p>
                  ) : (
                    <div key={m.id} className={`flex ${m.sender === "user" ? "justify-start" : "justify-end"}`}>
                      <div className="max-w-[80%]">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">
                          {m.sender === "user" ? "User" : m.sender === "bot" ? "AI Concierge" : "CS"}
                        </p>
                        <div
                          className={`px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                            m.sender === "user"
                              ? "bg-white border border-border"
                              : m.sender === "bot"
                              ? "bg-secondary"
                              : "bg-foreground text-background"
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>

              <div className="p-3 border-t border-border flex items-center gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={
                    active.status === "pending_cs"
                      ? "Terima sesi dulu, atau langsung balas untuk mengambil alih..."
                      : "Tulis balasan..."
                  }
                  className="flex-1 border border-border px-3 py-2.5 text-sm outline-none focus:border-foreground bg-white"
                />
                <button
                  onClick={send}
                  disabled={sending || !text.trim()}
                  className="w-10 h-10 flex items-center justify-center bg-foreground text-background disabled:opacity-40"
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <Headset size={13} /> AI Concierge menjawab otomatis sampai user meminta customer service.
      </p>
    </div>
  );
}
