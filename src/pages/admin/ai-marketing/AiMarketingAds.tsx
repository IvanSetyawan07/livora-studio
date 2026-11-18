import { useState, type FormEvent } from "react";
import { Calculator, CheckCircle2, Instagram, Loader2, Plus, Sparkles, Trash2, TrendingUp, Unlink } from "lucide-react";
import { toast } from "sonner";
import { AgentPageShell } from "@/components/ai/agent-page";
import { InsightCard } from "@/components/ai/insight-card";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { NotConnected, Panel, Pill, Reveal, SectionHeading, StatusDot } from "@/components/ai/primitives";
import {
  extractApiErrorMessage,
  useAddIgBoost,
  useAgent,
  useAiInsights,
  useDeleteIgBoost,
  useLearningSummary,
  useMetaAdsAuthorize,
  useMetaAdsDisconnect,
  useMetaAdsIntegrationStatus,
} from "@/hooks/useAiDashboard";
import { useAdsSummary } from "@/hooks/useMarketing";
import { useAiMarketingContext, usePageContext } from "@/context/AiMarketingContext";
import { ActiveCampaignsTable, AdsKpiGrid, AdsPlatformRows, BudgetSplitPanel, CtrImpressionsPanel, SpendLeadsTrendPanel } from "@/components/ai/marketing-panels";

const fmtRp = (n: number | null | undefined) =>
  n == null ? "—" : `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`;
const fmtNum = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);

function ConnectedCredentialCard({
  provider,
  accountId,
  onDisconnect,
  disconnecting,
}: {
  provider: string;
  accountId?: string | null;
  onDisconnect?: () => void;
  disconnecting?: boolean;
}) {
  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-success/40 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-success uppercase">
            <CheckCircle2 className="size-3" /> Connected
          </span>
          <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{provider}</span>
        </div>
        {onDisconnect ? (
          <button
            type="button"
            disabled={disconnecting}
            onClick={onDisconnect}
            className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="size-3 animate-spin" /> : <Unlink className="size-3" />}
            Disconnect
          </button>
        ) : null}
      </div>
      <p className="mt-3 text-sm font-medium">Kredensial {provider} sudah terpasang</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {accountId ? <>Akun aktif: <code className="font-mono text-brass">{accountId}</code>. </> : null}
        Angka di panel atas ditarik langsung dari akun ini.
      </p>
    </Panel>
  );
}

function AdsCredentialCards() {
  const { query } = useAdsSummary();
  const { data: metaOAuth } = useMetaAdsIntegrationStatus();
  const metaAuthorize = useMetaAdsAuthorize();
  const metaDisconnect = useMetaAdsDisconnect();

  const meta = query.data?.platforms?.meta;
  const google = query.data?.platforms?.google;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {meta?.status === "ok" ? (
        <ConnectedCredentialCard
          provider="Meta Ads"
          accountId={meta.accountId ?? metaOAuth?.accountId}
          disconnecting={metaDisconnect.isPending}
          onDisconnect={
            metaOAuth?.connected
              ? () =>
                  metaDisconnect.mutate(undefined, {
                    onSuccess: () => toast.success("Meta Ads disconnected."),
                    onError: (e) => toast.error(extractApiErrorMessage(e, "Gagal disconnect Meta Ads.")),
                  })
              : undefined
          }
        />
      ) : (
        <IntegrationRequired
          provider="Meta Ads (Facebook & Instagram)"
          title="Meta Marketing API belum tersambung"
          description={meta?.message ?? "Hubungkan via OAuth Meta Ads di sebelah kanan atau isi token System User di backend/.env untuk menarik spend, leads, CPL, CTR, dan ROAS harian."}
          envKeys={[
            { key: "META_ADS_ACCESS_TOKEN", note: "System User token (long-lived), scope ads_read" },
            { key: "META_ADS_ACCOUNT_ID", note: "format act_xxxxxxxxxx" },
            { key: "META_ADS_API_VERSION", note: "opsional, default v21.0" },
          ]}
        >
          <button
            type="button"
            disabled={metaAuthorize.isPending}
            onClick={() =>
              metaAuthorize.mutate(undefined, {
                onError: (e) => toast.error(extractApiErrorMessage(e, "Gagal membuka Meta Ads OAuth.")),
              })
            }
            className="inline-flex items-center gap-1.5 rounded-sm bg-ai px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {metaAuthorize.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Connect Meta Ads
          </button>
        </IntegrationRequired>
      )}

      {google?.status === "ok" ? (
        <ConnectedCredentialCard provider="Google Ads" accountId={google.accountId} />
      ) : (
        <IntegrationRequired
          provider="Google Ads"
          title="Google Ads API belum tersambung"
          description={google?.message ?? "Butuh developer token + OAuth client Google Ads. Search Console sudah terhubung terpisah dan tidak memberi data iklan."}
          envKeys={[
            { key: "GOOGLE_ADS_DEVELOPER_TOKEN" },
            { key: "GOOGLE_ADS_CUSTOMER_ID", note: "tanpa tanda hubung (pastikan ID Ad Account, bukan MCC Manager)" },
            { key: "GOOGLE_ADS_REFRESH_TOKEN", note: "hasil OAuth akun manager" },
          ]}
        />
      )}
    </div>
  );
}

