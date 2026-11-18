import { CheckCircle2, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { AgentPageShell } from "@/components/ai/agent-page";
import { InsightCard } from "@/components/ai/insight-card";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { NotConnected, Panel, Reveal, SectionHeading } from "@/components/ai/primitives";
import {
  extractApiErrorMessage,
  useAgent,
  useAiInsights,
  useMetaAdsAuthorize,
  useMetaAdsDisconnect,
  useMetaAdsIntegrationStatus,
} from "@/hooks/useAiDashboard";
import { useAdsSummary } from "@/hooks/useMarketing";
import { usePageContext } from "@/context/AiMarketingContext";
import { ActiveCampaignsTable, AdsKpiGrid, AdsPlatformRows, BudgetSplitPanel, CtrImpressionsPanel, SpendLeadsTrendPanel } from "@/components/ai/marketing-panels";

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

export default function AdsAgentPage() {
  usePageContext("ads");
  const { agent, isLoading: agentLoading } = useAgent("ads");
  const { data: agentInsights = [], isLoading } = useAiInsights("all", "ads");

  return (
    <AgentPageShell agent={agent} loading={agentLoading}>
      <section className="mt-10">
        <SectionHeading
          title="Ads — campaign performance"
          description="Spend, leads, cost per lead, ROAS, dan CTR. Kerangka dashboard tetap tampil; angka baru terisi setelah akun iklan tersambung — tidak ada data contoh."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <AdsKpiGrid />
        </div>
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
