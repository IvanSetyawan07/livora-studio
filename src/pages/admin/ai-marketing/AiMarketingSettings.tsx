import { PageHeader } from "@/components/admin/PageHeader";
import { Panel, Pill, SectionHeading, StatusDot } from "@/components/ai/primitives";
import {
  useAiAgents,
  useGoogleAuthorize,
  useGoogleDisconnect,
  useGoogleIntegrationStatus,
  useProviders,
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

/**
 * Satu jalur untuk status Google: hook react-query bersama. Hook-nya sudah
 * meng-invalidate aiKeys.googleStatus + aiKeys.agents, jadi badge di halaman
 * SEO/Overview ikut segar tanpa refresh manual.
 */
function ConnectionAction({ name }: { name: string }) {
  const { data: status } = useGoogleIntegrationStatus();

  const disconnect = useGoogleDisconnect();
  const authorize = useGoogleAuthorize();
  const redirecting = authorize.isPending;

  if (name !== GOOGLE_SEARCH_CONSOLE) return null;

  if (status?.connected) {
    return (
      <div className="flex items-center gap-3">
        {status.email ? (
          <span className="hidden text-xs text-muted-foreground sm:inline">{status.email}</span>
        ) : null}
        <button
          type="button"
          onClick={() =>
            disconnect.mutate(undefined, {
              onSuccess: () => toast.success("Google Search Console disconnected."),
              onError: (e: unknown) =>
                toast.error(e instanceof Error ? e.message : "Gagal disconnect."),
            })
          }
          disabled={disconnect.isPending}
          className="rounded-sm border border-border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={redirecting}
      onClick={() =>
        authorize.mutate(undefined, {
          onError: (e: unknown) =>
            toast.error(e instanceof Error ? e.message : "Gagal mengambil authorize URL."),
        })
      }
      className="rounded-sm border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
    >
      {redirecting ? "Redirecting…" : "Connect"}
    </button>
  );
}

export default function SettingsPage() {
  const { data: agents, isLoading: agentsLoading } = useAiAgents();
  const { data: providers, isLoading: providersLoading } = useProviders();

  const integrations = new Map<string, ConnectionState>();
  for (const agent of agents ?? []) {
    for (const dep of agent.dependencies) {
      const existing = integrations.get(dep.name);
      // Prefer showing "connected" if any agent already has it connected.
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
          description="Status is read-only. Services with their own OAuth flow can be connected right here; the rest are configured in the Laravel admin."
        />
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
                <li key={name} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
                  {name}
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
      </section>

      <section className="mt-10">
        <SectionHeading
          title="AI orchestration"
          description="Providers the Laravel backend can fall back across when an agent asks the AI a question."
        />
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
      </section>
    </>
  );
}
