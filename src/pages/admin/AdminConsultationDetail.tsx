import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessagesSquare,
  Phone,
  Save,
  Send,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  getAdminConsultation,
  updateAdminConsultation,
  approveConsultation,
  rejectConsultation,
  scheduleMeeting as apiScheduleMeeting,
  startMeeting,
  requestDp,
  markDpPaid,
  uploadAgreement,
  postProgress,
  completeConsultation,
  confirmConsultationEmail,
} from "@/lib/adminConsultations";
import {
  fileUrl,
  type Consultation,
  type ConsultationActivity,
  type ConsultationProgressComment,
  type ConsultationProgressUpdate,
  type ConsultationStageFile,
  type ConsultationStatusHistoryEntry,
} from "@/lib/consultations";
import ConsultationChat from "@/components/livora/ConsultationChat";
import ConsultationTimeline from "@/components/livora/ConsultationTimeline";
import ConsultationStageSheet, {
  AgreementComposer,
  PaymentPanel,
  StageContent,
} from "@/components/livora/ConsultationStageSheet";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import {
  ErrorState,
  StatusBadge as KitStatusBadge,
  TableSkeleton,
  useAdminDialog,
} from "@/components/admin/kit";

const STATUS_LABELS: Record<string, string> = {
  new_inquiry: "Permintaan baru",
  under_review: "Dalam peninjauan",
  contacted: "Sudah dihubungi",
  meeting_scheduled: "Pertemuan terjadwal",
  in_progress: "Konsultasi berjalan",
  agreement_pending: "Menunggu perjanjian",
  dp_pending: "Menunggu DP",
  project_paid: "DP diterima",
  project_running: "Proyek berjalan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  rejected: "Ditolak",
};

const NEXT_STEP_HINT: Record<string, string> = {
  new_inquiry: "Tinjau permintaan lalu klik Setujui untuk membuka ruang chat pelanggan.",
  under_review: "Selesaikan peninjauan dan setujui permintaan untuk lanjut ke penjadwalan.",
  contacted: "Atur jadwal pertemuan (online, telepon, atau kunjungan showroom).",
  meeting_scheduled: "Saat pertemuan berlangsung, tandai pertemuan dimulai agar masuk tahap Konsultasi Berjalan.",
  in_progress: "Buat naskah perjanjian digital (otomatis) & kirimkan ke pelanggan.",
  agreement_pending: "Setelah pelanggan tanda tangan, lakukan tanda tangan balik (Livora), bubuhkan meterai, lalu tagih DP.",
  dp_pending: "Verifikasi bukti transfer DP pelanggan di tab Pembayaran atau tandai DP diterima.",
  project_paid: "Kirim pembaruan progres pertama proyek beserta foto dokumentasi.",
  project_running: "Perbarui progres proyek secara berkala. Saat progres mencapai 85%, ajukan tagihan pelunasan.",
  completed: "Proyek telah selesai sepenuhnya.",
  cancelled: "Konsultasi ini dibatalkan.",
  rejected: "Permintaan konsultasi ini ditolak.",
};

const TABS = [
  ["summary", "Ringkasan", LayoutDashboard],
  ["action", "Tindakan Berikutnya", ChevronRight],
  ["payment", "Pembayaran (DP & Pelunasan)", CircleDollarSign],
  ["documents", "Dokumen", FolderOpen],
  ["progress", "Progres Proyek", TrendingUp],
  ["questions", "Pertanyaan Pelanggan", MessagesSquare],
  ["chat", "Percakapan", MessageCircle],
  ["history", "Riwayat", History],
] as const;

type TabKey = (typeof TABS)[number][0];

function toWaLink(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const norm = digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("8") ? `62${digits}` : digits;
  return `https://wa.me/${norm}`;
}

