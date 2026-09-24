<?php

namespace App\Services\AI\Actions;

use App\Models\AiRecommendation;
use App\Services\AI\AIProviderManager;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Eksekutor NYATA untuk "content": membuat post di Facebook Page Livora
 * sebagai post TIDAK TERBIT (published=false). Post muncul di Meta Business
 * Suite untuk direview lalu diterbitkan manual — tidak pernah langsung tayang.
 *
 * Butuh META_GRAPH_ACCESS_TOKEN (Page token, izin pages_manage_posts) dan
 * META_PAGE_ID. Kalau belum ada, eksekusi ditolak jujur (tidak ada fallback).
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
        $token = config('services.meta_graph.access_token');
        $pageId = config('services.meta_graph.page_id');
        $version = config('services.meta_ads.api_version', 'v21.0');

        if (! filled($token) || ! filled($pageId)) {
            throw new ActionNotExecutableException(
                'Facebook Page belum tersambung (META_GRAPH_ACCESS_TOKEN / META_PAGE_ID kosong), jadi konten tidak bisa dikirim ke platform.'
            );
        }

        $res = $this->ai->ask(
            'Kamu adalah social media copywriter Livora Studio, brand interior & furniture premium di Indonesia.',
            "Tulis caption post Facebook berdasarkan rekomendasi ini.\nJudul: {$recommendation->title}\n"
            ."Langkah: {$recommendation->suggested_action}\n\nAturan: Bahasa Indonesia, maksimal 600 karakter, 3-5 hashtag relevan, "
            .'tanpa klaim diskon/garansi yang tidak ada. Balas HANYA caption-nya.',
            'content',
        );
        $caption = trim((string) ($res['text'] ?? ''));

        if ($caption === '') {
            throw new RuntimeException('AI tidak menghasilkan caption. Tidak ada yang dikirim ke Facebook.');
        }

        $response = Http::asForm()->timeout(30)->post("https://graph.facebook.com/{$version}/{$pageId}/feed", [
            'message' => mb_substr($caption, 0, 2000),
            'published' => 'false',
            'access_token' => $token,
        ]);

        if (! $response->successful() || ! $response->json('id')) {
            throw new RuntimeException('Facebook menolak pembuatan post: '.($response->json('error.message') ?? $response->body()));
        }

        $postId = (string) $response->json('id');

        return ExecutionResult::changed(
            "Draft post (belum terbit) dibuat di Facebook Page Livora, ID {$postId}. Review & terbitkan di Meta Business Suite.\n\nCaption:\n{$caption}",
            ['facebook_post' => null],
            ['facebook_post' => ['id' => $postId, 'published' => false, 'message' => $caption]],
        );
    }
}
