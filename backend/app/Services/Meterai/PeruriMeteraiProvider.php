<?php

namespace App\Services\Meterai;

use Illuminate\Support\Facades\Http;

/**
 * Real e-meterai provider integration over a generic REST API.
 *
 * Only ever instantiated when METERAI_PROVIDER, METERAI_BASE_URL,
 * METERAI_API_KEY and METERAI_CLIENT_ID are all present in config —
 * see MeteraiService::provider(). Adjust the request/response mapping
 * below to match the actual provider contract once credentials exist.
 */
class PeruriMeteraiProvider implements MeteraiProvider
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $apiKey,
        private readonly string $clientId,
    ) {
    }

    public function stamp(string $documentAbsolutePath, string $documentLabel): array
    {
        if (!is_file($documentAbsolutePath)) {
            return [
                'status' => 'failed',
                'reference' => null,
                'error' => 'Document file not found on disk: ' . $documentAbsolutePath,
            ];
        }

        try {
            $response = Http::withToken($this->apiKey)
                ->attach('document', file_get_contents($documentAbsolutePath), basename($documentAbsolutePath))
                ->post(rtrim($this->baseUrl, '/') . '/stamps', [
                    'client_id' => $this->clientId,
                    'label' => $documentLabel,
                ]);

            if (!$response->successful()) {
                return [
                    'status' => 'failed',
                    'reference' => null,
                    'error' => 'Provider returned HTTP ' . $response->status() . ': ' . $response->body(),
                ];
            }

            $body = $response->json() ?? [];

            return [
                'status' => $body['status'] ?? 'pending',
                'reference' => $body['reference'] ?? $body['serial_number'] ?? null,
                'error' => null,
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 'failed',
                'reference' => null,
                'error' => $e->getMessage(),
            ];
        }
    }
}