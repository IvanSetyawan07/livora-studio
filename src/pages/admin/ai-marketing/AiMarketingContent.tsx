// path: src/pages/admin/ai-marketing/AiMarketingContent.tsx
import { useNavigate } from "react-router-dom";
import { Instagram, Facebook, Mail, Check, Loader2, RefreshCcw, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { AgentPageShell } from "@/components/ai/agent-page";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { LastUpdated } from "@/components/ai/section-state";
import { NotConnected, Panel, Pill, SectionHeading, StatusDot, type Tone } from "@/components/ai/primitives";
import {
  extractApiErrorMessage,
  useAgent,
  useContentQueue,
  useMetaIntegrationStatus,
  usePushDraftToEmail,
  useUpdateContentDraft,
} from "@/hooks/useAiDashboard";
import { usePageContext } from "@/context/AiMarketingContext";
import { ContentKpiGrid, EngagementTrendPanel, SocialPerformanceRows } from "@/components/ai/marketing-panels";
import { ContentInspirationPanel } from "@/components/ai/content-inspiration";
import type { MetaConnectionState } from "@/lib/ai/types";
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

export default function ContentAgentPage() {
  usePageContext("content");
  const navigate = useNavigate();
  const { agent } = useAgent("content");
  const { data: queue = [], isLoading: queueLoading } = useContentQueue();
  const updateDraft = useUpdateContentDraft();
  const pushToEmail = usePushDraftToEmail();

  async function handleApproveDraft(id: string) {
    try {
      await updateDraft.mutateAsync({ id, body: { status: "approved" } });
      toast.success("Draft konten disetujui.");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal memperbarui draft."));
    }
  }

  async function handleOpenEmailStudio(id: string) {
    try {
      const res = await pushToEmail.mutateAsync(id);
      navigate(res.redirectPath);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal membuat draft Email Marketing."));
    }
  }

  return (
    <AgentPageShell agent={agent}>
      <section className="mt-10">
        <SectionHeading
          title="Social media — performance tracking"
          description="Follower, cadence dan engagement per platform. Kerangka tetap tampil, angka kosong sampai akun sosial tersambung — tidak ada angka ilustratif."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ContentKpiGrid />
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Panel className="flex h-full flex-col p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-display rule-accent text-lg">Platforms</h3>
            <span className="text-[11px] text-muted-foreground">(30 Days)</span>
          </div>
          <div className="flex-1"><SocialPerformanceRows /></div>
        </Panel>
        <EngagementTrendPanel />
      </section>

      <section className="mt-6">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-display text-lg">Content Queue</h3>
              <p className="text-xs text-muted-foreground">
                Draft konten otomatis dari Content Agent — review, setujui, atau kirim langsung ke Email Marketing Studio.
              </p>
            </div>
          </div>
          {queueLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Memuat antrian konten…
            </div>
          ) : queue.length === 0 ? (
            <div className="p-5">
              <NotConnected
                title="Antrian konten masih kosong"
                description="Klik tombol Run Analysis di atas untuk membuat draft konten berbasis produk, proyek, dan promo Livora."
              />
            </div>
          ) : (
            <div className="scroll-rail">
              <table className="w-full min-w-[720px] text-sm">
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
                  {queue.map((d) => {
                    const refUrl = typeof d.meta?.reference_url === "string" ? d.meta.reference_url : null;
                    return (
                      <tr key={d.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-4 font-medium">
                          <div>{d.title}</div>
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
                          <div className="flex flex-wrap items-center gap-2">
                            {d.status === "needs_review" && (
                              <button
                                type="button"
                                onClick={() => handleApproveDraft(d.id)}
                                disabled={updateDraft.isPending}
                                className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs hover:bg-accent disabled:opacity-50"
                              >
                                <Check className="size-3" /> Approve
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEmailStudio(d.id)}
                              disabled={pushToEmail.isPending}
                              className="inline-flex items-center gap-1 rounded border border-ai/40 bg-ai/10 px-2.5 py-1 text-xs text-ai hover:bg-ai/20 disabled:opacity-50"
                            >
                              <Mail className="size-3" /> Edit di Email Studio
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

      <ContentInspirationPanel />

      <section className="mt-10">
        <SectionHeading
          title="Kredensial yang dibutuhkan"
          description="Isi di backend/.env lalu jalankan php artisan config:clear."
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