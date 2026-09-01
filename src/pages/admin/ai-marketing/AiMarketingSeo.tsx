import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, Unlink } from "lucide-react";
import { AgentPageShell } from "@/components/ai/agent-page";
import {
  ConfidenceBar,
  DemoBadge,
  NotConnected,
  Panel,
  Pill,
  Reveal,
  SectionHeading,
  StatusDot,
} from "@/components/ai/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { agentById } from "@/lib/ai/data";
import { aiServices } from "@/lib/ai/services";
import { useAiInsights, useSearchConsoleSummary } from "@/hooks/useAiDashboard";
import { LocalSeoSection } from "./AiMarketingSeoLocal";
import type { AIInsight, AISeverity, GoogleIntegrationStatus } from "@/lib/ai/types";

/**
 * Fase 7 — halaman SEO Agent disambungkan ke data asli.
 *
 * Dua sumber, sengaja dipisah:
 *  - 4 kartu KPI  → angka mentah Search Console (GET /ai/seo/search-console-summary),
 *                   TIDAK lewat AI, supaya angkanya bisa dicocokkan 1:1 dengan
 *                   search.google.com/search-console.
 *  - AI opportunities → hasil `php artisan ai:run-agent seo` yang tersimpan di
 *                   tabel ai_insights (agent_key = 'seo').
 *
 * Section Local SEO sengaja MASIH pakai data statis + DemoBadge: sumbernya
 * Google Business Profile API yang belum diintegrasikan sama sekali. Jangan
 * dihapus badge-nya sebelum integrasinya benar-benar ada.
 */

const severityTone: Record<AISeverity, "brass" | "info" | "neutral" | "danger"> = {
  critical: "danger",
  high: "brass",
  medium: "info",
  low: "neutral",
};

const googleCallbackMessage: Record<string, { tone: "success" | "danger"; text: string }> = {
  connected: { tone: "success", text: "Google Search Console connected." },
  denied: { tone: "danger", text: "Google connection was denied." },
  invalid_state: { tone: "danger", text: "Connection attempt expired — please try again." },
  missing_code: { tone: "danger", text: "Google did not return an authorization code." },
  exchange_failed: { tone: "danger", text: "Google rejected the token exchange — please try again." },
};

