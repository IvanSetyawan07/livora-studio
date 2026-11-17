<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\AI\AIProviderManager;
use App\Services\Google\GoogleBusinessProfileClient;
use App\Services\Google\GoogleOAuthTokenStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * Data Local SEO (Google Business Profile) untuk halaman SEO Agent.
 *
 * Pola respons SENGAJA sama persis dengan SeoController: `connected`,
 * `hasData`, `message` selalu ada dan eksplisit, supaya frontend bisa
 * membedakan tiga keadaan berbeda:
 *   - belum connect Google           → connected=false
 *   - connect tapi belum ada metrik  → connected=true, hasData=false
 *   - connect dan ada metrik         → connected=true, hasData=true
 *
 * Tidak ada AI di sini: ini angka mentah listing. Setiap blok API
 * dibungkus try/catch sendiri supaya satu API yang gagal (mis. reviews
 * belum di-approve) tidak menghapus metrik yang berhasil dibaca.
 */
class BusinessProfileController extends Controller
{
    /** Sama alasannya dengan SeoController: kuota harian API terbatas. */
    private const CACHE_TTL_SECONDS = 20 * 60;

    public function __construct(
        private GoogleOAuthTokenStore $tokens,
        private GoogleBusinessProfileClient $client,
    ) {
    }

    /**
     * GET /api/ai/seo/local-summary?days=30
     */
    public function localSummary(Request $request)
    {
        $days = (int) $request->query('days', 30);
        $days = max(7, min($days, 90));

        if ($this->tokens->getValidAccessToken() === null) {
            return response()->json([
                'connected' => false,
                'hasData' => false,
                'message' => 'Akun Google belum terhubung. Hubungkan akun Google dulu di kartu di atas.',
                'period' => null,
                'listing' => null,
                'totals' => null,
                'series' => [],
                'reviews' => [],
                'unavailable' => [],
            ]);
        }

        if (! $this->client->isConfigured()) {
            return response()->json([
                'connected' => true,
                'hasData' => false,
                'message' => 'GOOGLE_BUSINESS_LOCATION_ID belum diisi di backend/.env, jadi listing mana yang harus dibaca belum jelas.',
                'period' => null,
                'listing' => null,
                'totals' => null,
                'series' => [],
                'reviews' => [],
                'unavailable' => [],
            ]);
        }

        $key = "ai:seo:local-summary:{$days}";
        $payload = Cache::get($key);

        if (! is_array($payload)) {
            $payload = $this->fetchSummary($days);
            // Hasil sukses di-cache lama (hemat kuota), hasil gagal cuma 1 menit
            // supaya setelah user membetulkan izin/API, data langsung muncul.
            Cache::put($key, $payload, $payload['hasData'] ? self::CACHE_TTL_SECONDS : 60);
        }

        return response()->json($payload);
    }


