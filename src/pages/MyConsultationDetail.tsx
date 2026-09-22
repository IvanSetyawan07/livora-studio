import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  getConsultation,
  stageIndex,
  phaseIndexForStatus,
  CONSULTATION_STAGES,
  CONSULTATION_PHASES,
  type Consultation,
} from "@/lib/consultations";
import { cancelConsultation } from "@/lib/consultationMessages";
import { imgUrl } from "@/lib/adminApi";
import ConsultationJourney from "@/components/livora/ConsultationJourney";
import ConsultationChatCard from "@/components/livora/ConsultationChatCard";
import { WHATSAPP_NUMBER } from "@/components/livora/WhatsAppButton";
import { ArrowLeft, XCircle, Palette, Check } from "lucide-react";

const GOLD = "#C9974A";

const NEXT_STEP_HINTS: Record<string, string> = {
  new_inquiry: "Your request is in queue to be reviewed by our team.",
  under_review: "Our team is reviewing your inquiry.",
  contacted: "A designer will reach out to you shortly.",
  meeting_scheduled: "Attend your scheduled discussion / meeting.",
  in_progress: "Discussion and proposal preparation.",
  agreement_pending: "Review and sign the project agreement.",
  dp_pending: "Send DP payment once the invoice arrives.",
  project_paid: "DP verified — your project is being prepared.",
  project_running: "Your project is being worked on.",
  completed: "Nothing further — your project is complete.",
};

