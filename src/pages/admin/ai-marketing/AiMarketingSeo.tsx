import { useState } from "react";
import { AgentPageShell } from "@/components/ai/agent-page";
import {
  ConfidenceBar,
  DemoBadge,
  NotConnected,
  Panel,
  Pill,
  Reveal,
  SectionHeading,
} from "@/components/ai/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { agentById, seoOpportunities } from "@/lib/ai/data";
import { LocalSeoSection } from "./AiMarketingSeoLocal";
import type { SeoOpportunity } from "@/lib/ai/types";

const impactTone = { High: "brass", Medium: "info", Low: "neutral" } as const;

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
