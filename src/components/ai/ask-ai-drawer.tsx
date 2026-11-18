import { Fragment, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  ArrowUp,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Globe,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAiMarketingContext } from "@/context/AiMarketingContext";
import { extractApiErrorMessage } from "@/hooks/useAiDashboard";
import { aiServices } from "@/lib/ai/services";
import type { AiChatContextKey, AiChatMessage } from "@/lib/ai/types";

const CHAT_STORAGE_KEY = "livora_ai_chat_messages_v1";

const contextLabel: Record<AiChatContextKey, string> = {
  overview: "Overview",
  seo: "SEO Agent",
  content: "Content Agent",
  ads: "Ads Agent",
  leads: "Lead Intelligence",
  cro: "CRO Agent",
  campaigns: "Campaign Workspace",
  impact: "Impact Tracking",
  actions: "Actions",
  approvals: "Approvals",
  insights: "Insights",
  activity: "Activity Log",
  recommendations: "Recommendations",
  usage: "AI Usage & Cost",
  providers: "Providers & Routing",
  settings: "Settings & Integrations",
  general: "AI Marketing",
};

const suggestedQuestions: Record<AiChatContextKey, string[]> = {
  overview: [
    "Apa prioritas marketing terpenting hari ini?",
    "Analisis tren pasar interior design & furniture di Indonesia saat ini beserta kompetitornya",
    "Bagaimana performa konsultasi & cek harga WA bulan ini?",
    "Kampanye mana yang perlu perhatian?",
  ],
  seo: [
    "Halaman produk & proyek mana yang belum punya meta SEO?",
    "Bagaimana performa Search Console & keyword interior yang sedang naik tren di Indonesia?",
    "Bagaimana performa Google Business Profile?",
  ],
  content: [
    "Berikan ide konten eksternal di luar katalog Livora berdasarkan tren interior terkini",
    "Produk & promo apa yang paling banyak dilihat bulan ini?",
    "Konsep video Reels/TikTok apa yang paling potensial untuk audiens Livora?",
  ],
  ads: [
    "Bagaimana CPL & leads per platform iklan saat ini?",
    "Beri saran strategi iklan Meta/Google menghadapi kompetitor studio interior di Jabodetabek",
  ],
  leads: [
    "Siapa lead dengan skor intent tertinggi saat ini?",
    "Berapa cek harga WA LiviBot yang belum dijawab?",
    "Pola follow-up WhatsApp apa yang paling efektif meningkatkan closing?",
  ],
  cro: [
    "Di tahap konsultasi mana paling banyak drop-off?",
    "Bagaimana rasio keranjang ke WA LiviBot?",
    "Apa perbaikan cepat di halaman konsultasi untuk menaikkan konversi?",
  ],
  campaigns: [
    "Kampanye mana yang butuh perhatian?",
    "Buat rencana kampanye musiman baru berdasarkan tren desain hunian terbaru",
  ],
  impact: [
    "Apakah eksekusi terakhir berdampak positif?",
    "Bagaimana perkembangan metrik 7-14 hari terakhir?",
  ],
  actions: [
    "Aksi apa yang siap saya Approve & Execute sekarang?",
    "Mana aksi berisiko rendah yang bisa langsung jalan?",
  ],
  approvals: [
    "Ada berapa item di antrean persetujuan saat ini?",
    "Mana item berisiko tinggi yang perlu ditinjau lebih teliti?",
  ],
  insights: [
    "Insight mana yang paling mendesak untuk ditindaklanjuti?",
    "Gabungkan insight internal dengan tren pasar interior eksternal hari ini",
  ],
  activity: [
    "Ringkas aktivitas & hasil run AI agent terbaru",
    "Apakah ada aksi yang gagal dieksekusi dan perlu di-retry?",
  ],
  recommendations: [
    "Rekomendasi mana yang paling berdampak ke leads Livora?",
    "Mana yang tinggal dieksekusi?",
  ],
  usage: [
    "Agent mana yang paling banyak memakai token?",
    "Bagaimana estimasi biaya AI bulan ini?",
  ],
  providers: [
    "Provider AI mana yang sedang aktif?",
    "Apakah fallback Gemini/Groq berjalan normal?",
  ],
  settings: [
    "Integrasi mana yang masih belum terhubung?",
    "Apa manfaat menghubungkan GA4 & Search Console sekaligus?",
  ],
  general: [
    "Apa yang harus saya prioritaskan hari ini?",
    "Analisis tren pasar furniture & interior design eksternal untuk Livora",
  ],
};

