import { Megaphone, Target } from "lucide-react";
import { AgentPageShell } from "@/components/ai/agent-page";
import { InsightCard } from "@/components/ai/insight-card";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { LockedKpiCard, OfflinePanel, PlatformRow, TableShell } from "@/components/ai/offline";
import { NotConnected, Reveal, SectionHeading } from "@/components/ai/primitives";
import { useAgent, useAiInsights } from "@/hooks/useAiDashboard";
import { usePageContext } from "@/context/AiMarketingContext";
import { ActiveCampaignsTable, AdsKpiGrid, AdsPlatformRows, BudgetSplitPanel, SpendLeadsTrendPanel } from "@/components/ai/marketing-panels";

export default function AdsAgentPage() {
  usePageContext("ads");
  const { agent } = useAgent("ads");
  const { data: agentInsights = [], isLoading } = useAiInsights("all", "ads");

  return (
    <AgentPageShell agent={agent}>
      <section className="mt-10">
        <SectionHeading
          title="Ads — campaign performance"
          description="Spend, leads, cost per lead dan ROAS. Kerangka dashboard tetap tampil; angka baru terisi setelah akun iklan tersambung — tidak ada data contoh."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          <OfflinePanel
            title="Audience & Creative Health"
            provider="Meta Ads Insights"
            message="Frequency, CTR dan creative fatigue dihitung dari Insights API setelah token terpasang."
            height="h-40"
          />
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
        <div className="grid gap-4 lg:grid-cols-2">
          <IntegrationRequired
            provider="Meta Ads (Facebook & Instagram)"
            title="Meta Marketing API belum tersambung"
            description="Butuh System User Access Token dengan scope ads_read untuk Ad Account Livora. Setelah terisi, backend akan menarik spend, leads, CPL dan ROAS harian."
            envKeys={[
              { key: "META_ADS_ACCESS_TOKEN", note: "System User token (long-lived), scope ads_read" },
              { key: "META_ADS_ACCOUNT_ID", note: "format act_xxxxxxxxxx" },
              { key: "META_ADS_API_VERSION", note: "opsional, default v21.0" },
            ]}
          />
          <IntegrationRequired
            provider="Google Ads"
            title="Google Ads API belum tersambung"
            description="Butuh developer token + OAuth client Google Ads. Search Console sudah terhubung terpisah dan tidak memberi data iklan."
            envKeys={[
              { key: "GOOGLE_ADS_DEVELOPER_TOKEN" },
              { key: "GOOGLE_ADS_CUSTOMER_ID", note: "tanpa tanda hubung" },
              { key: "GOOGLE_ADS_REFRESH_TOKEN", note: "hasil OAuth akun manager" },
            ]}
          />
        </div>
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
