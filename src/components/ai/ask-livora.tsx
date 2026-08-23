import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NotConnected } from "./primitives";

export function AskLivoraAI() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="group inline-flex items-center gap-2 rounded-sm border border-brass/40 bg-brass/[0.06] px-3.5 py-2 text-xs tracking-wide transition-colors duration-300 hover:bg-brass/[0.12]">
          <Sparkles className="size-3.5 text-brass transition-transform duration-500 group-hover:rotate-12" />
          Ask Livora AI
        </button>
      </DialogTrigger>
      <DialogContent className="border-border-strong bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-display text-xl font-light">Ask Livora AI</DialogTitle>
          <DialogDescription>
            A conversational interface over Livora's marketing intelligence.
          </DialogDescription>
        </DialogHeader>

        <NotConnected
          title="AI assistant is not connected yet"
          description="Questions will be routed to the Laravel API, which orchestrates Claude with tool access to analytics, catalogue and lead data. No model credentials are held in this dashboard."
          state="awaiting_integration"
        />

        <ol className="space-y-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          {["Dashboard", "Laravel API", "AI orchestrator", "Claude", "Livora tools", "Response"].map(
            (step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="text-brass">{String(i + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ),
          )}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
