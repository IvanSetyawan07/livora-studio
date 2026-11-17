<?php

namespace App\Services\AI\Actions;

use App\Models\AiContentDraft;
use App\Models\AiRecommendation;
use App\Models\Item;
use App\Models\MarketingCampaign;
use App\Models\Project;
use App\Services\AI\AIProviderManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Eksekutor NYATA untuk "content":
 *  - Mengambil media produk/proyek/promo nyata bila ada (`target_type`/`target_id`).
 *  - Menyimpan draft terstruktur ke `ai_content_drafts` + `marketing_campaigns` (draft email).
 *  - Bila META_GRAPH_ACCESS_TOKEN & META_PAGE_ID tersedia, membuat post unpublished
 *    (foto + caption, atau feed) langsung ke Facebook Page Livora.
 */
class ContentActionExecutor implements ActionExecutor
{
    public function __construct(private AIProviderManager $ai)
    {
    }

    public function handles(): string
    {
        return 'content';
    }

    public function execute(AiRecommendation $recommendation): ExecutionResult
    {
        $mediaUrl = $this->resolveMediaUrl($recommendation);
        $copy = $this->generateCopy($recommendation);

        // 1. Selalu perbarui atau buat Content Draft lokal di `ai_content_drafts`
        $draft = null;
        if (Schema::hasTable('ai_content_drafts')) {
            $draft = AiContentDraft::updateOrCreate(
                ['recommendation_id' => $recommendation->id],
                [
                    'title' => $recommendation->title,
                    'channel' => 'facebook',
                    'headline' => $copy['headline'],
                    'caption' => $copy['caption'],
                    'body' => $copy['email_body'],
                    'media_url' => $mediaUrl,
                    'cta_label' => 'Konsultasi Desain',
                    'cta_url' => rtrim((string) config('app.frontend_url', 'https://livoralcr.com'), '/').'/appointment',
                    'target_type' => $recommendation->target_type,
                    'target_id' => $recommendation->target_id,
                    'status' => 'approved',
                ]
            );
        }

        // 2. Simpan juga draft Email Campaign siap edit di /admin/marketing
        $emailCampaign = null;
        if (Schema::hasTable('marketing_campaigns')) {
            $emailCampaign = MarketingCampaign::create([
                'campaign_name' => 'AI Content: '.Str::limit($recommendation->title, 80),
                'subject' => $copy['headline'],
                'section_label' => 'LIVORA JOURNAL',
                'headline' => $copy['headline'],
                'body' => $copy['email_body'],
                'hero_image' => $mediaUrl,
                'hero_image_alt' => $copy['headline'],
                'cta_label' => 'Jelajahi Koleksi',
                'cta_url' => rtrim((string) config('app.frontend_url', 'https://livoralcr.com'), '/').'/furniture',
                'signature' => "With warmth,\nThe Livora Team",
                'target' => 'all',
                'status' => 'draft',
            ]);

            if ($draft) {
                $draft->update(['marketing_campaign_id' => $emailCampaign->id]);
            }
        }

        // 3. Jika Meta Graph tersambung, dorong unpublished post ke Facebook Page
        $token = config('services.meta_graph.access_token');
        $pageId = config('services.meta_graph.page_id');
        $version = config('services.meta_ads.api_version', 'v21.0');

        if (filled($token) && filled($pageId)) {
            $isPhotoUrl = $mediaUrl && Str::startsWith($mediaUrl, ['http://', 'https://']);

            $response = $isPhotoUrl
                ? Http::asForm()->timeout(30)->post("https://graph.facebook.com/{$version}/{$pageId}/photos", [
                    'url' => $mediaUrl,
                    'caption' => mb_substr($copy['caption'], 0, 2000),
                    'published' => 'false',
                    'access_token' => $token,
                ])
                : Http::asForm()->timeout(30)->post("https://graph.facebook.com/{$version}/{$pageId}/feed", [
                    'message' => mb_substr($copy['caption'], 0, 2000),
                    'published' => 'false',
                    'access_token' => $token,
                ]);

            if (! $response->successful() || ! $response->json('id')) {
                throw new RuntimeException('Facebook menolak pembuatan post: '.($response->json('error.message') ?? $response->body()));
            }

            $postId = (string) $response->json('id');
            if ($draft) {
                $draft->update([
                    'status' => 'scheduled',
                    'external_id' => $postId,
                ]);
            }

            return ExecutionResult::changed(
                "Draft post visual (belum terbit) dibuat di Facebook Page Livora (ID {$postId}) dan draft Email Marketing (#{$emailCampaign?->id}) disimpan.\n\nCaption:\n{$copy['caption']}",
                ['facebook_post' => null],
                [
                    'facebook_post' => ['id' => $postId, 'published' => false, 'media_url' => $mediaUrl, 'message' => $copy['caption']],
                    'email_draft_id' => $emailCampaign?->id,
                ],
            );
        }

        // Jujur bila Meta Graph belum tersambung: aset tetap tersimpan nyata di Content Queue & Email Marketing
        return ExecutionResult::changed(
            "Draft konten masuk Content Queue (#{$draft?->id}) dan Email Marketing draft (#{$emailCampaign?->id}). Meta Graph API belum tersambung di .env, jadi post belum dikirim ke Facebook/Instagram.\n\nCaption:\n{$copy['caption']}",
            ['content_draft' => null],
            [
                'content_draft_id' => $draft?->id,
                'email_draft_id' => $emailCampaign?->id,
                'media_url' => $mediaUrl,
            ]
        );
    }

