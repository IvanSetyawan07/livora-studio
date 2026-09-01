import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowUp, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAiMarketingContext } from "@/context/AiMarketingContext";
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
    "What should I fix today?",
    "Why did traffic drop this week?",
    "Which campaign needs attention?",
    "What should I prioritise?",
  ],
  seo: ["Why isn't Serenade ranking yet?", "What's our local pack rank?", "Which pages need metadata work?"],
  content: ["What content gaps do we have?", "Which posts need review?", "What should I publish next?"],
  ads: ["Why did CPL change?", "Which platform has the best ROAS?", "Should I shift budget?"],
  leads: ["Which leads are high-intent right now?", "How fast are we responding?", "Who needs follow-up?"],
  cro: ["Why did the funnel drop?", "Where are people leaving?", "What should I test next?"],
  campaigns: ["Which campaign needs attention?", "What's blocking the funnel recovery?"],
  impact: ["Did the funnel fix work?", "What's the ROI on lead routing?"],
  actions: ["What's waiting for my review?", "What's the riskiest pending action?"],
  recommendations: ["What's the highest-impact recommendation?", "What's low-risk and ready to approve?"],
  usage: ["Which agent costs the most?", "Are we over budget this month?"],
  providers: ["Which provider handles content?", "Is Claude connected yet?"],
  general: ["What should I fix today?", "What should I prioritise?"],
};

export function AskAIDrawer() {
  const { askOpen, closeAsk, context } = useAiMarketingContext();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const userMsg: AiChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPending(true);
    try {
      const reply = await aiServices.chat.ask(trimmed, context);
      setMessages((prev) => [...prev, reply]);
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
          <button
            onClick={closeAsk}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
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
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                      m.role === "user" ? "bg-ai/12 text-foreground" : "panel text-foreground/90",
                    )}
                  >
                    {m.text}
                  </div>
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
