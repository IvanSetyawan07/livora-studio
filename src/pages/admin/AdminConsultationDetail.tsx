import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  getAdminConsultation,
  updateAdminConsultation,
  confirmConsultationEmail,
} from "@/lib/adminConsultations";
import type { Consultation } from "@/lib/consultations";
import ConsultationChat from "@/components/livora/ConsultationChat";

const STATUS_OPTIONS = [
  ["new_inquiry", "New Inquiry"],
  ["under_review", "Under Review"],
  ["contacted", "Contacted"],
  ["meeting_scheduled", "Meeting Scheduled"],
  ["in_progress", "In Progress"],
  ["follow_up_required", "Follow-up Required"],
  ["proposal_sent", "Proposal Sent"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;

export default function AdminConsultationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState<(Consultation & { statusHistory?: any[]; status_history?: any[] }) | null>(
    null,
  );
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
      setC(updated as any);
      toast.success("Tersimpan");
    } catch {
      toast.error("Gagal update");
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
      toast.success("Email konfirmasi terkirim ke user.");
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
      <div className="max-w-5xl mx-auto space-y-8">
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

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-3 text-sm">
            <h2 className="serif text-xl mb-2">Request Detail</h2>
            <Row label="Service" value={c.service_type} />
            <Row label="Project" value={c.project_type} />
            <Row label="Meeting Type" value={c.consultation_type} />
            <Row label="Contact Method" value={c.contact_method} />
            <Row label="Location" value={c.location} />
            <Row label="Estimated Area" value={c.estimated_area} />
            <Row label="Preferred Style" value={c.preferred_style} />
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Message
              </p>
              <p className="whitespace-pre-wrap">{c.message}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-6 space-y-3">
              <h2 className="serif text-xl">Status & Scheduling</h2>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground">
                Status
              </label>
              <select
                value={c.status}
                onChange={(e) => patch({ status: e.target.value })}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
              >
                {STATUS_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Meeting Date
                  </label>
                  <input
                    type="date"
                    defaultValue={c.meeting_date ?? ""}
                    onBlur={(e) => patch({ meeting_date: e.target.value })}
                    className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Meeting Time
                  </label>
                  <input
                    type="time"
                    defaultValue={c.meeting_time ?? ""}
                    onBlur={(e) => patch({ meeting_time: e.target.value })}
                    className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
                  />
                </div>
              </div>

              <input
                type="text"
                placeholder="Meeting location"
                defaultValue={c.meeting_location ?? ""}
                onBlur={(e) => patch({ meeting_location: e.target.value })}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
              />
              <input
                type="url"
                placeholder="Meeting link (Zoom / Meet)"
                defaultValue={c.meeting_link ?? ""}
                onBlur={(e) => patch({ meeting_link: e.target.value })}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
              />

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

            <div className="bg-secondary/30 border border-border rounded-lg p-6 space-y-3">
              <h2 className="serif text-xl">Confirm &amp; Email User</h2>
              <p className="text-xs text-muted-foreground">
                Kirim email konfirmasi ke <strong>{c.email}</strong>. Kosongkan field untuk pakai
                template default.
              </p>
              <input
                type="text"
                placeholder="Custom subject (optional)"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
              />
              <textarea
                rows={4}
                placeholder="Pesan tambahan untuk user (optional)"
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
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="serif text-xl mb-4">Conversation with Customer</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Polling setiap 20 detik. Sertakan link Zoom / Google Meet di composer bawah untuk mengirim tombol "Join Meeting" langsung ke customer.
          </p>
          <ConsultationChat
            consultationId={c.id}
            mode="admin"
            locked={c.status === "cancelled"}
          />
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