function renderFormattedText(text: string) {
  const urlRegex = /(https?:\/\/[^\s<>"')]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, idx) => {
    if (part.startsWith("http://") || part.startsWith("https://")) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-ai underline decoration-ai/40 underline-offset-2 hover:text-ai/80"
        >
          {part}
        </a>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

export function AskAIDrawer() {
  const { askOpen, closeAsk, context } = useAiMarketingContext();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    try {
      const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<{ prompt: string; message: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-24)));
    } catch {
      // ignore storage errors
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, lastError]);

  async function send(text: string, isRetry = false) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setLastError(null);
    const historySnapshot = messages.slice(-6).map((m) => ({
      role: m.role,
      text: m.text.slice(0, 1200),
    }));
    if (!isRetry) {
      const userMsg: AiChatMessage = {
        id: `u_${Date.now()}`,
        role: "user",
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
    }
    setPending(true);
    try {
      const reply = await aiServices.chat.ask(trimmed, context, {
        webSearch,
        history: historySnapshot,
      });
      setMessages((prev) => [...prev, reply]);
      if (reply.recommendation || (reply.executedActions && reply.executedActions.length > 0)) {
        queryClient.invalidateQueries({ queryKey: ["ai"] });
      }
      if (reply.executedActions && reply.executedActions.length > 0) {
        const okCount = reply.executedActions.filter((op) => op.status === "ok").length;
        if (okCount > 0) {
          toast.success(`${okCount} perintah sistem berhasil dieksekusi oleh AI.`);
        }
      }
    } catch (error) {
      const msg = extractApiErrorMessage(
        error,
        "AI provider tidak merespons. Periksa API key Gemini/Groq di backend atau coba sesaat lagi.",
      );
      setLastError({ prompt: trimmed, message: msg });
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setLastError(null);
    try {
      sessionStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <Sheet open={askOpen} onOpenChange={(open) => !open && closeAsk()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-border bg-popover p-0 text-foreground sm:max-w-md [&>button.absolute]:hidden"
      >
        <SheetTitle className="sr-only">Livora Marketing AI</SheetTitle>
        <SheetDescription className="sr-only">
          Chief Marketing and Profit Intelligence Assistant
        </SheetDescription>
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-ai/12">
              <Sparkles className="size-3.5 text-ai" />
            </span>
            <div className="min-w-0">
              <p className="text-display truncate text-sm leading-none">Livora Marketing AI</p>
              <p className="label-eyebrow mt-1 truncate">Context: {contextLabel[context]}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setWebSearch((v) => !v)}
              title="Aktifkan pencarian Google / analisis pasar & tren eksternal"
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium transition-colors",
                webSearch
                  ? "border-ai/40 bg-ai/15 text-ai"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Globe className="size-3" />
              <span className="hidden sm:inline">Riset Web</span>
            </button>
            {messages.length > 0 ? (
              <button
                type="button"
                onClick={clearChat}
                title="Bersihkan riwayat chat"
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Clear chat"
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={closeAsk}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-border bg-secondary/30 px-4 py-2">
          <div className="flex items-center justify-between gap-2 pb-1.5">
            <span className="label-eyebrow text-[9px] text-ai">Kendali 100% Fitur · Perintah Cepat</span>
            <span className="font-mono text-[9px] text-muted-foreground">Real DB + Self-Learning</span>
          </div>
          <div className="scroll-rail flex gap-1.5 overflow-x-auto pb-1">
            {[
              { label: "💰 Audit Profit & Leads", prompt: "Audit lengkap omzet shop, pipeline konsultasi interior, dan kebocoran WA LiviBot saat ini lalu beri strategi menaikkan profit tertinggi." },
              { label: "▶ Jalankan Semua Agent", prompt: "Jalankan semua agent sekarang dan ringkas temuan utamanya." },
              { label: "✓ Approve Low-Risk", prompt: "Approve semua rekomendasi low-risk yang masih pending." },
              { label: "⚡ Eksekusi Actions", prompt: "Eksekusi semua action yang sudah approved sekarang." },
              { label: "🚀 Buat Campaign Profit", prompt: "Buatkan campaign marketing baru untuk mendorong produk demand tertinggi & konsultasi interior Livora." },
            ].map((cmd) => (
              <button
                key={cmd.label}
                type="button"
                disabled={pending}
                onClick={() => void send(cmd.prompt)}
                className="shrink-0 rounded-sm border border-border bg-background/70 px-2 py-1 text-[10px] font-medium text-foreground/90 transition-colors hover:border-ai/50 hover:bg-ai/10 hover:text-ai disabled:opacity-50"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <p className="text-display text-lg">Chief Marketing & Profit AI</p>
                <p className="text-sm text-muted-foreground">
                  Terhubung langsung ke data order Rupiah, konsultasi, WA LiviBot, SEO, Ads, dan memori pembelajaran Livora. Anda juga bisa memerintahkan AI mengendalikan seluruh fitur di sini.
                </p>
              </div>
              <div className="space-y-2">
                <span className="label-eyebrow">Pertanyaan & perintah disarankan</span>
                <div className="flex flex-col gap-2 pt-1">
                  {suggestedQuestions[context].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="panel panel-hover rounded-lg px-3.5 py-2.5 text-left text-sm text-foreground/90"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex flex-col gap-1.5", m.role === "user" ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "max-w-[90%] whitespace-pre-wrap break-words rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                      m.role === "user" ? "bg-ai/15 text-foreground" : "panel text-foreground/90",
                    )}
                  >
                    {m.role === "assistant" && (m.provider || m.model) ? (
                      <div className="mb-1.5 flex items-center gap-1.5 border-b border-border/60 pb-1 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
                        <Sparkles className="size-2.5 text-ai" />
                        <span>{m.provider ?? "AI"}{m.model ? ` · ${m.model}` : ""}</span>
                      </div>
                    ) : null}
                    {m.role === "assistant" ? renderFormattedText(m.text) : m.text}
                  </div>
                  {m.executedActions && m.executedActions.length > 0 ? (
                    <div className="flex w-full max-w-[90%] flex-col gap-1.5">
                      {m.executedActions.map((op, idx) => (
                        <Link
                          key={`${m.id}_op_${idx}`}
                          to={op.href}
                          onClick={closeAsk}
                          className="panel panel-hover flex items-start gap-2 rounded-lg border-ai/30 bg-ai/[0.05] px-3.5 py-2.5 text-left"
                        >
                          {op.status === "ok" ? (
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                          ) : (
                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                          )}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-xs font-medium text-foreground">{op.title}</p>
                            <p className="line-clamp-2 text-[11px] text-muted-foreground">{op.detail}</p>
                            <p className="label-eyebrow pt-0.5 text-ai">Buka Fitur →</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  {m.recommendation && (
                    <Link
                      to="/admin/ai-marketing/ai-center/recommendations"
                      onClick={closeAsk}
                      className="panel panel-hover flex max-w-[90%] items-start gap-2 rounded-lg px-3.5 py-2.5 text-left"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-foreground/90">
                          Rekomendasi baru ditambahkan: {m.recommendation.title}
                        </p>
                        <p className="label-eyebrow text-ai">Buka Recommendations →</p>
                      </div>
                    </Link>
                  )}
                </div>
              ))}
              {pending && (
                <div className="flex justify-start">
                  <div className="panel flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="size-1.5 animate-pulse-dot rounded-full bg-ai" />
                      <span className="size-1.5 animate-pulse-dot rounded-full bg-ai [animation-delay:150ms]" />
                      <span className="size-1.5 animate-pulse-dot rounded-full bg-ai [animation-delay:300ms]" />
                    </span>
                    <span>{webSearch ? "Menganalisis data & riset web..." : "Menyusun jawaban..."}</span>
                  </div>
                </div>
              )}
              {lastError && (
                <div className="flex items-start justify-between gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span>{lastError.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => send(lastError.prompt, true)}
                    className="inline-flex shrink-0 items-center gap-1 rounded border border-destructive/40 px-2 py-1 text-[11px] font-medium hover:bg-destructive/15"
                  >
                    <RotateCcw className="size-3" /> Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-border px-4 py-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={webSearch ? "Tanya strategi, tren pasar, atau data Livora..." : "Tanya seputar data marketing Livora..."}
            className="h-10 flex-1 rounded-lg border border-border bg-secondary/60 px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ai/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ai text-background transition-opacity disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp className="size-4" />
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}