import { AgentPageShell } from "@/components/ai/agent-page";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { NotConnected, Panel, SectionHeading } from "@/components/ai/primitives";
import { useAgent } from "@/hooks/useAiDashboard";
import { usePageContext } from "@/context/AiMarketingContext";

export default function ContentAgentPage() {
  usePageContext("content");
  const { agent } = useAgent("content");

  return (
    <AgentPageShell agent={agent}>
      <section className="mt-10">
        <SectionHeading
          title="Social media — performance tracking"
          description="Follower, cadence dan engagement per platform. Kosong sampai akun sosial tersambung — tidak ada angka ilustratif."
        />
        <div className="grid gap-4 lg:grid-cols-2">
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
        <SectionHeading
          title="Content queue"
          description="Draft dan jadwal konten yang dihasilkan Content Agent."
        />
        <Panel className="p-6">
          <NotConnected
            title="Antrian konten masih kosong"
            description="Queue diisi hanya oleh draft nyata dari Content Agent (`php artisan ai:run-agent content`). Sebelum itu tabel sengaja dibiarkan kosong, bukan diisi contoh."
          />
        </Panel>
      </section>

      <section className="mt-10">
        <Panel className="p-6">
          <SectionHeading title="Generation" />
          <NotConnected
            state="coming_soon"
            title="Draft generation berjalan lewat AIProviderManager"
            description="Brief dan draft dibuat di sisi server dan masuk queue sebagai Needs Review — tidak pernah dipublikasikan otomatis."
          />
        </Panel>
      </section>
    </AgentPageShell>
  );
}