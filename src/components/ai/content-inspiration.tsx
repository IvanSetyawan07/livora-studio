// path: src/components/ai/content-inspiration.tsx
/**
 * Content Inspiration — pilih video Livora (YouTube/TikTok) atau ketik topik,
 * lalu tarik video sejenis dari YouTube Data API dan minta AI menyusun
 * rekomendasi produksi.
 *
 * Semua metrik yang tampil berasal langsung dari API platform. Kalau integrasi
 * belum ada, panel tampil kosong dengan status jujur — tidak ada contoh palsu.
 */
import { useMemo, useState } from "react";
import { ExternalLink, Loader2, Music2, Search, Sparkles, Youtube } from "lucide-react";
import { NotConnected, Panel, Pill, SectionHeading, StatusDot } from "@/components/ai/primitives";
import { useInspirationAnalysis, useInspirationLibrary } from "@/hooks/useMarketing";
import type { InspirationVideo } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const nf = new Intl.NumberFormat("id-ID");

function duration(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VideoCard({
  video,
  onPick,
  active,
}: {
  video: InspirationVideo;
  onPick?: () => void;
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
          className="h-16 w-28 shrink-0 rounded-sm object-cover"
        />
      ) : (
        <div className="h-16 w-28 shrink-0 rounded-sm bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium">{video.title || "(tanpa judul)"}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {video.channel ?? (video.platform === "tiktok" ? "TikTok Livora" : "")}
          {video.publishedAt ? ` · ${video.publishedAt.slice(0, 10)}` : ""}
          {dur ? ` · ${dur}` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {nf.format(video.views)} views · {nf.format(video.likes)} likes ·{" "}
          {video.engagementRate !== null ? `${video.engagementRate}% ER` : "ER —"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {onPick ? (
            <button
              type="button"
              onClick={onPick}
              className="text-[11px] font-medium uppercase tracking-[0.1em] text-foreground underline-offset-4 hover:underline"
            >
              Cari yang serupa
            </button>
          ) : null}
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

export function ContentInspirationPanel() {
  const library = useInspirationLibrary();
  const analysis = useInspirationAnalysis();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const ytVideos = library.data?.youtube.videos ?? [];
  const ttVideos = library.data?.tiktok.videos ?? [];
  const ownVideos = useMemo(() => [...ytVideos, ...ttVideos], [ytVideos, ttVideos]);

  function run(q: string, source?: InspirationVideo) {
    const topic = q.trim();
    if (topic.length < 3) return;
    setQuery(topic);
    setPicked(source?.id ?? null);
    analysis.mutate({
      query: topic,
      sourceTitle: source?.title,
      sourcePlatform: source?.platform,
      sourceViews: source?.views,
      sourceEngagementRate: source?.engagementRate ?? undefined,
    });
  }

  const result = analysis.data;

  return (
    <section className="mt-10">
      <SectionHeading
        title="Content Inspiration — video sejenis & rekomendasi AI"
        description="Pilih salah satu video Livora atau ketik topiknya. Sistem menarik video sejenis yang benar-benar ada di YouTube beserta metrik aslinya, lalu AI menyusun pola dan usulan produksi."
      />

      <Panel className="p-5 sm:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(query);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Contoh: custom wardrobe minimalis, tour rumah interior modern…"
              className="w-full rounded-sm border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-border-strong"
            />
          </div>
          <button
            type="submit"
            disabled={analysis.isPending || query.trim().length < 3}
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-border-strong px-4 py-2 text-[11px] font-medium uppercase tracking-[0.1em] transition-colors hover:bg-accent/40 disabled:opacity-50"
          >
            {analysis.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            Analisis
          </button>
        </form>

        {library.isLoading ? (
          <p className="mt-5 text-sm text-muted-foreground">Memuat video Livora…</p>
        ) : ownVideos.length > 0 ? (
          <div className="mt-6">
            <p className="label-eyebrow mb-3">Konten Livora</p>
            <div className="grid gap-3 md:grid-cols-2">
              {ownVideos.map((v) => (
                <VideoCard key={`${v.platform}-${v.id}`} video={v} active={picked === v.id} onPick={() => run(v.title, v)} />
              ))}
            </div>
          </div>
        ) : (
          <NotConnected
            className="mt-5"
            title="Belum ada video Livora yang bisa dibaca"
            description={
              library.data?.youtube.message ??
              library.data?.tiktok.message ??
              "Isi YOUTUBE_API_KEY + YOUTUBE_CHANNEL_ID dan/atau TIKTOK_ACCESS_TOKEN + TIKTOK_BUSINESS_ID di backend/.env, lalu jalankan php artisan config:clear."
            }
          />
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-sm border border-dashed border-border-strong bg-background/40 p-3">
          <Pill tone="neutral">
            <Music2 className="size-3" /> TikTok
          </Pill>
          <p className="text-xs text-muted-foreground">
            {library.data?.tiktokDiscoveryNote ??
              "TikTok Business API tidak menyediakan pencarian video publik, jadi pembanding lintas-kreator diambil dari YouTube; video TikTok yang tampil adalah milik akun Livora."}
          </p>
        </div>
      </Panel>

      {analysis.isError ? (
        <Panel className="mt-4 p-5">
          <NotConnected title="Analisis gagal" description={analysis.error.message} />
        </Panel>
      ) : null}

      {result ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <Panel className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Youtube className="size-4 text-muted-foreground" />
              <h3 className="text-display rule-accent text-lg">Video sejenis di YouTube</h3>
            </div>
            {result.references.length > 0 ? (
              <div className="grid gap-3">
                {result.references.map((v) => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            ) : (
              <NotConnected
                title="Tidak ada pembanding"
                description={result.message ?? "YouTube tidak mengembalikan video untuk topik ini."}
              />
            )}
          </Panel>

          <Panel className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-display rule-accent text-lg">Rekomendasi AI</h3>
              {result.analysis ? (
                <Pill tone="success">
                  <StatusDot tone="success" />
                  {result.analysis.provider} · {result.analysis.model}
                </Pill>
              ) : null}
            </div>
            {result.analysis ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {result.analysis.text}
              </div>
            ) : (
              <NotConnected
                title="AI belum menghasilkan rekomendasi"
                description={
                  result.analysisError ??
                  result.message ??
                  "Provider AI belum tersambung atau tidak merespons. Cek halaman Providers."
                }
              />
            )}
          </Panel>
        </div>
      ) : null}
    </section>
  );
}
