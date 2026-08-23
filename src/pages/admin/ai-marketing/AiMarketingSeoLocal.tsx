import { CategoryBarChart, MultiLineChart, StatGrid } from "@/components/ai/dashboard-charts";
import { LocalMap } from "@/components/ai/local-map";
import { DemoBadge, SectionHeading } from "@/components/ai/primitives";
import {
  localSeoKpis,
  rankingSeries,
  rankingSeriesConfig,
  reviewsBreakdown,
} from "@/lib/ai/dashboard-data";

/** Local SEO block (reviews, rankings, map presence) reused by the SEO agent page. */
export function LocalSeoSection() {
  return (
    <>
      <section className="mt-10">
        <SectionHeading
          title="Local SEO — reviews & rankings"
          description="Map views, direction requests, calls and local pack position for the Livora listing."
          action={<DemoBadge />}
        />
        <StatGrid kpis={localSeoKpis} />
      </section>

      <section className="mt-6">
        <SectionHeading title="Local map presence" />
        <LocalMap />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <CategoryBarChart title="Reviews by Rating" data={reviewsBreakdown} height={280} />
        <MultiLineChart
          title="Local Pack Position (12 Weeks)"
          data={rankingSeries}
          series={rankingSeriesConfig}
          height={280}
        />
      </section>
    </>
  );
}
