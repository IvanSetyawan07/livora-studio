import { PageHeader } from "@/components/admin/PageHeader";
import { Panel, Pill, SectionHeading, StatusDot } from "@/components/ai/primitives";
import { useAiAgents } from "@/hooks/useAiDashboard";
import { aiServices } from "@/lib/ai/services";
import { useQuery } from "@tanstack/react-query";
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

export default function SettingsPage() {
  const { data: agents, isLoading: agentsLoading } = useAiAgents();
  const { data: providers, isLoading: providersLoading } = useQuery<AIProviderInfo[]>({
    queryKey: ["ai", "providers"],
    queryFn: () => aiServices.providers.list(),
    staleTime: 60_000,
  });

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
          description="Read-only status. Connecting a service happens in the Laravel admin, not here."
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
                <li key={name} className="flex items-center justify-between px-5 py-3.5 text-sm">
                  {name}
                  <Pill tone={connTone[state]}>
                    <StatusDot tone={connTone[state]} pulse={state === "connected"} />
                    {connLabel[state]}
                  </Pill>
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