    /** @return array<string, mixed> */
    private function fetchSummary(int $days): array
    {
        // Data Business Profile delay ~2-3 hari, jadi jendela diakhiri kemarin
        // supaya hari terakhir tidak selalu terlihat nol tanpa alasan.
        $end = now()->subDay()->toDateString();
        $start = now()->subDay()->subDays($days - 1)->toDateString();

        $unavailable = [];

        $listing = null;
        try {
            $listing = $this->client->listingInfo();
        } catch (Throwable $e) {
            $unavailable[] = ['metric' => 'Listing info', 'reason' => $e->getMessage()];
        }

        $totals = null;
        $series = [];
        try {
            $performance = $this->client->performance($start, $end);
            $totals = $performance['totals'];
            $series = $performance['series'];
        } catch (Throwable $e) {
            $unavailable[] = ['metric' => 'Map views / directions / calls', 'reason' => $e->getMessage()];
        }

        $reviews = [];
        $averageRating = null;
        $totalReviewCount = null;
        try {
            $reviewData = $this->client->reviews(10);
            $reviews = $reviewData['reviews'];
            $averageRating = $reviewData['averageRating'];
            $totalReviewCount = $reviewData['totalReviewCount'];
        } catch (Throwable $e) {
            $unavailable[] = ['metric' => 'Reviews & rating', 'reason' => $e->getMessage()];
        }

        // Google TIDAK menyediakan posisi local pack lewat API mana pun.
        // Daripada mengarang angka ranking, chart diisi tren impresi Maps
        // (data resmi) dan keterbatasannya dinyatakan terus terang.
        $unavailable[] = [
            'metric' => 'Local pack position',
            'reason' => 'Google tidak mengekspos peringkat local pack lewat API. Chart menampilkan tren impresi Maps sebagai proksi visibilitas.',
        ];

        $hasData = ($totals !== null && ($totals['mapViews'] + $totals['directionRequests'] + $totals['calls']) > 0)
            || count($reviews) > 0;

        $message = null;
        if (! $hasData) {
            $message = count($unavailable) > 1
                ? 'Listing terhubung, tapi sebagian API menolak permintaan. Detailnya ada di daftar di bawah.'
                : "Listing terhubung, tapi belum ada aktivitas tercatat dalam {$days} hari terakhir.";
        }

        return [
            'connected' => true,
            'hasData' => $hasData,
            'message' => $message,
            'period' => ['start' => $start, 'end' => $end, 'days' => $days],
            'listing' => $listing,
            'totals' => $totals === null ? null : [
                'mapViews' => $totals['mapViews'],
                'directionRequests' => $totals['directionRequests'],
                'calls' => $totals['calls'],
                'averageRating' => $averageRating,
                'totalReviewCount' => $totalReviewCount,
            ],
            'series' => $series,
            'reviews' => $reviews,
            'unavailable' => $unavailable,
        ];
    }

    /**
     * POST /api/ai/seo/local-reviews/{reviewId}/draft-reply
     * Generate draft balasan review Google Maps dengan keyword lokal Livora (aman, butuh review manusia).
     */
    public function draftReviewReply(Request $request, string $reviewId, AIProviderManager $ai)
    {
        $data = $request->validate([
            'reviewer' => ['nullable', 'string', 'max:120'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $reviewer = $data['reviewer'] ?? 'Customer';
        $rating = $data['rating'] ?? 5;
        $comment = $data['comment'] ?? '(tanpa komentar tertulis)';

        $prompt = <<<TXT
Tulis balasan profesional & hangat dari LIVORA Studio (interior design, arsitektur & custom furniture showroom di Jakarta Selatan) untuk ulasan Google Maps berikut:

Nama reviewer: {$reviewer}
Rating         : {$rating}/5 bintang
Ulasan         : {$comment}

Aturan:
- Bahasa Indonesia ramah & elegan (atau bahasa Inggris kalau ulasan berbahasa Inggris).
- Sapa nama reviewer dengan sopan.
- Maksimal 2-3 kalimat, natural (tidak kaku/robotik).
- Bila rating >= 4: ucapkan terima kasih dan sebut secara alami keahlian Livora di interior/custom furniture showroom Jakarta.
- Bila rating <= 3: akui pengalaman mereka, minta maaf tulus, dan ajak lanjut via WhatsApp resmi Livora (+62 821-2043-307) agar tim kami bantu langsung.
Balas HANYA teks balasannya.
TXT;

        $res = $ai->ask('Kamu adalah showroom hospitality manager LIVORA Studio Jakarta.', $prompt, 'seo');

        return response()->json([
            'reviewId' => $reviewId,
            'draft' => trim((string) ($res['text'] ?? '')),
            'provider' => $res['provider'] ?? null,
        ]);
    }

    /**
     * POST /api/ai/seo/local-reviews/{reviewId}/reply
     * Kirim balasan resmi ke Google Business Profile dan reset cache summary.
     */
    public function replyReview(Request $request, string $reviewId)
    {
        $data = $request->validate([
            'comment' => ['required', 'string', 'min:2', 'max:4096'],
        ]);

        $result = $this->client->replyReview($reviewId, $data['comment']);

        foreach ([7, 14, 28, 30, 90] as $d) {
            Cache::forget("ai:seo:local-summary:{$d}");
        }

        return response()->json($result);
    }
}
