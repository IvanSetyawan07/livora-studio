import { Link } from "react-router-dom";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { AgentPageShell } from "@/components/ai/agent-page";
import { InsightCard } from "@/components/ai/insight-card";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { LeadsByStatusPanel, LeadsFunnelPanel, LeadsKpiGrid } from "@/components/ai/marketing-panels";
import { NotConnected, Panel, Pill, Reveal, SectionHeading } from "@/components/ai/primitives";
import { useAgent, useAiInsights, useHighIntentLeads } from "@/hooks/useAiDashboard";
import { usePageContext } from "@/context/AiMarketingContext";

export default function LeadsAgentPage() {
  usePageContext("leads");
  const { agent } = useAgent("leads");
  const { data: agentInsights = [], isLoading } = useAiInsights("all", "leads");
  const { data: highIntent, isLoading: leadsLoading } = useHighIntentLeads();
  const leadsList = highIntent?.leads ?? [];

  return (
    <AgentPageShell agent={agent}>
      <section className="mt-10">
        <SectionHeading
          title="Operations — lead & follow-up"
          description="Funnel dihitung langsung dari data konsultasi, wishlist, dan inquiry WhatsApp LiviBot."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LeadsKpiGrid />
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <LeadsFunnelPanel />
        <LeadsByStatusPanel />
      </section>

      <section className="mt-6">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-display text-lg">High Intent Leads</h3>
              <p className="text-xs text-muted-foreground">
                Skor intent dihitung real-time dari antrean cek harga WA LiviBot, status konsultasi, wishlist, dan repeat product views.
              </p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">{leadsList.length} leads</span>
          </div>
          {leadsLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Menghitung skor lead…
            </div>
          ) : leadsList.length === 0 ? (
            <div className="p-5">
              <NotConnected
                title="Belum ada lead ber-skor dalam 30 hari terakhir"
                description="Lead otomatis muncul begitu ada pengajuan konsultasi, cek harga WhatsApp di LiviBot, atau aktivitas wishlist."
              />
            </div>
          ) : (
            <div className="scroll-rail">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["Lead", "Source", "Score", "Signals", "Last Activity", "Status", ""].map((h) => (
                      <th key={h} className="label-eyebrow px-5 py-3 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leadsList.map((lead) => (
                    <tr key={lead.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.contact}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{lead.source}</td>
                      <td className="px-5 py-4">
                        <Pill tone={lead.score >= 85 ? "success" : lead.score >= 65 ? "info" : "neutral"}>
                          {lead.score}/100
                        </Pill>
                      </td>
                      <td className="max-w-xs px-5 py-4 text-xs text-muted-foreground">
                        {lead.signals.join(" · ") || "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {lead.lastActivity ? new Date(lead.lastActivity).toLocaleDateString("id-ID") : "—"}
                      </td>
                      <td className="px-5 py-4 font-mono text-[11px] uppercase text-muted-foreground">
                        {lead.status.replace(/_/g, " ")}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={lead.href}
                          className="inline-flex items-center gap-1 text-xs text-ai hover:underline"
                        >
                          Buka <ArrowUpRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Kredensial pengiriman lanjutan"
          description="Isi di backend/.env untuk mengaktifkan automasi WhatsApp & SMTP produksi."
        />
        <IntegrationRequired
          provider="WhatsApp (LiviBot) & Email Delivery"
          title="Konfigurasi provider follow-up otomatis"
          description="FollowUpActionExecutor otomatis mengirim via WhatsApp (WHATSAPP_PROVIDER) dan Email (MAIL_MAILER SMTP produksi) bila sudah dikonfigurasi di server."
          configPath="backend/config/services.php + backend/config/mail.php"
          envKeys={[
            { key: "WHATSAPP_PROVIDER", note: "fonnte | meta | twilio" },
            { key: "MAIL_HOST / MAIL_USERNAME", note: "SMTP produksi (Resend / Mailgun / Brevo)" },
          ]}
        />
      </section>

      <section className="mt-10">
        <SectionHeading
          title="AI insights"
          description="Prioritas follow-up prospek dari Lead Intelligence Agent."
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
            description="Klik Run Analysis di atas untuk menganalisis lead dan antrean LiviBot WhatsApp."
          />
        )}
      </section>
    </AgentPageShell>
  );
}
