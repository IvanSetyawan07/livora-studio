import { Mail, MailOpen, MousePointerClick, UserCheck } from "lucide-react";
import { AgentPageShell } from "@/components/ai/agent-page";
import { InsightCard } from "@/components/ai/insight-card";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { LockedKpiCard, OfflinePanel, PlatformRow, TableShell } from "@/components/ai/offline";
import { NotConnected, Reveal, SectionHeading } from "@/components/ai/primitives";
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
          description="Sequence otomatis, kecepatan respons dan lead yang berhasil dipulihkan. Kerangka tampil penuh; angka menyusul setelah endpoint agregasi dan penyedia email tersambung."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LockedKpiCard label="Emails Sent" provider="Resend / Mailgun stats API" index={0} />
          <LockedKpiCard label="Open Rate" provider="Resend / Mailgun stats API" index={1} />
          <LockedKpiCard label="Click Rate" provider="Resend / Mailgun stats API" index={2} />
          <LockedKpiCard label="Leads Recovered" provider="Funnel aggregation endpoint" index={3} />
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <OfflinePanel
          title="Lead Funnel (30 Days)"
          provider="Funnel aggregation endpoint"
          message="Data konsultasi & wishlist sudah ada di database, tapi endpoint agregasi funnel email belum dibuat. Sampai itu ada, panel ini sengaja kosong daripada menampilkan contoh."
          legend={[
            { label: "Visitors", className: "bg-info" },
            { label: "Leads", className: "bg-success" },
            { label: "Consultations", className: "bg-ai" },
          ]}
        />
        <div className="space-y-2.5">
          <PlatformRow icon={Mail} label="Delivery stats" note="Resend / Mailgun API key" />
          <PlatformRow icon={MailOpen} label="Open tracking" note="butuh stats API" />
          <PlatformRow icon={MousePointerClick} label="Click tracking" note="butuh stats API" />
          <PlatformRow icon={UserCheck} label="Response time" note="agregasi konsultasi" />
        </div>
      </section>

      <section className="mt-6">
        <TableShell
          title="High Intent Leads"
          columns={["Lead", "Source", "Score", "Last Activity", "Status"]}
          emptyTitle="Belum ada lead ber-skor"
          emptyDescription="Daftar ini diisi oleh Lead Intelligence Agent dari repeat visit, unduhan katalog dan aktivitas wishlist yang nyata."
          rows={4}
        />
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Kredensial yang dibutuhkan"
          description="Isi di backend/.env lalu jalankan php artisan config:clear."
        />
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
