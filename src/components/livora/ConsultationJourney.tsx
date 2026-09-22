import { useState } from "react";
import { Check, Clock, Lock, ChevronDown, XCircle } from "lucide-react";
import {
  CONSULTATION_PHASES,
  stageIndex,
  phaseIndexForStatus,
  stagesForPhase,
  isTerminal,
  type Consultation,
} from "@/lib/consultations";
import { StageContent } from "./ConsultationStageSheet";

type Props = {
  consultation: Consultation;
  onChanged?: (c: Consultation) => void;
  role?: "user" | "admin";
};

type PhaseState = "done" | "current" | "upcoming" | "blocked";
type MicroState = "done" | "current" | "upcoming" | "blocked";

const GOLD = "#C9974A";

function getPhaseState(phaseIdx: number, currentPhaseIdx: number, terminal: boolean, rejected: boolean): PhaseState {
  if (currentPhaseIdx < 0) return "upcoming";
  if (phaseIdx < currentPhaseIdx) return "done";
  if (phaseIdx === currentPhaseIdx) return terminal ? (rejected ? "blocked" : "done") : "current";
  return terminal ? "blocked" : "upcoming";
}

function getMicroState(absIdx: number, currentIdx: number, terminal: boolean, rejected: boolean): MicroState {
  if (currentIdx < 0) return "upcoming";
  if (absIdx < currentIdx) return "done";
  if (absIdx === currentIdx) return terminal ? (rejected ? "blocked" : "done") : "current";
  return terminal ? "blocked" : "upcoming";
}

/**
 * "Your Journey" — 10 stage granular dikelompokkan jadi 5 fase (Inquiry, Diskusi,
 * Agreement, Payment, Project) supaya halaman tidak perlu menampilkan 6-7 panel
 * penuh sekaligus ketika posisi customer sudah jauh.
 *
 * Aturan tampilan:
 * - Fase yang sudah SELESAI / rejected-terhenti-di-sana → diciutkan jadi 1 baris
 *   ringkas (default collapsed), user klik untuk membuka daftar micro-stage di
 *   dalamnya.
 * - Fase yang SEDANG BERJALAN → selalu terbuka penuh (tidak ada tombol collapse),
 *   berisi seluruh micro-stage aslinya: yang sudah lewat tampil ringkas (klik utk
 *   detail), yang aktif tampil penuh dengan semua fitur asli (upload, tanda
 *   tangan, dst — tidak disederhanakan), yang belum sampai tampil terkunci tanpa
 *   isi.
 * - Fase yang BELUM dimulai → 1 baris abu-abu terkunci, tanpa isi sama sekali.
 *
 * Setiap micro-stage (di dalam fase manapun) yang statusnya "done"/"blocked"
 * dirender ringkas dan bisa di-klik sendiri untuk membuka detail lengkapnya
 * (StageContent yang sama persis dengan sebelumnya — histori & lampiran tetap ada).
 */
