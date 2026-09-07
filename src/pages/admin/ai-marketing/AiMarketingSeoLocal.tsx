/**
 * Local SEO (Google Business Profile) — kerangka dashboard tetap tampil
 * penuh; angkanya diisi hanya kalau backend benar-benar mengembalikannya.
 * Tidak ada fixture: nilai kosong ditulis "—", dan alasan setiap metrik
 * yang tidak tersedia ditampilkan apa adanya dari backend.
 */
import { MapPin, Star, PhoneCall, Navigation, AlertTriangle } from "lucide-react";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { PlatformRow } from "@/components/ai/offline";
import { Panel, SectionHeading, StatusDot } from "@/components/ai/primitives";
import { ChartSection, MultiLineChart } from "@/components/ai/dashboard-charts";
import { useLocalSeoSummary } from "@/hooks/useAiDashboard";
import type { SectionState } from "@/lib/ai/section-state";
import type { LocalSeoSummary } from "@/lib/ai/types";

function fmt(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function LocalKpi({
  label,
  value,
  note,
  index,
  live,
}: {
  label: string;
  value: string;
  note: string;
  index: number;
  live: boolean;
}) {
  return (
    <Panel className={live ? "p-5" : "border-dashed p-5 opacity-80"}>
      <div
        className="animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
        style={{ animationDelay: `${index * 70}ms` }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="label-eyebrow">{label}</p>
          <StatusDot tone={live ? "success" : "neutral"} pulse={live} />
        </div>
        <p className="text-display num mt-3 text-4xl leading-none">{value}</p>
        <p className="mt-3 border-t border-border pt-3 text-[11px] tracking-wide text-muted-foreground">{note}</p>
      </div>
    </Panel>
  );
}

/** Local SEO block (reviews, rankings, map presence) reused by the SEO agent page. */
export function LocalSeoSection() {
  const { data, section } = useLocalSeoSummary();

  const connected = data?.connected ?? false;
  const totals = data?.totals ?? null;
  const live = Boolean(data?.hasData);
  const note = connected ? (data?.period ? `${data.period.days} hari terakhir` : "Google Business Profile") : "Butuh Google Business Profile";

  const seriesState: SectionState<LocalSeoSummary["series"]> =
    section.status === "data"
      ? { ...section, status: "data", data: section.data.series }
      : (section as SectionState<LocalSeoSummary["series"]>);

  return (
    <section className="mt-10">
      <SectionHeading
        title="Local SEO — reviews & rankings"
        description="Map views, direction requests, calls dan review untuk listing Livora, langsung dari Google Business Profile."
      />

      {data?.listing?.name && (
        <p className="mb-4 text-sm text-muted-foreground">
          Listing: <span className="text-foreground">{data.listing.name}</span>
          {data.listing.address ? ` — ${data.listing.address}` : ""}
        </p>
      )}

      {data?.message && (
        <p className="mb-4 flex items-start gap-2 rounded-sm border border-dashed border-border p-3 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {data.message}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LocalKpi label="Map Views" value={fmt(totals?.mapViews)} note={note} index={0} live={live} />
        <LocalKpi label="Direction Requests" value={fmt(totals?.directionRequests)} note={note} index={1} live={live} />
        <LocalKpi label="Calls" value={fmt(totals?.calls)} note={note} index={2} live={live} />
        <LocalKpi
          label="Avg Rating"
          value={fmt(totals?.averageRating ?? null, 2)}
          note={totals?.totalReviewCount ? `${totals.totalReviewCount} review` : note}
          index={3}
          live={Boolean(totals?.averageRating)}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ChartSection
          title="Map Visibility Trend"
          state={seriesState}
          provider="Google Business Profile"
          connectHref="/admin/ai-marketing/settings"
          renderChart={(points) => (
            <MultiLineChart
              title=""
              data={points.map((p) => ({
                label: p.date.slice(5),
                mapViews: p.mapViews,
                directionRequests: p.directionRequests,
                calls: p.calls,
              }))}
              series={[
                { key: "mapViews", label: "Map views", color: "hsl(var(--info))" },
                { key: "directionRequests", label: "Directions", color: "hsl(var(--success))" },
                { key: "calls", label: "Calls", color: "hsl(var(--warning))" },
              ]}
            />
          )}
        />
        <div className="space-y-2.5">
          <PlatformRow icon={MapPin} label="Google Maps listing" note="business.manage scope" />
          <PlatformRow icon={Star} label="Reviews & rating" note="reviews.readonly" />
          <PlatformRow icon={Navigation} label="Direction requests" note="performance API" />
          <PlatformRow icon={PhoneCall} label="Calls from listing" note="performance API" />
        </div>
      </div>

      <Panel className="mt-4 p-5 sm:p-6">
        <h3 className="text-display rule-accent mb-4 text-lg">Recent Reviews</h3>
        {data?.reviews?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4">Reviewer</th>
                  <th className="pb-2 pr-4">Rating</th>
                  <th className="pb-2 pr-4">Snippet</th>
                  <th className="pb-2 pr-4">Replied</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.reviews.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="py-2 pr-4">{r.reviewer ?? "—"}</td>
                    <td className="py-2 pr-4 num">{r.rating ?? "—"}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {r.comment ? (r.comment.length > 120 ? `${r.comment.slice(0, 120)}…` : r.comment) : "—"}
                    </td>
                    <td className="py-2 pr-4">{r.replied ? "Ya" : "Belum"}</td>
                    <td className="py-2 text-muted-foreground">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString("id-ID") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-sm text-muted-foreground">
            Belum ada review tersinkron. Review ditarik langsung dari listing Google Business Profile — tidak ada contoh yang ditampilkan.
          </p>
        )}
      </Panel>

      {data?.unavailable?.length ? (
        <Panel className="mt-4 p-5 sm:p-6">
          <h3 className="text-display mb-3 text-base">Keterbatasan data</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {data.unavailable.map((u) => (
              <li key={u.metric} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="text-foreground">{u.metric}</span> — {u.reason}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {!connected && (
        <div className="mt-4">
          <IntegrationRequired
            provider="Google Business Profile"
            title="Google Business Profile API belum tersambung"
            description="Akun Google yang dipakai untuk Search Console perlu diberi scope business.manage, lalu isi ID akun & lokasi listing di backend/.env dan connect ulang di kartu Google di atas."
            envKeys={[
              { key: "GOOGLE_MARKETING_CLIENT_ID", note: "sudah ada — dipakai bersama Search Console" },
              { key: "GOOGLE_MARKETING_CLIENT_SECRET", note: "sudah ada" },
              { key: "GOOGLE_BUSINESS_ACCOUNT_ID", note: "accounts/{id} dari Business Profile API" },
              { key: "GOOGLE_BUSINESS_LOCATION_ID", note: "locations/{id} listing Livora" },
            ]}
          />
        </div>
      )}
    </section>
  );
}
