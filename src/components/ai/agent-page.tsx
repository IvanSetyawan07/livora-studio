import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ExternalLink, Loader2, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { statusMeta } from "@/components/ai/agent-rail";
import {
  Panel,
  Pill,
  Reveal,
  SectionHeading,
  StatusDot,
} from "@/components/ai/primitives";
import { useAiMarketingContext } from "@/context/AiMarketingContext";
import { extractApiErrorMessage, useRunAgent } from "@/hooks/useAiDashboard";
import type { AIAgent } from "@/lib/ai/types";

const connLabel = {
  connected: "Connected",
  not_connected: "Not connected",
  coming_soon: "Coming soon",
} as const;

const connTone = {
  connected: "success",
  not_connected: "neutral",
  coming_soon: "neutral",
} as const;

export function AgentPageShell({
  agent,
  loading = false,
  children,
}: {
  agent: AIAgent;
  loading?: boolean;
  children?: ReactNode;
}) {
  const meta = statusMeta[agent.status];
  const runAgent = useRunAgent();
  const { openAsk } = useAiMarketingContext();

  async function handleRunNow() {
    try {
      const res = await runAgent.mutateAsync({ key: agent.id, limit: 5 });
      if (res.status === "ok") {
        toast.success(`${agent.name} selesai dijalankan`, {
          description: `${res.insights_created ?? 0} insight & ${res.recommendations_created ?? 0} rekomendasi baru (via ${res.provider ?? "AI"}).`,
        });
      } else if (res.status === "empty") {
        toast.message(`${agent.name}: data belum cukup`, {
          description: res.message ?? "Belum ada data baru yang cukup untuk dianalisis.",
        });
      } else {
        toast.error(res.message ?? "Gagal menjalankan agent.");
      }
    } catch (err) {
      toast.error(extractApiErrorMessage(err, `Gagal menjalankan ${agent.name}.`));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AI Agent"
        title={agent.name}
        description={agent.purpose}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={meta.tone}>
              <StatusDot tone={meta.tone} pulse={meta.pulse} />
              {meta.label}
            </Pill>
            <button
              type="button"
              onClick={handleRunNow}
              disabled={runAgent.isPending}
              className="inline-flex items-center gap-1.5 rounded-sm bg-ai px-3 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {runAgent.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5" />
              )}
              {runAgent.isPending ? "Running analysis…" : "Run Analysis"}
            </button>
            <button
              type="button"
              onClick={openAsk}
              className="inline-flex items-center gap-1.5 rounded-sm border border-ai/40 bg-ai/10 px-3 py-2 text-xs font-medium text-ai transition-colors hover:bg-ai/20"
            >
              <Sparkles className="size-3.5" />
              Tanya AI
            </button>
            <Link
              to="/admin/analytics"
              className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-2 text-xs transition-colors hover:bg-accent"
            >
              View full analytics <ExternalLink className="size-3.5" />
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Status", value: loading ? "—" : meta.label, to: "/admin/ai-marketing/settings" },
          { label: "Last run", value: loading ? "—" : agent.lastRun ? new Date(agent.lastRun).toLocaleString("id-ID") : "Never", to: "/admin/ai-marketing/activity" },
          { label: "Insights generated", value: loading ? "—" : String(agent.insightsCount), to: "/admin/ai-marketing/insights" },
          { label: "Pending approvals", value: loading ? "—" : String(agent.pendingApprovals), to: "/admin/ai-marketing/ai-center/recommendations" },
        ].map((item, i) => (
          <Reveal key={item.label} delay={i * 60}>
            <Link to={item.to} className="block">
              <Panel hover className="p-5 transition-colors hover:border-ai/40">
                <div className="flex items-center justify-between gap-2">
                  <p className="label-eyebrow">{item.label}</p>
                  <ArrowUpRight className="size-3.5 text-muted-foreground/60" />
                </div>
                <p className="text-display mt-2 text-xl">{item.value}</p>
              </Panel>
            </Link>
          </Reveal>
        ))}
      </div>

      {children}

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <SectionHeading title="Capabilities" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {agent.capabilities.map((c) => (
              <li
                key={c}
                className="rounded-sm border border-border bg-background/40 px-3 py-2 text-sm text-muted-foreground"
              >
                {c}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="p-6">
          <SectionHeading title="Integration status" />
          <ul className="space-y-2">
            {agent.dependencies.map((d) => (
              <li
                key={d.name}
                className="flex items-center justify-between rounded-sm border border-border px-3 py-2.5 text-sm"
              >
                {d.name}
                <Pill tone={connTone[d.state]}>
                  <StatusDot tone={connTone[d.state]} pulse={d.state === "connected"} />
                  {connLabel[d.state]}
                </Pill>
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </>
  );
}
