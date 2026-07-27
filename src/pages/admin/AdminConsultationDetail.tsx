import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  getAdminConsultation,
  updateAdminConsultation,
  confirmConsultationEmail,
  approveConsultation,
  rejectConsultation,
  scheduleMeeting as apiScheduleMeeting,
  startMeeting,
  requestDp,
  markDpPaid,
  uploadAgreement,
  postProgress,
  completeConsultation,
} from "@/lib/adminConsultations";
import type { Consultation } from "@/lib/consultations";
import ConsultationChat from "@/components/livora/ConsultationChat";
import ConsultationTimeline from "@/components/livora/ConsultationTimeline";

const STATUS_OPTIONS = [
  ["new_inquiry", "New Inquiry"],
  ["under_review", "Under Review"],
  ["contacted", "Contacted"],
  ["meeting_scheduled", "Meeting Scheduled"],
  ["in_progress", "In Progress"],
  ["dp_pending", "DP Payment"],
  ["project_paid", "Project Paid"],
  ["project_running", "Project Running"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["rejected", "Rejected"],
] as const;

export default function AdminConsultationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      setC(await getAdminConsultation(Number(id)));
    } catch {
      toast.error("Gagal memuat consultation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const patch = async (payload: any) => {
    if (!c) return;
    try {
      const updated = await updateAdminConsultation(c.id, payload);
      setC(updated);
      toast.success("Tersimpan");
    } catch {
      toast.error("Gagal update");
    }
  };

  const runAction = async (label: string, fn: () => Promise<Consultation>) => {
    try {
      const updated = await fn();
      setC(updated);
      toast.success(`${label} berhasil.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || `${label} gagal.`);
    }
  };

  const handleConfirm = async () => {
    if (!c) return;
    setSending(true);
    try {
      await confirmConsultationEmail(c.id, {
        subject: emailSubject || undefined,
        message: emailMessage || undefined,
      });
      toast.success("Email konfirmasi terkirim.");
      setEmailSubject("");
      setEmailMessage("");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal kirim email");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  if (!c) return <div className="p-10">Not found</div>;

  const history: any[] = (c as any).status_history || (c as any).statusHistory || [];

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
              Consultation #{c.id}
            </p>
            <h1 className="serif text-3xl">
              {c.first_name} {c.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {c.email} · {c.phone ?? "no phone"}
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/consultations")}
            className="text-sm underline text-muted-foreground"
          >
            ← Back
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="serif text-xl mb-4">Journey Timeline</h2>
              <ConsultationTimeline consultation={c} role="admin" onChanged={setC} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-6 space-y-3 text-sm">
                <h2 className="serif text-xl mb-2">Request Detail</h2>
                <Row label="Service" value={c.service_type} />
                <Row label="Project" value={c.project_type} />
                <Row label="Meeting Type" value={c.consultation_type} />
                <Row label="Contact Method" value={c.contact_method} />
                <Row label="Location" value={c.location} />
                <div className="pt-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Message</p>
                  <p className="whitespace-pre-wrap">{c.message}</p>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-3">
                <h2 className="serif text-xl">Manual Override</h2>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground">Status</label>
                <select
                  value={c.status}
                  onChange={(e) => patch({ status: e.target.value })}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
                >
                  {STATUS_OPTIONS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mt-2">
                  Admin Notes (internal)
                </label>
                <textarea
                  rows={3}
                  defaultValue={c.admin_notes ?? ""}
                  onBlur={(e) => patch({ admin_notes: e.target.value })}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="serif text-xl mb-4">Conversation with Customer</h2>
              <ConsultationChat consultationId={c.id} mode="admin" locked={c.status === "cancelled"} />
            </div>

            <div className="bg-secondary/30 border border-border rounded-lg p-6 space-y-3">
              <h2 className="serif text-xl">Confirm &amp; Email User</h2>
              <input
                type="text"
                placeholder="Custom subject (optional)"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
              />
              <textarea
                rows={3}
                placeholder="Pesan tambahan (optional)"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
              />
              <button
                onClick={handleConfirm}
                disabled={sending}
                className="w-full bg-foreground text-background py-3 rounded text-xs uppercase tracking-[0.25em] disabled:opacity-60"
              >
                {sending ? "Sending…" : "Confirm & Email User"}
              </button>
            </div>

            {history.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="serif text-xl mb-4">Status History</h2>
                <ol className="space-y-3">
                  {history.map((h: any) => (
                    <li key={h.id} className="border-l-2 border-border pl-4 text-sm">
                      <div className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString("id-ID")}
                        {h.changed_by_user?.name ? ` · by ${h.changed_by_user.name}` : ""}
                      </div>
                      <div>
                        {h.previous_status ? `${h.previous_status} → ` : ""}
                        <strong>{h.new_status}</strong>
                      </div>
                      {h.note && <p className="text-muted-foreground mt-1">{h.note}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Actions rail */}
          <div className="lg:sticky lg:top-6 self-start">
            <ActionsRail consultation={c} onRun={runAction} onScheduled={() => load()} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionsRail({
  consultation,
  onRun,
  onScheduled,
}: {
  consultation: Consultation;
  onRun: (label: string, fn: () => Promise<Consultation>) => Promise<void>;
  onScheduled: () => void;
}) {
  const status = consultation.status;
  const [meeting, setMeeting] = useState({
    meeting_date: consultation.meeting_date ?? "",
    meeting_time: consultation.meeting_time ?? "",
    meeting_location: consultation.meeting_location ?? "",
    meeting_link: consultation.meeting_link ?? "",
  });
  const [dpAmount, setDpAmount] = useState<string>(consultation.dp_amount ? String(consultation.dp_amount) : "");
  const [dpNote, setDpNote] = useState("");
  const invoiceRef = useRef<HTMLInputElement>(null);
  const agreementRef = useRef<HTMLInputElement>(null);
  const progressPhotosRef = useRef<HTMLInputElement>(null);
  const [percentage, setPercentage] = useState<string>(String(consultation.project_progress ?? 0));
  const [progressNote, setProgressNote] = useState("");

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Current Stage</p>
        <p className="serif text-lg">{consultation.status_label ?? consultation.status}</p>
      </div>

      {(status === "new_inquiry" || status === "under_review") && (
        <div className="space-y-2">
          <button
            onClick={() => onRun("Approve", () => approveConsultation(consultation.id))}
            className="w-full rounded bg-foreground text-background py-2 text-xs uppercase tracking-[0.2em]"
          >
            Approve → Open Chat
          </button>
          <button
            onClick={() => {
              const reason = window.prompt("Alasan penolakan:");
              if (!reason) return;
              onRun("Reject", () => rejectConsultation(consultation.id, reason));
            }}
            className="w-full rounded border border-red-200 text-red-600 py-2 text-xs uppercase tracking-[0.2em] hover:bg-red-50"
          >
            Reject
          </button>
        </div>
      )}

      {(status === "contacted" || status === "meeting_scheduled") && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Schedule Meeting</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={meeting.meeting_date}
              onChange={(e) => setMeeting({ ...meeting, meeting_date: e.target.value })}
              className="border border-border rounded px-2 py-1.5 text-xs bg-background" />
            <input type="time" value={meeting.meeting_time}
              onChange={(e) => setMeeting({ ...meeting, meeting_time: e.target.value })}
              className="border border-border rounded px-2 py-1.5 text-xs bg-background" />
          </div>
          <input placeholder="Location (optional)" value={meeting.meeting_location}
            onChange={(e) => setMeeting({ ...meeting, meeting_location: e.target.value })}
            className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
          <input placeholder="Meeting link" value={meeting.meeting_link}
            onChange={(e) => setMeeting({ ...meeting, meeting_link: e.target.value })}
            className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
          <button
            disabled={!meeting.meeting_date}
            onClick={async () => {
              await onRun("Schedule", () => apiScheduleMeeting(consultation.id, meeting));
              onScheduled();
            }}
            className="w-full rounded bg-foreground text-background py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
          >
            Save & Move to Scheduled
          </button>
          {status === "meeting_scheduled" && (
            <button
              onClick={() => onRun("Start Meeting", () => startMeeting(consultation.id))}
              className="w-full rounded border border-border py-2 text-xs uppercase tracking-[0.2em] hover:bg-secondary"
            >
              Mark Meeting Started
            </button>
          )}
        </div>
      )}

      {status === "in_progress" && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Request DP Payment</p>
          <input type="number" placeholder="Amount (IDR)" value={dpAmount}
            onChange={(e) => setDpAmount(e.target.value)}
            className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
          <textarea rows={2} placeholder="Note (optional)" value={dpNote}
            onChange={(e) => setDpNote(e.target.value)}
            className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
          <input ref={invoiceRef} type="file" className="text-xs" />
          <button
            disabled={!dpAmount}
            onClick={() =>
              onRun("Request DP", () =>
                requestDp(consultation.id, Number(dpAmount), dpNote || undefined, invoiceRef.current?.files?.[0]),
              )
            }
            className="w-full rounded bg-foreground text-background py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
          >
            Send Invoice & Move to DP Pending
          </button>
        </div>
      )}

      {status === "dp_pending" && (
        <div className="space-y-2">
          {consultation.dp_paid_at ? (
            <div className="rounded border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-1.5 text-[11px]">
              Payment already confirmed on {new Date(consultation.dp_paid_at).toLocaleDateString("id-ID")}.
            </div>
          ) : (
            <button
              onClick={() => onRun("Mark Paid", () => markDpPaid(consultation.id))}
              className="w-full rounded bg-foreground text-background py-2 text-xs uppercase tracking-[0.2em]"
            >
              Mark DP as Paid
            </button>
          )}
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground pt-2">Upload Agreement</p>
          <input ref={agreementRef} type="file" className="text-xs" />
          <button
            onClick={() => {
              const f = agreementRef.current?.files?.[0];
              if (!f) return toast.error("Pilih file agreement dulu.");
              onRun("Upload Agreement", () => uploadAgreement(consultation.id, f));
            }}
            className="w-full rounded border border-border py-2 text-xs uppercase tracking-[0.2em] hover:bg-secondary"
          >
            Upload & Move to Project Paid
          </button>
        </div>
      )}

      {status === "project_paid" && (
        <div className="space-y-2">
          {consultation.agreement_signed_at ? (
            <div className="rounded border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-1.5 text-[11px]">
              Customer signed as <strong>{consultation.agreement_signature_name}</strong>.
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Waiting for customer signature.</p>
          )}
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground pt-2">Post First Progress</p>
          <ProgressForm
            percentage={percentage}
            setPercentage={setPercentage}
            note={progressNote}
            setNote={setProgressNote}
            photosRef={progressPhotosRef}
            onSubmit={() =>
              onRun("Post Progress", () =>
                postProgress(
                  consultation.id,
                  Number(percentage),
                  progressNote || undefined,
                  Array.from(progressPhotosRef.current?.files || []),
                ),
              )
            }
          />
        </div>
      )}

      {status === "project_running" && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Post Progress Update</p>
          <ProgressForm
            percentage={percentage}
            setPercentage={setPercentage}
            note={progressNote}
            setNote={setProgressNote}
            photosRef={progressPhotosRef}
            onSubmit={() =>
              onRun("Post Progress", () =>
                postProgress(
                  consultation.id,
                  Number(percentage),
                  progressNote || undefined,
                  Array.from(progressPhotosRef.current?.files || []),
                ),
              )
            }
          />
          <button
            onClick={() => onRun("Complete", () => completeConsultation(consultation.id))}
            className="w-full mt-2 rounded border border-emerald-200 text-emerald-700 py-2 text-xs uppercase tracking-[0.2em] hover:bg-emerald-50"
          >
            Mark Project Completed
          </button>
        </div>
      )}

      {status === "completed" && (
        <p className="text-xs text-emerald-700">Project completed. No further actions.</p>
      )}
      {status === "cancelled" && (
        <p className="text-xs text-red-600">This consultation was cancelled.</p>
      )}
      {status === "rejected" && (
        <p className="text-xs text-amber-700">This inquiry was rejected.</p>
      )}
    </div>
  );
}

function ProgressForm({
  percentage, setPercentage, note, setNote, photosRef, onSubmit,
}: {
  percentage: string;
  setPercentage: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  photosRef: React.RefObject<HTMLInputElement>;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input type="range" min={0} max={100} value={percentage}
          onChange={(e) => setPercentage(e.target.value)} className="flex-1" />
        <span className="w-10 text-right text-xs font-medium">{percentage}%</span>
      </div>
      <textarea rows={2} placeholder="What was done in this update?" value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
      <input ref={photosRef} type="file" multiple accept="image/*" className="text-xs" />
      <button onClick={onSubmit}
        className="w-full rounded bg-foreground text-background py-2 text-xs uppercase tracking-[0.2em]">
        Post Progress Update
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 pb-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right">{value || "-"}</span>
    </div>
  );
}