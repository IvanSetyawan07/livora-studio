import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Panel, Pill, SectionHeading, StatusDot } from "@/components/ai/primitives";
import { QueryError } from "@/components/ai/query-error";
import { usePageContext } from "@/context/AiMarketingContext";
import { useAdminDialog } from "@/components/admin/kit";
import {
  extractApiErrorMessage,
  useAiAgents,
  useGoogleAuthorize,
  useGoogleDisconnect,
  useGoogleIntegrationStatus,
  useMetaAdsAuthorize,
  useMetaAdsDisconnect,
  useMetaAdsIntegrationStatus,
  useProviders,
  useSyncProviders,
} from "@/hooks/useAiDashboard";
import { toast } from "sonner";
import type { AIProviderInfo, ConnectionState } from "@/lib/ai/types";

const connLabel: Record<ConnectionState, string> = {
  connected: "Connected",
  not_connected: "Not connected",
  coming_soon: "Coming soon",
};

const connTone: Record<ConnectionState, "success" | "neutral"> = {
  connected: "success",
  not_connected: "neutral",
  coming_soon: "neutral",
};

const providerTone: Record<AIProviderInfo["status"], "success" | "neutral" | "warning"> = {
  connected: "success",
  not_connected: "neutral",
  degraded: "warning",
};

/** Dependency name di tabel ai_agents yang punya alur OAuth sendiri. */
const GOOGLE_SEARCH_CONSOLE = "Google Search Console";
const META_ADS_API = "Meta Ads API";

