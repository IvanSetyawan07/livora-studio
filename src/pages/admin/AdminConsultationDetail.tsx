import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, ChevronRight, CircleDollarSign, Clock3, FileText,
  FolderOpen, History, LayoutDashboard, MessageCircle, MessagesSquare, TrendingUp, UserRound,
} from "lucide-react";
import {
  getAdminConsultation, updateAdminConsultation, approveConsultation, rejectConsultation,
  scheduleMeeting as apiScheduleMeeting, startMeeting, requestDp, markDpPaid,
  uploadAgreement, postProgress, completeConsultation,
} from "@/lib/adminConsultations";
import {
  fileUrl, type Consultation, type ConsultationActivity, type ConsultationProgressComment,
  type ConsultationProgressUpdate, type ConsultationStageFile, type ConsultationStatusHistoryEntry,
} from "@/lib/consultations";
import ConsultationChat from "@/components/livora/ConsultationChat";
import ConsultationTimeline from "@/components/livora/ConsultationTimeline";
import ConsultationStageSheet from "@/components/livora/ConsultationStageSheet";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<string, string> = {
  new_inquiry: "Permintaan baru", under_review: "Dalam peninjauan", contacted: "Sudah dihubungi",
  meeting_scheduled: "Pertemuan terjadwal", in_progress: "Konsultasi berjalan",
  agreement_pending: "Menunggu perjanjian", dp_pending: "Menunggu uang muka",
  project_paid: "Uang muka diterima", project_running: "Proyek berjalan", completed: "Selesai",
  cancelled: "Dibatalkan", rejected: "Ditolak",
};
const TABS = [
  ["summary", "Ringkasan", LayoutDashboard], ["action", "Tindakan Berikutnya", ChevronRight],
  ["payment", "Pembayaran", CircleDollarSign], ["documents", "Dokumen", FolderOpen],
  ["progress", "Progres", TrendingUp], ["questions", "Pertanyaan Pelanggan", MessagesSquare],
  ["chat", "Percakapan", MessageCircle], ["history", "Riwayat", History],
] as const;
type TabKey = (typeof TABS)[number][0];

