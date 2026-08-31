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
import { agentById, seoOpportunities } from "@/lib/ai/data";
import { aiServices } from "@/lib/ai/services";
import { LocalSeoSection } from "./AiMarketingSeoLocal";
import type { GoogleIntegrationStatus, SeoOpportunity } from "@/lib/ai/types";

const impactTone = { High: "brass", Medium: "info", Low: "neutral" } as const;

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

export default function SeoAgentPage() {
  const agent = agentById("seo")!;
  const [selected, setSelected] = useState<SeoOpportunity | null>(null);

  return (
    <AgentPageShell agent={agent}>
      <section className="mt-10">
        <SectionHeading
          title="SEO overview"
          description="Organic clicks, impressions, average position and CTR will be sourced from Google Search Console."
          action={<DemoBadge />}
        />
        <div className="mb-4">
          <GoogleSearchConsoleCard />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {["Organic clicks", "Impressions", "Average position", "CTR"].map((label, i) => (
            <Reveal key={label} delay={i * 60}>
              <Panel className="p-5">
                <p className="label-eyebrow">{label}</p>
                <p className="text-display mt-2 text-2xl text-muted-foreground">—</p>
                <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  Search Console not connected
                </p>
              </Panel>
            </Reveal>
          ))}
        </div>
      </section>

      <LocalSeoSection />

      <section className="mt-10">
        <SectionHeading
          title="AI opportunities"
          description="Ranked by modelled impact. Select a row to inspect the reasoning before it becomes a recommendation."
          action={<DemoBadge />}
        />
        <Panel className="overflow-hidden">
          <div className="scroll-rail">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Opportunity", "Impact", "Confidence", "Source", "Status"].map((h) => (
                    <th key={h} className="label-eyebrow px-5 py-3 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seoOpportunities.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelected(o)}
                    className="cursor-pointer border-b border-border transition-colors duration-200 last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-5 py-4">{o.title}</td>
                    <td className="px-5 py-4">
                      <Pill tone={impactTone[o.impact]}>{o.impact}</Pill>
                    </td>
                    <td className="num px-5 py-4 text-brass">{o.confidence}%</td>
                    <td className="px-5 py-4 text-muted-foreground">{o.source}</td>
                    <td className="px-5 py-4 text-muted-foreground">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <SectionHeading title="Content opportunities" />
          <NotConnected
            title="Content gap analysis requires Search Console"
            description="Query-level data is needed to separate content gaps from ranking gaps."
          />
        </Panel>
        <Panel className="p-6">
          <SectionHeading title="Technical issues" />
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
                  {selected.impact} impact · source: {selected.source}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="label-eyebrow">AI reasoning</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">{selected.detail}</p>
                </div>
                <ConfidenceBar value={selected.confidence} />
                <NotConnected
                  state="coming_soon"
                  title="Promotion to recommendation is not enabled"
                  description="Once the orchestrator exists, promoting an opportunity will create a recommendation and route it to the Approval Centre."
                />
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AgentPageShell>
  );
}