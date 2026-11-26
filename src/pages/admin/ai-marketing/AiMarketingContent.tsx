// path: src/pages/admin/ai-marketing/AiMarketingContent.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Instagram,
  Facebook,
  Mail,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AgentPageShell } from "@/components/ai/agent-page";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { LastUpdated } from "@/components/ai/section-state";
import { NotConnected, Panel, Pill, SectionHeading, StatusDot, type Tone } from "@/components/ai/primitives";
import { QueryError } from "@/components/ai/query-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  extractApiErrorMessage,
  useAgent,
  useContentQueue,
  useCreateContentDraft,
  useDeleteContentDraft,
  useMetaIntegrationStatus,
  usePushDraftToEmail,
  useUpdateContentDraft,
} from "@/hooks/useAiDashboard";
import { useAiMarketingContext, usePageContext } from "@/context/AiMarketingContext";
import { useAdminDialog } from "@/components/admin/kit";
import { ContentKpiGrid, EngagementTrendPanel, SocialPerformanceRows } from "@/components/ai/marketing-panels";
import { ContentInspirationPanel } from "@/components/ai/content-inspiration";
import type { AiContentDraftItem, MetaConnectionState } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

function metaStatusMeta(status: MetaConnectionState): { tone: Tone; label: string } {
  switch (status) {
    case "ok":
      return { tone: "success", label: "Connected" };
    case "invalid_token":
      return { tone: "danger", label: "Invalid token" };
    case "permission_required":
      return { tone: "warning", label: "Permission required" };
    case "api_error":
      return { tone: "danger", label: "API error" };
    case "not_configured":
    default:
      return { tone: "neutral", label: "Not connected" };
  }
}

function MetaPlatformStatus({
  icon: Icon,
  label,
  connected,
  status,
  name,
}: {
  icon: LucideIcon;
  label: string;
  connected: boolean;
  status: MetaConnectionState;
  name: string | null;
}) {
  const meta = metaStatusMeta(status);
  return (
    <div className="flex items-start gap-3 rounded-sm border border-border bg-background/40 p-4">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          <Pill tone={meta.tone}>
            <StatusDot tone={meta.tone} />
            {meta.label}
          </Pill>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">{connected && name ? name : "—"}</p>
      </div>
    </div>
  );
}

/**
 * Kartu "Instagram & Facebook" di Content Agent — status koneksi real dari
 * Meta Graph API (read-only), lewat GET /ai/content/meta/status.
 * Selama META_GRAPH_ACCESS_TOKEN belum diisi backend akan balas
 * `not_configured`, jadi kartu jatuh balik ke `IntegrationRequired` yang
 * sudah ada (bukan menampilkan data kosong yang membingungkan).
 */
function MetaConnectionCard() {
  const { data, isLoading, isFetching, isError, refetch } = useMetaIntegrationStatus();

  if (!isLoading && !isError && data && data.status === "not_configured") {
    return (
      <IntegrationRequired
        provider="Instagram & Facebook (Meta Graph API)"
        title="Meta Graph API belum tersambung"
        description="Butuh Page Access Token dengan scope instagram_basic, instagram_manage_insights, pages_read_engagement, dan ID Instagram Business yang tertaut ke Facebook Page Livora."
        envKeys={[
          { key: "META_GRAPH_ACCESS_TOKEN", note: "Page/System User token long-lived" },
          { key: "META_PAGE_ID" },
          { key: "META_INSTAGRAM_BUSINESS_ID" },
        ]}
      />
    );
  }

  return (
    <Panel className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-display rule-accent text-lg">Instagram & Facebook</h3>
        <div className="flex items-center gap-3">
          {data ? <LastUpdated at={data.lastCheckedAt} refreshing={isFetching && !isLoading} /> : null}
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-accent/40 disabled:opacity-50"
          >
            <RefreshCcw className={cn("size-3", isFetching && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memeriksa status koneksi…</p>
      ) : isError || !data ? (
        <NotConnected
          title="Gagal memeriksa status koneksi"
          description="Tidak bisa menghubungi endpoint Meta Graph API. Coba refresh lagi."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <MetaPlatformStatus
            icon={Facebook}
            label="Facebook Page"
            connected={data.facebook.connected}
            status={data.facebook.status}
            name={data.facebook.name}
          />
          <MetaPlatformStatus
            icon={Instagram}
            label="Instagram"
            connected={data.instagram.connected}
            status={data.instagram.status}
            name={data.instagram.username ? `@${data.instagram.username}` : null}
          />
        </div>
      )}
    </Panel>
  );
}