export default function AdminConsultationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("summary");

  const load = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try { setConsultation(await getAdminConsultation(Number(id))); }
    catch { if (!silent) toast.error("Gagal memuat konsultasi."); }
    finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const patch = async (payload: Record<string, unknown>) => {
    if (!consultation) return;
    try { setConsultation(await updateAdminConsultation(consultation.id, payload)); toast.success("Perubahan tersimpan."); }
    catch { toast.error("Perubahan gagal disimpan."); }
  };
  const runAction = async (label: string, fn: () => Promise<Consultation>) => {
    try { setConsultation(await fn()); toast.success(`${label} berhasil.`); }
    catch (error: unknown) {
      const response = (error as { response?: { data?: { message?: string } } })?.response;
      toast.error(response?.data?.message || `${label} gagal.`);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!consultation) return <div className="py-16 text-center">Konsultasi tidak ditemukan.</div>;
  const c = consultation;
  const files = (c.stage_files || c.stageFiles || []) as ConsultationStageFile[];
  const updates = (c.progress_updates || c.progressUpdates || []) as ConsultationProgressUpdate[];
  const activities = c.activities || [];
  const history = (c.status_history || c.statusHistory || []) as ConsultationStatusHistoryEntry[];
  const customerQuestions = updates.flatMap((update) => (update.comments || []).filter((comment) => comment.author_type === "user").map((comment) => ({ update, comment })));

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="border-b border-border pb-5">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/consultations")} className="mb-4 -ml-3"><ArrowLeft /> Semua konsultasi</Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>Konsultasi #{c.id}</span><StatusBadge status={c.status} /></div>
            <h1 className="serif truncate text-3xl sm:text-4xl">{c.first_name} {c.last_name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{c.email} · {c.phone || "Nomor belum tersedia"}</p>
          </div>
          <div className="min-w-[180px]">
            <div className="mb-2 flex justify-between text-xs"><span>Progres proyek</span><strong>{c.project_progress ?? 0}%</strong></div>
            <div className="h-2 overflow-hidden bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, c.project_progress ?? 0)}%` }} /></div>
          </div>
        </div>
      </header>

      <div className="sticky top-[61px] z-20 -mx-4 mb-6 border-b border-border bg-background/95 px-4 backdrop-blur lg:top-0 lg:-mx-0 lg:px-0">
        <nav className="flex overflow-x-auto" aria-label="Bagian konsultasi">
          {TABS.map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)} className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors sm:px-4 ${tab === key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="size-4" />{label}{key === "questions" && customerQuestions.length > 0 ? <span className="rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">{customerQuestions.length}</span> : null}
            </button>
          ))}
        </nav>
      </div>

      {tab === "summary" && <Summary consultation={c} files={files} updates={updates} questions={customerQuestions.length} onChanged={setConsultation} onPatch={patch} />}
      {tab === "action" && <Section title="Tindakan Berikutnya" description="Satu tempat untuk menjalankan langkah operasional sesuai tahap saat ini."><div className="max-w-xl"><ActionsRail consultation={c} onRun={runAction} onScheduled={() => load(true)} /></div></Section>}
      {tab === "payment" && <PaymentSection consultation={c} files={files} onChanged={setConsultation} />}
      {tab === "documents" && <DocumentsSection consultation={c} files={files} />}
      {tab === "progress" && <ProgressSection consultation={c} updates={updates} onChanged={setConsultation} />}
      {tab === "questions" && <QuestionsSection questions={customerQuestions} onOpenProgress={() => setTab("progress")} />}
      {tab === "chat" && <Section title="Percakapan" description="Pesan langsung antara tim Livora dan pelanggan."><div className="max-w-3xl"><ConsultationChat consultationId={c.id} mode="admin" locked={c.status === "cancelled"} /></div></Section>}
      {tab === "history" && <HistorySection activities={activities} history={history} />}
    </div>
  );
}

function Summary({ consultation, files, updates, questions, onChanged, onPatch }: { consultation: Consultation; files: ConsultationStageFile[]; updates: ConsultationProgressUpdate[]; questions: number; onChanged: (value: Consultation) => void; onPatch: (payload: Record<string, unknown>) => Promise<void> }) {
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
    <div className="space-y-6">
      <Section title="Perjalanan Konsultasi" description="Klik setiap tahap untuk melihat rincian dan tindakan yang tersedia."><ConsultationTimeline consultation={consultation} role="admin" onChanged={onChanged} /></Section>
      <Section title="Ringkasan Permintaan"><div className="grid gap-px bg-border sm:grid-cols-2"><Fact label="Layanan" value={consultation.service_type} /><Fact label="Jenis proyek" value={consultation.project_type} /><Fact label="Jenis konsultasi" value={consultation.consultation_type} /><Fact label="Metode kontak" value={consultation.contact_method} /><Fact label="Lokasi" value={consultation.location} /><Fact label="Gaya pilihan" value={consultation.preferred_style} /></div>{consultation.message && <div className="border-t border-border pt-5"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pesan awal</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{consultation.message}</p></div>}</Section>
    </div>
    <div className="space-y-6">
      <Section title="Kondisi Saat Ini"><div className="space-y-4"><Snapshot label="Tahap" value={STATUS_LABELS[consultation.status] || consultation.status} /><Snapshot label="Dokumen" value={`${files.length + (consultation.attachments?.length || 0)} berkas`} /><Snapshot label="Pembaruan progres" value={`${updates.length} pembaruan`} /><Snapshot label="Pertanyaan pelanggan" value={`${questions} pertanyaan`} /></div></Section>
      <Section title="Catatan Internal"><textarea rows={6} defaultValue={consultation.admin_notes ?? ""} onBlur={(event) => onPatch({ admin_notes: event.target.value })} placeholder="Tambahkan catatan yang hanya terlihat oleh tim Livora" className="ui-input resize-none" /></Section>
    </div>
  </div>;
}

