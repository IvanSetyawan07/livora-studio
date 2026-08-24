import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { AnimatedBar, DemoBadge, Panel, Pill, SectionHeading, StatusDot } from "@/components/ai/primitives";
import { usePageContext } from "@/context/AiMarketingContext";
import { aiServices } from "@/lib/ai/services";
import type { AIProviderInfo, AIProviderStatus, AIRoutingStrategy } from "@/lib/ai/types";

const statusTone: Record<AIProviderStatus, "success" | "warning" | "neutral"> = {
  connected: "success",
  degraded: "warning",
  not_connected: "neutral",
};

const statusLabel: Record<AIProviderStatus, string> = {
  connected: "Connected",
  degraded: "Degraded",
  not_connected: "Not connected",
};

export default function AiMarketingProviders() {
  usePageContext("providers");
  const [providers, setProviders] = useState<AIProviderInfo[] | null>(null);
  const [routing, setRouting] = useState<AIRoutingStrategy | null>(null);

  useEffect(() => {
    aiServices.providers.list().then(setProviders);
    aiServices.providers.getRoutingStrategy().then(setRouting);
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="AI System"
        title="Providers & Routing"
        description="Livora's AI infrastructure isn't locked to one provider — routing chooses the right model for each task."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-sm border border-border bg-surface/40 px-4 py-3 text-xs text-muted-foreground">
        <DemoBadge />
        No provider is connected yet. These panels show how usage, cost and routing will look once the Laravel AI
        orchestration layer is live.
      </div>

      <section>
        <SectionHeading title="Providers" description="Claude, OpenAI, Gemini and any future provider, side by side." />
        {!providers ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-shimmer h-48 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {providers.map((p) => (
              <Panel key={p.id} hover className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-display text-base">{p.provider}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{p.model}</p>
                  </div>
                  <Pill tone={statusTone[p.status]}>
                    <StatusDot tone={statusTone[p.status]} />
                    {statusLabel[p.status]}
                  </Pill>
                </div>

                <div className="mt-4">
                  <AnimatedBar label="Usage share" value={p.usageShare} valueLabel={`${p.usageShare}%`} tone="ai" />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                  <div>
                    <p className="num text-sm text-foreground">${p.cost.toFixed(0)}</p>
                    <p className="label-eyebrow mt-0.5">Cost</p>
                  </div>
                  <div>
                    <p className="num text-sm text-foreground">{p.latencyMs}ms</p>
                    <p className="label-eyebrow mt-0.5">Latency</p>
                  </div>
                  <div>
                    <p className="num text-sm text-foreground">{p.successRate}%</p>
                    <p className="label-eyebrow mt-0.5">Success</p>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeading title="AI Routing" description="Chooses the best model for each task automatically — quality, speed and cost, balanced." />
        {!routing ? (
          <div className="skeleton-shimmer h-64 rounded-lg" />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
            <Panel className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label-eyebrow">Strategy</p>
                  <p className="text-display mt-1 text-xl">{routing.name}</p>
                </div>
                <Pill tone={routing.automatic ? "success" : "neutral"}>
                  <StatusDot tone={routing.automatic ? "success" : "neutral"} pulse={routing.automatic} />
                  {routing.automatic ? "Automatic" : "Manual"}
                </Pill>
              </div>
              <div className="mt-5 space-y-4">
                <AnimatedBar label="Quality" value={routing.quality} tone="insight" />
                <AnimatedBar label="Speed" value={routing.speed} tone="info" />
                <AnimatedBar label="Cost efficiency" value={routing.costEfficiency} tone="success" />
              </div>
            </Panel>

            <Panel className="p-5">
              <p className="label-eyebrow mb-3">How tasks get routed</p>
              <div className="space-y-3">
                {routing.taskRouting.map((t) => (
                  <div key={t.taskType} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-foreground/90">{t.taskType}</p>
                      <span className="rounded-sm bg-ai/12 px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] text-ai uppercase">
                        {t.routedTo}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t.reason}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </section>
    </>
  );
}
