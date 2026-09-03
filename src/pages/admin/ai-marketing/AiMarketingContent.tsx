import { Instagram, Facebook, Youtube, Music2 } from "lucide-react";
import { AgentPageShell } from "@/components/ai/agent-page";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { LockedKpiCard, OfflinePanel, PlatformRow, TableShell } from "@/components/ai/offline";
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
          description="Follower, cadence dan engagement per platform. Kerangka tetap tampil, angka kosong sampai akun sosial tersambung — tidak ada angka ilustratif."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LockedKpiCard label="Total Followers" provider="Meta Graph API" index={0} />
          <LockedKpiCard label="Avg Engagement" provider="Meta Graph API" index={1} />
          <LockedKpiCard label="Posts / Week" provider="Meta / TikTok / YouTube" index={2} />
          <LockedKpiCard label="Reach (30d)" provider="Meta Graph API" index={3} />
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Panel className="flex h-full flex-col p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-display rule-accent text-lg">Platforms</h3>
            <span className="text-[11px] text-muted-foreground">(30 Days)</span>
          </div>
          <div className="flex-1 space-y-2.5">
            <PlatformRow icon={Instagram} label="Instagram" note="instagram_basic + insights" />
            <PlatformRow icon={Facebook} label="Facebook Page" note="pages_read_engagement" />
            <PlatformRow icon={Music2} label="TikTok" note="TikTok Business API" />
            <PlatformRow icon={Youtube} label="YouTube" note="YouTube Data API v3" />
          </div>
        </Panel>
        <OfflinePanel
          title="Engagement Trend (30 Days)"
          provider="Meta Graph / TikTok / YouTube"
          message="Grafik engagement per platform aktif setelah token masing-masing platform dipasang di backend/.env."
          legend={[
            { label: "Instagram", className: "bg-ai" },
            { label: "Facebook", className: "bg-info" },
            { label: "TikTok", className: "bg-warning" },
            { label: "YouTube", className: "bg-danger" },
          ]}
        />
      </section>

      <section className="mt-6">
        <TableShell
          title="Content Queue"
          columns={["Draft", "Channel", "Scheduled", "Status", "Action"]}
          emptyTitle="Antrian konten masih kosong"
          emptyDescription="Queue diisi hanya oleh draft nyata dari Content Agent (`php artisan ai:run-agent content`). Sebelum itu tabel sengaja dibiarkan kosong, bukan diisi contoh."
          rows={4}
        />
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Kredensial yang dibutuhkan"
          description="Isi di backend/.env lalu jalankan php artisan config:clear."
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
