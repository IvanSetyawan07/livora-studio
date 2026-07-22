import { useEffect, useRef, useState } from "react";
import { Send, Video } from "lucide-react";
import { toast } from "sonner";
import {
  getMyMessages,
  sendMyMessage,
  getAdminMessages,
  sendAdminMessage,
  type ConsultationMessage,
} from "@/lib/consultationMessages";

type Props = {
  consultationId: number;
  mode: "user" | "admin";
  /** disabled composer (e.g. cancelled) */
  locked?: boolean;
};

const POLL_MS = 20_000;

/**
 * Two-way chat between user & admin for a single consultation.
 * - Polls every 20s (no realtime backend on Laravel side).
 * - Admin composer can attach a Zoom / Google Meet link that renders
 *   as a "Join Meeting" button on the user's side.
 */
export default function ConsultationChat({ consultationId, mode, locked }: Props) {
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [body, setBody] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetcher = mode === "user" ? getMyMessages : getAdminMessages;

  const load = async () => {
    try {
      const data = await fetcher(consultationId);
      setMessages(data);
    } catch {
      // silent — polling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId, mode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || sending || locked) return;
    setSending(true);
    try {
      let msg: ConsultationMessage;
      if (mode === "admin") {
        msg = await sendAdminMessage(consultationId, {
          body: body.trim(),
          meeting_link: meetingLink.trim() || undefined,
        });
        setMeetingLink("");
      } else {
        msg = await sendMyMessage(consultationId, body.trim());
      }
      setMessages((prev) => [...prev, msg]);
      setBody("");
    } catch {
      toast.error("Gagal mengirim pesan.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-border rounded-lg bg-background flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/40">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          {mode === "admin" ? "Chat with Customer" : "Chat with Livora Design Team"}
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-h-[420px] min-h-[240px]"
      >
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-6">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 italic">
            Belum ada pesan. {mode === "user" ? "Mulai percakapan dengan tim kami." : "Sapa customer untuk memulai."}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_type === mode;
            const system = m.sender_type === "system";
            if (system) {
              return (
                <div key={m.id} className="text-[11px] text-center text-muted-foreground italic py-1">
                  {m.body}
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-lg px-3.5 py-2.5 text-sm ${
                    mine
                      ? "bg-foreground text-background"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {!mine && m.sender?.name && (
                    <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">
                      {m.sender.name}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  {m.meeting_link && (
                    <a
                      href={m.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-2 inline-flex items-center gap-1.5 text-[11px] underline ${
                        mine ? "text-background" : "text-foreground"
                      }`}
                    >
                      <Video size={12} /> Join Meeting Link
                    </a>
                  )}
                  <p className={`text-[10px] mt-1.5 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={submit} className="border-t border-border p-3 space-y-2 bg-background">
        {mode === "admin" && (
          <input
            type="url"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="Zoom / Google Meet link (opsional — akan tampil sebagai tombol Join)"
            className="w-full border border-border rounded px-3 py-2 text-xs bg-background outline-none focus:border-foreground"
          />
        )}
        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(e as unknown as React.FormEvent);
              }
            }}
            rows={2}
            disabled={locked}
            placeholder={locked ? "Consultation ini sudah ditutup." : "Ketik pesan…"}
            className="flex-1 border border-border rounded px-3 py-2 text-sm bg-background outline-none focus:border-foreground resize-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || locked || !body.trim()}
            className="bg-foreground text-background px-4 rounded text-xs uppercase tracking-[0.2em] disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send size={14} /> {sending ? "…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
