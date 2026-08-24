import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoBadge, Panel, Pill, Sparkline } from "@/components/ai/primitives";
import { usePageContext } from "@/context/AiMarketingContext";
import { aiServices } from "@/lib/ai/services";
import type { Campaign, CampaignHealth } from "@/lib/ai/types";

const healthTone: Record<CampaignHealth, "success" | "warning" | "danger"> = {
  Good: "success",
  Fair: "warning",
  "Needs Attention": "danger",
};

export default function AiMarketingCampaigns() {
  usePageContext("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);

  useEffect(() => {
    aiServices.campaigns.list().then(setCampaigns);
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Campaigns"
        description="Not just analytics — AI helps plan the fix, not only report the problem."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-sm border border-border bg-surface/40 px-4 py-3 text-xs text-muted-foreground">
        <DemoBadge />
        Campaign plans and experiments are illustrative until connected to live ad, SEO and CRO data.
      </div>

      {!campaigns ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-shimmer h-64 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {campaigns.map((c, i) => {
            const done = c.plan.filter((s) => s.state === "done").length;
            return (
              <Link
                key={c.id}
                to={`/admin/ai-marketing/campaigns/${c.id}`}
                className="animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both] block"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Panel hover className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="label-eyebrow">{c.channel}</p>
                      <h3 className="text-display mt-1.5 text-base leading-snug">{c.name}</h3>
                    </div>
                    <Pill tone={healthTone[c.health]}>{c.health}</Pill>
                  </div>

                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.summary}</p>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="label-eyebrow">{c.metric.label}</span>
                      <span
                        className={
                          c.metric.deltaDirection === "up"
                            ? "text-[11px] text-success"
                            : c.metric.deltaDirection === "down"
                              ? "text-[11px] text-destructive"
                              : "text-[11px] text-muted-foreground"
                        }
                      >
                        {c.metric.deltaLabel}
                      </span>
                    </div>
                    <p className="num text-display mt-1 text-2xl">{c.metric.value}</p>
                    <Sparkline points={c.spark} tone={c.health === "Good" ? "success" : c.health === "Fair" ? "warning" : "danger"} className="mt-2" />
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs">
                    <span className="text-muted-foreground">
                      {done}/{c.plan.length} plan steps done
                    </span>
                    <span className="flex items-center gap-1 text-ai">
                      Open <ArrowUpRight className="size-3" />
                    </span>
                  </div>
                </Panel>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
