import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Check, Circle, Lock, XCircle, Clock } from "lucide-react";
import {
  CONSULTATION_STAGES,
  stageIndex,
  isTerminal,
  type Consultation,
} from "@/lib/consultations";
import ConsultationStageSheet from "./ConsultationStageSheet";

type Props = {
  consultation: Consultation;
  onChanged?: (c: Consultation) => void;
  role?: "user" | "admin";
};

export default function ConsultationTimeline({ consultation, onChanged, role = "user" }: Props) {
  const [openStage, setOpenStage] = useState<string | null>(null);
  const currentIdx = stageIndex(consultation.status);
  const cancelled = consultation.status === "cancelled";
  const rejected = consultation.status === "rejected";
  const completed = consultation.status === "completed";
  const terminal = isTerminal(consultation.status);

  // Compact mode after completion: single accordion revealing full journey.
  const [expanded, setExpanded] = useState(!completed);

  return (
    <div>
      {(cancelled || rejected) && (
        <div className={`mb-4 rounded-lg border p-3 text-xs flex items-start gap-2 ${
          cancelled ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          <XCircle size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium uppercase tracking-wider mb-0.5">
              {cancelled ? "Cancelled" : "Rejected"}
            </p>
            <p>{cancelled ? "This consultation was cancelled." : (consultation.rejection_reason || "This inquiry was declined.")}</p>
          </div>
        </div>
      )}

      {completed && !expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-left hover:bg-emerald-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <Check size={16} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">Journey Completed</p>
              <p className="text-sm text-emerald-900">Tap to view every stage from inquiry to completion</p>
            </div>
          </div>
          <span className="text-xs text-emerald-700">Expand</span>
        </button>
      ) : (
        <>
          {/* Desktop vertical timeline */}
          <ol className="hidden md:block relative border-l border-border ml-3 space-y-3">
            {CONSULTATION_STAGES.map((stage, i) => {
              const state = getState(i, currentIdx, terminal, rejected);
              return (
                <li key={stage.key} className="pl-6 relative">
                  <StageDot state={state} index={i} />
                  <button
                    onClick={() => setOpenStage(stage.key)}
                    className={`text-left w-full group -my-1 py-2 px-3 rounded-md transition-colors ${
                      state === "current"
                        ? "bg-foreground/5 border border-foreground/20"
                        : "hover:bg-secondary/60"
                    }`}
                  >
                    <p className={`text-[11px] uppercase tracking-[0.24em] ${
                      state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                    }`}>
                      Stage {i + 1}
                    </p>
                    <p className={`text-sm ${state === "upcoming" ? "text-muted-foreground" : "font-medium"}`}>
                      {stage.label}
                    </p>
                    {stage.key === "project_running" && state !== "upcoming" && (
                      <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-foreground transition-all"
                          style={{ width: `${consultation.project_progress ?? 0}%` }}
                        />
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Mobile horizontal scroll pills */}
          <div className="md:hidden -mx-6 px-6 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 pb-2">
              {CONSULTATION_STAGES.map((stage, i) => {
                const state = getState(i, currentIdx, terminal, rejected);
                return (
                  <button
                    key={stage.key}
                    onClick={() => setOpenStage(stage.key)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-[11px] flex items-center gap-1.5 transition-colors ${
                      state === "done"
                        ? "bg-foreground text-background border-foreground"
                        : state === "current"
                        ? "bg-foreground/5 border-foreground text-foreground"
                        : state === "blocked"
                        ? "bg-secondary text-muted-foreground border-border"
                        : "bg-background text-muted-foreground border-border"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-background/40 text-[10px] flex items-center justify-center">
                      {state === "done" ? <Check size={10} /> : i + 1}
                    </span>
                    {stage.label}
                  </button>
                );
              })}
            </div>
          </div>

          {completed && (
            <button
              onClick={() => setExpanded(false)}
              className="mt-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              Collapse
            </button>
          )}
        </>
      )}

      <Sheet open={openStage !== null} onOpenChange={(o) => !o && setOpenStage(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {openStage && (
            <>
              <SheetHeader>
                <SheetTitle className="serif text-2xl">
                  {CONSULTATION_STAGES.find((s) => s.key === openStage)?.label}
                </SheetTitle>
                <SheetDescription>
                  Stage {CONSULTATION_STAGES.findIndex((s) => s.key === openStage) + 1} of {CONSULTATION_STAGES.length}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <ConsultationStageSheet
                  stage={openStage}
                  consultation={consultation}
                  role={role}
                  onChanged={(c) => {
                    onChanged?.(c);
                  }}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

type StageState = "done" | "current" | "upcoming" | "blocked";

function getState(i: number, currentIdx: number, terminal: boolean, rejected: boolean): StageState {
  if (currentIdx < 0) return "upcoming";
  if (i < currentIdx) return "done";
  if (i === currentIdx) return terminal ? (rejected ? "blocked" : "done") : "current";
  return terminal ? "blocked" : "upcoming";
}

function StageDot({ state, index }: { state: StageState; index: number }) {
  const base = "absolute -left-[13px] top-3 w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 border-background";
  if (state === "done") return <span className={`${base} bg-foreground text-background`}><Check size={12} /></span>;
  if (state === "current") return <span className={`${base} bg-background text-foreground border-foreground`}><Clock size={12} /></span>;
  if (state === "blocked") return <span className={`${base} bg-secondary text-muted-foreground`}><Lock size={10} /></span>;
  return <span className={`${base} bg-secondary text-muted-foreground`}>{index + 1}</span>;
}
