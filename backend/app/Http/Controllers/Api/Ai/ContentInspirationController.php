<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\AI\AIProviderManager;
use App\Services\Marketing\MarketingSection;
use App\Services\Marketing\TikTokClient;
use App\Services\Marketing\YouTubeClient;
use Illuminate\Http\Request;

/**
 * Content Inspiration — bandingkan konten video Livora dengan video sejenis
 * yang benar-benar ada di YouTube, lalu minta AI menyusun rekomendasi.
 *
 * Aturan keras:
 *  - Semua angka (views/likes/durasi) berasal langsung dari API platform.
 *  - TikTok hanya bisa membaca video akun sendiri (token Business API tidak
 *    punya akses pencarian publik), jadi TikTok muncul sebagai "performa
 *    sendiri", bukan sumber inspirasi lintas-kreator.
 *  - Kalau integrasi belum ada, endpoint mengembalikan status apa adanya —
 *    tidak pernah contoh/dummy.
 */
class ContentInspirationController extends Controller
{
    public function __construct(
        private YouTubeClient $youtube,
        private TikTokClient $tiktok,
        private AIProviderManager $ai,
    ) {
    }

    /** GET /api/ai/content/inspiration/library — video milik sendiri (YouTube + TikTok). */
    public function library()
    {
        $youtube = MarketingSection::attempt('content:inspiration:library:youtube', function () {
            return ['videos' => $this->youtube->channelVideos(12)];
        });

        $tiktok = MarketingSection::attempt('content:inspiration:library:tiktok', function () {
            return ['videos' => $this->tiktok->videos(20)];
        });

        return response()->json([
            'status' => ($youtube['status'] === 'ok' || $tiktok['status'] === 'ok') ? 'ok' : 'not_configured',
            'generatedAt' => now()->toIso8601String(),
            'youtube' => $youtube,
            'tiktok' => $tiktok,
            'tiktokDiscoveryAvailable' => false,
            'tiktokDiscoveryNote' => 'TikTok Business API tidak menyediakan pencarian video publik. '
                .'Video TikTok di sini adalah milik akun Livora sendiri; pembanding lintas-kreator diambil dari YouTube.',
        ]);
    }

    /** POST /api/ai/content/inspiration/analyze { query, sourceUrl?, sourceMetrics? } */
    public function analyze(Request $request)
    {
        $data = $request->validate([
            'query' => ['required', 'string', 'min:3', 'max:160'],
            'sourceTitle' => ['nullable', 'string', 'max:200'],
            'sourcePlatform' => ['nullable', 'string', 'in:youtube,tiktok'],
            'sourceViews' => ['nullable', 'integer', 'min:0'],
            'sourceEngagementRate' => ['nullable', 'numeric', 'min:0'],
        ]);

        $references = MarketingSection::attempt(
            'content:inspiration:search:'.md5(mb_strtolower($data['query'])),
            fn () => ['videos' => $this->youtube->searchSimilar($data['query'], 12)],
        );

        if ($references['status'] !== 'ok') {
            return response()->json([
                'status' => $references['status'],
                'message' => $references['message'] ?? 'YouTube tidak merespons.',
                'query' => $data['query'],
                'references' => [],
                'analysis' => null,
            ]);
        }

        $videos = $references['videos'];
        if ($videos === []) {
            return response()->json([
                'status' => 'empty',
                'message' => 'YouTube tidak mengembalikan video untuk topik ini. Coba kata kunci lain.',
                'query' => $data['query'],
                'references' => [],
                'analysis' => null,
            ]);
        }

        $analysis = null;
        $analysisError = null;
        try {
            $result = $this->ai->ask($this->systemPrompt(), $this->userPrompt($data, $videos), 'content');
            $analysis = [
                'text' => $result['text'],
                'provider' => $result['provider'],
                'model' => $result['model'],
            ];
        } catch (\Throwable $e) {
            report($e);
            $analysisError = $e->getMessage();
        }

        return response()->json([
            'status' => 'ok',
            'query' => $data['query'],
            'generatedAt' => now()->toIso8601String(),
            'references' => $videos,
            'analysis' => $analysis,
            'analysisError' => $analysisError,
        ]);
    }

    private function systemPrompt(): string
    {
        return <<<'TXT'
Kamu analis konten video untuk Livora, brand interior & custom furniture premium di Indonesia.
Kamu menerima daftar video YouTube NYATA beserta metrik aslinya.

Aturan:
- Hanya gunakan angka yang diberikan. Jangan mengarang metrik, tanggal, atau video lain.
- Kalau data tidak cukup untuk suatu kesimpulan, katakan terus terang.
- Jawab dalam bahasa yang sama dengan topik yang diberikan pengguna (Indonesia atau Inggris).

Format jawaban (markdown, ringkas):
1. **Pola yang menang** — 3 poin tentang format, durasi, dan sudut pandang yang terlihat dari data.
2. **Hook yang bisa ditiru** — 3 usulan judul/opening untuk Livora, mengacu ke video referensi.
3. **Rekomendasi produksi** — durasi target, struktur, dan CTA yang cocok untuk brand furniture premium.
TXT;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<array<string, mixed>>  $videos
     */
    private function userPrompt(array $data, array $videos): string
    {
        $lines = ["Topik / konten Livora: {$data['query']}"];

        if (! empty($data['sourceTitle'])) {
            $lines[] = 'Video Livora yang jadi acuan: '.$data['sourceTitle']
                .' ('.($data['sourcePlatform'] ?? 'unknown').')'
                .(isset($data['sourceViews']) ? ', views: '.$data['sourceViews'] : '')
                .(isset($data['sourceEngagementRate']) ? ', engagement rate: '.$data['sourceEngagementRate'].'%' : '');
        }

        $lines[] = '';
        $lines[] = 'Video YouTube sejenis (data asli dari YouTube Data API):';
        foreach ($videos as $i => $v) {
            $dur = $v['durationSeconds'] !== null ? gmdate($v['durationSeconds'] >= 3600 ? 'H:i:s' : 'i:s', $v['durationSeconds']) : 'tidak dilaporkan';
            $er = $v['engagementRate'] !== null ? $v['engagementRate'].'%' : 'tidak bisa dihitung';
            $lines[] = sprintf(
                '%d. "%s" — channel: %s | views: %s | likes: %s | komentar: %s | durasi: %s | engagement rate: %s | terbit: %s',
                $i + 1,
                $v['title'],
                $v['channel'],
                number_format((int) $v['views']),
                number_format((int) $v['likes']),
                number_format((int) $v['comments']),
                $dur,
                $er,
                substr((string) $v['publishedAt'], 0, 10),
            );
        }

        return implode("\n", $lines);
    }
}