function PaymentSection({ consultation, files, onChanged }: { consultation: Consultation; files: ConsultationStageFile[]; onChanged: (value: Consultation) => void }) {
  return <Section title="Pembayaran" description="Periksa tagihan dan bukti pembayaran pelanggan sebelum melanjutkan tahap."><div className="grid gap-6 lg:grid-cols-2"><StagePanel title="Uang Muka"><ConsultationStageSheet stage="dp_pending" consultation={consultation} role="admin" onChanged={onChanged} /></StagePanel><StagePanel title="Pelunasan"><ConsultationStageSheet stage="project_running" consultation={consultation} role="admin" onChanged={onChanged} /></StagePanel></div></Section>;
}
function DocumentsSection({ consultation, files }: { consultation: Consultation; files: ConsultationStageFile[] }) {
  const uploaded = (consultation.attachments || []).map((path, index) => ({ key: `attachment-${index}`, label: `Lampiran pelanggan ${index + 1}`, path, meta: "Dikirim bersama permintaan" }));
  const workflow = files.map((item) => ({ key: `file-${item.id}`, label: item.kind.replaceAll("_", " "), path: item.file_path, meta: new Date(item.created_at).toLocaleString("id-ID") }));
  const special = [{ key: "agreement-final", label: "Perjanjian final", path: consultation.final_agreement_path, meta: "Ditandatangani kedua pihak" }].filter((item) => item.path);
  const documents = [...uploaded, ...workflow, ...special] as { key: string; label: string; path: string; meta: string }[];
  return <Section title="Dokumen" description="Seluruh lampiran pelanggan, invoice, bukti pembayaran, dan perjanjian.">{documents.length === 0 ? <Empty text="Belum ada dokumen." /> : <div className="divide-y divide-border border-y border-border">{documents.map((document) => <a key={document.key} href={fileUrl(document.path)} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-4 hover:bg-muted"><FileText className="size-5 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium capitalize">{document.label}</p><p className="text-xs text-muted-foreground">{document.meta}</p></div><ChevronRight className="size-4" /></a>)}</div>}</Section>;
}
function ProgressSection({ consultation, updates, onChanged }: { consultation: Consultation; updates: ConsultationProgressUpdate[]; onChanged: (value: Consultation) => void }) {
  return <Section title="Progres Proyek" description="Dokumentasi setiap perkembangan proyek beserta pertanyaan pelanggan.">{updates.length === 0 ? <Empty text="Belum ada pembaruan progres." /> : <ConsultationStageSheet stage="project_running" consultation={consultation} role="admin" onChanged={onChanged} />}</Section>;
}
function QuestionsSection({ questions, onOpenProgress }: { questions: { update: ConsultationProgressUpdate; comment: ConsultationProgressComment }[]; onOpenProgress: () => void }) {
  return <Section title="Pertanyaan Pelanggan" description="Pertanyaan yang dikirim melalui setiap pembaruan progres.">{questions.length === 0 ? <Empty text="Belum ada pertanyaan dari pelanggan." /> : <div className="space-y-3">{questions.map(({ update, comment }) => <div key={comment.id} className="border border-border p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-medium text-muted-foreground">Pembaruan {update.percentage}%</p><p className="mt-2 text-sm leading-6">{comment.body}</p><p className="mt-2 text-xs text-muted-foreground">{comment.author?.name || "Pelanggan"} · {new Date(comment.created_at).toLocaleString("id-ID")}</p></div><Button size="sm" variant="outline" onClick={onOpenProgress}>Lihat & balas</Button></div></div>)}</div>}</Section>;
}
function HistorySection({ activities, history }: { activities: ConsultationActivity[]; history: ConsultationStatusHistoryEntry[] }) {
  const entries = [...activities.map((item) => ({ id: `a-${item.id}`, date: item.created_at, title: item.title, body: item.body })), ...history.map((item) => ({ id: `h-${item.id}`, date: item.created_at, title: `Status: ${STATUS_LABELS[item.new_status] || item.new_status}`, body: item.note }))].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return <Section title="Riwayat" description="Catatan aktivitas dan perubahan status konsultasi.">{entries.length === 0 ? <Empty text="Belum ada aktivitas yang tercatat." /> : <ol className="border-l border-border pl-5">{entries.map((item) => <li key={item.id} className="relative pb-6 before:absolute before:-left-[25px] before:top-1 before:size-2 before:rounded-full before:bg-foreground"><p className="text-sm font-medium">{item.title}</p>{item.body && <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>}<p className="mt-1 text-xs text-muted-foreground">{new Date(item.date).toLocaleString("id-ID")}</p></li>)}</ol>}</Section>;
}
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) { return <section className="border border-border bg-card p-5 sm:p-6"><div className="mb-5"><h2 className="serif text-2xl">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{children}</section>; }
function StagePanel({ title, children }: { title: string; children: React.ReactNode }) { return <div className="border border-border p-4"><h3 className="mb-4 font-medium">{title}</h3>{children}</div>; }
function Fact({ label, value }: { label: string; value?: string | null }) { return <div className="bg-card p-4"><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-1 text-sm">{value || "Belum ditentukan"}</p></div>; }
function Snapshot({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 border-b border-border pb-3 text-sm"><span className="text-muted-foreground">{label}</span><strong className="text-right">{value}</strong></div>; }
function StatusBadge({ status }: { status: string }) { return <span className="border border-border bg-muted px-2 py-1 text-[10px] uppercase tracking-[0.15em]">{STATUS_LABELS[status] || status}</span>; }
function Empty({ text }: { text: string }) { return <div className="border border-dashed border-border px-5 py-12 text-center text-sm text-muted-foreground">{text}</div>; }
function DetailSkeleton() { return <div className="space-y-4 py-6" aria-label="Memuat detail konsultasi"><div className="h-24 animate-pulse bg-muted" /><div className="h-12 animate-pulse bg-muted" /><div className="h-96 animate-pulse bg-muted" /></div>; }

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
    meeting_type: consultation.meeting_type ?? "online",
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
          <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground pt-1">Meeting Type</label>
          <select value={meeting.meeting_type}
            onChange={(e) => setMeeting({ ...meeting, meeting_type: e.target.value })}
            className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background">
            <option value="online">Online</option>
            <option value="call">Call</option>
            <option value="offline">Offline</option>
          </select>
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
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Upload Agreement</p>
          <input ref={agreementRef} type="file" className="text-xs" />
          <button
            onClick={() => {
              const f = agreementRef.current?.files?.[0];
              if (!f) return toast.error("Pilih file agreement dulu.");
              onRun("Upload Agreement", () => uploadAgreement(consultation.id, f));
            }}
            className="w-full rounded bg-foreground text-background py-2 text-xs uppercase tracking-[0.2em]"
          >
            Upload & Move to Agreement
          </button>
        </div>
      )}

      {status === "agreement_pending" && (
        <div className="space-y-2">
          {consultation.agreement_signed_at ? (
            <div className="rounded border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-1.5 text-[11px]">
              Customer signed as <strong>{consultation.agreement_signature_name}</strong>.
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Waiting for customer signature.</p>
          )}
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground pt-2">Request DP Payment</p>
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
          <p className="text-[11px] text-muted-foreground pt-1">
            Verifikasi bukti transfer pelanggan pada panel dokumen untuk melanjutkan ke Project Paid.
          </p>
        </div>
      )}

      {status === "project_paid" && (
        <div className="space-y-2">
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