function IgBoostRoiAttributionPanel() {
  const { query: adsQuery } = useAdsSummary();
  const learningQuery = useLearningSummary();
  const addBoost = useAddIgBoost();
  const deleteBoost = useDeleteIgBoost();
  const { openAsk } = useAiMarketingContext();

  const [title, setTitle] = useState("");
  const [spendRp, setSpendRp] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reach, setReach] = useState("");
  const [clicks, setClicks] = useState("");
  const [leads, setLeads] = useState("");

  const roi = adsQuery.data?.roiAttribution ?? learningQuery.data?.roiAttribution ?? null;
  const entries = roi?.allIgBoostEntries ?? roi?.igBoostEntries ?? [];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const numericSpend = Number(spendRp.replace(/[^0-9.]/g, ""));
    if (!title.trim() || !numericSpend || numericSpend <= 0) {
      toast.error("Masukkan nama konten yang di-boost dan nominal biaya (Rp).");
      return;
    }

    addBoost.mutate(
      {
        title: title.trim(),
        spendRp: numericSpend,
        date: date || undefined,
        reach: reach ? Number(reach) : 0,
        clicks: clicks ? Number(clicks) : 0,
        leads: leads ? Number(leads) : 0,
      },
      {
        onSuccess: () => {
          toast.success("Biaya Instagram Boost dicatat & ROI/ROAS berhasil dihitung ulang.");
          setTitle("");
          setSpendRp("");
          setReach("");
          setClicks("");
          setLeads("");
        },
        onError: (err) => toast.error(extractApiErrorMessage(err, "Gagal menyimpan biaya Boost IG.")),
      },
    );
  }

  const toneMap: Record<string, "success" | "info" | "warning" | "neutral"> = {
    success: "success",
    info: "info",
    warning: "warning",
    neutral: "neutral",
  };

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Instagram className="size-4 text-ai" />
            <h3 className="text-display text-lg">Instagram Boost — True ROI & ROAS Attribution</h3>
            {roi ? (
              <Pill tone={toneMap[roi.tone] ?? "neutral"}>
                <StatusDot tone={toneMap[roi.tone] ?? "neutral"} pulse={roi.tone === "success"} />
                {roi.verdict}
              </Pill>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Menghitung ROI (%) & ROAS nyata Livora dengan membandingkan biaya Instagram Boost / Meta Ads terhadap omzet pesanan Shop, nilai produk yang ditanyakan di WhatsApp LiviBot, dan pipeline konsultasi interior.
          </p>
        </div>
        <button
          type="button"
          onClick={openAsk}
          className="inline-flex items-center gap-1.5 rounded-sm border border-ai/40 bg-ai/10 px-3 py-1.5 text-xs font-medium text-ai transition-colors hover:bg-ai/20"
        >
          <Sparkles className="size-3.5" /> Analisis ROI via Ask AI
        </button>
      </div>

      {roi ? (
        <>
          <div className="mt-4 rounded-sm border border-border bg-secondary/25 px-4 py-3 text-xs leading-relaxed text-foreground/90">
            <span className="font-semibold text-ai">Diagnosa AI: </span>
            {roi.explanation}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-sm border border-border bg-secondary/20 p-4">
              <p className="label-eyebrow">Total Biaya Boost & Ads ({roi.periodDays}d)</p>
              <p className="num mt-1.5 text-xl font-bold text-foreground">{fmtRp(roi.totalSpendRp)}</p>
              <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                <p>Meta Ads API: <span className="text-foreground">{fmtRp(roi.metaApiSpendRp)}</span></p>
                <p>IG Boost App/Manual: <span className="text-foreground">{fmtRp(roi.igBoostManualSpendRp)}</span></p>
              </div>
            </div>

            <div className="rounded-sm border border-border bg-secondary/20 p-4">
              <p className="label-eyebrow">True Shop ROAS & ROI (Order)</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <p className="num text-xl font-bold text-success">
                  {roi.realShopRoas != null ? `${roi.realShopRoas}x` : "—"}
                </p>
                {roi.realShopRoiPct != null ? (
                  <span className="font-mono text-xs text-success">
                    ({roi.realShopRoiPct > 0 ? "+" : ""}{roi.realShopRoiPct}% ROI)
                  </span>
                ) : null}
              </div>
              <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                <p>Order Lunas: <span className="text-foreground">{fmtRp(roi.paidShopRevenueRp)}</span></p>
                <p>Order Pipeline: <span className="text-foreground">{fmtRp(roi.pipelineOrderRevenueRp)}</span></p>
              </div>
            </div>

            <div className="rounded-sm border border-ai/30 bg-ai/[0.05] p-4">
              <p className="label-eyebrow text-ai">Blended Pipeline ROAS & ROI (Shop + WA)</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <p className="num text-xl font-bold text-ai">
                  {roi.blendedPipelineRoas != null ? `${roi.blendedPipelineRoas}x` : "—"}
                </p>
                {roi.blendedPipelineRoiPct != null ? (
                  <span className="font-mono text-xs text-ai">
                    ({roi.blendedPipelineRoiPct > 0 ? "+" : ""}{roi.blendedPipelineRoiPct}% ROI)
                  </span>
                ) : null}
              </div>
              <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                <p>Nilai Tanya Harga WA: <span className="text-foreground">{fmtRp(roi.waInquiredValueRp)}</span></p>
                <p>Total Nilai Bisnis: <span className="font-medium text-foreground">{fmtRp(roi.totalAttributedValueRp)}</span></p>
              </div>
            </div>

            <div className="rounded-sm border border-border bg-secondary/20 p-4">
              <p className="label-eyebrow">Unit Economics per Lead</p>
              <p className="num mt-1.5 text-xl font-bold text-foreground">{fmtRp(roi.realCplRp)}</p>
              <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                <p>Biaya / Konsultasi ({roi.consultationsCount}): <span className="text-foreground">{fmtRp(roi.costPerConsultationRp)}</span></p>
                <p>Biaya / WA LiviBot ({roi.waInquiriesCount}): <span className="text-foreground">{fmtRp(roi.costPerWaLeadRp)}</span></p>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="mt-6 grid gap-5 border-t border-border pt-5 lg:grid-cols-[1.1fr_1fr]">
        <form onSubmit={handleSubmit} className="space-y-3 rounded-sm border border-border bg-secondary/15 p-4">
          <div className="flex items-center gap-2">
            <Calculator className="size-4 text-ai" />
            <p className="text-xs font-semibold text-foreground">
              Catat Biaya Boost Instagram (Langsung dari IG App / Manual)
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Jika Anda menekan tombol "Boost Post" langsung dari aplikasi Instagram di HP dan biayanya belum muncul di API, catat di sini agar AI langsung menghitung ROI & ROAS terhadap pesanan dan lead WA Livora.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label-eyebrow mb-1 block">Judul Konten / Post yang Di-Boost *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Mis. Boost Reels Proyek Sinarmas / Sofa L-Shape"
                className="h-9 w-full rounded-sm border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div>
              <label className="label-eyebrow mb-1 block">Biaya Boost (Rp) *</label>
              <input
                type="number"
                min={1}
                value={spendRp}
                onChange={(e) => setSpendRp(e.target.value)}
                placeholder="Mis. 1500000"
                className="h-9 w-full rounded-sm border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div>
              <label className="label-eyebrow mb-1 block">Tanggal Boost</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-background px-3 text-xs text-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div>
              <label className="label-eyebrow mb-1 block">Reach / Tayangan (Opsional)</label>
              <input
                type="number"
                min={0}
                value={reach}
                onChange={(e) => setReach(e.target.value)}
                placeholder="Mis. 18500"
                className="h-9 w-full rounded-sm border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label-eyebrow mb-1 block">Klik (Opsional)</label>
                <input
                  type="number"
                  min={0}
                  value={clicks}
                  onChange={(e) => setClicks(e.target.value)}
                  placeholder="240"
                  className="h-9 w-full rounded-sm border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
                />
              </div>
              <div>
                <label className="label-eyebrow mb-1 block">DM/WA Leads</label>
                <input
                  type="number"
                  min={0}
                  value={leads}
                  onChange={(e) => setLeads(e.target.value)}
                  placeholder="12"
                  className="h-9 w-full rounded-sm border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={addBoost.isPending}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm bg-ai px-3 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {addBoost.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Simpan Biaya Boost & Hitung ROI / ROAS
          </button>
        </form>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="label-eyebrow">Riwayat Catatan Instagram Boost ({entries.length})</p>
            <TrendingUp className="size-3.5 text-muted-foreground" />
          </div>
          {entries.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-sm border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
              <p>Belum ada catatan biaya Boost Instagram manual.</p>
              <p className="mt-1 text-[11px]">
                Masukkan biaya Boost di sebelah kiri atau perintahkan lewat Ask AI (contoh: "Catat biaya boost IG Rp 1.500.000").
              </p>
            </div>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {entries.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-sm border border-border bg-secondary/20 px-3.5 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-ai">{fmtRp(item.spendRp)}</span> · {item.date}
                      {item.reach > 0 ? ` · Reach ${fmtNum(item.reach)}` : ""}
                      {item.clicks > 0 ? ` · ${fmtNum(item.clicks)} klik` : ""}
                      {item.leads > 0 ? ` · ${fmtNum(item.leads)} leads` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      deleteBoost.mutate(item.id, {
                        onSuccess: () => toast.success("Catatan Boost dihapus."),
                      })
                    }
                    disabled={deleteBoost.isPending}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                    title="Hapus catatan boost"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

export default function AdsAgentPage() {
  usePageContext("ads");
  const { agent, isLoading: agentLoading } = useAgent("ads");
  const { data: agentInsights = [], isLoading } = useAiInsights("all", "ads");

  return (
    <AgentPageShell agent={agent} loading={agentLoading}>
      <section className="mt-10">
        <SectionHeading
          title="Ads — campaign performance"
          description="Spend, leads, cost per lead, Blended ROAS, Real ROI (%), dan CTR dari Meta Ads & Instagram Boost."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <AdsKpiGrid />
        </div>
      </section>

      <section className="mt-6">
        <IgBoostRoiAttributionPanel />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
         <SpendLeadsTrendPanel />
        <BudgetSplitPanel />
      </section>

      <section className="mt-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2.5">
             <AdsPlatformRows />
          </div>
          <CtrImpressionsPanel />
        </div>
      </section>

      <section className="mt-6">
        <ActiveCampaignsTable />
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Kredensial yang dibutuhkan"
          description="Isi di backend/.env lalu jalankan php artisan config:clear."
        />
        <AdsCredentialCards />
      </section>

      <section className="mt-10">
        <SectionHeading
          title="AI insights"
          description="Budget dan creative recommendation dari Ads Agent."
        />
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
              role="status"
              aria-label="Loading insights"
            />
          </div>
        ) : agentInsights.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {agentInsights.map((i, idx) => (
              <Reveal key={i.id} delay={idx * 70}>
                <InsightCard insight={i} />
              </Reveal>
            ))}
          </div>
        ) : (
          <NotConnected
            title="Belum ada insight iklan"
            description="Ads Agent baru bisa menganalisis setelah salah satu platform iklan di atas tersambung."
          />
        )}
      </section>
    </AgentPageShell>
  );
}
