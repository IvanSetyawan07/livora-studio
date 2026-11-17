// path: src/components/ai/content-inspiration.tsx
/**
 * Content Inspiration & Brand Video Recommender —
 * Membaca traffic video Livora di Instagram, YouTube, dan TikTok, menarik video
 * referensi terverifikasi (YouTube Data API + Gemini Google Search Grounding),
 * lalu AI menyusun saran video lengkap dengan link asli, deskripsi, alasan
 * kecocokan Brand Identity Livora, analisis traffic, dan konsep eksekusi.
 */
import { useMemo, useState } from "react";
import {
  Check,
  Clapperboard,
  ExternalLink,
  Instagram,
  Loader2,
  Music2,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { NotConnected, Panel, Pill, SectionHeading, StatusDot } from "@/components/ai/primitives";
import { extractApiErrorMessage, useCreateContentDraft } from "@/hooks/useAiDashboard";
import { useInspirationAnalysis, useInspirationLibrary } from "@/hooks/useMarketing";
import type {
  InspirationVideo,
  PlatformTrafficOverview,
  RecommendedVideoItem,
  VideoPlatform,
} from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const nf = new Intl.NumberFormat("id-ID");

const PLATFORM_META: Record<
  VideoPlatform,
  { label: string; badgeTone: "info" | "danger" | "warning" | "neutral"; Icon: typeof Instagram }
> = {
  instagram: { label: "Instagram", badgeTone: "info", Icon: Instagram },
  youtube: { label: "YouTube", badgeTone: "danger", Icon: Youtube },
  tiktok: { label: "TikTok", badgeTone: "warning", Icon: Music2 },
};

const ALL_PLATFORMS: VideoPlatform[] = ["instagram", "youtube", "tiktok"];

function duration(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function PlatformPill({ platform }: { platform: VideoPlatform }) {
  const meta = PLATFORM_META[platform] ?? PLATFORM_META.youtube;
  const Icon = meta.Icon;
  return (
    <Pill tone={meta.badgeTone}>
      <Icon className="size-3" />
      {meta.label}
    </Pill>
  );
}

function PlatformTrafficSummaryCard({
  platform,
  overview,
}: {
  platform: VideoPlatform;
  overview?: PlatformTrafficOverview;
}) {
  const meta = PLATFORM_META[platform];
  const Icon = meta.Icon;
  const connected = Boolean(overview?.connected);

  return (
    <div className="rounded-sm border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{meta.label}</span>
        </div>
        <Pill tone={connected ? "success" : "neutral"}>
          <StatusDot tone={connected ? "success" : "neutral"} />
          {connected ? `${overview?.videoCount ?? 0} video` : "Belum terhubung"}
        </Pill>
      </div>

      {connected && overview ? (
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Total views</span>
            <span className="font-mono text-foreground">
              {overview.totalViews !== null ? nf.format(overview.totalViews) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Rata-rata ER</span>
            <span className="font-mono text-foreground">
              {overview.avgEngagementRate !== null ? `${overview.avgEngagementRate}%` : "—"}
            </span>
          </div>
          {overview.topVideo?.url ? (
            <a
              href={overview.topVideo.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-2 text-[11px] text-ai hover:underline"
            >
              <span className="truncate">Top: {overview.topVideo.title}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {overview?.message ?? `Akun ${meta.label} Livora belum terhubung di environment ini.`}
        </p>
      )}
    </div>
  );
}

function OwnVideoCard({
  video,
  onPick,
  active,
}: {
  video: InspirationVideo;
  onPick: () => void;
  active?: boolean;
}) {
  const dur = duration(video.durationSeconds);
  return (
    <div
      className={cn(
        "flex gap-3 rounded-sm border border-border bg-background/40 p-3 transition-colors",
        active && "border-border-strong bg-accent/30",
      )}
    >
      {video.thumbnail ? (
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          className="h-16 w-24 shrink-0 rounded-sm object-cover"
        />
      ) : (
        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-sm bg-muted">
          <Clapperboard className="size-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <PlatformPill platform={video.platform} />
          {dur ? <span className="text-[11px] text-muted-foreground">{dur}</span> : null}
        </div>
        <p className="mt-1 line-clamp-1 text-sm font-medium">{video.title || "(tanpa judul)"}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {video.views !== null ? `${nf.format(video.views)} views` : "Views n/a"} ·{" "}
          {video.likes !== null ? `${nf.format(video.likes)} likes` : "Likes n/a"} ·{" "}
          {video.engagementRate !== null ? `${video.engagementRate}% ER` : "ER —"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPick}
            className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground underline-offset-4 hover:underline"
          >
            Cari referensi serupa
          </button>
          {video.url ? (
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Buka <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RecommendedVideoCard({
  rec,
  saved,
  saving,
  onSaveDraft,
}: {
  rec: RecommendedVideoItem;
  saved: boolean;
  saving: boolean;
  onSaveDraft: (rec: RecommendedVideoItem) => void;
}) {
  const dur = duration(rec.durationSeconds);
  const meta = PLATFORM_META[rec.platform] ?? PLATFORM_META.youtube;
  const Icon = meta.Icon;

  const sourceLabel =
    rec.sourceKind === "livora_benchmark"
      ? "Benchmark Akun Livora"
      : rec.sourceKind === "web_discovered"
        ? "Search Grounding"
        : "Referensi Kreator";

  return (
    <div className="flex flex-col rounded-sm border border-border bg-background/50 p-4 sm:p-5">
      {/* Header Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PlatformPill platform={rec.platform} />
          <Pill tone="neutral">{sourceLabel}</Pill>
        </div>
        <Pill tone={rec.brandFitScore >= 85 ? "success" : "info"}>
          Brand Fit {rec.brandFitScore}%
        </Pill>
      </div>

      {/* Video preview + link */}
      <div className="mt-3 flex gap-3">
        {rec.thumbnail ? (
          <a href={rec.url} target="_blank" rel="noreferrer" className="shrink-0">
            <img
              src={rec.thumbnail}
              alt={rec.title}
              loading="lazy"
              className="h-20 w-32 rounded-sm object-cover transition-opacity hover:opacity-90"
            />
          </a>
        ) : (
          <a
            href={rec.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-20 w-32 shrink-0 flex-col items-center justify-center gap-1 rounded-sm border border-border bg-muted/40 text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <Icon className="size-5" />
            <span className="text-[10px] uppercase tracking-[0.08em]">{meta.label}</span>
          </a>
        )}
        <div className="min-w-0 flex-1">
          <a
            href={rec.url}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-2 text-sm font-medium leading-snug text-foreground hover:text-ai hover:underline"
          >
            {rec.title}
          </a>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {rec.channel ?? meta.label}
            {dur ? ` · ${dur}` : ""}
            {rec.publishedAt ? ` · ${rec.publishedAt.slice(0, 10)}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {rec.views !== null ? (
              <>
                <span className="font-mono text-foreground">{nf.format(rec.views)}</span> views ·{" "}
                <span className="font-mono text-foreground">{nf.format(rec.likes ?? 0)}</span> likes ·{" "}
                {rec.engagementRate !== null ? `${rec.engagementRate}% ER` : "ER —"}
              </>
            ) : (
              <span>Sumber: {rec.metricsSource} — buka link untuk metrik live platform</span>
            )}
          </p>
        </div>
      </div>

      {/* Prominent Link Action */}
      <div className="mt-3">
        <a
          href={rec.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-accent/40"
        >
          Buka Video di {meta.label}
          <ExternalLink className="size-3" />
        </a>
      </div>

      {/* Deskripsi Video */}
      <div className="mt-4 space-y-3 text-xs leading-relaxed">
        <div>
          <p className="label-eyebrow mb-1">Deskripsi Video</p>
          <p className="text-foreground/90">{rec.description}</p>
        </div>

        {/* Alasan Rekomendasi AI */}
        <div className="rounded-sm border border-ai/30 bg-ai/5 p-3">
          <p className="label-eyebrow mb-1 text-ai">Alasan Rekomendasi AI (Brand Identity & Traffic)</p>
          <p className="text-foreground/90">{rec.reason}</p>
          {rec.trafficInsight ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <TrendingUp className="size-3 shrink-0 text-ai" />
              <span>{rec.trafficInsight}</span>
            </p>
          ) : null}
        </div>

        {/* Konsep Produksi Livora */}
        <div className="rounded-sm border border-border bg-background/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="label-eyebrow">Konsep Adaptasi untuk Livora</p>
            <Pill tone="neutral">{rec.livoraAdaptation.targetFormat}</Pill>
          </div>
          <p className="mt-1.5 text-sm font-medium text-foreground">
            {rec.livoraAdaptation.conceptTitle || rec.title}
          </p>
          {rec.livoraAdaptation.targetName ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Terkait {rec.livoraAdaptation.targetType === "project" ? "Proyek" : rec.livoraAdaptation.targetType === "promo_banner" ? "Promo" : "Produk"}:{" "}
              <span className="font-medium text-foreground">{rec.livoraAdaptation.targetName}</span>
            </p>
          ) : null}
          {rec.livoraAdaptation.hook ? (
            <p className="mt-2 text-foreground/90">
              <span className="font-medium text-foreground">Hook 3 detik: </span>
              {rec.livoraAdaptation.hook}
            </p>
          ) : null}
          {rec.livoraAdaptation.shotList.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
              {rec.livoraAdaptation.shotList.map((shot, idx) => (
                <li key={idx}>{shot}</li>
              ))}
            </ul>
          ) : null}
          {rec.livoraAdaptation.captionDraft ? (
            <p className="mt-2 border-t border-border pt-2 italic text-muted-foreground">
              "{rec.livoraAdaptation.captionDraft}"
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              Target Channel: {rec.livoraAdaptation.recommendedChannel}
            </span>
            <button
              type="button"
              disabled={saved || saving}
              onClick={() => onSaveDraft(rec)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-ai/40 bg-ai/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ai transition-colors hover:bg-ai/20 disabled:opacity-60"
            >
              {saved ? (
                <>
                  <Check className="size-3.5" /> Tersimpan di Content Queue
                </>
              ) : saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Menyimpan…
                </>
              ) : (
                <>
                  <Plus className="size-3.5" /> Simpan ke Content Queue
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContentInspirationPanel() {
  const library = useInspirationLibrary();
  const analysis = useInspirationAnalysis();
  const createDraft = useCreateContentDraft();

  const [query, setQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<VideoPlatform[]>(ALL_PLATFORMS);
  const [filterTab, setFilterTab] = useState<"all" | VideoPlatform>("all");
  const [picked, setPicked] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const igVideos = library.data?.instagram?.videos ?? [];
  const ytVideos = library.data?.youtube.videos ?? [];
  const ttVideos = library.data?.tiktok.videos ?? [];
  const ownVideos = useMemo(() => [...igVideos, ...ytVideos, ...ttVideos], [igVideos, ytVideos, ttVideos]);

  function togglePlatform(p: VideoPlatform) {
    setSelectedPlatforms((prev) => {
      if (prev.includes(p)) {
        return prev.length > 1 ? prev.filter((x) => x !== p) : prev;
      }
      return [...prev, p];
    });
  }

  function runBrandAuto() {
    setPicked(null);
    setFilterTab("all");
    analysis.mutate({
      query: query.trim().length >= 3 ? query.trim() : undefined,
      mode: "auto_brand",
      platforms: selectedPlatforms,
    });
  }

  function runTopic(q: string, source?: InspirationVideo) {
    const topic = q.trim();
    if (topic.length < 3) return;
    setQuery(topic);
    setPicked(source?.id ?? null);
    setFilterTab("all");
    analysis.mutate({
      query: topic,
      mode: "topic",
      platforms: selectedPlatforms,
      sourceTitle: source?.title,
      sourcePlatform: source?.platform,
      sourceViews: source?.views ?? undefined,
      sourceEngagementRate: source?.engagementRate ?? undefined,
      sourceUrl: source?.url,
    });
  }

  async function handleSaveToQueue(rec: RecommendedVideoItem) {
    setSavingId(rec.id);
    try {
      const ad = rec.livoraAdaptation;
      const bodyLines = [
        `[Konsep] ${ad.conceptTitle || rec.title}`,
        `[Format] ${ad.targetFormat}`,
        ad.hook ? `[Hook 3 Detik] ${ad.hook}` : "",
        ad.shotList.length ? `\nShot List:\n${ad.shotList.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : "",
        `\n[Alasan AI] ${rec.reason}`,
        `\n[Referensi Video] ${rec.url}`,
      ]
        .filter(Boolean)
        .join("\n");

      await createDraft.mutateAsync({
        title: ad.conceptTitle || `Video ${rec.platform.toUpperCase()}: ${rec.title}`,
        channel: ad.recommendedChannel || rec.platform,
        headline: ad.hook || ad.conceptTitle || rec.title,
        caption: ad.captionDraft || rec.description,
        body: bodyLines,
        cta_label: "Jadwalkan Konsultasi",
        target_type: ad.targetType ?? undefined,
        target_id: ad.targetId ?? undefined,
        meta: {
          reference_url: rec.url,
          reference_platform: rec.platform,
          brand_fit_score: rec.brandFitScore,
          reason: rec.reason,
          shot_list: ad.shotList,
        },
      });
      setSavedIds((prev) => ({ ...prev, [rec.id]: true }));
      toast.success("Konsep video disimpan ke Content Queue.");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyimpan draft video ke Content Queue."));
    } finally {
      setSavingId(null);
    }
  }

  const result = analysis.data;
  const recommendations = result?.recommendations ?? [];
  const filteredRecommendations = useMemo(
    () =>
      filterTab === "all"
        ? recommendations
        : recommendations.filter((r) => r.platform === filterTab),
    [filterTab, recommendations],
  );

  return (
    <section className="mt-10">
      <SectionHeading
        title="Saran Video Brand Identity Livora (Instagram · YouTube · TikTok)"
        description="AI membaca traffic video di IG, YouTube & TikTok serta katalog proyek/produk Livora, lalu mencari video nyata lintas platform beserta link aslinya, alasan rekomendasi, deskripsi visual, dan konsep siap produksi."
      />

      <Panel className="p-5 sm:p-6">
        {/* Controls: One-click Brand Identity AI + Topic Search + Platform Selector */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-eyebrow mr-1">Platform Target:</span>
              {ALL_PLATFORMS.map((p) => {
                const active = selectedPlatforms.includes(p);
                const meta = PLATFORM_META[p];
                const Icon = meta.Icon;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs transition-colors",
                      active
                        ? "border-ai/60 bg-ai/10 text-foreground"
                        : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={runBrandAuto}
              disabled={analysis.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-ai/50 bg-ai/15 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.1em] text-ai transition-colors hover:bg-ai/25 disabled:opacity-50"
            >
              {analysis.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Generate Saran Video Brand Livora
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim().length >= 3) {
                runTopic(query);
              } else {
                runBrandAuto();
              }
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Topik spesifik (opsional), mis. custom wardrobe, living room travertine, house tour Kemang…"
                className="w-full rounded-sm border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-border-strong"
              />
            </div>
            <button
              type="submit"
              disabled={analysis.isPending || (query.trim().length > 0 && query.trim().length < 3)}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-border-strong px-4 py-2 text-[11px] font-medium uppercase tracking-[0.1em] transition-colors hover:bg-accent/40 disabled:opacity-50"
            >
              {analysis.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Analisis Topik
            </button>
          </form>
        </div>

        {/* Cross-platform LIVORA traffic overview */}
        <div className="mt-6">
          <p className="label-eyebrow mb-3">Ringkasan Traffic Video Akun Livora</p>
          {library.isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat traffic Instagram, YouTube & TikTok…</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {ALL_PLATFORMS.map((p) => (
                <PlatformTrafficSummaryCard
                  key={p}
                  platform={p}
                  overview={library.data?.trafficOverview?.[p]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Own video library */}
        {!library.isLoading && ownVideos.length > 0 ? (
          <div className="mt-6">
            <p className="label-eyebrow mb-3">Pustaka Video Livora ({ownVideos.length}) — klik "Cari referensi serupa"</p>
            <div className="grid gap-3 md:grid-cols-2">
              {ownVideos.slice(0, 6).map((v) => (
                <OwnVideoCard
                  key={`${v.platform}-${v.id}`}
                  video={v}
                  active={picked === v.id}
                  onPick={() => runTopic(v.title || "interior furniture luxury", v)}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-sm border border-dashed border-border-strong bg-background/40 p-3">
          <Pill tone="neutral">Lintas Platform</Pill>
          <p className="text-xs text-muted-foreground">
            {library.data?.tiktokDiscoveryNote ??
              "Setiap link video berasal langsung dari API platform (Meta Graph IG, TikTok Business, YouTube Data API) atau Google Search Grounding terverifikasi — tanpa link fiktif."}
          </p>
        </div>
      </Panel>

      {/* Error State */}
      {analysis.isError ? (
        <Panel className="mt-4 p-5">
          <NotConnected title="Gagal menganalisis video" description={analysis.error.message} />
        </Panel>
      ) : null}

      {/* Recommendation Output */}
      {result ? (
        <div className="mt-5 space-y-5">
          {result.status !== "ok" && recommendations.length === 0 ? (
            <Panel className="p-5">
              <NotConnected
                title="Belum ada kandidat video yang bisa ditampilkan"
                description={result.message ?? "Pastikan kredensial platform / GEMINI_API_KEY sudah dikonfigurasi."}
              />
            </Panel>
          ) : (
            <>
              {/* Cross-platform AI Traffic Summary */}
              <Panel className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-display rule-accent text-lg">
                    Hasil Analisis Traffic & Brand Fit Livora
                  </h3>
                  {result.analysis ? (
                    <Pill tone="success">
                      <StatusDot tone="success" />
                      {result.analysis.provider} · {result.analysis.model}
                    </Pill>
                  ) : null}
                </div>

                {result.analysisError ? (
                  <p className="mt-3 rounded-sm border border-warning/40 bg-warning/10 p-2.5 text-xs text-warning">
                    {result.analysisError}
                  </p>
                ) : null}

                {result.trafficAnalysis?.summary ? (
                  <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                    {result.trafficAnalysis.summary}
                  </p>
                ) : null}

                {result.trafficAnalysis?.platformNotes ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {ALL_PLATFORMS.map((p) => {
                      const note = result.trafficAnalysis?.platformNotes?.[p];
                      if (!note) return null;
                      return (
                        <div key={p} className="rounded-sm border border-border bg-background/40 p-3 text-xs">
                          <div className="mb-1.5">
                            <PlatformPill platform={p} />
                          </div>
                          <p className="leading-relaxed text-muted-foreground">{note}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {result.brandContextUsed &&
                (result.brandContextUsed.items.length > 0 ||
                  result.brandContextUsed.projects.length > 0 ||
                  result.brandContextUsed.promos.length > 0) ? (
                  <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3 text-xs">
                    <span className="text-muted-foreground">Konteks Katalog Livora:</span>
                    {result.brandContextUsed.items.slice(0, 3).map((it) => (
                      <Pill key={`it-${it.targetId}`} tone="neutral">
                        Produk: {it.name}
                      </Pill>
                    ))}
                    {result.brandContextUsed.projects.slice(0, 2).map((pr) => (
                      <Pill key={`pr-${pr.targetId}`} tone="neutral">
                        Proyek: {pr.name}
                      </Pill>
                    ))}
                    {result.brandContextUsed.promos.slice(0, 2).map((pm) => (
                      <Pill key={`pm-${pm.targetId}`} tone="info">
                        Promo: {pm.name}
                      </Pill>
                    ))}
                  </div>
                ) : null}

                {result.discoveryNotes && Object.keys(result.discoveryNotes).length > 0 ? (
                  <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                    {Object.entries(result.discoveryNotes).map(([k, msg]) => (
                      <p key={k}>
                        • {k}: {msg}
                      </p>
                    ))}
                  </div>
                ) : null}
              </Panel>

              {/* Recommendation Cards Grid */}
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-display text-base">
                    Rekomendasi Video ({filteredRecommendations.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(["all", ...ALL_PLATFORMS] as const).map((tab) => {
                      const count =
                        tab === "all"
                          ? recommendations.length
                          : recommendations.filter((r) => r.platform === tab).length;
                      if (tab !== "all" && count === 0) return null;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setFilterTab(tab)}
                          className={cn(
                            "rounded-sm border px-2.5 py-1 text-xs transition-colors",
                            filterTab === tab
                              ? "border-border-strong bg-accent/40 text-foreground"
                              : "border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {tab === "all" ? `Semua (${count})` : `${PLATFORM_META[tab].label} (${count})`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filteredRecommendations.length > 0 ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {filteredRecommendations.map((rec) => (
                      <RecommendedVideoCard
                        key={rec.id}
                        rec={rec}
                        saved={Boolean(savedIds[rec.id])}
                        saving={savingId === rec.id}
                        onSaveDraft={handleSaveToQueue}
                      />
                    ))}
                  </div>
                ) : (
                  <Panel className="p-5">
                    <NotConnected
                      title="Tidak ada video pada filter platform ini"
                      description="Pilih tab Semua atau jalankan analisis ulang dengan platform tersebut aktif."
                    />
                  </Panel>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
