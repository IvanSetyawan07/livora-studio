import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Check, Clock, Lock, MessageCircle, Bell, ArrowLeft } from "lucide-react";
import {
  CONSULTATION_STAGES,
  stageIndex,
  isTerminal,
  type Consultation,
} from "@/lib/consultations";
import { imgUrl } from "@/lib/adminApi";
import ConsultationChat from "./ConsultationChat";
import ConsultationStageSheet from "./ConsultationStageSheet";

type View = "timeline" | "chat" | "activities" | "stage";

type Props = {
  consultation: Consultation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialView?: View;
  onChanged?: (c: Consultation) => void;
};

export default function ConsultationDetailSheet({ consultation, open, onOpenChange, initialView = "timeline", onChanged }: Props) {
  const [view, setView] = useState<View>(initialView);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  useEffect(() => {
    if (open) setView(initialView);
  }, [open, initialView]);

  if (!consultation) return null;
  const c = consultation;

  const currentIdx = stageIndex(c.status);
  const terminal = isTerminal(c.status);
  const rejected = c.status === "rejected";
  const cancelled = c.status === "cancelled";
  const totalStages = CONSULTATION_STAGES.length;
  const completedStages = terminal && !rejected && !cancelled ? totalStages : Math.max(currentIdx, 0);
  const pct = Math.round((completedStages / totalStages) * 100);

  const thumbnail = c.attachments?.[0] ? imgUrl(c.attachments[0]) : null;
  const activities = [...(c.activities ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const latestUpdate = activities[0];

  const history = c.status_history || c.statusHistory || [];
  const timestampFor = (stageKey: string) =>
    history.find((h) => h.new_status === stageKey)?.created_at;

  const isClosed = terminal || cancelled;

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setView("timeline"); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Hero */}
        <div className="relative h-40 w-full bg-secondary overflow-hidden">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#C9974A]/20 to-secondary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-3 left-4 right-12">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/80 mb-1">
              {c.service_type ?? "Design Consultation"}
            </p>
            <SheetTitle className="serif text-xl text-white">
              {c.project_type ?? "Consultation"} Request
            </SheetTitle>
            <span className="inline-block mt-1 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider bg-white/90 text-foreground">
              {c.status_label ?? c.status}
            </span>
          </div>
        </div>

        <div className="p-6">
          {view === "timeline" && (
            <>
              {/* Summary */}
              <div className="mb-6">
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Progress</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.min(completedStages, totalStages)} / {totalStages} Stages
                  </p>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <p className="serif text-3xl">{pct}%</p>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: "#C9974A" }}
                  />
                </div>
              </div>

              {(cancelled || rejected) && (
                <div className={`mb-5 rounded-lg border p-3 text-xs ${
                  cancelled ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-800"
                }`}>
                  <p className="font-medium uppercase tracking-wider mb-0.5">{cancelled ? "Cancelled" : "Rejected"}</p>
                  <p>{cancelled ? "This consultation was cancelled." : (c.rejection_reason || "This inquiry was declined.")}</p>
                </div>
              )}

              {latestUpdate && (
                <div className="mb-6 rounded-lg border border-border bg-secondary/30 p-3 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#C9974A]/15 text-[#C9974A] flex items-center justify-center shrink-0">
                    <Bell size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{latestUpdate.title}</p>
                    {latestUpdate.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{latestUpdate.body}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(latestUpdate.created_at).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              )}

              {/* Vertical 9-stage timeline */}
              <ol className="relative border-l border-border ml-3 space-y-4">
                {CONSULTATION_STAGES.map((stage, i) => {
                  const state: "done" | "current" | "upcoming" | "blocked" =
                    currentIdx < 0
                      ? "upcoming"
                      : i < currentIdx
                      ? "done"
                      : i === currentIdx
                      ? (terminal ? (rejected ? "blocked" : "done") : "current")
                      : (terminal ? "blocked" : "upcoming");
                  const ts = timestampFor(stage.key);
                  return (
                    <li key={stage.key} className="pl-6 relative">
                      <span
                        className="absolute -left-[13px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 border-background"
                        style={
                          state === "done"
                            ? { backgroundColor: "#C9974A", color: "white" }
                            : state === "current"
                            ? { backgroundColor: "white", color: "#C9974A", border: "2px solid #C9974A" }
                            : undefined
                        }
                      >
                        {state === "done" ? <Check size={12} /> : state === "current" ? <Clock size={12} /> : state === "blocked" ? <Lock size={10} className="text-muted-foreground" /> : <span className="text-muted-foreground">{i + 1}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setSelectedStage(stage.key); setView("stage"); }}
                        className="text-left w-full -my-1 py-1 rounded hover:bg-secondary/50 transition-colors"
                      >
                        <p className={`text-sm ${state === "upcoming" ? "text-muted-foreground" : "font-medium"}`}>
                          {stage.label}
                        </p>
                        {ts && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          {view === "activities" && (
            <>
              <button
                onClick={() => setView("timeline")}
                className="mb-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={13} /> Back
              </button>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No updates yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activities.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 border-b border-border/60 pb-3">
                      <div className="w-7 h-7 rounded-full bg-[#C9974A]/15 text-[#C9974A] flex items-center justify-center shrink-0">
                        <Bell size={13} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{a.title}</p>
                        {a.body && <p className="text-xs text-muted-foreground">{a.body}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(a.created_at).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {view === "stage" && selectedStage && (
            <>
              <button
                onClick={() => setView("timeline")}
                className="mb-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={13} /> Back
              </button>
              <ConsultationStageSheet
                stage={selectedStage}
                consultation={c}
                role="user"
                onChanged={onChanged}
              />
            </>
          )}

          {view === "chat" && (
            <>
              <button
                onClick={() => setView("timeline")}
                className="mb-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={13} /> Back
              </button>
              <ConsultationChat consultationId={c.id} mode="user" locked={isClosed} />
            </>
          )}

          {/* Bottom actions */}
          {view === "timeline" && (
            <div className="mt-6 pt-5 border-t border-border flex gap-3">
              <button
                onClick={() => setView("chat")}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded bg-foreground text-background px-4 py-2.5 text-xs uppercase tracking-[0.2em]"
              >
                <MessageCircle size={14} /> Contact Us
              </button>
              <button
                onClick={() => setView("activities")}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded border border-border px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-secondary/60"
              >
                <Bell size={14} /> View All Updates
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}