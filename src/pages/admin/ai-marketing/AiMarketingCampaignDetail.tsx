import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, CircleDashed, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { Panel, Pill, SectionHeading, Sparkline } from "@/components/ai/primitives";
import { RecommendationCard } from "@/components/ai/recommendation-card";
import { QueryError } from "@/components/ai/query-error";
import { usePageContext } from "@/context/AiMarketingContext";
import {
  extractApiErrorMessage,
  useCampaign,
  useRecommendations,
  useUpdateCampaign,
} from "@/hooks/useAiDashboard";
import type { Campaign, CampaignHealth, CampaignPlanStepState } from "@/lib/ai/types";

const healthTone: Record<CampaignHealth, "success" | "warning" | "danger"> = {
  Good: "success",
  Fair: "warning",
  "Needs Attention": "danger",
};

const NEXT_STEP_STATE: Record<CampaignPlanStepState, CampaignPlanStepState> = {
  upcoming: "active",
  active: "done",
  done: "upcoming",
};

export default function AiMarketingCampaignDetail() {
  usePageContext("campaigns");
  const { id } = useParams();
  const { data: campaign, isLoading, isError, refetch } = useCampaign(id);
  const { data: recommendations } = useRecommendations();
  const updateCampaign = useUpdateCampaign();

  if (isError) {
    return <QueryError message="Campaign tidak bisa dimuat dari server." onRetry={() => refetch()} />;
  }
  if (isLoading) {
    return <div className="skeleton-shimmer h-64 rounded-lg" />;
  }
  if (!campaign) {
    return (
      <Panel className="p-10 text-center text-sm text-muted-foreground">
        Campaign not found.{" "}
        <Link to="/admin/ai-marketing/campaigns" className="text-ai">
          Back to Campaigns
        </Link>
      </Panel>
    );
  }

  const activeCampaign = campaign;

  async function handleStatusChange(nextStatus: Campaign["status"]) {
    try {
      await updateCampaign.mutateAsync({ id: activeCampaign.id, body: { status: nextStatus } });
      toast.success(`Status campaign diubah ke ${nextStatus}.`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal memperbarui status campaign."));
    }
  }

  async function handleTogglePlanStep(stepId: string) {
    const nextPlan = activeCampaign.plan.map((s) =>
      s.id === stepId ? { ...s, state: NEXT_STEP_STATE[s.state] } : s,
    );
    try {
      await updateCampaign.mutateAsync({ id: activeCampaign.id, body: { plan: nextPlan } });
      toast.success("Langkah campaign diperbarui.");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal memperbarui langkah plan."));
    }
  }

  const relatedRecs = (recommendations ?? []).filter((r) =>
    campaign.relatedRecommendationIds.includes(r.id),
  );

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
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={campaign.status}
              disabled={updateCampaign.isPending}
              onChange={(e) => void handleStatusChange(e.target.value as Campaign["status"])}
              className="h-8 rounded-sm border border-border bg-secondary px-2.5 text-xs text-foreground focus:border-ai focus:outline-none disabled:opacity-50"
              aria-label="Ubah status campaign"
            >
              {(["Active", "Paused", "Draft", "Ended"] as const).map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <Pill tone={healthTone[campaign.health]}>{campaign.health}</Pill>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <Panel className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="label-eyebrow">{campaign.metric.label}</p>
                <p className="num text-display mt-1 text-3xl">{campaign.metric.value}</p>
              </div>
              {campaign.budgetDaily ? (
                <div className="text-right">
                  <p className="label-eyebrow">Budget</p>
                  <p className="num mt-1 text-sm text-foreground">{campaign.budgetDaily}</p>
                </div>
              ) : null}
            </div>
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
            {campaign.spark.length > 1 ? (
              <Sparkline points={campaign.spark} tone={campaign.health === "Good" ? "success" : campaign.health === "Fair" ? "warning" : "danger"} className="mt-4" />
            ) : null}
          </Panel>

          <Panel className="p-5">
            <p className="label-eyebrow mb-3">Goals</p>
            {campaign.goals.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada target angka khusus pada campaign ini.</p>
            ) : (
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
            )}
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
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="label-eyebrow">AI Plan (klik langkah untuk update progress)</p>
            </div>
            <ol className="space-y-0">
              {campaign.plan.map((step, i) => (
                <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < campaign.plan.length - 1 ? (
                    <span className="absolute left-[9px] top-6 h-full w-px bg-border" aria-hidden />
                  ) : null}
                  <button
                    type="button"
                    disabled={updateCampaign.isPending}
                    onClick={() => void handleTogglePlanStep(step.id)}
                    className={`z-10 mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110 disabled:opacity-50 ${
                      step.state === "done"
                        ? "bg-success text-background"
                        : step.state === "active"
                          ? "bg-ai/15 text-ai"
                          : "border border-border text-muted-foreground"
                    }`}
                    title={`Klik untuk ubah status (${step.state})`}
                  >
                    {step.state === "done" ? (
                      <Check className="size-3" />
                    ) : step.state === "active" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <CircleDashed className="size-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={updateCampaign.isPending}
                    onClick={() => void handleTogglePlanStep(step.id)}
                    className={`text-left text-sm transition-colors hover:text-foreground ${
                      step.state === "upcoming" ? "text-muted-foreground" : "text-foreground/90"
                    }`}
                  >
                    {step.label || step.title || "Langkah eksekusi"}
                  </button>
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