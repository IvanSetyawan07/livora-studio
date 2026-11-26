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
  ShieldCheck,
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
  overview: "Ringkasan",
  seo: "SEO & Google Maps",
  content: "Konten & Medsos",
  ads: "Iklan & IG Boost",
  leads: "Prospek (Leads)",
  cro: "Konversi Website (CRO)",
  campaigns: "Rencana Campaign",
  impact: "Hasil & Dampak",
  actions: "Antrean Aksi",
  approvals: "Persetujuan & Audit",
  insights: "Temuan & Insight",
  activity: "Riwayat Aktivitas",
  recommendations: "Rekomendasi AI",
  usage: "Biaya & Pemakaian AI",
  providers: "Mesin & Provider AI",
  settings: "Sambungan Platform",
  general: "AI Marketing",
};

const suggestedQuestions: Record<AiChatContextKey, string[]> = {
  overview: [
    "Apa prioritas marketing terpenting hari ini?",
    "Analisis tren pasar interior design & furniture di Indonesia saat ini beserta kompetitornya",
    "Bagaimana performa konsultasi & cek harga WA bulan ini?",
    "Campaign mana yang perlu perhatian?",
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
    "Bagaimana biaya per prospek (CPL) & leads per platform iklan saat ini?",
    "Beri saran strategi iklan Meta/Google menghadapi kompetitor studio interior di Jabodetabek",
  ],
  leads: [
    "Siapa prospek (lead) dengan niat beli tertinggi saat ini?",
    "Berapa permintaan cek harga WA LiviBot yang belum dijawab?",
    "Pola follow-up WhatsApp apa yang paling efektif meningkatkan closing?",
  ],
  cro: [
    "Di tahap konsultasi mana paling banyak calon klien berhenti?",
    "Bagaimana rasio keranjang ke WA LiviBot?",
    "Apa perbaikan cepat di halaman konsultasi untuk menaikkan konversi?",
  ],
  campaigns: [
    "Rencana campaign mana yang butuh perhatian?",
    "Susun ide rencana campaign musiman baru berdasarkan tren desain hunian terbaru",
  ],
  impact: [
    "Apakah eksekusi terakhir berdampak positif?",
    "Bagaimana perkembangan metrik 7-14 hari terakhir?",
  ],
  actions: [
    "Aksi apa saja yang saat ini menunggu tinjauan saya?",
    "Jelaskan dampak dari aksi berisiko rendah yang ada di antrean.",
  ],
  approvals: [
    "Ada berapa item di antrean persetujuan saat ini?",
    "Mana item berisiko tinggi yang perlu saya tinjau paling teliti?",
  ],
  insights: [
    "Temuan mana yang paling mendesak untuk ditindaklanjuti?",
    "Gabungkan temuan internal dengan tren pasar interior eksternal hari ini",
  ],
  activity: [
    "Ringkas aktivitas & hasil analisis AI terbaru",
    "Apakah ada aksi yang gagal dieksekusi dan perlu dicek ulang?",
  ],
  recommendations: [
    "Rekomendasi mana yang paling berdampak ke prospek Livora?",
    "Jelaskan perbedaan rekomendasi berisiko rendah vs tinggi di antrean.",
  ],
  usage: [
    "Agent mana yang paling banyak memakai token?",
    "Bagaimana estimasi biaya AI bulan ini?",
  ],
  providers: [
    "Mesin AI mana yang sedang aktif?",
    "Apakah cadangan Gemini/Groq berjalan normal?",
  ],
  settings: [
    "Platform mana saja yang masih belum terhubung?",
    "Apa manfaat menghubungkan Google Analytics & Search Console sekaligus?",
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
  const inputRef = useRef<HTMLInputElement>(null);

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
          toast.success(`${okCount} perintah sistem berhasil diproses oleh AI.`);
        }
      }
    } catch (error) {
      const msg = extractApiErrorMessage(
        error,
        "Mesin AI belum merespons. Coba beberapa saat lagi atau periksa sambungan AI di Pengaturan.",
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

  /** Chip aman: pertanyaan baca-saja langsung dikirim, sedangkan perintah aksi hanya mengisi kolom input agar admin meninjau dulu sebelum menekan Enter. */
  const quickChips: { label: string; prompt: string; prefillOnly?: boolean }[] = [
    {
      label: "Audit Omzet & Prospek",
      prompt:
        "Ringkas omzet pesanan, pipeline konsultasi interior, dan antrean cek harga WA LiviBot saat ini lalu beri saran prioritas.",
    },
    {
      label: "Cek Antrean Persetujuan",
      prompt: "Ada rekomendasi atau aksi apa saja yang sedang menunggu persetujuan saya saat ini? Jangan eksekusi dulu, cukup ringkas.",
    },
    {
      label: "Ide Rencana Campaign",
      prompt: "Usulkan ide rencana campaign marketing untuk produk dengan minat tertinggi di Livora.",
      prefillOnly: true,
    },
    {
      label: "Jalankan Analisis Agent",
      prompt: "Jalankan analisis agent marketing sekarang dan ringkas temuan utamanya.",
      prefillOnly: true,
    },
  ];

  return (
    <Sheet open={askOpen} onOpenChange={(open) => !open && closeAsk()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-border bg-popover p-0 text-foreground sm:max-w-md [&>button.absolute]:hidden"
      >
        <SheetTitle className="sr-only">Asisten AI Marketing Livora</SheetTitle>
        <SheetDescription className="sr-only">
          Asisten analisis penjualan, konsultasi, dan strategi marketing Livora
        </SheetDescription>
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-ai/12">
              <Sparkles className="size-3.5 text-ai" />
            </span>
            <div className="min-w-0">
              <p className="text-display truncate text-sm leading-none">Asisten AI Marketing</p>
              <p className="label-eyebrow mt-1 truncate">Konteks: {contextLabel[context]}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setWebSearch((v) => !v)}
              title="Aktifkan pencarian web untuk riset pasar & tren eksternal"
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                webSearch
                  ? "border-ai/40 bg-ai/12 text-ai"
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
                aria-label="Bersihkan riwayat chat"
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={closeAsk}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Tutup panel Tanya AI"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Shortcut aman — tidak ada 1-klik eksekusi live */}
        <div className="border-b border-border bg-secondary/40 px-4 py-2.5">
          <div className="flex items-center justify-between gap-2 pb-1.5">
            <span className="label-eyebrow text-[10px] text-ai">Pertanyaan Cepat</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <ShieldCheck className="size-3 text-success" /> Aman · Tidak mengubah data tanpa izin
            </span>
          </div>
          <div className="scroll-rail flex gap-1.5 overflow-x-auto pb-1">
            {quickChips.map((cmd) => (
              <button
                key={cmd.label}
                type="button"
                disabled={pending}
                onClick={() => {
                  if (cmd.prefillOnly) {
                    setInput(cmd.prompt);
                    inputRef.current?.focus();
                    toast.info("Draf perintah disiapkan di kotak ketik — periksa lalu tekan Kirim.");
                  } else {
                    void send(cmd.prompt);
                  }
                }}
                className="shrink-0 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-foreground/90 transition-colors hover:border-ai/50 hover:bg-ai/10 hover:text-ai disabled:opacity-50"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-background/60 px-5 py-5">
          {messages.length === 0 ? (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <p className="text-display text-lg">Halo, ada yang ingin dianalisis?</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Asisten ini membaca data penjualan, konsultasi interior, antrean WhatsApp LiviBot, SEO, dan iklan Livora. Perubahan berisiko tetap memerlukan persetujuan Anda di halaman Aksi.
                </p>
              </div>
              <div className="space-y-2">
                <span className="label-eyebrow">Contoh pertanyaan untuk halaman ini</span>
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
                      m.role === "user" ? "bg-[#232528] text-white" : "panel text-foreground",
                    )}
                  >
                    {m.role === "assistant" && (m.provider || m.model) ? (
                      <div className="mb-1.5 flex items-center gap-1.5 border-b border-border/60 pb-1 text-[10px] tracking-wider text-muted-foreground uppercase">
                        <Sparkles className="size-2.5 text-ai" />
                        <span>
                          {m.provider ?? "AI"}
                          {m.model ? ` · ${m.model}` : ""}
                        </span>
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
                          className="panel panel-hover flex items-start gap-2 rounded-lg border-ai/30 bg-ai/[0.04] px-3.5 py-2.5 text-left"
                        >
                          {op.status === "ok" ? (
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                          ) : (
                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                          )}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-xs font-medium text-foreground">{op.title}</p>
                            <p className="line-clamp-2 text-[11px] text-muted-foreground">{op.detail}</p>
                            <p className="label-eyebrow pt-0.5 text-ai">Buka Halaman →</p>
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
                        <p className="text-xs font-medium text-foreground">
                          Rekomendasi baru ditambahkan: {m.recommendation.title}
                        </p>
                        <p className="label-eyebrow text-ai">Tinjau di Rekomendasi AI →</p>
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
                    <span>{webSearch ? "Menganalisis data & mencari tren web..." : "Menyusun jawaban..."}</span>
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
                    <RotateCcw className="size-3" /> Ulangi
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
          className="flex items-center gap-2 border-t border-border bg-white px-4 py-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              webSearch
                ? "Tanya strategi, tren pasar, atau data Livora..."
                : "Tulis pertanyaan seputar marketing Livora..."
            }
            className="h-10 flex-1 rounded-lg border border-border bg-secondary/60 px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ai focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#232528] text-white transition-opacity disabled:opacity-40"
            aria-label="Kirim pertanyaan"
          >
            <ArrowUp className="size-4" />
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
