<?php

namespace App\Services\Meta;

/**
 * Exception khusus Meta Graph API.
 *
 * `$status` dipakai MetaIntegrationController untuk memetakan kegagalan ke
 * salah satu dari: not_configured, invalid_token, permission_required,
 * api_error — tanpa pernah meneruskan access token atau detail respons
 * mentah Meta ke frontend.
 */
class MetaGraphException extends \RuntimeException
{
    public function __construct(string $message, public readonly string $status = 'api_error')
    {
        parent::__construct($message);
    }

    public static function notConfigured(string $message): self
    {
        return new self($message, 'not_configured');
    }

    /**
     * Bangun exception dari payload "error" respons Graph API.
     *
     * @param array<string, mixed> $error
     */
    public static function fromGraphResponse(array $error, int $httpStatus): self
    {
        $code = $error['code'] ?? null;
        $subcode = $error['error_subcode'] ?? null;
        $type = $error['type'] ?? null;
        $message = $error['message'] ?? "Meta Graph API error (HTTP {$httpStatus}).";

        // code 190 / type OAuthException = access token invalid, expired, atau dicabut.
        if ($httpStatus === 401 || $code === 190 || $type === 'OAuthException') {
            return new self($message, 'invalid_token');
        }

        // code 10 / 200 = permission ditolak; subcode 33 = object tidak kelihatan
        // karena token tidak punya scope yang cukup untuk node ini.
        if (in_array($code, [10, 200], true) || $subcode === 33) {
            return new self($message, 'permission_required');
        }

        return new self($message, 'api_error');
    }
}