function GoogleSearchConsoleCard() {
  const [status, setStatus] = useState<GoogleIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const callbackResult = searchParams.get("google");

  const refreshStatus = async () => {
    setLoading(true);
    try {
      setStatus(await aiServices.integrations.getGoogleStatus());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    // Bersihkan query param ?google=... dari URL setelah dibaca, supaya
    // refresh halaman tidak menampilkan pesan callback lama berulang-ulang.
    if (callbackResult) {
      const params = new URLSearchParams(searchParams);
      params.delete("google");
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const url = await aiServices.integrations.getGoogleAuthorizeUrl();
      if (url.startsWith("#")) {
        // Mode demo (mock backend) — tidak ada consent screen asli.
        await refreshStatus();
        setBusy(false);
        return;
      }
      window.location.href = url;
    } catch {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      setStatus(await aiServices.integrations.disconnectGoogle());
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {callbackResult && googleCallbackMessage[callbackResult] ? (
        <Reveal>
          <Panel
            className={`mb-4 flex items-center gap-2 p-4 text-sm ${
              googleCallbackMessage[callbackResult].tone === "success"
                ? "border-success/40 text-success"
                : "border-destructive/40 text-destructive"
            }`}
          >
            <StatusDot tone={googleCallbackMessage[callbackResult].tone === "success" ? "success" : "danger"} />
            {googleCallbackMessage[callbackResult].text}
          </Panel>
        </Reveal>
      ) : null}

      {loading ? (
        <Panel className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Checking Google connection…
        </Panel>
      ) : status?.connected ? (
        <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 text-success" />
            <div>
              <p className="text-sm font-medium">Google Search Console connected</p>
              <p className="text-xs text-muted-foreground">
                {status.email ?? "Unknown account"}
                {status.connectedAt ? ` · since ${new Date(status.connectedAt).toLocaleDateString()}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Unlink className="size-3.5" />}
            Disconnect
          </button>
        </Panel>
      ) : (
        <NotConnected
          title="Google Search Console is not connected"
          description="Connect a Google account with Search Console access to pull real organic clicks, impressions, position and CTR into this dashboard."
        >
          <button
            onClick={handleConnect}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md bg-ai px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Connect Google
          </button>
        </NotConnected>
      )}
    </>
  );
}

/** Satu kartu KPI. Tiga keadaan (loading / tidak ada angka / ada angka) dibedakan jujur. */
function KpiCard({
  label,
  value,
  note,
  delay,
}: {
  label: string;
  value: string | null;
  note: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <Panel className="p-5">
        <p className="label-eyebrow">{label}</p>
        <p className={`text-display mt-2 text-2xl ${value ? "" : "text-muted-foreground"}`}>
          {value ?? "—"}
        </p>
        <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          {note}
        </p>
      </Panel>
    </Reveal>
  );
}

function SeoKpiCards() {
  const { data, isLoading, isError } = useSearchConsoleSummary(28);

  // Catatan "kenapa": kita TIDAK menampilkan angka apapun kalau datanya tidak
  // ada. Lebih baik kartu kosong dengan alasan yang jelas daripada angka nol
  // yang terlihat seperti data asli.
  const note = isLoading
    ? "Loading Search Console…"
    : isError
      ? "Gagal memuat data Search Console"
      : !data?.connected
        ? "Search Console not connected"
        : !data.hasData
          ? "Connected · belum ada data 28 hari terakhir"
          : `Last 28 days · ${data.siteUrl ?? ""}`;

  const totals = data?.hasData ? data.totals : null;

  const cards: { label: string; value: string | null }[] = [
    { label: "Organic clicks", value: totals ? totals.clicks.toLocaleString() : null },
    { label: "Impressions", value: totals ? totals.impressions.toLocaleString() : null },
    { label: "Average position", value: totals ? totals.position.toFixed(1) : null },
    { label: "CTR", value: totals ? `${totals.ctr.toFixed(2)}%` : null },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <KpiCard key={card.label} label={card.label} value={card.value} note={note} delay={i * 60} />
      ))}
    </div>
  );
}

export default function SeoAgentPage() {
  const agent = agentById("seo")!;
  const [selected, setSelected] = useState<AIInsight | null>(null);
  const { data: seoInsights, isLoading: insightsLoading } = useAiInsights("all", "seo");

  return (
    <AgentPageShell agent={agent}>
      <section className="mt-10">
        <SectionHeading
          title="SEO overview"
          description="Organic clicks, impressions, average position and CTR — read directly from Google Search Console for the last 28 days."
        />
        <div className="mb-4">
          <GoogleSearchConsoleCard />
        </div>
        <SeoKpiCards />
      </section>

      {/* Local SEO masih memakai data statis — integrasi Google Business Profile
          belum ada, jadi DemoBadge di dalamnya sengaja dipertahankan. */}
      <LocalSeoSection />

      <section className="mt-10">
        <SectionHeading
          title="AI opportunities"
          description="Findings from the SEO Agent, generated from real Search Console query and page data. Select a row to inspect the reasoning."
        />
        <Panel className="overflow-hidden">
          {insightsLoading ? (
            <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading SEO insights…
            </div>
          ) : (seoInsights?.length ?? 0) === 0 ? (
            <div className="p-5">
              <NotConnected
                title="SEO Agent belum pernah menghasilkan insight"
                description="Jalankan `php artisan ai:run-agent seo` setelah Search Console terhubung dan ada cukup data. Sampai itu terjadi, tabel ini sengaja dibiarkan kosong — bukan diisi contoh."
              />
            </div>
          ) : (
            <div className="scroll-rail">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["Opportunity", "Severity", "Confidence", "Source", "Status"].map((h) => (
                      <th key={h} className="label-eyebrow px-5 py-3 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seoInsights!.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => setSelected(o)}
                      className="cursor-pointer border-b border-border transition-colors duration-200 last:border-0 hover:bg-accent/40"
                    >
                      <td className="px-5 py-4">{o.title}</td>
                      <td className="px-5 py-4">
                        <Pill tone={severityTone[o.severity]}>{o.severity}</Pill>
                      </td>
                      <td className="num px-5 py-4 text-brass">{o.confidence}%</td>
                      <td className="px-5 py-4 text-muted-foreground">{o.source.join(", ")}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {o.recommendationId ? "Recommendation created" : "Observation"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <SectionHeading title="Content opportunities" action={<DemoBadge />} />
          <NotConnected
            title="Content gap analysis belum dipisah dari insight umum"
            description="Untuk sekarang temuan content gap ikut muncul di tabel AI opportunities di atas."
          />
        </Panel>
        <Panel className="p-6">
          <SectionHeading title="Technical issues" action={<DemoBadge />} />
          <NotConnected
            title="Site crawl is not scheduled yet"
            description="The Laravel backend will run the crawl and pass structured findings to the SEO Agent for reasoning."
          />
        </Panel>
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="border-border-strong bg-popover sm:max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-display text-xl font-light">
                  {selected.title}
                </DialogTitle>
                <DialogDescription>
                  {selected.severity} severity · source: {selected.source.join(", ")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="label-eyebrow">What happened</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                    {selected.whatHappened}
                  </p>
                </div>
                <div>
                  <p className="label-eyebrow">AI reasoning</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                    {selected.reasoning}
                  </p>
                </div>
                <div>
                  <p className="label-eyebrow">Why it matters</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                    {selected.whyItMatters}
                  </p>
                </div>
                <ConfidenceBar value={selected.confidence} />
                {selected.recommendationId ? (
                  <p className="text-xs text-muted-foreground">
                    Rekomendasi dari insight ini sudah dibuat dan menunggu keputusan di halaman
                    Recommendations.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Insight ini murni observasi — AI tidak menemukan langkah konkret yang cukup jelas
                    untuk dijadikan rekomendasi.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AgentPageShell>
  );
}
