import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  getConsultation,
  stageIndex,
  isTerminal,
  CONSULTATION_STAGES,
  type Consultation,
} from "@/lib/consultations";
import { cancelConsultation } from "@/lib/consultationMessages";
import { imgUrl } from "@/lib/adminApi";
import ConsultationJourney from "@/components/livora/ConsultationJourney";
import ConsultationChat from "@/components/livora/ConsultationChat";
import { WHATSAPP_NUMBER } from "@/components/livora/WhatsAppButton";
import { ArrowLeft, MessageCircle, XCircle, Palette } from "lucide-react";

const NEXT_STEP_HINTS: Record<string, string> = {
  new_inquiry: "Your request is in queue to be reviewed by our team.",
  under_review: "Our team is reviewing your inquiry.",
  contacted: "A designer will reach out to you shortly.",
  meeting_scheduled: "Attend your scheduled discussion / meeting.",
  in_progress: "Discussion and proposal preparation.",
  dp_pending: "Send DP payment once the invoice arrives.",
  project_paid: "Waiting for the project agreement to be signed.",
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
  const terminal = isTerminal(c.status);
  const isCancelled = c.status === "cancelled";
  const isRejected = c.status === "rejected";
  const isClosed = isCancelled || isRejected || c.status === "completed";
  const thumbnail = c.attachments?.[0] ? imgUrl(c.attachments[0]) : null;

  const badgeClass = isCancelled
    ? "bg-red-50 text-red-600"
    : isRejected
    ? "bg-amber-50 text-amber-700"
    : c.status === "completed"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-white/90 text-foreground";

  const nextStages = terminal ? [] : CONSULTATION_STAGES.slice(Math.max(currentIdx, 0) + (currentIdx < 0 ? 0 : 1), Math.max(currentIdx, 0) + 3);
  const currentStage = currentIdx >= 0 ? CONSULTATION_STAGES[currentIdx] : null;

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
    <div className="min-h-screen bg-background p-4 md:p-10">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/profile/consultations"))}
          className="mb-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to My Consultation
        </button>

        <div className="relative rounded-xl overflow-hidden h-48 md:h-56 bg-secondary mb-6">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#C9974A]/25 to-secondary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/75 mb-1">Consultation</p>
                <h1 className="serif text-2xl md:text-3xl text-white">
                  {c.service_type ?? "Design"} #LV-{new Date(c.created_at).getFullYear()}-{String(c.id).padStart(3, "0")}
                </h1>
              </div>
              <span className={`shrink-0 text-xs px-3 py-1.5 rounded-full uppercase tracking-wider ${badgeClass}`}>
                {c.status_label ?? c.status}
              </span>
            </div>
            <p className="text-xs text-white/80">
              Created {new Date(c.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              {" · "}Last Updated {new Date(c.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {!isClosed && !isCancelled && !isRejected && (
          <div className="mb-8 -mx-1 overflow-x-auto no-scrollbar">
            <div className="flex items-start min-w-max px-1 py-1">
              {CONSULTATION_STAGES.map((stage, i) => {
                const done = currentIdx >= 0 && (i < currentIdx || (terminal && i === currentIdx));
                const current = !terminal && i === currentIdx;
                return (
                  <div key={stage.key} className="flex items-start">
                    <div className="flex flex-col items-center w-24 text-center">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0"
                        style={
                          done
                            ? { backgroundColor: "#C9974A", color: "white" }
                            : current
                            ? { border: "2px solid #C9974A", color: "#C9974A" }
                            : { backgroundColor: "var(--secondary)", color: "var(--muted-foreground)" }
                        }
                      >
                        {done ? "✓" : i + 1}
                      </span>
                      <p className={`mt-1.5 text-[10px] leading-tight ${current ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {stage.label}
                      </p>
                    </div>
                    {i < CONSULTATION_STAGES.length - 1 && (
                      <div
                        className="w-8 md:w-10 h-px mt-4 shrink-0"
                        style={{ backgroundColor: i < currentIdx ? "#C9974A" : "var(--border)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6 min-w-0">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="serif text-xl mb-4">Consultation Details</h2>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Row label="Customer Name" value={`${c.first_name} ${c.last_name ?? ""}`.trim()} />
                <Row label="Project Type" value={c.project_type} />
                <Row label="Email" value={c.email} />
                <Row label="Phone" value={c.phone} />
                <Row label="Location" value={c.location} />
                <Row label="Estimated Area" value={c.estimated_area} />
                <Row label="Meeting Type" value={c.consultation_type} />
                <Row label="Contact Method" value={c.contact_method} />
              </div>
              {c.preferred_style && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {c.preferred_style.split(",").map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider bg-secondary text-foreground px-2.5 py-1 rounded-full">
                      <Palette size={11} /> {s.trim()}
                    </span>
                  ))}
                </div>
              )}
              {c.message && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-1">Message</p>
                  <p className="text-sm whitespace-pre-wrap">{c.message}</p>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="serif text-xl mb-4">Consultation Timeline</h2>
              <ConsultationJourney consultation={c} onChanged={setDetail} role="user" />
            </div>

            <div id="notes" className="bg-card border border-border rounded-lg p-6">
              <h2 className="serif text-xl mb-4">Consultation Notes</h2>
              <ConsultationChat consultationId={c.id} mode="user" locked={isClosed} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-2">Current Status</p>
              <span className={`inline-block text-xs px-3 py-1.5 rounded-full uppercase tracking-wider mb-3 ${badgeClass}`}>
                {c.status_label ?? c.status}
              </span>
              <p className="text-sm text-muted-foreground">
                {isCancelled
                  ? "This consultation was cancelled."
                  : isRejected
                  ? c.rejection_reason || "This inquiry was declined."
                  : c.status === "completed"
                  ? "This project has been completed."
                  : currentStage
                  ? NEXT_STEP_HINTS[currentStage.key] ?? "Our team is discussing your needs and preparing the proposal."
                  : "Our team is discussing your needs and preparing the proposal."}
              </p>
            </div>

            {nextStages.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-3">Next Steps</p>
                <ul className="space-y-3">
                  {nextStages.map((s) => (
                    <li key={s.key} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{NEXT_STEP_HINTS[s.key]}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-card border border-border rounded-lg p-5 space-y-2.5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-1">Quick Actions</p>
              
              <a
                href="#notes"
                className="w-full inline-flex items-center justify-center gap-2 rounded bg-foreground text-background px-4 py-2.5 text-xs uppercase tracking-[0.2em]"
              >
                <MessageCircle size={14} /> Send Message
              </a>
              
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded border border-border px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-secondary/60"
              >
                Contact Us on WhatsApp
              </a>
              
              {!isClosed && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-red-600 hover:underline disabled:opacity-60 pt-1"
                >
                  <XCircle size={13} /> {cancelling ? "Cancelling…" : "Cancel Request"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-1.5">
      <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground shrink-0">{label}</span>
      <span className="text-right truncate">{value}</span>
    </div>
  );
}