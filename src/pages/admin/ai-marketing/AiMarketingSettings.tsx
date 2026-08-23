import { PageHeader } from "@/components/admin/PageHeader";
import { DemoBadge, NotConnected, Panel, Pill, SectionHeading, StatusDot } from "@/components/ai/primitives";
import { agents, DATA_MODE } from "@/lib/ai/data";
import type { ConnectionState } from "@/lib/ai/types";

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

export default function SettingsPage() {
  const integrations = new Map<string, ConnectionState>();
  for (const agent of agents) {
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
        action={<DemoBadge />}
      />

      <section>
        <SectionHeading
          title="Data source & platform connections"
          description="Read-only status. Connecting a service happens in the Laravel admin, not here."
        />
        <Panel className="overflow-hidden">
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
        </Panel>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <SectionHeading title="AI orchestration" />
          <NotConnected
            state="coming_soon"
            title="Claude via Laravel API is not connected"
            description="Once the orchestration endpoint exists, every agent on this dashboard will reason over live data instead of demo fixtures."
          />
        </Panel>
        <Panel className="p-6">
          <SectionHeading title="Data mode" />
          <div className="flex items-center gap-2 rounded-sm border border-dashed border-border-strong bg-background/40 p-5">
            <Pill tone="neutral">
              <StatusDot tone="neutral" />
              {DATA_MODE}
            </Pill>
            <p className="text-sm text-muted-foreground">
              Every insight, agent and metric in this dashboard is illustrative preview data, not
              production analytics.
            </p>
          </div>
        </Panel>
      </section>
    </>
  );
}