    private function resolveMediaUrl(AiRecommendation $rec): ?string
    {
        $path = null;
        if ($rec->target_type === 'item' && $rec->target_id) {
            $path = Item::whereKey($rec->target_id)->value('image');
        } elseif ($rec->target_type === 'project' && $rec->target_id) {
            $path = Project::whereKey($rec->target_id)->value('hero_image');
        } elseif ($rec->target_type === 'promo_banner' && $rec->target_id && Schema::hasTable('promo_banners')) {
            $path = DB::table('promo_banners')->where('id', $rec->target_id)->value('image_url');
        }

        if (! $path && Schema::hasTable('projects')) {
            $path = Project::whereNotNull('hero_image')->orderByDesc('is_highlighted')->value('hero_image');
        }

        if (! $path) {
            return null;
        }

        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        $base = rtrim((string) config('app.url', 'https://api.livoralcr.com'), '/');
        $clean = str_starts_with($path, '/') ? $path : '/storage/'.$path;
        if (! str_starts_with($clean, '/storage/') && ! str_starts_with($clean, '/seed/')) {
            $clean = '/storage'.$clean;
        }

        return $base.$clean;
    }

    /** @return array{headline: string, caption: string, email_body: string} */
    private function generateCopy(AiRecommendation $rec): array
    {
        $prompt = <<<TXT
Buat materi konten Livora Studio (arsitek, desain interior & furniture custom premium Jakarta) berdasarkan rekomendasi ini:
Judul  : {$rec->title}
Detail : {$rec->description}
Langkah: {$rec->suggested_action}

Aturan:
- Bahasa Indonesia elegan, natural untuk audiens homeowner/arsitek/interior designer.
- Tanpa klaim diskon atau garansi yang tidak disebut di data.
- Balas HANYA JSON valid tanpa code fence:
{"headline":"judul editorial maks 90 karakter","caption":"caption Instagram/Facebook siap tayang maks 600 karakter + 4 hashtag","email_body":"2 paragraf pendek untuk newsletter Livora"}
TXT;

        $res = $this->ai->ask(
            'Kamu adalah creative copywriter Livora Studio Indonesia.',
            $prompt,
            'content',
        );

        $raw = trim((string) ($res['text'] ?? ''));
        $raw = preg_replace('/^```(json)?/i', '', $raw);
        $raw = preg_replace('/```$/', '', $raw);
        $decoded = json_decode(trim($raw), true);

        if (is_array($decoded) && ! empty($decoded['caption'])) {
            return [
                'headline' => Str::limit((string) ($decoded['headline'] ?? $rec->title), 180),
                'caption' => (string) $decoded['caption'],
                'email_body' => (string) ($decoded['email_body'] ?? $decoded['caption']),
            ];
        }

        return [
            'headline' => Str::limit($rec->title, 180),
            'caption' => $raw !== '' ? $raw : $rec->description,
            'email_body' => $raw !== '' ? $raw : $rec->description,
        ];
    }
}