export default function AdminConsultationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dialog = useAdminDialog();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("consultations");

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [adminUsers, setAdminUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("summary");
  const [resendingEmail, setResendingEmail] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        setConsultation(await getAdminConsultation(Number(id)));
      } catch (e: any) {
        if (!silent) {
          setError(e?.message || "Gagal memuat detail konsultasi.");
          toast.error("Gagal memuat konsultasi.");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
    api
      .get("/admin/users")
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setAdminUsers(list.filter((u: any) => u.role === "admin").map((u: any) => ({ id: u.id, name: u.name })));
      })
      .catch(() => {});
  }, [load]);

  const patch = async (payload: Record<string, unknown>) => {
    if (!consultation || !editable) return;
    try {
      setConsultation(await updateAdminConsultation(consultation.id, payload));
      toast.success("Perubahan tersimpan.");
    } catch {
      toast.error("Perubahan gagal disimpan.");
    }
  };

  const runAction = async (label: string, fn: () => Promise<Consultation>) => {
    if (!editable) return;
    try {
      setConsultation(await fn());
      toast.success(`${label} berhasil.`);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(response?.data?.message || `${label} gagal.`);
    }
  };

  const handleResendEmail = async () => {
    if (!consultation || !editable) return;
    const ok = await dialog.confirm({
      title: "Kirim ulang email konfirmasi?",
      text: `Email konfirmasi jadwal/konsultasi akan dikirim ulang ke ${consultation.email}.`,
      confirmLabel: "Ya, kirim email",
    });
    if (!ok) return;
    setResendingEmail(true);
    try {
      await confirmConsultationEmail(consultation.id);
      toast.success("Email konfirmasi berhasil dikirim ulang");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal mengirim ulang email");
    } finally {
      setResendingEmail(false);
    }
  };

  if (loading) return <TableSkeleton rows={6} cols={3} />;
  if (error || !consultation) {
    return (
      <ErrorState
        title="Konsultasi tidak dapat dimuat"
        description={error ?? "Data konsultasi tidak ditemukan."}
        onRetry={() => void load()}
      />
    );
  }

  const c = consultation;
  const files = (c.stage_files || c.stageFiles || []) as ConsultationStageFile[];
  const updates = (c.progress_updates || c.progressUpdates || []) as ConsultationProgressUpdate[];
  const activities = c.activities || [];
  const history = (c.status_history || c.statusHistory || []) as ConsultationStatusHistoryEntry[];

  // Hitung pertanyaan pelanggan yang BELUM dibalas admin setelahnya
  const customerQuestions = updates.flatMap((update) => {
    const comments = update.comments || [];
    return comments
      .filter((comment) => comment.author_type === "user")
      .map((comment) => {
        const answered = comments.some(
          (reply) =>
            reply.author_type === "admin" &&
            new Date(reply.created_at).getTime() > new Date(comment.created_at).getTime(),
        );
        return { update, comment, answered };
      });
  });
  const unansweredCount = customerQuestions.filter((q) => !q.answered).length;
  const unreadChat = c.unread_messages_count ?? 0;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <header className="border-b border-[#EAE4DA] pb-5">
        <button
          type="button"
          onClick={() => navigate("/admin/consultations")}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#5E93B8] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Daftar Konsultasi
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[#656B73]">
              <span>Konsultasi #{c.id}</span>
              <KitStatusBadge
                tone={
                  c.status === "completed"
                    ? "success"
                    : c.status === "cancelled" || c.status === "rejected"
                      ? "danger"
                      : "accent"
                }
              >
                {STATUS_LABELS[c.status] || c.status}
              </KitStatusBadge>
            </div>
            <h1 className="font-header truncate text-3xl text-[#232528] sm:text-4xl">
              {c.first_name} {c.last_name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#656B73]">
              {c.email && (
                <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 hover:text-[#232528] hover:underline">
                  <Mail className="h-3.5 w-3.5 text-[#5E93B8]" /> {c.email}
                </a>
              )}
              {c.phone && toWaLink(c.phone) && (
                <a
                  href={toWaLink(c.phone)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-[#232528] hover:underline"
                >
                  <Phone className="h-3.5 w-3.5 text-[#5E93B8]" /> {c.phone} (Buka WhatsApp)
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {editable && (
              <button
                type="button"
                disabled={resendingEmail}
                onClick={() => void handleResendEmail()}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DACF] bg-white px-3.5 py-2 text-xs font-medium text-[#232528] hover:border-[#5E93B8] disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5 text-[#5E93B8]" />
                {resendingEmail ? "Mengirim…" : "Kirim Ulang Email Konfirmasi"}
              </button>
            )}
            <div className="min-w-[170px] rounded-xl border border-[#EAE4DA] bg-white px-3.5 py-2">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-[#656B73]">Progres Proyek</span>
                <strong className="text-[#232528]">{c.project_progress ?? 0}%</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#EFEAE2]">
                <div
                  className="h-full rounded-full bg-[#5E93B8] transition-all"
                  style={{ width: `${Math.min(100, c.project_progress ?? 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Banner Langkah Berikutnya */}
      {!["completed", "cancelled", "rejected"].includes(c.status) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#5E93B8]/30 bg-[#EDF4F8]/80 px-5 py-3.5">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#5E93B8]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#35678B]">
                Langkah Berikutnya ({STATUS_LABELS[c.status] || c.status})
              </p>
              <p className="mt-0.5 text-sm text-[#232528]">{NEXT_STEP_HINT[c.status] || "Tinjau detail konsultasi."}</p>
            </div>
          </div>
          {tab !== "action" && editable && (
            <button
              type="button"
              onClick={() => setTab("action")}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white hover:bg-[#34383D]"
            >
              Jalankan Langkah Ini <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="sticky top-14 z-20 -mx-4 border-b border-[#EAE4DA] bg-[#FAF8F4]/95 px-4 backdrop-blur lg:-mx-0 lg:px-0">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Bagian konsultasi">
          {TABS.map(([key, label, Icon]) => {
            const badge = key === "questions" ? unansweredCount : key === "chat" ? unreadChat : 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-3 text-xs font-medium transition-colors ${
                  tab === key
                    ? "border-[#5E93B8] text-[#232528]"
                    : "border-transparent text-[#656B73] hover:text-[#232528]"
                }`}
              >
                <Icon className={`size-4 ${tab === key ? "text-[#5E93B8]" : ""}`} />
                {label}
                {badge > 0 && (
                  <span className="rounded-full bg-[#5E93B8] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {tab === "summary" && (
        <Summary
          consultation={c}
          adminUsers={adminUsers}
          editable={editable}
          files={files}
          updates={updates}
          questions={unansweredCount}
          onChanged={setConsultation}
          onPatch={patch}
        />
      )}

      {tab === "action" && (
        <Section
          title="Tindakan Berikutnya"
          description="Jalankan langkah operasional untuk memajukan proyek ke tahap berikutnya."
        >
          <div className="max-w-2xl">
            <ActionsRail
              consultation={c}
              editable={editable}
              onRun={runAction}
              onScheduled={() => void load(true)}
              onChanged={setConsultation}
              onGoPayment={() => setTab("payment")}
            />
          </div>
        </Section>
      )}

      {tab === "payment" && (
        <PaymentSection consultation={c} files={files} onChanged={setConsultation} />
      )}

      {tab === "documents" && <DocumentsSection consultation={c} files={files} />}

      {tab === "progress" && (
        <ProgressSection
          consultation={c}
          editable={editable}
          updates={updates}
          onRun={runAction}
          onChanged={setConsultation}
          onGoPayment={() => setTab("payment")}
        />
      )}

      {tab === "questions" && (
        <QuestionsSection questions={customerQuestions} onOpenProgress={() => setTab("progress")} />
      )}

      {tab === "chat" && (
        <Section title="Percakapan dengan Pelanggan" description="Pesan langsung antara tim LIVORA dan pelanggan.">
          <div className="max-w-3xl">
            <ConsultationChat consultationId={c.id} mode="admin" locked={c.status === "cancelled" || !editable} />
          </div>
        </Section>
      )}

      {tab === "history" && <HistorySection activities={activities} history={history} />}
    </div>
  );
}

function Summary({
  consultation,
  adminUsers,
  editable,
  files,
  updates,
  questions,
  onChanged,
  onPatch,
}: {
  consultation: Consultation;
  adminUsers: Array<{ id: number; name: string }>;
  editable: boolean;
  files: ConsultationStageFile[];
  updates: ConsultationProgressUpdate[];
  questions: number;
  onChanged: (value: Consultation) => void;
  onPatch: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [notes, setNotes] = useState(consultation.admin_notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(consultation.admin_notes ?? "");
  }, [consultation.admin_notes]);

  const saveNotes = async () => {
    setSavingNotes(true);
    await onPatch({ admin_notes: notes });
    setSavingNotes(false);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <Section
          title="Perjalanan Konsultasi"
          description="Klik tahap mana saja untuk melihat rincian dokumen, jadwal, atau tanda tangan pada tahap tersebut."
        >
          <ConsultationTimeline consultation={consultation} role="admin" onChanged={onChanged} />
        </Section>

        <Section title="Ringkasan Permintaan Pelanggan">
          <div className="grid gap-4 sm:grid-cols-2">
            <Fact label="Layanan" value={consultation.service_type} />
            <Fact label="Jenis Proyek" value={consultation.project_type} />
            <Fact label="Tipe Konsultasi" value={consultation.consultation_type} />
            <Fact label="Metode Kontak" value={consultation.contact_method} />
            <Fact label="Lokasi" value={consultation.location} />
            <Fact label="Estimasi Luas" value={consultation.estimated_area} />
            <Fact label="Gaya Pilihan" value={consultation.preferred_style} />
          </div>
          {consultation.message && (
            <div className="mt-5 border-t border-[#EAE4DA] pt-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#656B73]">Pesan Awal Pelanggan</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#232528]">{consultation.message}</p>
            </div>
          )}
        </Section>
      </div>

      <div className="space-y-6">
        <Section title="PIC & Kondisi Saat Ini">
          <div className="space-y-3">
            {adminUsers.length > 0 && (
              <label className="block pb-2">
                <span className="text-xs font-medium text-[#656B73]">Penanggung Jawab (PIC)</span>
                <select
                  disabled={!editable}
                  value={consultation.assigned_admin_id ?? ""}
                  onChange={(e) =>
                    void onPatch({ assigned_admin_id: e.target.value ? Number(e.target.value) : null })
                  }
                  className="ui-input mt-1"
                >
                  <option value="">— Belum ditugaskan —</option>
                  {adminUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Snapshot label="Tahap" value={STATUS_LABELS[consultation.status] || consultation.status} />
            <Snapshot label="Dokumen" value={`${files.length + (consultation.attachments?.length || 0)} berkas`} />
            <Snapshot label="Pembaruan Progres" value={`${updates.length} kali`} />
            <Snapshot label="Pertanyaan Belum Dijawab" value={`${questions} pertanyaan`} />
          </div>
        </Section>

        <Section title="Catatan Internal Tim">
          <textarea
            rows={5}
            disabled={!editable}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan internal yang hanya dilihat oleh tim LIVORA…"
            className="ui-input resize-none"
          />
          {editable && (
            <button
              type="button"
              disabled={savingNotes || notes === (consultation.admin_notes ?? "")}
              onClick={() => void saveNotes()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              {savingNotes ? "Menyimpan…" : "Simpan Catatan"}
            </button>
          )}
        </Section>
      </div>
    </div>
  );
}

/** FIXED: Panel Pelunasan langsung memanggil <PaymentPanel kind="final" /> — bukan ProgressPanel! */
function PaymentSection({
  consultation,
  files,
  onChanged,
}: {
  consultation: Consultation;
  files: ConsultationStageFile[];
  onChanged: (value: Consultation) => void;
}) {
  const dpFiles = files.filter((f) => f.stage === "dp_pending" || ["invoice", "payment_proof"].includes(f.kind));
  const finalFiles = files.filter(
    (f) => f.stage === "project_paid" || f.stage === "project_running" || ["final_invoice", "final_payment_proof"].includes(f.kind),
  );
  return (
    <Section
      title="Pembayaran (DP & Pelunasan)"
      description="Verifikasi bukti transfer Uang Muka (DP) serta kelola tagihan dan pelunasan akhir setelah progres mencapai 85%."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <StagePanel title="1. Uang Muka (DP)">
          <PaymentPanel
            consultation={consultation}
            role="admin"
            kind="dp"
            files={dpFiles}
            onChanged={onChanged}
          />
        </StagePanel>
        <StagePanel title="2. Pelunasan Akhir">
          <PaymentPanel
            consultation={consultation}
            role="admin"
            kind="final"
            files={finalFiles}
            onChanged={onChanged}
          />
        </StagePanel>
      </div>
    </Section>
  );
}

function DocumentsSection({ consultation, files }: { consultation: Consultation; files: ConsultationStageFile[] }) {
  const uploaded = (consultation.attachments || []).map((path, index) => ({
    key: `attachment-${index}`,
    label: `Lampiran pelanggan ${index + 1}`,
    path,
    meta: "Dikirim bersama permintaan awal",
  }));
  const workflow = files.map((item) => ({
    key: `file-${item.id}`,
    label: String(item.kind).replace(/_/g, " "),
    path: item.file_path,
    meta: new Date(item.created_at).toLocaleString("id-ID"),
  }));
  const special = [
    {
      key: "agreement-final",
      label: "Perjanjian Final (Bertanda Tangan)",
      path: consultation.final_agreement_path,
      meta: "Ditandatangani kedua pihak",
    },
  ].filter((item) => item.path);

  const documents = [...uploaded, ...workflow, ...special] as { key: string; label: string; path: string; meta: string }[];
  return (
    <Section title="Dokumen Konsultasi" description="Seluruh lampiran pelanggan, invoice, bukti bayar, dan surat perjanjian.">
      {documents.length === 0 ? (
        <Empty text="Belum ada dokumen yang terunggah." />
      ) : (
        <div className="divide-y divide-[#F1ECE4] rounded-xl border border-[#EAE4DA]">
          {documents.map((doc) => (
            <a
              key={doc.key}
              href={fileUrl(doc.path)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#FAF8F4]"
            >
              <FileText className="size-5 shrink-0 text-[#5E93B8]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium capitalize text-[#232528]">{doc.label}</p>
                <p className="text-xs text-[#656B73]">{doc.meta}</p>
              </div>
              <ChevronRight className="size-4 text-[#656B73]" />
            </a>
          ))}
        </div>
      )}
    </Section>
  );
}

function ProgressSection({
  consultation,
  editable,
  updates,
  onRun,
  onChanged,
  onGoPayment,
}: {
  consultation: Consultation;
  editable: boolean;
  updates: ConsultationProgressUpdate[];
  onRun: (label: string, fn: () => Promise<Consultation>) => Promise<void>;
  onChanged: (value: Consultation) => void;
  onGoPayment: () => void;
}) {
  const photosRef = useRef<HTMLInputElement>(null);
  const finalPaid = Boolean(consultation.final_payment_paid_at);
  const maxPct = finalPaid ? 100 : 85;
  const [percentage, setPercentage] = useState<string>(String(Math.min(maxPct, consultation.project_progress ?? 0)));
  const [note, setNote] = useState("");
  const canPost = editable && ["project_paid", "project_running"].includes(consultation.status);

  return (
    <div className="space-y-6">
      {canPost && (
        <Section
          title="Tambah Pembaruan Progres"
          description="Kirim persentase perkembangan terbaru beserta foto lapangan untuk pelanggan."
        >
          <div className="max-w-xl">
            <ProgressForm
              percentage={percentage}
              maxPct={maxPct}
              finalPaid={finalPaid}
              setPercentage={setPercentage}
              note={note}
              setNote={setNote}
              photosRef={photosRef}
              onGoPayment={onGoPayment}
              onSubmit={async () => {
                await onRun("Pembaruan progres", () =>
                  postProgress(
                    consultation.id,
                    Number(percentage),
                    note || undefined,
                    Array.from(photosRef.current?.files || []),
                  ),
                );
                setNote("");
                if (photosRef.current) photosRef.current.value = "";
              }}
            />
          </div>
        </Section>
      )}

      <Section title="Riwayat Progres & Komentar" description="Dokumentasi perkembangan proyek serta pertanyaan pelanggan.">
        {updates.length === 0 ? (
          <Empty text="Belum ada pembaruan progres yang dikirim." />
        ) : (
          <ConsultationStageSheet stage="project_running" consultation={consultation} role="admin" onChanged={onChanged} />
        )}
      </Section>
    </div>
  );
}

function QuestionsSection({
  questions,
  onOpenProgress,
}: {
  questions: { update: ConsultationProgressUpdate; comment: ConsultationProgressComment; answered: boolean }[];
  onOpenProgress: () => void;
}) {
  return (
    <Section title="Pertanyaan Pelanggan" description="Pertanyaan yang ditulis pelanggan pada setiap pembaruan progres.">
      {questions.length === 0 ? (
        <Empty text="Belum ada pertanyaan dari pelanggan." />
      ) : (
        <div className="space-y-3">
          {questions.map(({ update, comment, answered }) => (
            <div key={comment.id} className="rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#5E93B8]">Pembaruan {update.percentage}%</span>
                    <KitStatusBadge tone={answered ? "success" : "warning"} dot={false} className="text-[10px]">
                      {answered ? "Sudah dijawab" : "Belum dijawab"}
                    </KitStatusBadge>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#232528]">{comment.body}</p>
                  <p className="mt-1.5 text-xs text-[#656B73]">
                    {comment.author?.name || "Pelanggan"} · {new Date(comment.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenProgress}
                  className="shrink-0 rounded-full border border-[#E2DACF] bg-white px-3.5 py-1.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
                >
                  Lihat &amp; Balas
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function HistorySection({
  activities,
  history,
}: {
  activities: ConsultationActivity[];
  history: ConsultationStatusHistoryEntry[];
}) {
  const entries = [
    ...activities.map((item) => ({ id: `a-${item.id}`, date: item.created_at, title: item.title, body: item.body })),
    ...history.map((item) => ({
      id: `h-${item.id}`,
      date: item.created_at,
      title: `Status berubah ke: ${STATUS_LABELS[item.new_status] || item.new_status}`,
      body: item.note,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Section title="Riwayat Aktivitas" description="Log lengkap perubahan tahap dan aktivitas konsultasi.">
      {entries.length === 0 ? (
        <Empty text="Belum ada aktivitas yang tercatat." />
      ) : (
        <ol className="ml-2 border-l-2 border-[#EAE4DA] pl-5">
          {entries.map((item) => (
            <li
              key={item.id}
              className="relative pb-5 before:absolute before:-left-[25px] before:top-1.5 before:size-2.5 before:rounded-full before:bg-[#5E93B8]"
            >
              <p className="text-sm font-medium text-[#232528]">{item.title}</p>
              {item.body && <p className="mt-1 text-sm text-[#656B73]">{item.body}</p>}
              <p className="mt-1 text-xs text-[#656B73]/80">{new Date(item.date).toLocaleString("id-ID")}</p>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function ActionsRail({
  consultation,
  editable,
  onRun,
  onScheduled,
  onChanged,
  onGoPayment,
}: {
  consultation: Consultation;
  editable: boolean;
  onRun: (label: string, fn: () => Promise<Consultation>) => Promise<void>;
  onScheduled: () => void;
  onChanged: (value: Consultation) => void;
  onGoPayment: () => void;
}) {
  const dialog = useAdminDialog();
  const status = consultation.status;
  const finalPaid = Boolean(consultation.final_payment_paid_at);
  const maxPct = finalPaid ? 100 : 85;

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
  const [percentage, setPercentage] = useState<string>(String(Math.min(maxPct, consultation.project_progress ?? 0)));
  const [progressNote, setProgressNote] = useState("");

  if (!editable) {
    return (
      <p className="rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-4 text-sm text-[#656B73]">
        Mode lihat saja — Anda tidak dapat menjalankan perubahan tahap konsultasi.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/60 p-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#5E93B8]">Tahap Saat Ini</p>
        <p className="font-header text-xl text-[#232528]">{STATUS_LABELS[status] || status}</p>
      </div>

      {(status === "new_inquiry" || status === "under_review") && (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => void onRun("Persetujuan konsultasi", () => approveConsultation(consultation.id))}
            className="w-full rounded-full bg-[#232528] py-2.5 text-xs font-medium text-white hover:bg-[#34383D]"
          >
            Setujui &amp; Buka Ruang Chat Pelanggan
          </button>
          <button
            type="button"
            onClick={async () => {
              const reason = await dialog.prompt({
                title: "Tolak permintaan konsultasi ini?",
                label: "Alasan penolakan (akan dicatat dan diinformasikan ke pelanggan)",
                placeholder: "mis. Area di luar jangkauan layanan atau jadwal penuh",
                danger: true,
                confirmLabel: "Tolak Permintaan",
              });
              if (!reason) return;
              await onRun("Penolakan konsultasi", () => rejectConsultation(consultation.id, reason));
            }}
            className="w-full rounded-full border border-red-200 bg-white py-2.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Tolak Permintaan
          </button>
        </div>
      )}

      {(status === "contacted" || status === "meeting_scheduled") && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#232528]">Atur Jadwal Pertemuan</p>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="text-[11px] text-[#656B73]">Tanggal *</span>
              <input
                type="date"
                value={meeting.meeting_date}
                onChange={(e) => setMeeting({ ...meeting, meeting_date: e.target.value })}
                className="ui-input mt-1 bg-white"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-[#656B73]">Jam</span>
              <input
                type="time"
                value={meeting.meeting_time}
                onChange={(e) => setMeeting({ ...meeting, meeting_time: e.target.value })}
                className="ui-input mt-1 bg-white"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] text-[#656B73]">Format Pertemuan</span>
            <select
              value={meeting.meeting_type}
              onChange={(e) => setMeeting({ ...meeting, meeting_type: e.target.value })}
              className="ui-input mt-1 bg-white"
            >
              <option value="online">Online (Video Call / Zoom / Meet)</option>
              <option value="call">Telepon / WhatsApp Call</option>
              <option value="offline">Tatap Muka (Showroom / Kunjungan Lokasi)</option>
            </select>
          </label>
          <input
            placeholder="Lokasi pertemuan (opsional)"
            value={meeting.meeting_location}
            onChange={(e) => setMeeting({ ...meeting, meeting_location: e.target.value })}
            className="ui-input bg-white"
          />
          <input
            placeholder="Tautan meeting (Zoom / Google Meet)"
            value={meeting.meeting_link}
            onChange={(e) => setMeeting({ ...meeting, meeting_link: e.target.value })}
            className="ui-input bg-white"
          />
          <button
            type="button"
            disabled={!meeting.meeting_date}
            onClick={async () => {
              await onRun("Penjadwalan pertemuan", () => apiScheduleMeeting(consultation.id, meeting));
              onScheduled();
            }}
            className="w-full rounded-full bg-[#232528] py-2.5 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-45"
          >
            Simpan &amp; Jadwalkan Pertemuan
          </button>
          {status === "meeting_scheduled" && (
            <button
              type="button"
              onClick={() => void onRun("Mulai pertemuan", () => startMeeting(consultation.id))}
              className="w-full rounded-full border border-[#5E93B8]/40 bg-[#EDF4F8] py-2.5 text-xs font-medium text-[#35678B] hover:bg-[#DFECF4]"
            >
              Tandai Pertemuan Dimulai
            </button>
          )}
        </div>
      )}

      {/* FIXED: Saat in_progress, gunakan AgreementComposer agar e-Meterai & tanda tangan digital aktif! */}
      {status === "in_progress" && (
        <div className="space-y-4">
          <AgreementComposer consultation={consultation} onChanged={onChanged} />
          <details className="rounded-xl border border-[#EAE4DA] bg-white p-3.5">
            <summary className="cursor-pointer text-xs font-medium text-[#656B73]">
              Atau unggah file PDF perjanjian manual (tanpa naskah otomatis)
            </summary>
            <div className="mt-3 space-y-2.5">
              <input ref={agreementRef} type="file" accept=".pdf,application/pdf" className="text-xs" />
              <button
                type="button"
                onClick={() => {
                  const f = agreementRef.current?.files?.[0];
                  if (!f) return toast.error("Pilih file PDF perjanjian terlebih dahulu.");
                  void onRun("Unggah perjanjian manual", () => uploadAgreement(consultation.id, f));
                }}
                className="w-full rounded-full border border-[#232528] py-2 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4]"
              >
                Unggah PDF Manual &amp; Lanjut ke Perjanjian
              </button>
            </div>
          </details>
        </div>
      )}

      {status === "agreement_pending" && (
        <div className="space-y-3">
          {consultation.livora_countersigned_at ? (
            <>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Perjanjian sudah ditandatangani kedua pihak
                {consultation.final_agreement_path ? " & dokumen final telah dibuat." : "."}
              </div>
              <p className="pt-1 text-xs font-semibold text-[#232528]">Ajukan Tagihan Uang Muka (DP)</p>
              <input
                type="number"
                placeholder="Nominal DP (IDR)"
                value={dpAmount}
                onChange={(e) => setDpAmount(e.target.value)}
                className="ui-input bg-white"
              />
              <textarea
                rows={2}
                placeholder="Catatan pembayaran / rekening (opsional)"
                value={dpNote}
                onChange={(e) => setDpNote(e.target.value)}
                className="ui-input bg-white"
              />
              <input ref={invoiceRef} type="file" className="text-xs" />
              <button
                type="button"
                disabled={!dpAmount || Number(dpAmount) <= 0}
                onClick={async () => {
                  const ok = await dialog.confirm({
                    title: "Kirim tagihan DP ke pelanggan?",
                    text: `Tagihan sebesar Rp ${Number(dpAmount).toLocaleString("id-ID")} akan dikirim ke pelanggan.`,
                    confirmLabel: "Ya, kirim tagihan DP",
                  });
                  if (!ok) return;
                  await onRun("Pengiriman tagihan DP", () =>
                    requestDp(consultation.id, Number(dpAmount), dpNote || undefined, invoiceRef.current?.files?.[0]),
                  );
                }}
                className="w-full rounded-full bg-[#232528] py-2.5 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-45"
              >
                Kirim Tagihan &amp; Lanjut ke Menunggu DP
              </button>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-[#232528]">
                {consultation.agreement_signed_at
                  ? "Tinjau & Tanda Tangani Balik sebagai LIVORA"
                  : "Menunggu Tanda Tangan Pelanggan"}
              </p>
              <StageContent stage="agreement_pending" consultation={consultation} role="admin" onChanged={onChanged} />
            </>
          )}
        </div>
      )}

      {status === "dp_pending" && (
        <div className="space-y-3">
          {consultation.dp_paid_at ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              DP sudah terverifikasi pada {new Date(consultation.dp_paid_at).toLocaleDateString("id-ID")}.
            </div>
          ) : (
            <>
              <p className="text-xs text-[#656B73]">
                Periksa bukti transfer di tab <strong>Pembayaran</strong> terlebih dahulu sebelum menandai DP diterima.
              </p>
              <button
                type="button"
                onClick={onGoPayment}
                className="w-full rounded-full border border-[#5E93B8]/40 bg-[#EDF4F8] py-2 text-xs font-medium text-[#35678B]"
              >
                Buka Tab Pembayaran &amp; Cek Bukti Transfer
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await dialog.confirm({
                    title: "Tandai Uang Muka (DP) sudah diterima?",
                    text: "Status proyek akan berpindah ke DP Diterima. Pastikan dana benar-benar sudah masuk rekening LIVORA.",
                    confirmLabel: "Ya, konfirmasi DP diterima",
                  });
                  if (!ok) return;
                  await onRun("Konfirmasi DP diterima", () => markDpPaid(consultation.id));
                }}
                className="w-full rounded-full bg-[#232528] py-2.5 text-xs font-medium text-white hover:bg-[#34383D]"
              >
                Konfirmasi DP Sudah Diterima
              </button>
            </>
          )}
        </div>
      )}

      {(status === "project_paid" || status === "project_running") && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#232528]">
            {status === "project_paid" ? "Kirim Pembaruan Progres Pertama" : "Kirim Pembaruan Progres"}
          </p>
          <ProgressForm
            percentage={percentage}
            maxPct={maxPct}
            finalPaid={finalPaid}
            setPercentage={setPercentage}
            note={progressNote}
            setNote={setProgressNote}
            photosRef={progressPhotosRef}
            onGoPayment={onGoPayment}
            onSubmit={async () => {
              await onRun("Pembaruan progres", () =>
                postProgress(
                  consultation.id,
                  Number(percentage),
                  progressNote || undefined,
                  Array.from(progressPhotosRef.current?.files || []),
                ),
              );
              setProgressNote("");
              if (progressPhotosRef.current) progressPhotosRef.current.value = "";
            }}
          />

          {status === "project_running" && (
            <button
              type="button"
              onClick={async () => {
                const ok = await dialog.confirm({
                  title: "Tandai proyek konsultasi selesai?",
                  text: "Pastikan seluruh pekerjaan & pelunasan sudah rampung. Status akan berubah menjadi Selesai.",
                  confirmLabel: "Ya, tandai selesai",
                });
                if (!ok) return;
                await onRun("Penyelesaian proyek", () => completeConsultation(consultation.id));
              }}
              className="mt-2 w-full rounded-full border border-emerald-300 bg-emerald-50 py-2.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
            >
              Tandai Proyek Selesai (100%)
            </button>
          )}
        </div>
      )}

      {status === "completed" && <p className="text-xs font-medium text-emerald-700">Proyek sudah selesai sepenuhnya.</p>}
      {status === "cancelled" && <p className="text-xs font-medium text-red-600">Konsultasi ini dibatalkan.</p>}
      {status === "rejected" && <p className="text-xs font-medium text-amber-700">Permintaan ini telah ditolak.</p>}
    </div>
  );
}

function ProgressForm({
  percentage,
  maxPct,
  finalPaid,
  setPercentage,
  note,
  setNote,
  photosRef,
  onGoPayment,
  onSubmit,
}: {
  percentage: string;
  maxPct: number;
  finalPaid: boolean;
  setPercentage: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  photosRef: React.RefObject<HTMLInputElement>;
  onGoPayment: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={maxPct}
          value={Math.min(maxPct, Number(percentage) || 0)}
          onChange={(e) => setPercentage(e.target.value)}
          className="flex-1 accent-[#5E93B8]"
        />
        <span className="w-12 text-right text-sm font-semibold text-[#232528]">
          {Math.min(maxPct, Number(percentage) || 0)}%
        </span>
      </div>
      {!finalPaid && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
          <span>Batas progres sebelum pelunasan adalah 85%.</span>
          <button type="button" onClick={onGoPayment} className="shrink-0 font-semibold text-[#35678B] hover:underline">
            Tagih Pelunasan →
          </button>
        </div>
      )}
      <textarea
        rows={2}
        placeholder="Apa saja pekerjaan yang diselesaikan pada pembaruan ini?"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="ui-input bg-white"
      />
      <input ref={photosRef} type="file" multiple accept="image/*" className="text-xs" />
      <button
        type="button"
        onClick={onSubmit}
        className="w-full rounded-full bg-[#232528] py-2.5 text-xs font-medium text-white hover:bg-[#34383D]"
      >
        Kirim Pembaruan Progres
      </button>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#EAE4DA] bg-white p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="font-header text-xl text-[#232528]">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-[#656B73]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function StagePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/50 p-4">
      <h3 className="font-header mb-3 text-base text-[#232528]">{title}</h3>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-[#F0EAE0] bg-[#FAF8F4]/50 p-3.5">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#656B73]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#232528]">{value || "Belum ditentukan"}</p>
    </div>
  );
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#F1ECE4] pb-2.5 text-sm last:border-0 last:pb-0">
      <span className="text-[#656B73]">{label}</span>
      <strong className="text-right text-[#232528]">{value}</strong>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#DED7CC] px-5 py-10 text-center text-sm text-[#656B73]">
      {text}
    </div>
  );
}
