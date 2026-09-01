import { AgentPageShell } from "@/components/ai/agent-page";
import { InsightCard } from "@/components/ai/insight-card";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { NotConnected, Panel, Reveal, SectionHeading } from "@/components/ai/primitives";
import { useAgent, useAiInsights } from "@/hooks/useAiDashboard";
import { usePageContext } from "@/context/AiMarketingContext";

export default function LeadsAgentPage() {
  usePageContext("leads");
  const { agent } = useAgent("leads");
  const { data: agentInsights = [], isLoading } = useAiInsights("all", "leads");

  return (
    <AgentPageShell agent={agent}>
      <section className="mt-10">
        <SectionHeading
          title="Operations — email & follow-up"
          description="Sequence otomatis, kecepatan respons dan lead yang berhasil dipulihkan."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="p-6">
            <NotConnected
              title="Metrik follow-up belum dihitung"
              description="Data konsultasi & wishlist sudah ada di database, tapi endpoint agregasi funnel email belum dibuat. Sampai itu ada, halaman ini tidak menampilkan angka apa pun daripada menampilkan contoh."
            />
          </Panel>
          <IntegrationRequired
            provider="Email delivery (Resend / Mailgun / SES)"
            title="Statistik pengiriman email belum tersambung"
            description="Open rate, click rate dan bounce diambil dari penyedia email. Kredensial pengiriman sudah dipakai untuk mengirim, tapi API statistik perlu key terpisah."
            configPath="backend/config/services.php + backend/config/mail.php"
            envKeys={[
              { key: "MAIL_MAILER", note: "sudah ada — untuk pengiriman" },
              { key: "MAILGUN_SECRET / RESEND_API_KEY", note: "untuk membaca statistik kampanye" },
            ]}
          />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading
          title="AI insights"
          description="Identitas high-intent dari repeat visit, unduhan katalog dan aktivitas wishlist."
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
            title="Belum ada lead insight"
            description="Lead Intelligence Agent akan menampilkan identitas ber-skor di sini setelah dijalankan."
          />
        )}
      </section>
    </AgentPageShell>
  );
}