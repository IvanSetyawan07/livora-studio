<?php

namespace App\Services\Meterai;

/**
 * Used whenever no real e-meterai provider is configured.
 *
 * This deliberately never returns "completed" — a stamp duty transaction
 * cannot be faked. It always reports "failed" with an explanation so the
 * UI and admins are never misled into thinking a real stamp exists.
 */
class NullMeteraiProvider implements MeteraiProvider
{
    public function stamp(string $documentAbsolutePath, string $documentLabel): array
    {
        return [
            'status' => 'failed',
            'reference' => null,
            'error' => 'e-Meterai provider is not configured. Set METERAI_PROVIDER, METERAI_BASE_URL, '
                . 'METERAI_API_KEY and METERAI_CLIENT_ID in .env to enable real stamping.',
        ];
    }
}