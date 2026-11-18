/**
 * Local SEO (Google Business Profile) — kerangka dashboard tetap tampil
 * penuh; angkanya diisi hanya kalau backend benar-benar mengembalikannya.
 * Tidak ada fixture: nilai kosong ditulis "—", dan alasan setiap metrik
 * yang tidak tersedia ditampilkan apa adanya dari backend.
 */
import { useState } from "react";
import {
  MapPin,
  Star,
  PhoneCall,
  Navigation,
  AlertTriangle,
  ExternalLink,
  MessageSquareReply,
  Loader2,
  Sparkles,
} from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { IntegrationRequired } from "@/components/ai/integration-required";
import { Panel, Pill, SectionHeading, StatusDot } from "@/components/ai/primitives";
import { ChartSection } from "@/components/ai/dashboard-charts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  extractApiErrorMessage,
  useDraftReviewReply,
  useLocalSeoSummary,
  useReplyReview,
} from "@/hooks/useAiDashboard";
import type { SectionState } from "@/lib/ai/section-state";
import type { LocalSeoReview, LocalSeoSummary } from "@/lib/ai/types";

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
  const [replyTarget, setReplyTarget] = useState<LocalSeoReview | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const draftReply = useDraftReviewReply();
  const sendReply = useReplyReview();

  async function openReplyDialog(r: LocalSeoReview) {
    setReplyTarget(r);
    setReplyDraft("");
    try {
      const res = await draftReply.mutateAsync({
        reviewId: r.id,
        reviewer: r.reviewer,
        rating: r.rating,
        comment: r.comment,
      });
      setReplyDraft(res.draft || "");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal membuat draft balasan AI."));
    }
  }

  async function handleSendReply() {
    if (!replyTarget || !replyDraft.trim()) return;
    try {
      await sendReply.mutateAsync({ reviewId: replyTarget.id, comment: replyDraft.trim() });
      toast.success("Balasan review berhasil dikirim ke Google Maps.");
      setReplyTarget(null);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal mengirim balasan ke Google Business Profile."));
    }
  }

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>
            Listing: <span className="font-medium text-foreground">{data.listing.name}</span>
            {data.listing.address ? ` — ${data.listing.address}` : ""}
          </p>
          {data.listing.mapsUri ? (
            <a
              href={data.listing.mapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-ai hover:underline"
            >
              Buka di Google Maps <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
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
          isEmpty={(points) => points.length === 0}
          renderChart={(points) => (
            <LineChart
              data={points.map((p) => ({
                label: p.date.slice(5),
                mapViews: p.mapViews,
                directionRequests: p.directionRequests,
                calls: p.calls,
              }))}
              margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
            >
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border-strong))",
                  borderRadius: 4,
                  fontSize: 12,
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend verticalAlign="bottom" height={28} iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="mapViews" name="Map views" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="directionRequests" name="Directions" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="calls" name="Calls" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
            </LineChart>
          )}
        />

        <div className="space-y-2.5">
          {[
            {
              icon: MapPin,
              label: "Google Maps listing",
              note: data?.listing?.name ?? "business.manage scope",
              active: connected && Boolean(data?.listing?.name),
              warn: data?.unavailable?.find((u) => u.metric.toLowerCase().includes("listing")),
            },
            {
              icon: Star,
              label: "Reviews & rating",
              note: "reviews.readonly",
              active: connected && ((data?.reviews?.length ?? 0) > 0 || totals?.averageRating !== null),
              warn: data?.unavailable?.find((u) => u.metric.toLowerCase().includes("review")),
            },
            {
              icon: Navigation,
              label: "Direction requests",
              note: "Business Profile Performance API",
              active: connected && totals?.directionRequests !== undefined && totals?.directionRequests !== null && !data?.unavailable?.some((u) => u.metric.toLowerCase().includes("map")),
              warn: data?.unavailable?.find((u) => u.metric.toLowerCase().includes("map")),
            },
            {
              icon: PhoneCall,
              label: "Calls from listing",
              note: "Business Profile Performance API",
              active: connected && totals?.calls !== undefined && totals?.calls !== null && !data?.unavailable?.some((u) => u.metric.toLowerCase().includes("map")),
              warn: data?.unavailable?.find((u) => u.metric.toLowerCase().includes("map")),
            },
          ].map((row) => {
            const RowIcon = row.icon;
            const tone = row.active ? "success" : row.warn ? "warning" : "neutral";
            const badgeText = row.active ? "Connected" : row.warn ? "Limited" : connected ? "No Data" : "Not connected";
            return (
              <div key={row.label} className="flex items-center justify-between gap-3 rounded-sm border border-border px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <RowIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{row.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{row.note}</p>
                  </div>
                </div>
                <Pill tone={tone} className="shrink-0">
                  <StatusDot tone={tone} />
                  {badgeText}
                </Pill>
              </div>
            );
          })}
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
                  <th className="pb-2 pr-4">Comment & Reply</th>
                  <th className="pb-2 pr-4">Replied</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.reviews.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="py-2.5 pr-4 font-medium">{r.reviewer ?? "—"}</td>
                    <td className="py-2.5 pr-4 num">{r.rating ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      <p>{r.comment ? (r.comment.length > 140 ? `${r.comment.slice(0, 140)}…` : r.comment) : "—"}</p>
                      {r.replyComment ? (
                        <p className="mt-1 rounded bg-secondary/50 px-2 py-1 text-[11px] text-foreground/80">
                          Balasan: {r.replyComment}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-4">{r.replied ? "Ya" : "Belum"}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString("id-ID") : "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      {!r.replied ? (
                        <button
                          type="button"
                          onClick={() => openReplyDialog(r)}
                          className="inline-flex items-center gap-1 rounded border border-ai/40 bg-ai/10 px-2.5 py-1 text-xs text-ai hover:bg-ai/20"
                        >
                          <MessageSquareReply className="size-3" /> Balas (AI)
                        </button>
                      ) : (
                        <span className="text-xs text-success">Sudah dibalas</span>
                      )}
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

      <Dialog open={!!replyTarget} onOpenChange={(open) => !open && setReplyTarget(null)}>
        <DialogContent className="border-border-strong bg-popover sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-display text-lg">Balas Review Google Maps</DialogTitle>
            <DialogDescription>
              {replyTarget?.reviewer ?? "Reviewer"} · {replyTarget?.rating ?? "—"} bintang
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {replyTarget?.comment && (
              <p className="rounded border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                “{replyTarget.comment}”
              </p>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="label-eyebrow">Draft Balasan AI</label>
                {draftReply.isPending && (
                  <span className="inline-flex items-center gap-1 text-xs text-ai">
                    <Loader2 className="size-3 animate-spin" /> Menyusun…
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={replyDraft}
                disabled={draftReply.isPending || sendReply.isPending}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder="Tulis atau edit balasan sebelum dikirim ke Google Maps..."
                className="w-full rounded border border-border bg-background p-3 text-sm text-foreground disabled:opacity-60"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => replyTarget && openReplyDialog(replyTarget)}
                disabled={draftReply.isPending || sendReply.isPending}
                className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
              >
                <Sparkles className="size-3 text-ai" /> Buat ulang draft
              </button>
              <button
                type="button"
                onClick={handleSendReply}
                disabled={!replyDraft.trim() || sendReply.isPending}
                className="inline-flex items-center gap-1.5 rounded bg-ai px-3.5 py-1.5 text-xs font-semibold text-background disabled:opacity-50"
              >
                {sendReply.isPending && <Loader2 className="size-3 animate-spin" />}
                Kirim ke Google Maps
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