export default function MyConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    getConsultation(Number(id))
      .then(setDetail)
      .catch(() => toast.error("Gagal memuat consultation."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  if (loading) {
    return <div className="min-h-screen bg-background p-10 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!detail) {
    return (
      <div className="min-h-screen bg-background p-10">
        <p className="text-sm text-muted-foreground mb-4">Consultation not found.</p>
        <button onClick={() => navigate("/profile/consultations")} className="text-xs uppercase tracking-[0.2em] underline">
          ← Back to My Consultation
        </button>
      </div>
    );
  }

  const c = detail;
  const currentIdx = stageIndex(c.status);
  const currentPhaseIdx = phaseIndexForStatus(c.status);
  const isCancelled = c.status === "cancelled";
  const isRejected = c.status === "rejected";
  const isCompleted = c.status === "completed";
  const isClosed = isCancelled || isRejected || isCompleted;
  const thumbnail = c.attachments?.[0] ? imgUrl(c.attachments[0]) : null;

  const currentStage = currentIdx >= 0 ? CONSULTATION_STAGES[currentIdx] : null;

  const statusDescription = isCancelled
    ? "This consultation was cancelled."
    : isRejected
    ? c.rejection_reason || "This inquiry was declined."
    : isCompleted
    ? "This project has been completed."
    : currentStage
    ? NEXT_STEP_HINTS[currentStage.key] ?? "Our team is discussing your needs and preparing the proposal."
    : "Our team is discussing your needs and preparing the proposal.";

  const handleCancel = async () => {
    const reason = window.prompt("Batalkan permintaan konsultasi ini?\n\nOpsional — tulis alasan singkat:", "");
    if (reason === null) return;
    setCancelling(true);
    try {
      await cancelConsultation(c.id, reason.trim() || undefined);
      toast.success("Consultation dibatalkan.");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal membatalkan.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-5 py-8 md:px-10 md:py-14">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/profile/consultations"))}
          className="mb-8 md:mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to My Consultation
        </button>

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="pb-8 md:pb-10 border-b border-border/70">
          {thumbnail && (
            <div className="mb-7 md:mb-9 h-40 md:h-56 rounded-sm overflow-hidden border border-border">
              <img src={thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2.5">Consultation</p>
              <h1 className="serif text-3xl md:text-[2.5rem] leading-[1.08] text-foreground">
                {c.service_type ?? "Design"} #LV-{new Date(c.created_at).getFullYear()}-{String(c.id).padStart(3, "0")}
              </h1>
              <p className="mt-3.5 text-xs text-muted-foreground">
                Created {new Date(c.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                <span className="mx-2 text-border">/</span>
                Last Updated {new Date(c.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <StatusPill
              label={c.status_label ?? c.status}
              isCancelled={isCancelled}
              isRejected={isRejected}
              isCompleted={isCompleted}
            />
          </div>
        </div>

        {/* ── Journey ──────────────────────────────────────────── */}
        {!isClosed && (
          <div className="pt-10 md:pt-14 pb-2">
            <JourneyStepper currentPhaseIdx={currentPhaseIdx} currentStage={currentStage} />
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-[1fr_336px] gap-8 lg:gap-14 mt-10 md:mt-14">
          <div className="space-y-10 md:space-y-14 min-w-0">
            <section>
              <h2 className="serif text-2xl mb-6">Consultation Details</h2>
              <div className="grid sm:grid-cols-2 gap-x-10">
                <Row label="Customer Name" value={`${c.first_name} ${c.last_name ?? ""}`.trim()} />
                <Row label="Project Type" value={c.project_type} />
                <Row label="Email" value={c.email} />
                <Row label="Phone" value={c.phone} />
                <Row label="Location" value={c.location} />
                <Row label="Estimated Area" value={c.estimated_area} />
                <Row label="Meeting Preference" value={c.consultation_type} />
                <Row label="Contact Method" value={c.contact_method} />
              </div>
              {c.preferred_style && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {c.preferred_style.split(",").map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] border px-3 py-1.5 rounded-full text-foreground/80"
                      style={{ borderColor: "rgba(201,151,74,0.35)", backgroundColor: "rgba(201,151,74,0.06)" }}
                    >
                      <Palette size={11} style={{ color: GOLD }} /> {s.trim()}
                    </span>
                  ))}
                </div>
              )}
              {c.message && (
                <div className="mt-6 pt-6 border-t border-border/70">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-2">Message</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.message}</p>
                </div>
              )}
            </section>

            <section>
              <h2 className="serif text-2xl mb-6">Consultation Timeline</h2>
              <ConsultationJourney consultation={c} onChanged={setDetail} role="user" />
            </section>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-sm p-6 md:p-7">
              <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground mb-3">Current Status</p>
              <StatusPill
                label={c.status_label ?? c.status}
                isCancelled={isCancelled}
                isRejected={isRejected}
                isCompleted={isCompleted}
              />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{statusDescription}</p>
            </div>

            {/* "Chat with Livora Design Team" harus selalu terlihat tanpa
                perlu scroll — makanya ditaruh di sini, bukan di kolom utama. */}
            <ConsultationChatCard
              consultationId={c.id}
              unreadCount={c.unread_messages_count ?? 0}
              locked={isClosed}
            />

            <div className="bg-card border border-border rounded-sm p-6 md:p-7">
              <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground mb-4">Quick Actions</p>
              <div className="space-y-2.5">
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-sm border border-border px-4 py-3 text-xs uppercase tracking-[0.2em] hover:bg-secondary/60 transition-colors"
                >
                  Contact Us on WhatsApp
                </a>

                {!isClosed && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-red-600 hover:underline disabled:opacity-60 pt-2"
                  >
                    <XCircle size={13} /> {cancelling ? "Cancelling…" : "Cancel Request"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  isCancelled,
  isRejected,
  isCompleted,
}: {
  label: string;
  isCancelled: boolean;
  isRejected: boolean;
  isCompleted: boolean;
}) {
  const cls = isCancelled
    ? "bg-red-50 text-red-700 border-red-200"
    : isRejected
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : isCompleted
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "text-foreground/90";
  const dot = isCancelled ? "#DC2626" : isRejected ? "#B45309" : isCompleted ? "#059669" : GOLD;
  const style = !isCancelled && !isRejected && !isCompleted
    ? { borderColor: "rgba(201,151,74,0.32)", backgroundColor: "rgba(201,151,74,0.07)" }
    : undefined;

  return (
    <span
      className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] uppercase tracking-[0.2em] ${cls}`}
      style={style}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
      {label}
    </span>
  );
}

function JourneyStepper({
  currentPhaseIdx,
  currentStage,
}: {
  currentPhaseIdx: number;
  currentStage: { key: string; label: string } | null;
}) {
  const total = CONSULTATION_PHASES.length;
  const hint = currentStage ? NEXT_STEP_HINTS[currentStage.key] : null;
  const pct = ((Math.max(currentPhaseIdx, 0) + 1) / total) * 100;
  const currentPhaseLabel = currentPhaseIdx >= 0 ? CONSULTATION_PHASES[currentPhaseIdx].label : null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7 md:mb-10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Your Journey</p>
          {currentPhaseLabel && (
            <>
              <h2 className="serif text-2xl md:text-[1.75rem] text-foreground leading-tight">
                {currentPhaseLabel}
                {currentStage && currentStage.label !== currentPhaseLabel && (
                  <span className="text-muted-foreground"> — {currentStage.label}</span>
                )}
              </h2>
              {hint && <p className="mt-1.5 text-sm text-muted-foreground max-w-md">{hint}</p>}
            </>
          )}
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground shrink-0">
          Phase {Math.max(currentPhaseIdx, 0) + 1} <span className="opacity-40">/</span> {total}
        </p>
      </div>

      {/* Desktop / tablet-landscape stepper — 5 fase, bukan 10 stage granular
          (yang granular tetap ada, dipindah ke daftar "Your Journey" di bawah). */}
      <div className="hidden lg:flex items-start">
        {CONSULTATION_PHASES.map((phase, i) => {
          const done = i < currentPhaseIdx;
          const current = i === currentPhaseIdx;
          const connectorDone = i < currentPhaseIdx;
          const isLastNode = i === total - 1;
          return (
            <div key={phase.key} className="flex items-start">
              <div className="flex flex-col items-center text-center w-[86px] xl:w-[104px]">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    !done && !current ? "border border-border text-muted-foreground" : ""
                  } ${current ? "bg-card" : ""}`}
                  style={
                    done
                      ? { backgroundColor: GOLD, color: "#fff" }
                      : current
                      ? { border: `1.5px solid ${GOLD}`, boxShadow: "0 0 0 5px rgba(201,151,74,0.13)" }
                      : undefined
                  }
                >
                  {done ? (
                    <Check size={14} />
                  ) : current ? (
                    <span className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: GOLD }} />
                  ) : (
                    <span className="text-[11px]">{i + 1}</span>
                  )}
                </span>
                <p
                  className={`mt-3 text-[10.5px] leading-[1.25] uppercase tracking-[0.05em] px-0.5 ${
                    current ? "text-foreground font-medium" : done ? "text-foreground/55" : "text-muted-foreground/55"
                  }`}
                >
                  {phase.label}
                </p>
              </div>
              {!isLastNode && (
                <div
                  className={`h-px mt-4 flex-1 min-w-[10px] xl:min-w-[16px] ${!connectorDone ? "bg-border" : ""}`}
                  style={connectorDone ? { backgroundColor: GOLD } : undefined}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Compact mobile / tablet-portrait progress */}
      <div className="lg:hidden">
        <div className="h-[3px] rounded-full bg-border overflow-hidden mb-3.5">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, backgroundColor: GOLD }}
          />
        </div>
        <div className="flex items-center justify-between">
          {CONSULTATION_PHASES.map((phase, i) => {
            const done = i < currentPhaseIdx;
            const current = i === currentPhaseIdx;
            return (
              <span
                key={phase.key}
                className={`rounded-full shrink-0 ${!done && !current ? "bg-border" : ""}`}
                style={
                  done || current
                    ? { width: current ? 8 : 6, height: current ? 8 : 6, backgroundColor: GOLD }
                    : { width: 5, height: 5 }
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-border/60 py-2.5">
      <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right truncate">{value}</span>
    </div>
  );
}