/** Tombol Connect/Disconnect generik — dipakai Google & Meta Ads, cuma beda hook & label. */
function OAuthConnectionButtons({
  connected,
  subtitle,
  disconnecting,
  redirecting,
  onDisconnect,
  onConnect,
  disconnectedLabel,
}: {
  connected: boolean;
  subtitle?: string | null;
  disconnecting: boolean;
  redirecting: boolean;
  onDisconnect: () => void;
  onConnect: () => void;
  disconnectedLabel: string;
}) {
  if (connected) {
    return (
      <div className="flex items-center gap-3">
        {subtitle ? (
          <span className="hidden text-xs text-muted-foreground sm:inline">{subtitle}</span>
        ) : null}
        <button
          type="button"
          onClick={onDisconnect}
          disabled={disconnecting}
          className="rounded-sm border border-border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          {disconnecting ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={redirecting}
      onClick={onConnect}
      className="rounded-sm border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
    >
      {redirecting ? "Redirecting…" : disconnectedLabel}
    </button>
  );
}

/**
 * Satu jalur untuk status Google: hook react-query bersama. Hook-nya sudah
 * meng-invalidate aiKeys.googleStatus + aiKeys.agents, jadi badge di halaman
 * SEO/Overview ikut segar tanpa refresh manual.
 */
function GoogleConnectionAction() {
  const dialog = useAdminDialog();
  const { data: status } = useGoogleIntegrationStatus();
  const disconnect = useGoogleDisconnect();
  const authorize = useGoogleAuthorize();

  return (
    <OAuthConnectionButtons
      connected={Boolean(status?.connected)}
      subtitle={status?.email}
      disconnecting={disconnect.isPending}
      redirecting={authorize.isPending}
      disconnectedLabel="Connect"
      onDisconnect={async () => {
        const ok = await dialog.confirm({
          title: "Putuskan Google Search Console?",
          description: "Data SEO & Google Analytics akan berhenti diperbarui sampai disambungkan kembali.",
          confirmText: "Ya, Putuskan",
          cancelText: "Batal",
          tone: "danger",
        });
        if (!ok) return;
        disconnect.mutate(undefined, {
          onSuccess: () => toast.success("Google Search Console diputus."),
          onError: (e: unknown) => toast.error(extractApiErrorMessage(e, "Gagal memutus sambungan.")),
        });
      }}
      onConnect={() =>
        authorize.mutate(undefined, {
          onError: (e: unknown) =>
            toast.error(extractApiErrorMessage(e, "Gagal mengambil authorize URL.")),
        })
      }
    />
  );
}

/** Padanan GoogleConnectionAction, untuk kartu "Meta Ads API". */
function MetaAdsConnectionAction() {
  const dialog = useAdminDialog();
  const { data: status } = useMetaAdsIntegrationStatus();
  const disconnect = useMetaAdsDisconnect();
  const authorize = useMetaAdsAuthorize();

  return (
    <OAuthConnectionButtons
      connected={Boolean(status?.connected)}
      subtitle={status?.accountName ?? status?.accountId}
      disconnecting={disconnect.isPending}
      redirecting={authorize.isPending}
      disconnectedLabel="Connect"
      onDisconnect={async () => {
        const ok = await dialog.confirm({
          title: "Putuskan Meta Ads?",
          description: "Data biaya & performa iklan Meta/Instagram akan berhenti ditarik sampai disambungkan kembali.",
          confirmText: "Ya, Putuskan",
          cancelText: "Batal",
          tone: "danger",
        });
        if (!ok) return;
        disconnect.mutate(undefined, {
          onSuccess: () => toast.success("Meta Ads diputus."),
          onError: (e: unknown) => toast.error(extractApiErrorMessage(e, "Gagal memutus sambungan.")),
        });
      }}
      onConnect={() =>
        authorize.mutate(undefined, {
          onError: (e: unknown) =>
            toast.error(extractApiErrorMessage(e, "Gagal mengambil authorize URL.")),
        })
      }
    />
  );
}

function ConnectionAction({ name }: { name: string }) {
  if (name === GOOGLE_SEARCH_CONSOLE) return <GoogleConnectionAction />;
  if (name === META_ADS_API) return <MetaAdsConnectionAction />;
  return null;
}

const metaAdsCallbackMessage: Record<string, { tone: "success" | "danger"; text: string }> = {
  connected: { tone: "success", text: "Meta Ads connected." },
  denied: { tone: "danger", text: "Meta connection was denied." },
  invalid_state: { tone: "danger", text: "Connection attempt expired — please try again." },
  missing_code: { tone: "danger", text: "Meta did not return an authorization code." },
  exchange_failed: { tone: "danger", text: "Meta rejected the token exchange — please try again." },
};

function MetaAdsCallbackBanner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [callbackResult] = useState(() => searchParams.get("meta_ads"));

  useEffect(() => {
    if (searchParams.get("meta_ads")) {
      const params = new URLSearchParams(searchParams);
      params.delete("meta_ads");
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!callbackResult || !metaAdsCallbackMessage[callbackResult]) return null;

  const { tone, text } = metaAdsCallbackMessage[callbackResult];

  return (
    <Panel
      className={`mb-4 flex items-center gap-2 p-4 text-sm ${
        tone === "success" ? "border-success/40 text-success" : "border-destructive/40 text-destructive"
      }`}
    >
      <StatusDot tone={tone === "success" ? "success" : "danger"} />
      {text}
    </Panel>
  );
}

export default function SettingsPage() {
  usePageContext("settings");
  const { data: agents, isLoading: agentsLoading, error: agentsError, refetch: refetchAgents } = useAiAgents();
  const { data: providers, isLoading: providersLoading, error: providersError, refetch: refetchProviders } = useProviders();
  const syncProviders = useSyncProviders();

  const integrations = new Map<string, ConnectionState>();
  for (const agent of agents ?? []) {
    for (const dep of agent.dependencies) {
      const existing = integrations.get(dep.name);
      if (!existing || existing !== "connected") {
        integrations.set(dep.name, dep.state);
      }
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Settings"
        description="Integration status for every data source and platform the AI Marketing system depends on. Credentials are managed server-side in the Laravel backend — never in this dashboard."
      />

      <section>
        <SectionHeading
          title="Data source & platform connections"
          description="Services with their own OAuth flow can be connected right here; the rest are configured in the Laravel backend .env."
        />
        <MetaAdsCallbackBanner />
        {agentsError ? (
          <QueryError message="Status integrasi tidak bisa dimuat." onRetry={() => void refetchAgents()} />
        ) : (
          <Panel className="overflow-hidden">
            {agentsLoading ? (
              <div className="h-32 animate-pulse bg-surface/40" />
            ) : integrations.size === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No agent dependencies registered yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {[...integrations.entries()].map(([name, state]) => (
                  <li key={name} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
                    <span>{name}</span>
                    <div className="flex items-center gap-3">
                      <Pill tone={connTone[state]}>
                        <StatusDot tone={connTone[state]} pulse={state === "connected"} />
                        {connLabel[state]}
                      </Pill>
                      <ConnectionAction name={name} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </section>

      <section className="mt-10">
        <SectionHeading
          title="AI orchestration"
          description="Providers the Laravel backend can fall back across when an agent asks the AI a question."
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={syncProviders.isPending}
                onClick={() =>
                  syncProviders.mutate(undefined, {
                    onSuccess: () => toast.success("Model & status provider disinkronkan."),
                    onError: (e) => toast.error(extractApiErrorMessage(e, "Gagal sinkronisasi provider.")),
                  })
                }
                className="inline-flex items-center gap-1 rounded-sm border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {syncProviders.isPending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                Sync .env
              </button>
              <Link
                to="/admin/ai-marketing/providers"
                className="inline-flex items-center gap-1 text-xs text-ai hover:underline"
              >
                Providers & Routing <ArrowUpRight className="size-3" />
              </Link>
            </div>
          }
        />
        {providersError ? (
          <QueryError message="Status AI provider tidak bisa dimuat." onRetry={() => void refetchProviders()} />
        ) : (
          <Panel className="overflow-hidden">
            {providersLoading ? (
              <div className="h-32 animate-pulse bg-surface/40" />
            ) : (providers ?? []).length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No AI provider registered yet — run the provider seeder on the backend.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {(providers ?? []).map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                    <span className="capitalize">
                      {p.provider} <span className="text-muted-foreground">— {p.model}</span>
                    </span>
                    <Pill tone={providerTone[p.status]}>
                      <StatusDot tone={providerTone[p.status]} pulse={p.status === "connected"} />
                      {p.status === "connected" ? "Connected" : p.status === "degraded" ? "Degraded" : "Not connected"}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </section>
    </>
  );
}