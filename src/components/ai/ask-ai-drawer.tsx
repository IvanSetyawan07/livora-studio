import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, ArrowUp, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAiMarketingContext } from "@/context/AiMarketingContext";
import { extractApiErrorMessage } from "@/hooks/useAiDashboard";
import { aiServices } from "@/lib/ai/services";
import type { AiChatContextKey, AiChatMessage } from "@/lib/ai/types";

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
  recommendations: "Recommendations",
  usage: "AI Usage & Cost",
  providers: "Providers & Routing",
  general: "AI Marketing",
};

const suggestedQuestions: Record<AiChatContextKey, string[]> = {
  overview: [
    "Apa prioritas marketing terpenting hari ini?",
    "Bagaimana performa konsultasi & cek harga WA bulan ini?",
    "Kampanye mana yang perlu perhatian?",
    "Apa insight SEO & produk terbaru?",
  ],
  seo: ["Halaman produk & proyek mana yang belum punya meta SEO?", "Bagaimana performa Google Business Profile?", "Keyword apa yang potensial?"],
  content: ["Produk & promo apa yang paling banyak dilihat bulan ini?", "Konten Instagram/Email apa yang sebaiknya dibuat?"],
  ads: ["Bagaimana CPL & leads per platform iklan?", "Apakah perlu realokasi budget?"],
  leads: ["Siapa lead dengan skor intent tertinggi saat ini?", "Berapa cek harga WA LiviBot yang belum dijawab?", "Siapa yang perlu follow-up segera?"],
  cro: ["Di tahap konsultasi mana paling banyak drop-off?", "Bagaimana rasio keranjang ke WA LiviBot?", "Apa yang harus diperbaiki di funnel?"],
  campaigns: ["Kampanye mana yang butuh perhatian?", "Apa hambatan utama konversi promo?"],
  impact: ["Apakah eksekusi terakhir berdampak positif?", "Bagaimana perkembangan metrik 7-14 hari terakhir?"],
  actions: ["Aksi apa yang siap saya Approve & Execute sekarang?", "Mana aksi berisiko rendah yang bisa langsung jalan?"],
  recommendations: ["Rekomendasi mana yang paling berdampak ke leads Livora?", "Mana yang tinggal dieksekusi?"],
  usage: ["Agent mana yang paling banyak memakai token?", "Bagaimana estimasi biaya AI bulan ini?"],
  providers: ["Provider AI mana yang sedang aktif?", "Apakah fallback Gemini/Groq berjalan normal?"],
  general: ["Apa yang harus saya prioritaskan hari ini?", "Bagaimana kondisi lead Livora saat ini?"],
};

export function AskAIDrawer() {
  const { askOpen, closeAsk, context } = useAiMarketingContext();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<{ prompt: string; message: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, lastError]);

  async function send(text: string, isRetry = false) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setLastError(null);
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
      const reply = await aiServices.chat.ask(trimmed, context);
      setMessages((prev) => [...prev, reply]);
      // Chat bisa menghasilkan recommendation baru di backend — segarkan
      // Recommendations/Actions/Overview supaya langsung terlihat.
      if (reply.recommendation) {
        queryClient.invalidateQueries({ queryKey: ["ai"] });
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

  return (
    <Sheet open={askOpen} onOpenChange={(open) => !open && closeAsk()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-border bg-popover p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-ai/12">
              <Sparkles className="size-3.5 text-ai" />
            </span>
            <div>
              <p className="text-display text-sm leading-none">Livora Marketing AI</p>
              <p className="label-eyebrow mt-1">Context: {contextLabel[context]}</p>
            </div>
          </div>
          {/* <button
            onClick={closeAsk}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button> */}
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <p className="text-display text-lg">What can I help you with?</p>
                <p className="text-sm text-muted-foreground">
                  Ask about {contextLabel[context].toLowerCase()} — I already know what you're looking at.
                </p>
              </div>
              <div className="space-y-2">
                <span className="label-eyebrow">Suggested questions</span>
                <div className="flex flex-col gap-2 pt-1">
                  {suggestedQuestions[context].map((q) => (
                    <button
                      key={q}
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
                      "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                      m.role === "user" ? "bg-ai/12 text-foreground" : "panel text-foreground/90",
                    )}
                  >
                    {m.text}
                  </div>
                  {m.recommendation && (
                    <Link
                      to="/admin/ai-marketing/recommendations"
                      className="panel panel-hover flex max-w-[85%] items-start gap-2 rounded-lg px-3.5 py-2.5 text-left"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-foreground/90">
                          Rekomendasi baru ditambahkan: {m.recommendation.title}
                        </p>
                        <p className="label-eyebrow">Lihat di Recommendations →</p>
                      </div>
                    </Link>
                  )}
                </div>
              ))}
              {pending && (
                <div className="flex justify-start">
                  <div className="panel flex items-center gap-1.5 rounded-xl px-3.5 py-2.5">
                    <span className="size-1.5 animate-pulse-dot rounded-full bg-ai" />
                    <span className="size-1.5 animate-pulse-dot rounded-full bg-ai [animation-delay:150ms]" />
                    <span className="size-1.5 animate-pulse-dot rounded-full bg-ai [animation-delay:300ms]" />
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
            placeholder="Ask about your marketing..."
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