export default function ConsultationJourney({ consultation, onChanged, role = "user" }: Props) {
  const currentIdx = stageIndex(consultation.status);
  const currentPhaseIdx = phaseIndexForStatus(consultation.status);
  const cancelled = consultation.status === "cancelled";
  const rejected = consultation.status === "rejected";
  const terminal = isTerminal(consultation.status);

  const history = consultation.status_history || consultation.statusHistory || [];
  const timestampFor = (stageKey: string) =>
    history.find((h) => h.new_status === stageKey)?.created_at;

  // Fase done/blocked yang sedang dibuka user (default semua tertutup).
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({});
  const togglePhase = (key: string) => setOpenPhases((prev) => ({ ...prev, [key]: !prev[key] }));

  // Micro-stage individual (di fase manapun) yang sedang dibuka user.
  const [openStages, setOpenStages] = useState<Record<string, boolean>>({});
  const toggleStage = (key: string) => setOpenStages((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div>
      {(cancelled || rejected) && (
        <div
          className={`mb-6 rounded border p-4 text-xs flex items-start gap-2.5 ${
            cancelled ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <XCircle size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium uppercase tracking-[0.16em] mb-1">{cancelled ? "Cancelled" : "Rejected"}</p>
            <p className="leading-relaxed">{cancelled ? "This consultation was cancelled." : (consultation.rejection_reason || "This inquiry was declined.")}</p>
          </div>
        </div>
      )}

      <ol>
        {CONSULTATION_PHASES.map((phase, phaseIdx) => {
          const state = getPhaseState(phaseIdx, currentPhaseIdx, terminal, rejected);
          const isLastPhase = phaseIdx === CONSULTATION_PHASES.length - 1;
          const phaseStages = stagesForPhase(phaseIdx);
          const reached = phaseStages.filter((s) => s.absIndex <= Math.max(currentIdx, -1));
          const representative = reached.length ? reached[reached.length - 1] : phaseStages[0];
          const repTs = representative ? timestampFor(representative.stage.key) : undefined;
          const isOpen = state === "current" ? true : !!openPhases[phase.key];

          return (
            <li key={phase.key} className="flex gap-4">
              <div className="flex flex-col items-center shrink-0 w-7">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    state === "current"
                      ? "bg-card"
                      : state === "blocked"
                      ? "bg-secondary text-muted-foreground"
                      : state === "upcoming"
                      ? "border border-border text-muted-foreground"
                      : ""
                  }`}
                  style={
                    state === "done"
                      ? { backgroundColor: GOLD, color: "#fff" }
                      : state === "current"
                      ? { border: `1.5px solid ${GOLD}`, color: GOLD, boxShadow: "0 0 0 4px rgba(201,151,74,0.14)" }
                      : undefined
                  }
                >
                  {state === "done" ? (
                    <Check size={13} />
                  ) : state === "current" ? (
                    <Clock size={12} />
                  ) : (
                    <Lock size={11} />
                  )}
                </span>
                {!isLastPhase && (
                  <span
                    className={`flex-1 w-px my-1.5 ${state !== "done" ? "bg-border" : ""}`}
                    style={{ minHeight: 16, ...(state === "done" ? { backgroundColor: GOLD } : {}) }}
                  />
                )}
              </div>

              <div className={`flex-1 min-w-0 ${isLastPhase ? "pb-1" : "pb-6"}`}>
                {state === "upcoming" ? (
                  /* Fase yang belum dimulai — node terkunci, tanpa isi. */
                  <div className="flex items-center justify-between gap-3 rounded px-3.5 py-2.5 -mt-0.5">
                    <p className="text-[15px] leading-snug text-muted-foreground">{phase.label}</p>
                    <span className="text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border bg-secondary text-muted-foreground border-border">
                      Nanti
                    </span>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={state === "current" ? undefined : () => togglePhase(phase.key)}
                      disabled={state === "current"}
                      className={`w-full flex items-center justify-between gap-3 text-left rounded px-3.5 py-2.5 -mt-0.5 transition-colors ${
                        state === "current" ? "bg-[#C9974A]/[0.07] cursor-default" : "hover:bg-secondary/50"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-[15px] leading-snug font-medium text-foreground">{phase.label}</p>
                        {representative && (
                          <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                            {representative.stage.label}
                            {repTs && (
                              <span className="ml-1.5">
                                · {new Date(repTs).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`hidden sm:inline-flex text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border ${
                            state === "done"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : state === "current"
                              ? "text-[#8a6a30] border-[#C9974A]/35"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {state === "done" ? "Selesai" : state === "current" ? "Sedang Berjalan" : "Terhenti"}
                        </span>
                        {state !== "current" && (
                          <ChevronDown
                            size={15}
                            className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                          />
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="mt-3 px-3.5 space-y-3">
                        {phaseStages.map(({ stage, absIndex }) => {
                          const microState = getMicroState(absIndex, currentIdx, terminal, rejected);
                          const ts = timestampFor(stage.key);

                          if (microState === "upcoming") {
                            return (
                              <div
                                key={stage.key}
                                className="flex items-center gap-2.5 text-[13px] text-muted-foreground rounded border border-dashed border-border px-3 py-2"
                              >
                                <Lock size={12} className="shrink-0" />
                                {stage.label}
                              </div>
                            );
                          }

                          if (microState === "current") {
                            return (
                              <div
                                key={stage.key}
                                className="rounded border px-3.5 py-3"
                                style={{ borderColor: "rgba(201,151,74,0.4)", backgroundColor: "rgba(201,151,74,0.06)" }}
                              >
                                <p className="text-[11px] uppercase tracking-[0.18em] mb-2.5" style={{ color: GOLD }}>
                                  {stage.label} — sedang berjalan
                                </p>
                                <StageContent stage={stage.key} consultation={consultation} role={role} onChanged={onChanged} />
                              </div>
                            );
                          }

                          // done / blocked micro-stage — compact row, klik untuk buka detail.
                          const stageOpen = !!openStages[stage.key];
                          return (
                            <div key={stage.key}>
                              <button
                                type="button"
                                onClick={() => toggleStage(stage.key)}
                                className="w-full flex items-center justify-between gap-3 text-left rounded px-3 py-2 text-[13px] hover:bg-secondary/50 transition-colors"
                              >
                                <span className="flex items-center gap-2.5 min-w-0">
                                  {microState === "blocked" ? (
                                    <Lock size={12} className="text-muted-foreground shrink-0" />
                                  ) : (
                                    <Check size={12} className="shrink-0" style={{ color: GOLD }} />
                                  )}
                                  <span className="truncate text-foreground/90">{stage.label}</span>
                                  {ts && (
                                    <span className="text-[11px] text-muted-foreground shrink-0">
                                      · {new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                    </span>
                                  )}
                                </span>
                                <ChevronDown
                                  size={13}
                                  className={`text-muted-foreground shrink-0 transition-transform duration-200 ${stageOpen ? "rotate-180" : ""}`}
                                />
                              </button>
                              {stageOpen && (
                                <div className="mt-2 pl-3 pb-1 border-l border-border ml-2.5">
                                  <StageContent stage={stage.key} consultation={consultation} role={role} onChanged={onChanged} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}