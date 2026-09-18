import React, { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Video,
  Phone,
  FileText,
  Upload,
  Check,
  Clock,
  Lock,
  Image as ImageIcon,
  MessageCircle,
  XCircle,
  Download,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import {
  type Consultation,
  type ConsultationStageFile,
  type ConsultationProgressUpdate,
  uploadDpProof,
  uploadFinalPaymentProof,
  commentOnProgress,
  signAgreementWithSignature,
  stageIndex,
  fileUrl,
  CONSULTATION_STAGES,
  isTerminal,
} from "@/lib/consultations";
import {
  approveProof,
  rejectProof,
  requestFinalPayment,
  adminCommentOnProgress,
  countersignAgreement,
} from "@/lib/adminConsultations";
import { WHATSAPP_NUMBER } from "./WhatsAppButton";

type Props = {
  stage: string;
  consultation: Consultation;
  role: "user" | "admin";
  onChanged?: (c: Consultation) => void;
};

export default function ConsultationStageSheet({ stage, consultation, role, onChanged }: Props) {
  return (
    <div className="space-y-6">
      <ConsultationMiniTimeline consultation={consultation} />
      <StageContent stage={stage} consultation={consultation} role={role} onChanged={onChanged} />
    </div>
  );
}

/** Status pill + panel + history + attachments untuk SATU stage — tanpa mini timeline.
 * Diekspor supaya bisa dirender inline, selalu terbuka, tanpa klik / tanpa sheet
 * (dipakai oleh ConsultationJourney). */
export function StageContent({ stage, consultation, role, onChanged }: Props) {
  const files = (consultation.stage_files || consultation.stageFiles || []).filter((f) => f.stage === stage);
  const history = (consultation.status_history || consultation.statusHistory || []).filter(
    (h) => h.new_status === stage || h.previous_status === stage,
  );
  const idx = stageIndex(stage);
  const currentIdx = stageIndex(consultation.status);
  const isPast = currentIdx > idx;
  const isCurrent = currentIdx === idx;

  return (
    <div className="space-y-4">
      <StatusBadge stage={stage} isPast={isPast} isCurrent={isCurrent} />

      {stage === "new_inquiry" && <InquiryPanel consultation={consultation} />}
      {stage === "under_review" && <ReviewPanel consultation={consultation} />}
      {stage === "contacted" && <ContactedPanel />}
      {stage === "meeting_scheduled" && <MeetingPanel consultation={consultation} />}
      {stage === "in_progress" && <InProgressPanel />}
      {stage === "agreement_pending" && (
        <AgreementPanel consultation={consultation} role={role} files={files} onChanged={onChanged} />
      )}
      {(stage === "dp_pending" || stage === "project_paid") && (
        <PaymentPanel consultation={consultation} role={role} kind="dp" files={files} onChanged={onChanged} />
      )}
      {stage === "project_running" && (
        <ProgressPanel consultation={consultation} role={role} files={files} onChanged={onChanged} />
      )}
      {stage === "completed" && <CompletedPanel consultation={consultation} />}

      {history.length > 0 && (
        <div className="border-t border-border pt-4">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-2">History</p>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="text-xs text-muted-foreground border-l-2 border-border pl-3">
                <span className="block text-foreground/80">
                  {h.note || `${h.previous_status ?? "—"} → ${h.new_status}`}
                </span>
                <span>
                  {new Date(h.created_at).toLocaleString("id-ID")}
                  {h.changed_by_user?.name ? ` · ${h.changed_by_user.name}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {files.length > 0 && (
        <div className="border-t border-border pt-4">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-2">Attachments</p>
          <FileList files={files} />
        </div>
      )}
    </div>
  );
}

/* ── Sub-panels ─────────────────────────────────────────────────── */

function ConsultationMiniTimeline({ consultation: c }: { consultation: Consultation }) {
  const currentIdx = stageIndex(c.status);
  const terminal = isTerminal(c.status);
  const rejected = c.status === "rejected";
  const cancelled = c.status === "cancelled";
  const totalStages = CONSULTATION_STAGES.length;
  const completedStages = terminal && !rejected && !cancelled ? totalStages : Math.max(currentIdx, 0);
  const pct = Math.round((completedStages / totalStages) * 100);

  const history = c.status_history || c.statusHistory || [];
  const timestampFor = (stageKey: string) =>
    history.find((h) => h.new_status === stageKey)?.created_at;

  return (
    <div>
      {/* Progress summary */}
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

      {/* Vertical stage timeline */}
      <ol className="relative border-l border-border ml-3 space-y-4 mb-2">
        {CONSULTATION_STAGES.map((stg, i) => {
          const state: "done" | "current" | "upcoming" | "blocked" =
            currentIdx < 0
              ? "upcoming"
              : i < currentIdx
              ? "done"
              : i === currentIdx
              ? (terminal ? (rejected ? "blocked" : "done") : "current")
              : (terminal ? "blocked" : "upcoming");
          const ts = timestampFor(stg.key);
          return (
            <li key={stg.key} className="pl-6 relative">
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
              <p className={`text-sm ${state === "upcoming" ? "text-muted-foreground" : "font-medium"}`}>
                {stg.label}
              </p>
              {ts && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StatusBadge({ stage, isPast, isCurrent }: { stage: string; isPast: boolean; isCurrent: boolean }) {
  const label = isPast ? "Completed" : isCurrent ? "In progress" : "Upcoming";
  const cls = isPast
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isCurrent
    ? "bg-foreground/5 text-foreground border-foreground/20"
    : "bg-secondary text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] px-2.5 py-1 rounded-full border ${cls}`}>
      {isPast && <Check size={11} />} {label}
    </span>
  );
}

function InquiryPanel({ consultation }: { consultation: Consultation }) {
  return (
    <div className="space-y-3 text-sm">
      <Row label="Requested" value={new Date(consultation.created_at).toLocaleString("id-ID")} />
      <Row label="Service" value={consultation.service_type} />
      <Row label="Project" value={consultation.project_type} />
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-1">Message</p>
        <p className="whitespace-pre-wrap text-sm">{consultation.message}</p>
      </div>
    </div>
  );
}

function ReviewPanel({ consultation }: { consultation: Consultation }) {
  if (consultation.status === "rejected") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <p className="font-medium mb-1">Inquiry declined</p>
        <p>{consultation.rejection_reason || "Our team decided not to proceed."}</p>
      </div>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      Our design team is reviewing your inquiry. You'll be notified once it moves forward.
    </p>
  );
}

function ContactedPanel() {
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}`;
  return (
    <div className="text-sm space-y-3">
      <p className="text-muted-foreground">
        Our design team has reached out and the chat room is now open — see Consultation Notes below to
        keep talking with your designer, or reach us directly on WhatsApp.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded bg-foreground text-background px-4 py-2 text-xs uppercase tracking-[0.2em]"
        >
          <Phone size={14} /> Chat on WhatsApp
        </a>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MessageCircle size={13} /> Or scroll to Consultation Notes
        </span>
      </div>
    </div>
  );
}


function MeetingPanel({ consultation }: { consultation: Consultation }) {
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}`;
  const type = consultation.meeting_type;

  if (!consultation.meeting_date && !consultation.meeting_link && !type) {
    return <p className="text-sm text-muted-foreground">Meeting details will appear here once scheduled.</p>;
  }
  return (
    <div className="space-y-2 text-sm">
      {consultation.meeting_date && (
        <div className="flex items-center gap-2"><Calendar size={14} />
          {new Date(consultation.meeting_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          {consultation.meeting_time ? ` · ${consultation.meeting_time}` : ""}
        </div>
      )}
      {consultation.meeting_location && (
        <div className="flex items-center gap-2"><MapPin size={14} /> {consultation.meeting_location}</div>
      )}

      {type === "call" ? (
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded bg-foreground text-background px-3 py-2 text-xs uppercase tracking-[0.2em]"
        >
          <Phone size={14} /> Call on WhatsApp
        </a>
      ) : type === "offline" ? (
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded bg-foreground text-background px-3 py-2 text-xs uppercase tracking-[0.2em]"
        >
          <Phone size={14} /> Contact Us on WhatsApp
        </a>
      ) : consultation.meeting_link ? (
        <a
          href={consultation.meeting_link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded bg-foreground text-background px-3 py-2 text-xs uppercase tracking-[0.2em]"
        >
          <Video size={14} /> Join Meeting
        </a>
      ) : null}
    </div>
  );
}

function InProgressPanel() {
  return (
    <p className="text-sm text-muted-foreground">
      Your consultation is being conducted. No action needed — feel free to chat with your designer any time.
    </p>
  );
}

/** Reusable DP / Final-payment panel — covers: not requested, requested/unpaid,
 * proof uploaded/pending, verified, rejected. Shared by both stages & both roles. */
function PaymentPanel({
  consultation, role, kind, files, onChanged,
}: {
  consultation: Consultation;
  role: "user" | "admin";
  kind: "dp" | "final";
  files: ConsultationStageFile[];
  onChanged?: (c: Consultation) => void;
}) {
  const isDp = kind === "dp";
  const amount = isDp ? consultation.dp_amount : consultation.final_payment_amount;
  const requested = isDp ? !!consultation.dp_amount : !!consultation.final_payment_requested_at;
  const paidAt = isDp ? consultation.dp_paid_at : consultation.final_payment_paid_at;
  const paid = !!paidAt;
  const invoice = files.find((f) => f.kind === (isDp ? "invoice" : "final_invoice"));
  const proof = [...files]
    .filter((f) => f.kind === (isDp ? "payment_proof" : "final_payment_proof"))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const rejected = proof?.review_status === "rejected";

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  // Admin-only: form to request the final payment once progress has reached 85%.
  const [finalAmount, setFinalAmount] = useState(
    consultation.final_payment_amount ? String(consultation.final_payment_amount) : "",
  );
  const [finalNote, setFinalNote] = useState("");
  const finalInvoiceRef = useRef<HTMLInputElement>(null);
  const [requesting, setRequesting] = useState(false);
  const progress = consultation.project_progress ?? 0;

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const updated = isDp
        ? await uploadDpProof(consultation.id, file)
        : await uploadFinalPaymentProof(consultation.id, file);
      onChanged?.(updated);
      toast.success("Bukti pembayaran terkirim.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal mengunggah bukti.");
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async () => {
    if (!proof) return;
    setReviewing(true);
    try {
      const updated = await approveProof(consultation.id, proof.id);
      onChanged?.(updated);
      toast.success("Pembayaran diverifikasi.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal memverifikasi pembayaran.");
    } finally {
      setReviewing(false);
    }
  };

  const handleReject = async () => {
    if (!proof) return;
    const reason = window.prompt("Alasan penolakan bukti pembayaran:");
    if (!reason) return;
    setReviewing(true);
    try {
      const updated = await rejectProof(consultation.id, proof.id, reason);
      onChanged?.(updated);
      toast.success("Bukti pembayaran ditolak.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menolak bukti.");
    } finally {
      setReviewing(false);
    }
  };

  const handleRequestFinal = async () => {
    if (!finalAmount) return;
    setRequesting(true);
    try {
      const updated = await requestFinalPayment(
        consultation.id,
        Number(finalAmount),
        finalNote || undefined,
        finalInvoiceRef.current?.files?.[0],
      );
      onChanged?.(updated);
      toast.success("Final payment diminta.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal meminta final payment.");
    } finally {
      setRequesting(false);
    }
  };

  // 1. Not requested yet.
  if (!requested) {
    if (!isDp && role === "admin") {
      return (
        <div className="space-y-2 text-sm">
          {progress < 85 ? (
            <p className="text-xs text-muted-foreground">
              Reach 85% project progress before requesting the final payment ({progress}% so far).
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Request Final Payment</p>
              <input type="number" placeholder="Amount (IDR)" value={finalAmount}
                onChange={(e) => setFinalAmount(e.target.value)}
                className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
              <textarea rows={2} placeholder="Note (optional)" value={finalNote}
                onChange={(e) => setFinalNote(e.target.value)}
                className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
              <input ref={finalInvoiceRef} type="file" className="text-xs" />
              <button
                disabled={!finalAmount || requesting}
                onClick={handleRequestFinal}
                className="w-full rounded bg-foreground text-background py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
              >
                {requesting ? "Sending…" : "Request Final Payment"}
              </button>
            </div>
          )}
        </div>
      );
    }
    return (
      <p className="text-sm text-muted-foreground">
        {isDp ? "DP has not been requested yet." : "Final payment has not been requested yet."}
      </p>
    );
  }

  // 2-5. Requested: unpaid / proof pending / verified / rejected.
  return (
    <div className="space-y-3 text-sm">
      {amount && (
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            {isDp ? "DP Amount" : "Final Payment Amount"}
          </p>
          <p className="serif text-xl">Rp {Number(amount).toLocaleString("id-ID")}</p>
        </div>
      )}

      {invoice && (
        <a href={fileUrl(invoice.file_path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] underline">
          <FileText size={14} /> Download Invoice
        </a>
      )}

      {paid ? (
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 text-xs">
          <Check size={12} /> Payment verified {new Date(paidAt!).toLocaleDateString("id-ID")}
        </div>
      ) : (
        <>
          {rejected && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-xs">
              <p className="font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <XCircle size={12} /> Proof Rejected
              </p>
              <p>{proof?.rejection_reason}</p>
            </div>
          )}
          {proof && !rejected && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 p-3 text-xs">
              Proof uploaded {new Date(proof.created_at).toLocaleDateString("id-ID")} — pending verification.
            </div>
          )}
          {!proof && (
            <p className="text-muted-foreground">Waiting for payment proof.</p>
          )}

          {role === "user" && (
            <>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded bg-foreground text-background px-4 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-60"
              >
                <Upload size={14} /> {uploading ? "Uploading…" : proof ? "Re-upload Proof" : "Upload Payment Proof"}
              </button>
            </>
          )}

          {role === "admin" && proof && (
            <div className="flex gap-2">
              <button onClick={handleApprove} disabled={reviewing}
                className="flex-1 rounded bg-emerald-600 text-white py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50">
                Approve
              </button>
              <button onClick={handleReject} disabled={reviewing}
                className="flex-1 rounded border border-red-300 text-red-600 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50">
                Reject
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Small canvas-based signature pad — shared by both the customer's
 * signing flow and the admin countersign flow. Mouse + touch supported. */
function SignatureCanvas({
  value,
  onChange,
  height = 160,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasDrawnRef = useRef(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const src = "touches" in e ? e.touches[0] || e.changedTouches[0] : e;
    if (!src) return null;
    return {
      x: ((src.clientX - rect.left) / rect.width) * canvas.width,
      y: ((src.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    drawingRef.current = true;
    lastPointRef.current = pos;
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const pos = getPos(e);
    if (!canvas || !ctx || !pos || !lastPointRef.current) return;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPointRef.current = pos;
    hasDrawnRef.current = true;
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas && hasDrawnRef.current) {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={500}
        height={height}
        className="w-full rounded border border-border bg-white touch-none cursor-crosshair"
        style={{ height }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          {value ? "Signature captured." : "Draw your signature above."}
        </p>
        <button
          type="button"
          onClick={clear}
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground underline"
        >
          Clear Signature
        </button>
      </div>
    </div>
  );
}

/** Status pill for the e-meterai (Indonesian stamp duty) lifecycle. */
function MeteraiStatus({ consultation }: { consultation: Consultation }) {
  const status = consultation.meterai_status;
  if (!status || status === "not_requested") return null;

  if (status === "completed") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 text-xs">
        <ShieldCheck size={12} /> e-Meterai completed
        {consultation.meterai_reference ? ` · ${consultation.meterai_reference}` : ""}
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-xs">
        <p className="font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <AlertTriangle size={12} /> e-Meterai failed
        </p>
        <p>{consultation.meterai_error || "Stamp duty could not be processed."}</p>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 text-xs">
      <Clock size={12} /> e-Meterai pending
    </div>
  );
}

function AgreementPanel({
  consultation, role, files, onChanged,
}: { consultation: Consultation; role: "user" | "admin"; files: ConsultationStageFile[]; onChanged?: (c: Consultation) => void }) {
  const agreement = files.find((f) => f.kind === "agreement");
  const signed = !!consultation.agreement_signed_at;
  const countersigned = !!consultation.livora_countersigned_at;
  const finalReady = signed && countersigned && !!consultation.final_agreement_path;

  const [name, setName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [adminSignatureData, setAdminSignatureData] = useState<string | null>(null);
  const [counterSaving, setCounterSaving] = useState(false);

  const handleSign = async () => {
    if (!name.trim() || !signatureData) return;
    setSaving(true);
    try {
      const updated = await signAgreementWithSignature(consultation.id, name.trim(), signatureData);
      onChanged?.(updated);
      toast.success("Terima kasih! Tanda tangan tercatat.");
    } catch {
      toast.error("Gagal menyimpan tanda tangan.");
    } finally {
      setSaving(false);
    }
  };

  const handleCountersign = async () => {
    if (!adminName.trim() || !adminSignatureData) return;
    setCounterSaving(true);
    try {
      const updated = await countersignAgreement(consultation.id, adminName.trim(), adminSignatureData);
      onChanged?.(updated);
      toast.success("Agreement countersigned.");
    } catch {
      toast.error("Failed to countersign the agreement.");
    } finally {
      setCounterSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Read-only viewer — no download affordance until fully executed. */}
      {agreement ? (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Agreement Document</p>
          <div className="rounded-lg border border-border overflow-hidden bg-secondary/30">
            <iframe
              src={fileUrl(agreement.file_path)}
              title="Project Agreement"
              className="w-full h-72"
            />
          </div>
          <a
            href={fileUrl(agreement.file_path)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] underline text-muted-foreground"
          >
            <FileText size={12} /> Open Agreement in New Tab
          </a>
          <p className="text-[11px] text-muted-foreground">
            View-only until the agreement is fully signed and countersigned.
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground">Waiting for the project agreement to be uploaded.</p>
      )}

      {/* Customer signature status / form */}
      {signed ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
          <p className="text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Check size={12} /> Signed by Customer
          </p>
          <p className="text-sm">
            <strong>{consultation.agreement_signature_name}</strong> · {new Date(consultation.agreement_signed_at!).toLocaleString("id-ID")}
          </p>
          {consultation.agreement_signature_path && (
            <img
              src={fileUrl(consultation.agreement_signature_path)}
              alt="Customer signature"
              className="mt-2 h-14 bg-white rounded border border-emerald-200 p-1"
            />
          )}
        </div>
      ) : role === "user" && agreement ? (
        <div className="space-y-3 border border-border rounded-lg p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sign this Agreement</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full legal name"
            className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
          />
          <SignatureCanvas value={signatureData} onChange={setSignatureData} />
          <button
            onClick={handleSign}
            disabled={saving || !name.trim() || !signatureData}
            className="w-full rounded bg-foreground text-background py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {saving ? "Signing…" : "Sign Agreement"}
          </button>
        </div>
      ) : role === "admin" ? (
        <p className="text-muted-foreground">Waiting for the customer to sign the agreement.</p>
      ) : null}

      {/* Livora countersignature status / form */}
      {signed && (
        countersigned ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
            <p className="text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Check size={12} /> Countersigned by Livora
            </p>
            <p className="text-sm">
              <strong>{consultation.livora_countersigner_name}</strong> · {new Date(consultation.livora_countersigned_at!).toLocaleString("id-ID")}
            </p>
            {consultation.livora_signature_path && (
              <img
                src={fileUrl(consultation.livora_signature_path)}
                alt="Livora signature"
                className="mt-2 h-14 bg-white rounded border border-emerald-200 p-1"
              />
            )}
          </div>
        ) : role === "admin" ? (
          <div className="space-y-3 border border-border rounded-lg p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Countersign as Livora</p>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Admin full name"
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
            />
            <SignatureCanvas value={adminSignatureData} onChange={setAdminSignatureData} />
            <button
              onClick={handleCountersign}
              disabled={counterSaving || !adminName.trim() || !adminSignatureData}
              className="w-full rounded bg-foreground text-background py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
            >
              {counterSaving ? "Countersigning…" : "Countersign Agreement"}
            </button>
          </div>
        ) : (
          <p className="text-muted-foreground">Waiting for Livora to countersign.</p>
        )
      )}

      {/* e-Meterai status — only relevant once the final document has been generated */}
      {consultation.final_agreement_path && <MeteraiStatus consultation={consultation} />}

      {/* Final download — only once the agreement is actually fully executed */}
      {finalReady && (
        <a
          href={fileUrl(consultation.final_agreement_path)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded bg-foreground text-background px-4 py-2 text-xs uppercase tracking-[0.2em]"
        >
          <Download size={14} /> Download Final Agreement
        </a>
      )}
    </div>
  );
}

function ProgressPanel({
  consultation, role, files, onChanged,
}: {
  consultation: Consultation;
  role: "user" | "admin";
  files: ConsultationStageFile[];
  onChanged?: (c: Consultation) => void;
}) {
  const updates = (consultation.progress_updates || consultation.progressUpdates || []) as ConsultationProgressUpdate[];
  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Overall progress</span>
          <span className="font-medium text-foreground">{consultation.project_progress ?? 0}%</span>
        </div>
        <div className="h-2 rounded-full bg-border overflow-hidden">
          <div className="h-full bg-foreground transition-all" style={{ width: `${consultation.project_progress ?? 0}%` }} />
        </div>
      </div>
      {updates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No progress updates yet.</p>
      ) : (
        <ol className="space-y-5">
          {updates.map((u) => (
            <li key={u.id} className="border-l-2 border-border pl-3">
              <p className="text-xs text-muted-foreground">
                {new Date(u.created_at).toLocaleString("id-ID")}{u.creator?.name ? ` · ${u.creator.name}` : ""}
              </p>
              <p className="text-sm font-medium">{u.percentage}%{u.note ? ` — ${u.note}` : ""}</p>
              {u.photos && u.photos.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {u.photos.map((p, idx) => (
  <a key={idx} href={fileUrl(p)} target="_blank" rel="noreferrer" className="block aspect-square bg-secondary rounded overflow-hidden">
    <img src={fileUrl(p)} alt="progress" className="w-full h-full object-cover" />
  </a>
))}
                </div>
              )}
              <ProgressComments
                consultationId={consultation.id}
                update={u}
                role={role}
                onChanged={onChanged}
              />
            </li>
          ))}
        </ol>
      )}

      <div className="border-t border-border pt-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-2">Final Payment</p>
        <PaymentPanel consultation={consultation} role={role} kind="final" files={files} onChanged={onChanged} />
      </div>
    </div>
  );
}

/** Small comment thread under a single progress update — existing comments + one reply box for the current role. */
function ProgressComments({
  consultationId, update, role, onChanged,
}: {
  consultationId: number;
  update: ConsultationProgressUpdate;
  role: "user" | "admin";
  onChanged?: (c: Consultation) => void;
}) {
  const comments = update.comments || [];
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      const updated = role === "admin"
        ? await adminCommentOnProgress(consultationId, update.id, text)
        : await commentOnProgress(consultationId, update.id, text);
      onChanged?.(updated);
      setBody("");
    } catch {
      toast.error("Gagal mengirim komentar.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {comments.length > 0 && (
        <ul className="space-y-2">
          {comments.map((cm) => (
            <li key={cm.id} className="text-xs bg-secondary/40 rounded p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {cm.author?.name ?? (cm.author_type === "admin" ? "Livora Team" : "Customer")}
                </span>
                <span className="text-muted-foreground">{new Date(cm.created_at).toLocaleString("id-ID")}</span>
              </div>
              <p className="mt-0.5 text-foreground/90">{cm.body}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-start gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={role === "admin" ? "Reply as Livora…" : "Ask about this update…"}
          className="flex-1 border border-border rounded px-2 py-1.5 text-xs bg-background"
        />
        <button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="shrink-0 rounded bg-foreground text-background px-3 py-1.5 text-[10px] uppercase tracking-wider disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function CompletedPanel({ consultation }: { consultation: Consultation }) {
  const history = consultation.status_history || consultation.statusHistory || [];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Complete journey recap — tap any stage from the timeline for full detail.
      </p>
      <ol className="space-y-2">
        {[...history].reverse().map((h) => (
          <li key={h.id} className="text-xs border border-border rounded p-2">
            <div className="flex justify-between">
              <span className="font-medium">{h.new_status}</span>
              <span className="text-muted-foreground">{new Date(h.created_at).toLocaleDateString("id-ID")}</span>
            </div>
            {h.note && <p className="text-muted-foreground mt-1">{h.note}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function FileList({ files }: { files: ConsultationStageFile[] }) {
  return (
    <ul className="space-y-2">
      {files.map((f) => {
        const isImage = /\.(jpe?g|png|webp|gif|avif)$/i.test(f.file_path);
        return (
          <li key={f.id} className="flex items-center gap-3 text-xs">
            {isImage ? <ImageIcon size={14} /> : <FileText size={14} />}
            <a href={fileUrl(f.file_path)} target="_blank" rel="noreferrer" className="underline truncate flex-1">
              {f.kind.replace("_", " ")} · {new Date(f.created_at).toLocaleDateString("id-ID")}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 pb-1.5">
      <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}