import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Loader2, MessageCircle, Search } from "lucide-react";
import { AgentPageShell } from "@/components/ai/agent-page";
import { InsightCard } from "@/components/ai/insight-card";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { LeadsByStatusPanel, LeadsFunnelPanel, LeadsKpiGrid } from "@/components/ai/marketing-panels";
import { NotConnected, Panel, Pill, Reveal, SectionHeading } from "@/components/ai/primitives";
import { QueryError } from "@/components/ai/query-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAgent, useAiInsights, useHighIntentLeads } from "@/hooks/useAiDashboard";
import { usePageContext } from "@/context/AiMarketingContext";
import type { HighIntentLead } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

function normalizeWaUrl(contact?: string | null): string | null {
  if (!contact || contact.includes("@")) return null;
  let digits = contact.replace(/\D+/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  return digits.length >= 9 ? `https://wa.me/${digits}` : null;
}

export default function LeadsAgentPage() {
  usePageContext("leads");
  const { agent, isLoading: agentLoading } = useAgent("leads");
  const { data: agentInsights = [], isLoading } = useAiInsights("all", "leads");
  const [limit, setLimit] = useState(25);
  const { data: highIntent, isLoading: leadsLoading, isError: leadsError, refetch: refetchLeads } = useHighIntentLeads(limit);
  const leadsList = highIntent?.leads ?? [];

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "wa" | "consult" | "wishlist">("all");
  const [highScoreOnly, setHighScoreOnly] = useState(false);
  const [selectedLead, setSelectedLead] = useState<HighIntentLead | null>(null);

  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leadsList.filter((l) => {
      if (highScoreOnly && l.score < 70) return false;
      if (sourceFilter === "wa" && !l.source.toLowerCase().includes("whatsapp") && !l.id.startsWith("wa_")) return false;
      if (sourceFilter === "consult" && !l.id.startsWith("consult_") && !l.source.toLowerCase().includes("consultation")) return false;
      if (sourceFilter === "wishlist" && !l.id.startsWith("wish_") && !l.source.toLowerCase().includes("wishlist")) return false;
      if (q && !`${l.name} ${l.contact} ${l.signals.join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [leadsList, highScoreOnly, sourceFilter, search]);

  return (
    <AgentPageShell agent={agent} loading={agentLoading}>
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-display text-lg">High Intent Leads</h3>
                <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {visibleLeads.length}
                  {highIntent?.total && highIntent.total > visibleLeads.length ? ` / ${highIntent.total}` : ""} leads
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Skor intent dihitung real-time dari antrean cek harga WA LiviBot, status konsultasi, wishlist, dan repeat product views.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama / nomor WA..."
                  className="h-8 w-44 rounded-sm border border-border bg-secondary/60 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
                />
              </div>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as "all" | "wa" | "consult" | "wishlist")}
                className="h-8 rounded-sm border border-border bg-secondary px-2 text-xs text-foreground focus:border-ai focus:outline-none"
              >
                <option value="all">Semua Sumber</option>
                <option value="wa">WhatsApp LiviBot</option>
                <option value="consult">Konsultasi</option>
                <option value="wishlist">Wishlist / Keranjang</option>
              </select>
              <button
                type="button"
                onClick={() => setHighScoreOnly((v) => !v)}
                className={cn(
                  "h-8 rounded-sm border px-2.5 text-xs transition-colors",
                  highScoreOnly ? "border-ai/40 bg-ai/12 text-ai" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                Score ≥ 70
              </button>
            </div>
          </div>

          {leadsLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Menghitung skor lead…
            </div>
          ) : leadsError ? (
            <div className="p-5">
              <QueryError message="Gagal memuat daftar High Intent Leads." onRetry={() => void refetchLeads()} />
            </div>
          ) : visibleLeads.length === 0 ? (
            <div className="p-5">
              <NotConnected
                title={leadsList.length === 0 ? "Belum ada lead ber-skor dalam 30 hari terakhir" : "Tidak ada lead yang cocok dengan filter"}
                description={
                  leadsList.length === 0
                    ? "Lead otomatis muncul begitu ada pengajuan konsultasi, cek harga WhatsApp di LiviBot, atau aktivitas wishlist."
                    : "Ubah pencarian atau filter sumber untuk melihat prospek lain."
                }
              />
            </div>
          ) : (
            <>
              <div className="scroll-rail">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      {["Lead", "Source", "Score", "Signals", "Last Activity", "Status", "Aksi"].map((h) => (
                        <th key={h} className="label-eyebrow px-5 py-3 font-normal">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLeads.map((lead) => {
                      const waUrl = normalizeWaUrl(lead.contact);
                      return (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/30"
                        >
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
                          <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-2">
                              {waUrl ? (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded border border-success/40 bg-success/10 px-2 py-1 text-xs text-success hover:bg-success/20"
                                >
                                  <MessageCircle className="size-3" /> WA
                                </a>
                              ) : null}
                              <Link
                                to={lead.href}
                                className="inline-flex items-center gap-1 text-xs text-ai hover:underline"
                              >
                                Buka <ArrowUpRight className="size-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {highIntent && highIntent.total > leadsList.length ? (
                <div className="border-t border-border px-5 py-3 text-center">
                  {limit < 50 ? (
                    <button
                      type="button"
                      onClick={() => setLimit((n) => Math.min(50, n + 25))}
                      className="text-xs font-medium text-ai hover:underline"
                    >
                      Muat lebih banyak ({highIntent.total - leadsList.length} tersisa)
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Menampilkan 50 prospek teratas berdasarkan skor. Gunakan pencarian atau filter untuk mempersempit daftar.
                    </p>
                  )}
                </div>
              ) : null}
            </>
          )}
        </Panel>
      </section>

      <Dialog open={!!selectedLead} onOpenChange={(o) => !o && setSelectedLead(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border-strong bg-popover text-foreground sm:max-w-lg">
          {selectedLead ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-display text-lg">{selectedLead.name}</DialogTitle>
                <DialogDescription>
                  {selectedLead.source} · {selectedLead.channel} · Score {selectedLead.score}/100
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="rounded-sm border border-border bg-secondary/40 p-3">
                  <p className="label-eyebrow">Kontak</p>
                  <p className="mt-1 font-mono text-xs text-foreground">{selectedLead.contact || "—"}</p>
                </div>
                <div>
                  <p className="label-eyebrow mb-1.5">Sinyal Intent</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLead.signals.length > 0 ? (
                      selectedLead.signals.map((sig, i) => (
                        <Pill key={i} tone="info">{sig}</Pill>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Tidak ada sinyal tambahan.</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  {normalizeWaUrl(selectedLead.contact) ? (
                    <a
                      href={normalizeWaUrl(selectedLead.contact)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded bg-success px-3 py-1.5 text-xs font-semibold text-background"
                    >
                      <MessageCircle className="size-3.5" /> Chat WhatsApp
                    </a>
                  ) : null}
                  <Link
                    to={selectedLead.href}
                    className="inline-flex items-center gap-1.5 rounded bg-ai px-3 py-1.5 text-xs font-semibold text-background"
                  >
                    Buka Halaman Lead <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <section className="mt-10">
        <SectionHeading
          title="Pengiriman Follow-Up Otomatis"
          description="Status sambungan WhatsApp & email untuk follow-up prospek. Pengaturan teknis ada di bagian Info Teknis."
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
