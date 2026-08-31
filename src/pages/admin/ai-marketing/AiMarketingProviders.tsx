import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { AnimatedBar, Panel, Pill, SectionHeading, StatusDot } from "@/components/ai/primitives";
import { usePageContext } from "@/context/AiMarketingContext";
import { aiServices } from "@/lib/ai/services";
import type {
  AIProviderInfo,
  AIProviderPreference,
  AIProviderQuota,
  AIProviderStatus,
  AIRoutingStrategy,
} from "@/lib/ai/types";
import { cn } from "@/lib/utils";

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

const providerDisplayName: Record<string, string> = {
  gemini: "Gemini",
  groq: "Groq",
  anthropic: "Anthropic",
};

function formatResetIn(iso: string | null): string | null {
  if (!iso) return null;
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "resets now";
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "resets in <1m";
  if (mins < 60) return `resets in ${mins}m`;
  return `resets in ${Math.round(mins / 60)}h`;
}

export default function AiMarketingProviders() {
  usePageContext("providers");
  const [providers, setProviders] = useState<AIProviderInfo[] | null>(null);
  const [routing, setRouting] = useState<AIRoutingStrategy | null>(null);
  const [quota, setQuota] = useState<AIProviderQuota[] | null>(null);
  const [preference, setPreference] = useState<AIProviderPreference | null>(null);
  const [savingPreference, setSavingPreference] = useState(false);

  useEffect(() => {
    aiServices.providers.list().then(setProviders);
    aiServices.providers.getRoutingStrategy().then(setRouting);
    aiServices.providers.getQuota().then(setQuota);
    aiServices.providers.getPreference().then(setPreference);
  }, []);

  async function choosePreferred(provider: string | null) {
    setSavingPreference(true);
    try {
      const updated = await aiServices.providers.setPreference(provider);
      setPreference(updated);
      toast.success(
        provider ? `${providerDisplayName[provider] ?? provider} set as preferred provider` : "Back to automatic fallback order",
      );
    } catch {
      toast.error("Failed to update provider preference");
    } finally {
      setSavingPreference(false);
    }
  }

  const configuredProviders = providers?.map((p) => p.provider) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="AI System"
        title="Providers & Routing"
        description="Livora's AI infrastructure isn't locked to one provider — routing chooses the right model for each task."
      />

      <section>
        <SectionHeading
          title="Provider Preference"
          description="Which provider gets tried first for every agent run. If it fails or hits a rate limit, the next one in line is used automatically — a run never hard-fails just because one provider is busy."
        />
        <Panel className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={savingPreference}
              onClick={() => choosePreferred(null)}
              className={cn(
                "rounded-sm border px-3 py-1.5 text-xs transition-colors disabled:opacity-50",
                !preference?.preferredProvider
                  ? "border-ai bg-ai/12 text-ai"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              Auto (config order)
            </button>
            {configuredProviders.map((key) => (
              <button
                key={key}
                type="button"
                disabled={savingPreference}
                onClick={() => choosePreferred(key)}
                className={cn(
                  "rounded-sm border px-3 py-1.5 text-xs capitalize transition-colors disabled:opacity-50",
                  preference?.preferredProvider === key
                    ? "border-ai bg-ai/12 text-ai"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {providerDisplayName[key] ?? key}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Applies globally, to every agent (SEO, Content, Ads, Leads, CRO). Picking Groq here means Groq is tried
            first, then the rest fall back in config order.
          </p>
        </Panel>
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Providers"
          description="Gemini, Groq and Anthropic, side by side — live status from the last real request each one handled."
        />
        {!providers ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-shimmer h-48 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {providers.map((p) => {
              const q = quota?.find((row) => row.provider === p.provider) ?? null;
              return (
                <Panel key={p.id} hover className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-display text-base capitalize">{providerDisplayName[p.provider] ?? p.provider}</p>
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

                  <div className="mt-4 space-y-2 border-t border-border pt-3">
                    {q?.note ? (
                      <p className="text-[11px] text-muted-foreground">{q.note}</p>
                    ) : q && q.requestsUsedPct !== null ? (
                      <>
                        <AnimatedBar
                          label="Requests quota"
                          value={q.requestsUsedPct}
                          valueLabel={`${q.requestsRemaining}/${q.requestsLimit} left`}
                          tone={q.requestsUsedPct > 85 ? "warning" : "info"}
                        />
                        {q.tokensUsedPct !== null && (
                          <AnimatedBar
                            label="Tokens quota"
                            value={q.tokensUsedPct}
                            valueLabel={`${q.tokensRemaining}/${q.tokensLimit} left`}
                            tone={q.tokensUsedPct > 85 ? "warning" : "info"}
                          />
                        )}
                        {formatResetIn(q.requestsResetAt) && (
                          <p className="text-[10px] text-muted-foreground">{formatResetIn(q.requestsResetAt)}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        No quota reading yet — populates once this provider handles a real request.
                      </p>
                    )}
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
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeading
          title="AI Routing"
          description="Chooses the best model for each task automatically — quality, speed and cost, balanced."
        />
        <div className="mb-4 rounded-sm border border-border bg-surface/40 px-4 py-3 text-xs text-muted-foreground">
          This panel is a visual model of an intended routing strategy — it doesn't yet decide which provider
          actually handles a request. The setting that does that today is "Provider Preference" above.
        </div>
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