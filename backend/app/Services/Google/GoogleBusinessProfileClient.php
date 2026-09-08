<?php

namespace App\Services\Google;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Wrapper tipis untuk Google Business Profile.
 *
 * Google memecah Business Profile jadi beberapa host yang berbeda, jadi
 * satu Google_Service tidak cukup — di sini dipakai HTTP client biasa
 * dengan access token dari GoogleOAuthTokenStore (OAuth-nya sudah ada di
 * GoogleIntegrationController, TIDAK dibuat ulang di sini):
 *
 *   - mybusinessbusinessinformation.googleapis.com/v1  → info listing
 *   - businessprofileperformance.googleapis.com/v1     → metrik performa
 *   - mybusiness.googleapis.com/v4                     → reviews & rating
 *
 * Catatan versi API (per 2026): endpoint reviews masih hanya tersedia di
 * My Business API v4 — Google belum memindahkannya ke API baru mana pun,
 * jadi v4 memang jalur yang benar untuk reviews (bukan yang deprecated).
 * Semua endpoint LAIN yang dulu ada di v4 sudah pindah ke API baru dan
 * TIDAK dipakai lagi di sini.
 */
class GoogleBusinessProfileClient
{
    private const INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
    private const PERFORMANCE_BASE = 'https://businessprofileperformance.googleapis.com/v1';
    private const REVIEWS_BASE = 'https://mybusiness.googleapis.com/v4';

    /** Metrik harian yang dipakai 4 kartu KPI + chart tren. */
    private const DAILY_METRICS = [
        'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
        'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
        'BUSINESS_DIRECTION_REQUESTS',
        'CALL_CLICKS',
    ];

    public function __construct(private GoogleOAuthTokenStore $tokens)
    {
    }

    public function isConfigured(): bool
    {
        return $this->locationId() !== null;
    }

    /** "locations/12345" — dinormalkan supaya .env boleh diisi dengan atau tanpa prefix. */
    public function locationId(): ?string
    {
        $raw = trim((string) config('services.google_business.location_id'));

        if ($raw === '') {
            return null;
        }

        return str_starts_with($raw, 'locations/') ? $raw : 'locations/'.$raw;
    }

    /** "accounts/12345" — dibutuhkan khusus untuk endpoint reviews (v4). */
    public function accountId(): ?string
    {
        $raw = trim((string) config('services.google_business.account_id'));

        if ($raw === '') {
            return null;
        }

        return str_starts_with($raw, 'accounts/') ? $raw : 'accounts/'.$raw;
    }

    /**
     * Info listing dasar.
     *
     * @return array{name: ?string, address: ?string, primaryCategory: ?string, mapsUri: ?string}
     */
    public function listingInfo(): array
    {
        $location = $this->requireLocation();

        $data = $this->get(
            self::INFO_BASE.'/'.$location,
            ['readMask' => 'name,title,storefrontAddress,categories,metadata'],
            'Business Information API'
        );

        $address = $data['storefrontAddress'] ?? null;
        $lines = array_filter(array_merge(
            $address['addressLines'] ?? [],
            [$address['locality'] ?? null, $address['administrativeArea'] ?? null, $address['postalCode'] ?? null]
        ));

        return [
            'name' => $data['title'] ?? null,
            'address' => count($lines) ? implode(', ', $lines) : null,
            'primaryCategory' => $data['categories']['primaryCategory']['displayName'] ?? null,
            'mapsUri' => $data['metadata']['mapsUri'] ?? null,
        ];
    }