type DraftChannel = AiContentDraftItem["channel"];
type DraftStatus = AiContentDraftItem["status"];

const DRAFT_CHANNELS: DraftChannel[] = ["instagram", "tiktok", "youtube", "facebook", "email", "website"];
const DRAFT_STATUSES: DraftStatus[] = ["needs_review", "approved", "scheduled", "published", "draft"];

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ContentAgentPage() {
  usePageContext("content");
  const dialog = useAdminDialog();
  const navigate = useNavigate();
  const { dateRange } = useAiMarketingContext();
  const { agent, isLoading: agentLoading } = useAgent("content");
  const { data: queue = [], isLoading: queueLoading, isError: queueError, refetch: refetchQueue } = useContentQueue();
  const createDraft = useCreateContentDraft();
  const updateDraft = useUpdateContentDraft();
  const deleteDraft = useDeleteContentDraft();
  const pushToEmail = usePushDraftToEmail();

  const [queueSearch, setQueueSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | DraftChannel>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | DraftStatus>("all");
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    title: "",
    channel: "instagram" as DraftChannel,
    headline: "",
    caption: "",
    body: "",
    cta_label: "Jadwalkan Konsultasi",
  });

  const [editingDraft, setEditingDraft] = useState<AiContentDraftItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    channel: "instagram" as DraftChannel,
    headline: "",
    caption: "",
    body: "",
    cta_label: "",
    status: "needs_review" as DraftStatus,
    scheduled_for: "",
  });

  const filteredQueue = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    return queue.filter((d) => {
      if (channelFilter !== "all" && d.channel !== channelFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (q && !`${d.title} ${d.caption ?? ""} ${d.headline ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [queue, queueSearch, channelFilter, statusFilter]);

  function openEditModal(d: AiContentDraftItem) {
    setEditingDraft(d);
    setEditForm({
      title: d.title,
      channel: d.channel,
      headline: d.headline ?? "",
      caption: d.caption ?? "",
      body: d.body ?? "",
      cta_label: d.ctaLabel ?? "Jadwalkan Konsultasi",
      status: d.status,
      scheduled_for: toDatetimeLocalValue(d.scheduledFor),
    });
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.title.trim()) return;
    try {
      await createDraft.mutateAsync({
        title: newForm.title.trim(),
        channel: newForm.channel,
        headline: newForm.headline.trim() || newForm.title.trim(),
        caption: newForm.caption.trim() || null,
        body: newForm.body.trim() || newForm.caption.trim() || null,
        cta_label: newForm.cta_label.trim() || "Jadwalkan Konsultasi",
      });
      toast.success("Draft konten baru ditambahkan ke queue.");
      setNewOpen(false);
      setNewForm({
        title: "",
        channel: "instagram",
        headline: "",
        caption: "",
        body: "",
        cta_label: "Jadwalkan Konsultasi",
      });
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal membuat draft konten."));
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDraft) return;
    setBusyDraftId(editingDraft.id);
    try {
      await updateDraft.mutateAsync({
        id: editingDraft.id,
        body: {
          title: editForm.title.trim() || editingDraft.title,
          channel: editForm.channel,
          headline: editForm.headline.trim(),
          caption: editForm.caption.trim(),
          body: editForm.body.trim(),
          cta_label: editForm.cta_label.trim(),
          status: editForm.status,
          ...(editForm.scheduled_for ? { scheduled_for: new Date(editForm.scheduled_for).toISOString() } : {}),
        },
      });
      toast.success("Draft konten diperbarui.");
      setEditingDraft(null);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal memperbarui draft."));
    } finally {
      setBusyDraftId(null);
    }
  }

  async function handleApproveDraft(id: string) {
    setBusyDraftId(id);
    try {
      await updateDraft.mutateAsync({ id, body: { status: "approved" } });
      toast.success("Draft konten disetujui.");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal memperbarui draft."));
    } finally {
      setBusyDraftId(null);
    }
  }

  async function handleDeleteDraft(id: string) {
    const target = queue.find((q) => q.id === id);
    const ok = await dialog.confirm({
      title: "Hapus Draft Konten?",
      description: `Draft "${target?.title ?? "ini"}" akan dihapus permanen dari Content Queue.`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!ok) return;
    setBusyDraftId(id);
    try {
      await deleteDraft.mutateAsync(id);
      toast.success("Draft dihapus dari Content Queue.");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menghapus draft."));
    } finally {
      setBusyDraftId(null);
    }
  }

  async function handleOpenEmailStudio(id: string) {
    setBusyDraftId(id);
    try {
      const res = await pushToEmail.mutateAsync(id);
      navigate(res.redirectPath);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal membuat draft Email Marketing."));
    } finally {
      setBusyDraftId(null);
    }
  }

  return (
    <AgentPageShell agent={agent} loading={agentLoading}>
      <section className="mt-10">
        <SectionHeading
          title="Social media — performance tracking"
          description="Follower, cadence dan engagement per platform. Angka kosong sampai akun sosial tersambung — tidak ada angka ilustratif."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ContentKpiGrid />
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Panel className="flex h-full flex-col p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-display rule-accent text-lg">Platforms</h3>
            <span className="text-[11px] text-muted-foreground">({dateRange.days} Days)</span>
          </div>
          <div className="flex-1"><SocialPerformanceRows /></div>
        </Panel>
        <EngagementTrendPanel />
      </section>

      <section className="mt-6">
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h3 className="text-display text-lg">Content Queue ({queue.length})</h3>
              <p className="text-xs text-muted-foreground">
                Buat draft manual, kelola jadwal terbit, edit brief/caption, atau kirim ke Email Marketing Studio.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  placeholder="Cari draft..."
                  className="h-8 w-40 rounded-sm border border-border bg-secondary/60 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
                />
              </div>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as "all" | DraftChannel)}
                className="h-8 rounded-sm border border-border bg-secondary px-2 text-xs text-foreground focus:border-ai focus:outline-none"
              >
                <option value="all">Semua Channel</option>
                {DRAFT_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>{ch.toUpperCase()}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | DraftStatus)}
                className="h-8 rounded-sm border border-border bg-secondary px-2 text-xs text-foreground focus:border-ai focus:outline-none"
              >
                <option value="all">Semua Status</option>
                {DRAFT_STATUSES.map((st) => (
                  <option key={st} value={st}>{st.replace("_", " ")}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-sm bg-ai px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90"
              >
                <Plus className="size-3.5" /> Tambah Draft
              </button>
            </div>
          </div>

          {queueLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Memuat antrian konten…
            </div>
          ) : queueError ? (
            <div className="p-5">
              <QueryError message="Gagal memuat Content Queue." onRetry={() => void refetchQueue()} />
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="p-5">
              <NotConnected
                title={queue.length === 0 ? "Antrian konten masih kosong" : "Tidak ada draft yang cocok"}
                description={
                  queue.length === 0
                    ? "Klik Run Analysis di atas, Tambah Draft manual, atau simpan ide dari Video & Market Recommender di bawah."
                    : "Ubah filter pencarian/channel/status untuk melihat draft lainnya."
                }
              />
            </div>
          ) : (
            <div className="scroll-rail">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["Draft", "Channel", "Headline / Caption", "Status", "Action"].map((h) => (
                      <th key={h} className="label-eyebrow px-5 py-3 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.map((d) => {
                    const refUrl = typeof d.meta?.reference_url === "string" ? d.meta.reference_url : null;
                    const rowBusy = busyDraftId === d.id;
                    return (
                      <tr key={d.id} className="border-b border-border last:border-0 hover:bg-accent/20">
                        <td className="px-5 py-4 font-medium">
                          <div className="max-w-xs">{d.title}</div>
                          {d.scheduledFor ? (
                            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                              Jadwal: {new Date(d.scheduledFor).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          ) : null}
                          {refUrl ? (
                            <a
                              href={refUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-[11px] font-normal text-ai hover:underline"
                            >
                              Lihat video referensi ↗
                            </a>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 uppercase font-mono text-xs text-muted-foreground">{d.channel}</td>
                        <td className="max-w-md px-5 py-4 text-xs text-muted-foreground">
                          {d.caption ? (d.caption.length > 120 ? `${d.caption.slice(0, 120)}…` : d.caption) : d.headline ?? "—"}
                        </td>
                        <td className="px-5 py-4">
                          <Pill tone={d.status === "scheduled" || d.status === "published" ? "success" : d.status === "approved" ? "info" : "warning"}>
                            {d.status.replace("_", " ")}
                          </Pill>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(d)}
                              disabled={rowBusy}
                              className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs text-foreground/90 hover:bg-accent disabled:opacity-50"
                            >
                              <Pencil className="size-3" /> Edit
                            </button>
                            {d.status === "needs_review" && (
                              <button
                                type="button"
                                onClick={() => handleApproveDraft(d.id)}
                                disabled={rowBusy}
                                className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs hover:bg-accent disabled:opacity-50"
                              >
                                {rowBusy ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                                Approve
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEmailStudio(d.id)}
                              disabled={rowBusy}
                              className="inline-flex items-center gap-1 rounded border border-ai/40 bg-ai/10 px-2.5 py-1 text-xs text-ai hover:bg-ai/20 disabled:opacity-50"
                            >
                              <Mail className="size-3" /> Email Studio
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDraft(d.id)}
                              disabled={rowBusy}
                              title="Hapus draft"
                              className="inline-flex items-center justify-center rounded border border-border p-1.5 text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
                            >
                              {rowBusy ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </section>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border-strong bg-popover text-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-display text-lg">Buat Draft Konten Baru</DialogTitle>
            <DialogDescription>Tambahkan ide konten baru untuk dijadwalkan atau diolah lewat Email Studio.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-3">
            <div>
              <label className="label-eyebrow mb-1 block">Judul Draft *</label>
              <input
                required
                value={newForm.title}
                onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Mis. Tren Travertine & Warm Minimalism 2026"
                className="w-full rounded border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-eyebrow mb-1 block">Channel</label>
                <select
                  value={newForm.channel}
                  onChange={(e) => setNewForm((f) => ({ ...f, channel: e.target.value as DraftChannel }))}
                  className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:border-ai focus:outline-none"
                >
                  {DRAFT_CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>{ch.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-eyebrow mb-1 block">CTA Label</label>
                <input
                  value={newForm.cta_label}
                  onChange={(e) => setNewForm((f) => ({ ...f, cta_label: e.target.value }))}
                  className="w-full rounded border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground focus:border-ai focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="label-eyebrow mb-1 block">Hook / Headline</label>
              <input
                value={newForm.headline}
                onChange={(e) => setNewForm((f) => ({ ...f, headline: e.target.value }))}
                placeholder="Kalimat pembuka 3 detik / subjek email"
                className="w-full rounded border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div>
              <label className="label-eyebrow mb-1 block">Caption</label>
              <textarea
                rows={3}
                value={newForm.caption}
                onChange={(e) => setNewForm((f) => ({ ...f, caption: e.target.value }))}
                placeholder="Tulis caption / CTA utama..."
                className="w-full rounded border border-border bg-secondary/60 p-3 text-sm text-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div>
              <label className="label-eyebrow mb-1 block">Brief / Shot List (opsional)</label>
              <textarea
                rows={3}
                value={newForm.body}
                onChange={(e) => setNewForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Detail visual, referensi, atau script singkat"
                className="w-full rounded border border-border bg-secondary/60 p-3 text-sm text-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={createDraft.isPending || !newForm.title.trim()}
                className="inline-flex items-center gap-1.5 rounded bg-ai px-3.5 py-1.5 text-xs font-semibold text-background disabled:opacity-50"
              >
                {createDraft.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Simpan Draft
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDraft} onOpenChange={(o) => !o && setEditingDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border-strong bg-popover text-foreground sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-display text-lg">Edit & Jadwalkan Draft</DialogTitle>
            <DialogDescription>Perbarui copy, status review, atau jadwal publikasi konten.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <div>
              <label className="label-eyebrow mb-1 block">Judul</label>
              <input
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="label-eyebrow mb-1 block">Channel</label>
                <select
                  value={editForm.channel}
                  onChange={(e) => setEditForm((f) => ({ ...f, channel: e.target.value as DraftChannel }))}
                  className="w-full rounded border border-border bg-secondary px-2.5 py-2 text-xs text-foreground focus:border-ai focus:outline-none"
                >
                  {DRAFT_CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>{ch.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-eyebrow mb-1 block">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as DraftStatus }))}
                  className="w-full rounded border border-border bg-secondary px-2.5 py-2 text-xs text-foreground focus:border-ai focus:outline-none"
                >
                  {DRAFT_STATUSES.map((st) => (
                    <option key={st} value={st}>{st.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-eyebrow mb-1 block">Jadwal Terbit</label>
                <input
                  type="datetime-local"
                  value={editForm.scheduled_for}
                  onChange={(e) => setEditForm((f) => ({ ...f, scheduled_for: e.target.value }))}
                  className="w-full rounded border border-border bg-secondary px-2 py-2 text-xs text-foreground focus:border-ai focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="label-eyebrow mb-1 block">Headline / Hook</label>
              <input
                value={editForm.headline}
                onChange={(e) => setEditForm((f) => ({ ...f, headline: e.target.value }))}
                className="w-full rounded border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div>
              <label className="label-eyebrow mb-1 block">Caption</label>
              <textarea
                rows={3}
                value={editForm.caption}
                onChange={(e) => setEditForm((f) => ({ ...f, caption: e.target.value }))}
                className="w-full rounded border border-border bg-secondary/60 p-3 text-sm text-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div>
              <label className="label-eyebrow mb-1 block">Brief / Shot List</label>
              <textarea
                rows={4}
                value={editForm.body}
                onChange={(e) => setEditForm((f) => ({ ...f, body: e.target.value }))}
                className="w-full rounded border border-border bg-secondary/60 p-3 text-sm text-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
                className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={updateDraft.isPending}
                className="inline-flex items-center gap-1.5 rounded bg-ai px-3.5 py-1.5 text-xs font-semibold text-background disabled:opacity-50"
              >
                {updateDraft.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Simpan Perubahan
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ContentInspirationPanel />

      <section className="mt-10">
        <SectionHeading
          title="Sambungan Akun Sosial Media"
          description="Status koneksi Instagram, Facebook, TikTok, dan YouTube. Detail teknis untuk Tim IT ada di dalam kartu."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <MetaConnectionCard />
          <IntegrationRequired
            provider="TikTok & YouTube"
            title="TikTok Business dan YouTube Data API belum tersambung"
            description="Dipakai untuk jumlah posting, views dan engagement mingguan."
            envKeys={[
              { key: "TIKTOK_ACCESS_TOKEN" },
              { key: "TIKTOK_BUSINESS_ID" },
              { key: "YOUTUBE_API_KEY" },
              { key: "YOUTUBE_CHANNEL_ID" },
            ]}
          />
        </div>
      </section>

      <section className="mt-10">
        <Panel className="p-6">
          <SectionHeading title="Publishing & Email Integration" />
          <p className="text-sm text-muted-foreground">
            Rekomendasi Content Agent masuk ke Content Queue di atas sebagai draft review. Klik <span className="font-medium text-foreground">Approve &amp; Execute</span> di halaman Actions untuk membuat draft post Facebook Page (saat Meta Graph API terhubung) sekaligus menyusun draf Email Marketing di <span className="font-medium text-foreground">/admin/marketing</span>.
          </p>
        </Panel>
      </section>
    </AgentPageShell>
  );
}