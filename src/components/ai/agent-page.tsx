import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2, Play } from "lucide-react";
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
  children,
}: {
  agent: AIAgent;
  children?: ReactNode;
}) {
  const meta = statusMeta[agent.status];
  const runAgent = useRunAgent();

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
          ["Status", meta.label],
          ["Last run", agent.lastRun ? new Date(agent.lastRun).toLocaleString("id-ID") : "Never"],
          ["Insights generated", String(agent.insightsCount)],
          ["Pending approvals", String(agent.pendingApprovals)],
        ].map(([label, value], i) => (
          <Reveal key={label} delay={i * 60}>
            <Panel hover className="p-5">
              <p className="label-eyebrow">{label}</p>
              <p className="text-display mt-2 text-xl">{value}</p>
            </Panel>
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
