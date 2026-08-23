import { Link } from "react-router-dom";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActivityStream } from "@/components/ai/activity-stream";
import { AgentPipeline, AgentRail } from "@/components/ai/agent-rail";
import { ContentQueue } from "@/components/ai/content-queue";
import { InsightCard } from "@/components/ai/insight-card";
import { KpiCard } from "@/components/ai/kpi-card";
import { LocalMap } from "@/components/ai/local-map";
import { PerformanceChart } from "@/components/ai/performance-chart";
import {
  DemoBadge,
  NotConnected,
  Panel,
  Reveal,
  SectionHeading,
  StatusDot,
} from "@/components/ai/primitives";
import { activity, agents, approvals, contentQueue, insights, kpis } from "@/lib/ai/data";

export default function AiMarketingOverview() {
  const pending = approvals.filter((a) => a.status === "pending");

  return (
    <>
      <PageHeader
        eyebrow="AI Marketing"
        title="AI Marketing"
        description="Intelligence and recommendations for Livora's digital growth."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              <StatusDot tone="warning" pulse /> Last analysis · demo cycle
            </span>
            <Link
              to="/admin/analytics"
              className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-2 text-xs transition-colors hover:bg-accent"
            >
              View full analytics <ExternalLink className="size-3.5" />
            </Link>
          </div>
        }
      />

      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-sm border border-border bg-surface/40 px-4 py-3 text-xs text-muted-foreground">
        <DemoBadge />
        Figures below are illustrative until the Laravel AI API and analytics endpoints are connected.
        No production values are being reported.
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <KpiCard key={k.id} kpi={k} index={i} />
        ))}
      </div>

      {/* Performance + insights */}
      <div className="mt-8 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Reveal>
          <PerformanceChart />
        </Reveal>
        <Reveal delay={120}>
          <ActivityStream items={activity} compact />
        </Reveal>
      </div>

      {/* AI insights */}
      <section className="mt-12">
        <SectionHeading
          title="AI Insights"
          description="What the system noticed, why it matters, and what it proposes. Insight, recommendation and action are kept distinct."
          action={
            <Link
              to="/admin/ai-marketing/insights"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              All insights <ArrowUpRight className="size-3.5" />
            </Link>
          }
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {insights.slice(0, 4).map((i, idx) => (
            <Reveal key={i.id} delay={idx * 80}>
              <InsightCard insight={i} defaultOpen={idx === 0} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section className="mt-12">
        <SectionHeading
          title="AI Agents"
          description="Specialised workers that observe, analyse and propose. They are not chatbots."
        />
        <AgentRail agents={agents} />
        <div className="mt-4">
          <AgentPipeline />
        </div>
      </section>

      {/* Approvals preview */}
      <section className="mt-12">
        <SectionHeading
          title="Awaiting your decision"
          description="Nothing is executed automatically. Every AI action passes through human approval."
          action={
            <Link
              to="/admin/ai-marketing/approvals"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Approval centre <ArrowUpRight className="size-3.5" />
            </Link>
          }
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {pending.map((a, i) => (
            <Reveal key={a.id} delay={i * 80}>
              <Panel hover className="flex h-full flex-col justify-between p-5">
                <div>
                  <p className="label-eyebrow">{a.agent} agent · {a.risk} risk</p>
                  <h3 className="text-display mt-3 text-base leading-snug">{a.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{a.summary}</p>
                </div>
                <Link
                  to="/admin/ai-marketing/approvals"
                  className="mt-5 inline-flex items-center gap-1.5 border-t border-border pt-4 text-xs text-brass"
                >
                  Review <ArrowUpRight className="size-3.5" />
                </Link>
              </Panel>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Content queue */}
      <section className="mt-12">
        <SectionHeading
          title="Content Queue"
          description="Planned and AI-assisted content across owned and social surfaces."
        />
        <ContentQueue items={contentQueue} />
      </section>

      {/* Secondary systems */}
      <section className="mt-12 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <Panel className="h-full p-6">
            <SectionHeading
              title="Social — Performance tracking"
              description="Followers, engagement rate and platform mix."
            />
            <NotConnected
              title="Social platform APIs are not connected"
              description="Instagram, Facebook, TikTok and YouTube metrics will appear here once the Laravel backend holds the platform credentials and exposes an aggregated endpoint."
            />
          </Panel>
        </Reveal>
        <Reveal delay={100}>
          <Panel className="h-full p-6">
            <SectionHeading
              title="Ads — Campaign performance"
              description="Spend, cost per lead, ROAS and conversion funnel."
            />
            <NotConnected
              title="Meta Ads and Google Ads are not connected"
              description="The Ads Agent needs read access to both ad accounts through the Laravel API before any spend figures can be shown."
            />
          </Panel>
        </Reveal>
        <Reveal delay={160}>
          <Panel className="h-full p-6">
            <SectionHeading
              title="Operations — Email & follow-up"
              description="Sequences, response rate and leads recovered."
            />
            <NotConnected
              title="Email sequencing is not connected"
              description="Follow-up telemetry will be sourced from the existing lead and campaign systems once their endpoints are exposed to this dashboard."
            />
          </Panel>
        </Reveal>
        <Reveal delay={220}>
          <LocalMap />
        </Reveal>
      </section>

      {/* Concept */}
      <Panel className="mt-12 p-6">
        <p className="label-eyebrow">How this fits together</p>
        <div className="scroll-rail mt-4 flex gap-3 pb-2">
          {[
            ["Analytics", "What happened?"],
            ["AI Marketing", "Why did it happen?"],
            ["AI Agent", "What should we do?"],
            ["Approval", "Should we do it?"],
            ["Action", "Execute it."],
            ["Monitoring", "Did it work?"],
          ].map(([k, v]) => (
            <div key={k} className="w-[190px] shrink-0 rounded-sm border border-border p-4">
              <p className="label-eyebrow text-brass">{k}</p>
              <p className="mt-2 text-sm">{v}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
