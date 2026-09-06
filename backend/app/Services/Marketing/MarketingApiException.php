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

    /** Petakan HTTP status jadi status yang bisa dimengerti UI. */
    public static function fromHttp(string $platform, int $httpStatus, string $body): self
    {
        $short = mb_substr(trim($body), 0, 400);

        return match (true) {
            $httpStatus === 401 => new self("$platform menolak kredensial (401). $short", 'invalid_credentials'),
            $httpStatus === 403 => new self("$platform menolak akses (403) — scope/permission kurang. $short", 'permission_required'),
            $httpStatus === 429 => new self("$platform membatasi jumlah request (429). Coba lagi nanti.", 'rate_limited'),
            default => new self("$platform gagal merespons ($httpStatus). $short", 'api_error'),
        };
    }
}
