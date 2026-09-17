import { useState } from "react";
import { Check, Clock, Lock, ChevronDown, XCircle } from "lucide-react";
import {
  CONSULTATION_STAGES,
  stageIndex,
  isTerminal,
  type Consultation,
} from "@/lib/consultations";
import { StageContent } from "./ConsultationStageSheet";

type Props = {
  consultation: Consultation;
  onChanged?: (c: Consultation) => void;
  role?: "user" | "admin";
};

type StageState = "done" | "current" | "upcoming" | "blocked";

function getState(i: number, currentIdx: number, terminal: boolean, rejected: boolean): StageState {
  if (currentIdx < 0) return "upcoming";
  if (i < currentIdx) return "done";
  if (i === currentIdx) return terminal ? (rejected ? "blocked" : "done") : "current";
  return terminal ? "blocked" : "upcoming";
}

/**
 * Timeline yang selalu terbuka — isi setiap stage langsung dijabarkan di halaman
 * (tidak ada lagi pola "klik baris, panel muncul dari kanan"). Tiap baris tetap
 * bisa di-collapse manual biar rapi, tapi TIDAK ADA yang default tersembunyi
 * kecuali stage yang memang belum sampai (belum ada apa-apa untuk ditindaklanjuti).
 */
export default function ConsultationJourney({ consultation, onChanged, role = "user" }: Props) {
  const currentIdx = stageIndex(consultation.status);
  const cancelled = consultation.status === "cancelled";
  const rejected = consultation.status === "rejected";
  const terminal = isTerminal(consultation.status);

  const history = consultation.status_history || consultation.statusHistory || [];
  const timestampFor = (stageKey: string) =>
    history.find((h) => h.new_status === stageKey)?.created_at;

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    CONSULTATION_STAGES.forEach((stage, i) => {
      const state = getState(i, currentIdx, terminal, rejected);
      initial[stage.key] = state === "upcoming";
    });
    return initial;
  });

  const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div>
      {(cancelled || rejected) && (
        <div
          className={`mb-5 rounded-lg border p-3 text-xs flex items-start gap-2 ${
            cancelled ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <XCircle size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium uppercase tracking-wider mb-0.5">{cancelled ? "Cancelled" : "Rejected"}</p>
            <p>{cancelled ? "This consultation was cancelled." : (consultation.rejection_reason || "This inquiry was declined.")}</p>
          </div>
        </div>
      )}

      <ol className="relative border-l border-border ml-3 space-y-2">
        {CONSULTATION_STAGES.map((stage, i) => {
          const state = getState(i, currentIdx, terminal, rejected);
          const ts = timestampFor(stage.key);
          const isOpen = !collapsed[stage.key];

          const label =
            state === "done" ? "Completed" : state === "current" ? "In Progress" : state === "blocked" ? "Blocked" : "Upcoming";
          const pillCls =
            state === "done"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : state === "current"
              ? "bg-foreground/5 text-foreground border-foreground/20"
              : "bg-secondary text-muted-foreground border-border";

          return (
            <li key={stage.key} className="pl-7 relative pb-3">
              <span
                className="absolute -left-[13px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 border-background z-10"
                style={
                  state === "done"
                    ? { backgroundColor: "#C9974A", color: "white" }
                    : state === "current"
                    ? { backgroundColor: "white", color: "#C9974A", border: "2px solid #C9974A" }
                    : undefined
                }
              >
                {state === "done" ? (
                  <Check size={12} />
                ) : state === "current" ? (
                  <Clock size={12} />
                ) : state === "blocked" ? (
                  <Lock size={10} className="text-muted-foreground" />
                ) : (
                  <span className="text-muted-foreground">{i + 1}</span>
                )}
              </span>

              <button
                type="button"
                onClick={() => toggle(stage.key)}
                className={`w-full flex items-center justify-between gap-3 text-left rounded-md px-3 py-2 transition-colors ${
                  state === "current" ? "bg-foreground/5" : "hover:bg-secondary/50"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Stage {i + 1}</p>
                  <p className={`text-sm ${state === "upcoming" ? "text-muted-foreground" : "font-medium"}`}>
                    {stage.label}
                  </p>
                  {ts && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`hidden sm:inline-flex text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${pillCls}`}>
                    {label}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="mt-2 ml-1 pl-3 border-l-2 border-border/70">
                  <StageContent stage={stage.key} consultation={consultation} role={role} onChanged={onChanged} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}