import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, CircleDashed, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoBadge, Panel, Pill, SectionHeading, Sparkline } from "@/components/ai/primitives";
import { RecommendationCard } from "@/components/ai/recommendation-card";
import { usePageContext } from "@/context/AiMarketingContext";
import { aiServices } from "@/lib/ai/services";
import { recommendations } from "@/lib/ai/data";
import type { Campaign, CampaignHealth } from "@/lib/ai/types";

const healthTone: Record<CampaignHealth, "success" | "warning" | "danger"> = {
  Good: "success",
  Fair: "warning",
  "Needs Attention": "danger",
};

export default function AiMarketingCampaignDetail() {
  usePageContext("campaigns");
  const { id } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    aiServices.campaigns.getById(id).then((c) => setCampaign(c ?? null));
  }, [id]);

  if (campaign === undefined) {
    return <div className="skeleton-shimmer h-64 rounded-lg" />;
  }
  if (campaign === null) {
    return (
      <Panel className="p-10 text-center text-sm text-muted-foreground">
        Campaign not found.{" "}
        <Link to="/admin/ai-marketing/campaigns" className="text-ai">
          Back to Campaigns
        </Link>
      </Panel>
    );
  }

  const relatedRecs = recommendations.filter((r) => campaign.relatedRecommendationIds.includes(r.id));

  return (
    <>
      <Link
        to="/admin/ai-marketing/campaigns"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All campaigns
      </Link>

      <PageHeader
        eyebrow={campaign.channel}
        title={campaign.name}
        description={campaign.summary}
        action={<Pill tone={healthTone[campaign.health]}>{campaign.health}</Pill>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-sm border border-border bg-surface/40 px-4 py-3 text-xs text-muted-foreground">
        <DemoBadge />
        This plan is illustrative — steps and experiments will run for real once the campaign is wired to a live
        data source.
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <Panel className="p-5">
            <p className="label-eyebrow">{campaign.metric.label}</p>
            <p className="num text-display mt-1 text-3xl">{campaign.metric.value}</p>
            <p
              className={
                campaign.metric.deltaDirection === "up"
                  ? "mt-1 text-xs text-success"
                  : campaign.metric.deltaDirection === "down"
                    ? "mt-1 text-xs text-destructive"
                    : "mt-1 text-xs text-muted-foreground"
              }
            >
              {campaign.metric.deltaLabel}
            </p>
            <Sparkline points={campaign.spark} tone={campaign.health === "Good" ? "success" : campaign.health === "Fair" ? "warning" : "danger"} className="mt-4" />
          </Panel>

          <Panel className="p-5">
            <p className="label-eyebrow mb-3">Goals</p>
            <div className="space-y-3">
              {campaign.goals.map((g) => (
                <div key={g.label} className="flex items-center justify-between border-t border-border pt-3 first:border-t-0 first:pt-0">
                  <div>
                    <p className="text-sm text-foreground/90">{g.label}</p>
                    <p className="text-xs text-muted-foreground">Target: {g.target}</p>
                  </div>
                  <span className={`num text-sm ${g.onTrack ? "text-success" : "text-destructive"}`}>{g.current}</span>
                </div>
              ))}
            </div>
          </Panel>

          {campaign.activeExperiments.length > 0 ? (
            <Panel className="p-5">
              <p className="label-eyebrow mb-3">Active Experiments</p>
              <div className="space-y-3">
                {campaign.activeExperiments.map((e) => (
                  <div key={e.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground/90">{e.name}</p>
                      <Pill tone={e.status === "Running" ? "info" : e.status === "Done" ? "success" : "neutral"}>{e.status}</Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{e.hypothesis}</p>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-4">
          <Panel className="p-5">
            <p className="label-eyebrow mb-4">AI Plan</p>
            <ol className="space-y-0">
              {campaign.plan.map((step, i) => (
                <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < campaign.plan.length - 1 ? (
                    <span className="absolute left-[9px] top-5 h-full w-px bg-border" aria-hidden />
                  ) : null}
                  <span
                    className={`z-10 flex size-[19px] shrink-0 items-center justify-center rounded-full ${
                      step.state === "done"
                        ? "bg-success text-background"
                        : step.state === "active"
                          ? "bg-ai/15 text-ai"
                          : "border border-border text-muted-foreground"
                    }`}
                  >
                    {step.state === "done" ? (
                      <Check className="size-3" />
                    ) : step.state === "active" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <CircleDashed className="size-3" />
                    )}
                  </span>
                  <p
                    className={`text-sm ${
                      step.state === "upcoming" ? "text-muted-foreground" : "text-foreground/90"
                    }`}
                  >
                    {step.label}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>

          {relatedRecs.length > 0 ? (
            <section>
              <SectionHeading title="Related recommendations" description="What the AI proposed for this campaign." />
              <div className="space-y-4">
                {relatedRecs.map((r) => (
                  <RecommendationCard key={r.id} rec={r} variant="compact" />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
