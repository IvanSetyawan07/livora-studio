<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Models\AiContentDraft;
use App\Models\AiRecommendation;
use App\Models\MarketingCampaign;
use App\Services\Marketing\MarketingPeriod;
use App\Services\Marketing\MarketingSection;
use App\Services\Marketing\TikTokClient;
use App\Services\Marketing\YouTubeClient;
use App\Services\Meta\MetaGraphClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ContentController extends Controller
{
    public function __construct(
        private MetaGraphClient $meta,
        private TikTokClient $tiktok,
        private YouTubeClient $youtube,
    ) {
    }

    /** GET /api/ai/content/summary?from&to|days */
    public function summary(Request $request)
    {
        $period = MarketingPeriod::fromRequest($request, 30);

        $platforms = [
            'instagram' => MarketingSection::attempt($period->cacheKey('content:instagram'), function () use ($period) {
                $acc = $this->meta->getInstagramAccount();
                $ins = $this->meta->instagramInsights($period);

                return [
                    'label' => 'Instagram', 'handle' => '@'.$acc['username'],
                    'followers' => $acc['followers'], 'reach' => $ins['reach'],
                    'engagements' => $ins['engagements'], 'posts' => $ins['posts'],
                    'daily' => $ins['daily'],
                ];
            }),
            'facebook' => MarketingSection::attempt($period->cacheKey('content:facebook'), function () use ($period) {
                $page = $this->meta->getFacebookPage();
                $ins = $this->meta->facebookInsights($period);

                return [
                    'label' => 'Facebook Page', 'handle' => $page['name'],
                    'followers' => $page['followers'], 'reach' => $ins['reach'],
                    'engagements' => $ins['engagements'], 'posts' => null,
                    'daily' => $ins['daily'],
                ];
            }),
            'tiktok' => MarketingSection::attempt($period->cacheKey('content:tiktok'), function () use ($period) {
                $s = $this->tiktok->summary($period);

                return [
                    'label' => 'TikTok', 'handle' => null,
                    'followers' => $s['followers'], 'reach' => $s['views'],
                    'engagements' => $s['engagements'], 'posts' => null,
                    'daily' => array_map(fn ($d) => ['date' => $d['date'], 'reach' => $d['views'], 'engagements' => $d['engagements']], $s['daily']),
                ];
            }),
            'youtube' => MarketingSection::attempt($period->cacheKey('content:youtube'), function () use ($period) {
                $s = $this->youtube->summary($period);

                return [
                    'label' => 'YouTube', 'handle' => $s['title'],
                    'followers' => $s['subscribers'], 'reach' => $s['views_in_period'],
                    'engagements' => $s['engagements'], 'posts' => $s['videos_in_period'],
                    'daily' => [], 'seriesAvailable' => false,
                ];
            }),
        ];

        $followers = 0;
        $reach = 0;
        $eng = 0;
        $posts = 0;
        $byDate = [];
        foreach ($platforms as $key => $p) {
            if (($p['status'] ?? null) !== 'ok') {
                continue;
            }
            $followers += $p['followers'];
            $reach += $p['reach'];
            $eng += $p['engagements'];
            $posts += (int) ($p['posts'] ?? 0);
            foreach ($p['daily'] as $row) {
                $byDate[$row['date']] ??= ['date' => $row['date']];
                $byDate[$row['date']][$key] = (int) ($row['engagements'] ?? 0);
            }
        }
        ksort($byDate);

        $anyOk = collect($platforms)->contains(fn ($p) => ($p['status'] ?? null) === 'ok');
        $weeks = max(1, $period->days() / 7);

        return response()->json([
            'status' => $anyOk ? 'ok' : 'not_configured',
            'period' => $period->toArray(),
            'generatedAt' => now()->toIso8601String(),
            'kpis' => [
                'followers' => $followers,
                'engagementRate' => $reach > 0 ? round($eng / $reach * 100, 2) : null,
                'postsPerWeek' => $anyOk ? round($posts / $weeks, 1) : null,
                'reach' => $reach,
            ],
            'engagementSeries' => array_values($byDate),
            'platforms' => collect($platforms)->map(fn ($p) => collect($p)->except(['daily'])->all())->all(),
        ]);
    }

    /**
     * GET /api/ai/content/queue
     * Antrian konten nyata dari `ai_content_drafts` (+ backfill otomatis dari
     * rekomendasi `content` yang sudah ada bila tabel draft masih kosong).
     */
    public function queue()
    {
        if (! Schema::hasTable('ai_content_drafts')) {
            return response()->json([]);
        }

        if (AiContentDraft::count() === 0) {
            $recs = AiRecommendation::where('action_type', 'content')->latest()->limit(10)->get();
            foreach ($recs as $r) {
                AiContentDraft::create([
                    'recommendation_id' => $r->id,
                    'title' => $r->title,
                    'channel' => 'instagram',
                    'headline' => $r->title,
                    'caption' => $r->suggested_action ?: $r->description,
                    'body' => $r->suggested_action ?: $r->description,
                    'target_type' => $r->target_type,
                    'target_id' => $r->target_id,
                    'status' => $r->status === 'executed' ? 'scheduled' : ($r->status === 'approved' ? 'approved' : 'needs_review'),
                ]);
            }
        }

        $drafts = AiContentDraft::orderByDesc('created_at')->limit(30)->get();

        return response()->json($drafts->map(fn (AiContentDraft $d) => $this->formatDraft($d))->values());
    }

    /** POST /api/ai/content/queue */
    public function createDraft(Request $request)
    {
        if (! Schema::hasTable('ai_content_drafts')) {
            return response()->json(['message' => 'Tabel ai_content_drafts belum tersedia. Jalankan migrasi terlebih dahulu.'], 422);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'channel' => ['required', 'string', 'in:instagram,facebook,email,tiktok,youtube,website'],
            'headline' => ['nullable', 'string', 'max:255'],
            'caption' => ['nullable', 'string', 'max:4000'],
            'body' => ['nullable', 'string', 'max:10000'],
            'media_url' => ['nullable', 'string', 'max:500'],
            'cta_label' => ['nullable', 'string', 'max:80'],
            'cta_url' => ['nullable', 'string', 'max:500'],
            'target_type' => ['nullable', 'string', 'in:item,project,promo_banner'],
            'target_id' => ['nullable', 'integer', 'min:1'],
            'meta' => ['nullable', 'array'],
        ]);

        $targetType = $data['target_type'] ?? null;
        $targetId = isset($data['target_id']) ? (int) $data['target_id'] : null;

        if ($targetType && $targetId) {
            $exists = match ($targetType) {
                'item' => Schema::hasTable('items') && DB::table('items')->where('id', $targetId)->exists(),
                'project' => Schema::hasTable('projects') && DB::table('projects')->where('id', $targetId)->exists(),
                'promo_banner' => Schema::hasTable('promo_banners') && DB::table('promo_banners')->where('id', $targetId)->exists(),
                default => false,
            };
            if (! $exists) {
                $targetType = null;
                $targetId = null;
            }
        } else {
            $targetType = null;
            $targetId = null;
        }

        $mediaUrl = $data['media_url'] ?? null;
        if (! $mediaUrl && $targetType && $targetId) {
            $mediaUrl = match ($targetType) {
                'item' => DB::table('items')->where('id', $targetId)->value('image'),
                'project' => DB::table('projects')->where('id', $targetId)->value('hero_image'),
                'promo_banner' => DB::table('promo_banners')->where('id', $targetId)->value('image_url'),
                default => null,
            };
        }

        $draft = AiContentDraft::create([
            'title' => $data['title'],
            'channel' => $data['channel'],
            'headline' => $data['headline'] ?? $data['title'],
            'caption' => $data['caption'] ?? null,
            'body' => $data['body'] ?? ($data['caption'] ?? $data['title']),
            'media_url' => $mediaUrl,
            'cta_label' => $data['cta_label'] ?? 'Jadwalkan Konsultasi',
            'cta_url' => $data['cta_url'] ?? null,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'status' => 'needs_review',
            'meta' => $data['meta'] ?? null,
        ]);

        return response()->json($this->formatDraft($draft), 201);
    }

    /** @return array<string, mixed> */
    private function formatDraft(AiContentDraft $d): array
    {
        return [
            'id' => (string) $d->id,
            'recommendationId' => $d->recommendation_id ? (string) $d->recommendation_id : null,
            'marketingCampaignId' => $d->marketing_campaign_id,
            'title' => $d->title,
            'channel' => $d->channel,
            'headline' => $d->headline,
            'caption' => $d->caption,
            'mediaUrl' => $d->media_url,
            'status' => $d->status,
            'scheduledFor' => optional($d->scheduled_for)->toIso8601String(),
            'externalId' => $d->external_id,
            'createdAt' => optional($d->created_at)->toIso8601String(),
            'meta' => $d->meta,
        ];
    }

    /** PATCH /api/ai/content/queue/{draft} */
    public function updateDraft(Request $request, AiContentDraft $draft)
    {
        $data = $request->validate([
            'status' => ['nullable', 'in:needs_review,approved,scheduled,published,draft'],
            'channel' => ['nullable', 'in:instagram,facebook,email,tiktok,youtube,website'],
            'caption' => ['nullable', 'string', 'max:4000'],
            'headline' => ['nullable', 'string', 'max:255'],
            'scheduled_for' => ['nullable', 'date'],
        ]);

        $draft->update(array_filter($data, fn ($v) => $v !== null));

        return response()->json([
            'id' => (string) $draft->id,
            'status' => $draft->status,
            'channel' => $draft->channel,
            'scheduledFor' => optional($draft->scheduled_for)->toIso8601String(),
        ]);
    }

    /** POST /api/ai/content/queue/{draft}/email-draft */
    public function pushToEmailCampaign(AiContentDraft $draft)
    {
        $base = rtrim((string) config('app.frontend_url', 'https://livoralcr.com'), '/');
        $campaign = $draft->marketing_campaign_id
            ? MarketingCampaign::find($draft->marketing_campaign_id)
            : null;

        if (! $campaign) {
            $campaign = MarketingCampaign::create([
                'campaign_name' => 'AI Content: '.Str::limit($draft->title, 80),
                'subject' => $draft->headline ?: $draft->title,
                'section_label' => 'LIVORA JOURNAL',
                'headline' => $draft->headline ?: $draft->title,
                'body' => $draft->body ?: $draft->caption ?: $draft->title,
                'hero_image' => $draft->media_url,
                'hero_image_alt' => $draft->headline ?: $draft->title,
                'cta_label' => $draft->cta_label ?: 'Jelajahi Koleksi',
                'cta_url' => $draft->cta_url ?: $base.'/furniture',
                'signature' => "With warmth,\nThe Livora Team",
                'target' => 'all',
                'status' => 'draft',
            ]);
            $draft->update(['marketing_campaign_id' => $campaign->id]);
        }

        return response()->json([
            'campaignId' => $campaign->id,
            'redirectPath' => "/admin/marketing?campaignId={$campaign->id}",
        ]);
    }
}
