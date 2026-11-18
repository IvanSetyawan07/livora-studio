<?php

namespace App\Services\Marketing;

/**
 * Kegagalan pemanggilan API platform marketing (GA4, Meta Ads, Google Ads,
 * TikTok, YouTube).
 *
 * `$status` sengaja memakai kosakata yang sama dengan SectionState di
 * frontend supaya UI bisa membedakan "belum diisi kredensialnya" dari
 * "token salah" dan "kena rate limit" — bukan semuanya jadi "error".
 * Nilai yang mungkin: not_configured, invalid_credentials,
 * permission_required, rate_limited, api_error.
 */
class MarketingApiException extends \RuntimeException
{
    public function __construct(string $message, public readonly string $status = 'api_error')
    {
        parent::__construct($message);
    }

    public static function notConfigured(string $message): self
    {
        return new self($message, 'not_configured');
    }

    public static function fromHttp(string $platform, int $httpStatus, string $body): self
    {
        $raw = trim($body);

        // Google Cloud: API-nya belum diaktifkan di project.
        if (preg_match('/project (\d+)/', $raw, $m) && str_contains($raw, 'has not been used in project')) {
            return new self(
                $platform.' belum diaktifkan di Google Cloud project '.$m[1]
                .'. Buka Google Cloud Console → APIs & Services → Library, aktifkan API-nya, tunggu 2-3 menit, lalu muat ulang.',
                'permission_required'
            );
        }

        if (str_contains($raw, 'USER_PERMISSION_DENIED')) {
            return new self(
                $platform.': akun Google yang dipakai belum punya akses ke customer ID ini. Pastikan akun itu diundang sebagai user di akun Google Ads, dan GOOGLE_ADS_CUSTOMER_ID diisi tanpa tanda hubung. Kalau akunnya di bawah manager (MCC), isi juga login customer ID manager-nya.',
                'permission_required'
            );
        }

        if (str_contains($raw, 'DEVELOPER_TOKEN')) {
            return new self(
                $platform.': developer token belum disetujui atau salah. Cek statusnya di Google Ads → Tools → API Center (butuh status Basic/Standard access).',
                'invalid_credentials'
            );
        }

        // Token Google lama: disetujui sebelum scope Analytics ditambahkan,
        // jadi 403 "insufficient authentication scopes". Yang perlu dilakukan
        // user bukan "hubungi admin", tapi menyambung ulang akun Google.
        if (str_contains($raw, 'insufficient authentication scopes') || str_contains($raw, 'ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
            return new self(
                'Akun Google yang tersambung belum memberi izin baca '.$platform
                .'. Buka Settings → Google, klik Disconnect lalu Connect lagi, dan pastikan centang izin Analytics ikut disetujui.',
                'permission_required'
            );
        }

        $short = self::extractReadableError($raw);

        if (str_contains($raw, 'REQUESTED_METRICS_FOR_MANAGER')) {
            return new self(
                $platform.': GOOGLE_ADS_CUSTOMER_ID saat ini adalah akun Manager (MCC). Isi GOOGLE_ADS_CUSTOMER_ID dengan ID akun iklan klien (tanpa tanda hubung), dan taruh ID Manager ke GOOGLE_ADS_LOGIN_CUSTOMER_ID.',
                'api_error'
            );
        }

        return match (true) {
            $httpStatus === 401 => new self("$platform menolak kredensial (401) — token salah atau kedaluwarsa. Buat ulang token lalu isi kembali di backend/.env.", 'invalid_credentials'),
            $httpStatus === 403 => new self("$platform menolak akses (403) — izin/scope kurang. $short", 'permission_required'),
            $httpStatus === 429 => new self("$platform membatasi jumlah request (429). Kuota akan pulih sendiri, coba lagi nanti.", 'rate_limited'),
            default => new self("$platform gagal merespons ($httpStatus). $short", 'api_error'),
        };
    }

    private static function extractReadableError(string $raw): string
    {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $innerError = $decoded['error']['details'][0]['errors'][0] ?? null;
            if (is_array($innerError)) {
                $code = is_array($innerError['errorCode'] ?? null)
                    ? implode(':', array_filter(array_map('strval', $innerError['errorCode'])))
                    : '';
                $msg = trim((string) ($innerError['message'] ?? ''));
                if ($msg !== '') {
                    return trim(($code !== '' ? "[{$code}] " : '').$msg);
                }
            }
            $topMsg = trim((string) ($decoded['error']['message'] ?? ''));
            if ($topMsg !== '') {
                return mb_substr($topMsg, 0, 260);
            }
        }

        return mb_substr($raw, 0, 240);
    }

}