    /**
     * Metrik performa harian pada rentang tanggal (inklusif).
     *
     * @return array{
     *     totals: array{mapViews: int, directionRequests: int, calls: int},
     *     series: array<int, array{date: string, mapViews: int, directionRequests: int, calls: int}>
     * }
     */
    public function performance(string $startDate, string $endDate): array
    {
        $location = $this->requireLocation();

        [$sy, $sm, $sd] = array_map('intval', explode('-', $startDate));
        [$ey, $em, $ed] = array_map('intval', explode('-', $endDate));

        $query = [
            'dailyRange.start_date.year' => $sy,
            'dailyRange.start_date.month' => $sm,
            'dailyRange.start_date.day' => $sd,
            'dailyRange.end_date.year' => $ey,
            'dailyRange.end_date.month' => $em,
            'dailyRange.end_date.day' => $ed,
        ];

        // dailyMetrics diulang sebagai parameter yang sama (repeated field).
        $url = self::PERFORMANCE_BASE.'/'.$location.':fetchMultiDailyMetricsTimeSeries?'
            .http_build_query($query)
            .'&'.implode('&', array_map(fn ($m) => 'dailyMetrics='.$m, self::DAILY_METRICS));

        $data = $this->get($url, [], 'Business Profile Performance API');

        /** @var array<string, array{mapViews:int, directionRequests:int, calls:int}> $byDate */
        $byDate = [];

        foreach ($data['multiDailyMetricTimeSeries'] ?? [] as $group) {
            foreach ($group['dailyMetricTimeSeries'] ?? [] as $entry) {
                $metric = $entry['dailyMetric'] ?? '';

                foreach ($entry['timeSeries']['datedValues'] ?? [] as $point) {
                    $date = sprintf(
                        '%04d-%02d-%02d',
                        (int) ($point['date']['year'] ?? 0),
                        (int) ($point['date']['month'] ?? 0),
                        (int) ($point['date']['day'] ?? 0)
                    );
                    $value = (int) ($point['value'] ?? 0);

                    $byDate[$date] ??= ['mapViews' => 0, 'directionRequests' => 0, 'calls' => 0];

                    if (str_contains($metric, 'MAPS')) {
                        $byDate[$date]['mapViews'] += $value;
                    } elseif ($metric === 'BUSINESS_DIRECTION_REQUESTS') {
                        $byDate[$date]['directionRequests'] += $value;
                    } elseif ($metric === 'CALL_CLICKS') {
                        $byDate[$date]['calls'] += $value;
                    }
                }
            }
        }

        ksort($byDate);

        $series = [];
        $totals = ['mapViews' => 0, 'directionRequests' => 0, 'calls' => 0];

        foreach ($byDate as $date => $row) {
            $series[] = ['date' => $date] + $row;
            $totals['mapViews'] += $row['mapViews'];
            $totals['directionRequests'] += $row['directionRequests'];
            $totals['calls'] += $row['calls'];
        }

        return ['totals' => $totals, 'series' => $series];
    }

    /**
     * Reviews terbaru + rating rata-rata resmi dari Google.
     *
     * @return array{
     *     averageRating: ?float,
     *     totalReviewCount: int,
     *     reviews: array<int, array{id: string, reviewer: ?string, rating: ?int, comment: ?string, replied: bool, createdAt: ?string}>
     * }
     */
    public function reviews(int $limit = 10): array
    {
        $account = $this->accountId();
        $location = $this->requireLocation();

        if ($account === null) {
            throw new RuntimeException(
                'GOOGLE_BUSINESS_ACCOUNT_ID belum diisi di backend/.env — endpoint reviews butuh path accounts/{id}/locations/{id}.'
            );
        }

        $path = $account.'/'.$location.'/reviews';

        $data = $this->get(
            self::REVIEWS_BASE.'/'.$path,
            ['pageSize' => max(1, min($limit, 50)), 'orderBy' => 'updateTime desc'],
            'My Business API (reviews)'
        );

        $starMap = ['ONE' => 1, 'TWO' => 2, 'THREE' => 3, 'FOUR' => 4, 'FIVE' => 5];

        $reviews = array_map(function (array $review) use ($starMap) {
            return [
                'id' => (string) ($review['reviewId'] ?? ($review['name'] ?? uniqid('review_'))),
                'reviewer' => $review['reviewer']['displayName'] ?? null,
                'rating' => $starMap[$review['starRating'] ?? ''] ?? null,
                'comment' => $review['comment'] ?? null,
                'replied' => isset($review['reviewReply']),
                'createdAt' => $review['createTime'] ?? null,
            ];
        }, array_slice($data['reviews'] ?? [], 0, $limit));

        return [
            'averageRating' => isset($data['averageRating']) ? round((float) $data['averageRating'], 2) : null,
            'totalReviewCount' => (int) ($data['totalReviewCount'] ?? count($reviews)),
            'reviews' => $reviews,
        ];
    }

    private function requireLocation(): string
    {
        $location = $this->locationId();

        if ($location === null) {
            throw new RuntimeException('GOOGLE_BUSINESS_LOCATION_ID belum diisi di backend/.env.');
        }

        return $location;
    }

    /**
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    private function get(string $url, array $query, string $apiLabel): array
    {
        $token = $this->tokens->getValidAccessToken();

        if ($token === null) {
            throw new RuntimeException('Koneksi Google belum aktif atau token perlu disambungkan ulang.');
        }

        $response = Http::withToken($token)->timeout(20)->acceptJson()->get($url, $query);

        if ($response->failed()) {
            throw new RuntimeException(
                self::humanError($apiLabel, $response->status(), (string) ($response->json('error.message') ?? $response->body()))
            );
        }


        $json = $response->json();

        return is_array($json) ? $json : [];
    }
}
