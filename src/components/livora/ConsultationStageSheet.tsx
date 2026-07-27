import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Video,
  FileText,
  Upload,
  Check,
  Image as ImageIcon,
  MessageCircle,
  XCircle,
} from "lucide-react";
import {
  type Consultation,
  type ConsultationStageFile,
  type ConsultationProgressUpdate,
  uploadDpProof,
  signAgreement,
  stageIndex,
} from "@/lib/consultations";

type Props = {
  stage: string;
  consultation: Consultation;
  role: "user" | "admin";
  onChanged?: (c: Consultation) => void;
};

export default function ConsultationStageSheet({ stage, consultation, role, onChanged }: Props) {
  const files = (consultation.stage_files || consultation.stageFiles || []).filter((f) => f.stage === stage);
  const history = (consultation.status_history || consultation.statusHistory || []).filter(
    (h) => h.new_status === stage || h.previous_status === stage,
  );
  const idx = stageIndex(stage);
  const currentIdx = stageIndex(consultation.status);
  const isPast = currentIdx > idx;
  const isCurrent = currentIdx === idx;

  return (
    <div className="space-y-6">
      <StatusBadge stage={stage} isPast={isPast} isCurrent={isCurrent} />

      {/* Stage-specific body */}
      {stage === "new_inquiry" && <InquiryPanel consultation={consultation} />}
      {stage === "under_review" && <ReviewPanel consultation={consultation} />}
      {stage === "contacted" && <ContactedPanel />}
      {stage === "meeting_scheduled" && <MeetingPanel consultation={consultation} />}
      {stage === "in_progress" && <InProgressPanel />}
      {stage === "dp_pending" && (
        <DpPanel consultation={consultation} role={role} files={files} onChanged={onChanged} />
      )}
      {stage === "project_paid" && (
        <AgreementPanel consultation={consultation} role={role} files={files} onChanged={onChanged} />
      )}
      {stage === "project_running" && (
        <ProgressPanel consultation={consultation} />
      )}
      {stage === "completed" && <CompletedPanel consultation={consultation} />}

      {/* History for this stage */}
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
  return (
    <div className="text-sm space-y-2">
      <p className="text-muted-foreground">The chat room with your designer is now open.</p>
      <div className="flex items-center gap-2 text-xs">
        <MessageCircle size={14} /> Open the chat below to start the conversation.
      </div>
    </div>
  );
}

function MeetingPanel({ consultation }: { consultation: Consultation }) {
  if (!consultation.meeting_date && !consultation.meeting_link) {
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
      {consultation.meeting_link && (
        <a
          href={consultation.meeting_link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded bg-foreground text-background px-3 py-2 text-xs uppercase tracking-[0.2em]"
        >
          <Video size={14} /> Join Meeting
        </a>
      )}
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

function DpPanel({
  consultation, role, files, onChanged,
}: { consultation: Consultation; role: "user" | "admin"; files: ConsultationStageFile[]; onChanged?: (c: Consultation) => void }) {
  const invoice = files.find((f) => f.kind === "invoice");
  const proof = files.find((f) => f.kind === "payment_proof");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const paid = !!consultation.dp_paid_at;

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const updated = await uploadDpProof(consultation.id, file);
      onChanged?.(updated);
      toast.success("Bukti pembayaran terkirim.");
    } catch {
      toast.error("Gagal mengunggah bukti.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      {consultation.dp_amount && (
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">DP Amount</p>
          <p className="serif text-xl">Rp {Number(consultation.dp_amount).toLocaleString("id-ID")}</p>
        </div>
      )}
      {invoice && (
        <a href={invoice.file_path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] underline">
          <FileText size={14} /> Download Invoice
        </a>
      )}
      {role === "user" && !paid && (
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
            <Upload size={14} /> {uploading ? "Uploading…" : proof ? "Upload New Proof" : "Upload Payment Proof"}
          </button>
        </>
      )}
      {paid && (
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 text-xs">
          <Check size={12} /> Payment confirmed {new Date(consultation.dp_paid_at!).toLocaleDateString("id-ID")}
        </div>
      )}
    </div>
  );
}

function AgreementPanel({
  consultation, role, files, onChanged,
}: { consultation: Consultation; role: "user" | "admin"; files: ConsultationStageFile[]; onChanged?: (c: Consultation) => void }) {
  const agreement = files.find((f) => f.kind === "agreement");
  const [name, setName] = useState("");
  const [accept, setAccept] = useState(false);
  const [saving, setSaving] = useState(false);
  const signed = !!consultation.agreement_signed_at;

  const handleSign = async () => {
    if (!name.trim() || !accept) return;
    setSaving(true);
    try {
      const updated = await signAgreement(consultation.id, name.trim());
      onChanged?.(updated);
      toast.success("Terima kasih! Tanda tangan tercatat.");
    } catch {
      toast.error("Gagal menyimpan tanda tangan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {agreement ? (
        <a
          href={agreement.file_path}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-secondary"
        >
          <FileText size={14} /> Download Agreement
        </a>
      ) : (
        <p className="text-muted-foreground">Waiting for the project agreement to be uploaded.</p>
      )}

      {signed ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
          <p className="text-xs uppercase tracking-wider mb-1">Signed</p>
          <p className="text-sm">
            <strong>{consultation.agreement_signature_name}</strong> · {new Date(consultation.agreement_signed_at!).toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] mt-1 opacity-80">Digital acknowledgement — not a qualified e-signature.</p>
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
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5" />
            I have read and agree to the terms of this project agreement.
          </label>
          <button
            onClick={handleSign}
            disabled={saving || !name.trim() || !accept}
            className="w-full rounded bg-foreground text-background py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {saving ? "Signing…" : "Sign Agreement"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ProgressPanel({ consultation }: { consultation: Consultation }) {
  const updates = (consultation.progress_updates || consultation.progressUpdates || []) as ConsultationProgressUpdate[];
  return (
    <div className="space-y-4">
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
        <ol className="space-y-4">
          {updates.map((u) => (
            <li key={u.id} className="border-l-2 border-border pl-3">
              <p className="text-xs text-muted-foreground">
                {new Date(u.created_at).toLocaleString("id-ID")}{u.creator?.name ? ` · ${u.creator.name}` : ""}
              </p>
              <p className="text-sm font-medium">{u.percentage}%{u.note ? ` — ${u.note}` : ""}</p>
              {u.photos && u.photos.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {u.photos.map((p, idx) => (
                    <a key={idx} href={p} target="_blank" rel="noreferrer" className="block aspect-square bg-secondary rounded overflow-hidden">
                      <img src={p} alt="progress" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
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
            <a href={f.file_path} target="_blank" rel="noreferrer" className="underline truncate flex-1">
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
