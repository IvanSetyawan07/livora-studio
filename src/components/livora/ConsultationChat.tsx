import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Video, Paperclip, X, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  getMyMessages,
  sendMyMessage,
  getAdminMessages,
  sendAdminMessage,
  type ConsultationMessage,
} from "@/lib/consultationMessages";
import { API_BASE_URL } from "@/lib/api";

type Props = {
  consultationId: number;
  mode: "user" | "admin";
  locked?: boolean;
};

// Fast polling; incremental (only fetches new messages via ?since=lastId)
const POLL_ACTIVE_MS = 3_000;
const POLL_IDLE_MS = 15_000;

const FILE_HOST = API_BASE_URL.replace(/\/api\/?$/, "");
const resolveUrl = (path: string) =>
  /^https?:\/\//i.test(path) ? path : `${FILE_HOST}${path}`;

const URL_REGEX = /(https?:\/\/[^\s<]+)/gi;

function renderBody(text: string) {
  if (!text) return null;
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="underline break-all hover:opacity-80"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ConsultationChat({ consultationId, mode, locked }: Props) {
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [body, setBody] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastIdRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);

  const load = useCallback(async (incremental: boolean) => {
    try {
      const since = incremental ? lastIdRef.current || undefined : undefined;
      const data =
        mode === "user"
          ? await getMyMessages(consultationId, since)
          : await getAdminMessages(consultationId, since);

      if (!data || data.length === 0) {
        if (!incremental) setMessages([]);
        return;
      }
      if (incremental) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const merged = [...prev, ...data.filter((m) => !seen.has(m.id))];
          return merged;
        });
      } else {
        setMessages(data);
      }
      const maxId = data.reduce((m, x) => Math.max(m, x.id), lastIdRef.current);
      lastIdRef.current = maxId;
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [consultationId, mode]);

  useEffect(() => {
    lastIdRef.current = 0;
    setLoading(true);
    load(false);

    let timer: number | undefined;
    const schedule = () => {
      const interval = isVisibleRef.current ? POLL_ACTIVE_MS : POLL_IDLE_MS;
      timer = window.setTimeout(async () => {
        await load(true);
        schedule();
      }, interval);
    };
    schedule();

    const onVis = () => {
      isVisibleRef.current = document.visibilityState === "visible";
      if (isVisibleRef.current) load(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [consultationId, mode, load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      toast.error("File maksimal 20MB.");
      return;
    }
    setAttachment(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!body.trim() && !attachment) || sending || locked) return;
    setSending(true);
    try {
      let msg: ConsultationMessage;
      if (mode === "admin") {
        msg = await sendAdminMessage(consultationId, {
          body: body.trim() || undefined,
          meeting_link: meetingLink.trim() || undefined,
          attachment: attachment ?? undefined,
        });
        setMeetingLink("");
      } else {
        msg = await sendMyMessage(consultationId, {
          body: body.trim() || undefined,
          attachment: attachment ?? undefined,
        });
      }
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      lastIdRef.current = Math.max(lastIdRef.current, msg.id);
      setBody("");
      setAttachment(null);
      if (fileRef.current) fileRef.current.value = "";
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
            const isImage = m.attachment_type?.startsWith("image/");
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-lg px-3.5 py-2.5 text-sm ${
                    mine ? "bg-foreground text-background" : "bg-secondary text-foreground"
                  }`}
                >
                  {!mine && m.sender?.name && (
                    <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">
                      {m.sender.name}
                    </p>
                  )}
                  {m.body && (
                    <p className="whitespace-pre-wrap leading-relaxed break-words">
                      {renderBody(m.body)}
                    </p>
                  )}
                  {m.attachment_url && (
                    <div className="mt-2">
                      {isImage ? (
                        <a href={resolveUrl(m.attachment_url)} target="_blank" rel="noreferrer">
                          <img
                            src={resolveUrl(m.attachment_url)}
                            alt={m.attachment_name || "attachment"}
                            className="rounded max-h-56 object-cover"
                          />
                        </a>
                      ) : (
                        <a
                          href={resolveUrl(m.attachment_url)}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-2 rounded border px-2.5 py-1.5 text-[11px] ${
                            mine
                              ? "border-background/30 text-background"
                              : "border-border text-foreground"
                          }`}
                        >
                          <FileText size={12} />
                          <span className="truncate max-w-[180px]">
                            {m.attachment_name || "Download file"}
                          </span>
                        </a>
                      )}
                    </div>
                  )}
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
        {attachment && (
          <div className="flex items-center justify-between gap-2 text-[11px] bg-secondary/60 border border-border rounded px-2.5 py-1.5">
            <span className="truncate flex items-center gap-1.5">
              <Paperclip size={12} /> {attachment.name}
            </span>
            <button
              type="button"
              onClick={() => {
                setAttachment(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={locked || sending}
            title="Attach file"
            className="border border-border rounded p-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Paperclip size={14} />
          </button>
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
            disabled={sending || locked || (!body.trim() && !attachment)}
            className="bg-foreground text-background px-4 py-2 rounded text-xs uppercase tracking-[0.2em] disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send size={14} /> {sending ? "…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
