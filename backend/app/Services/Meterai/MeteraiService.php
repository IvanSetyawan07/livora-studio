<?php

namespace App\Services\Meterai;

use App\Models\Consultation;

class MeteraiService
{
    /** True only when a real e-meterai provider is configured. */
    public static function isConfigured(): bool
    {
        return !(self::provider() instanceof NullMeteraiProvider);
    }

    public static function provider(): MeteraiProvider
    {
        $config = config('services.meterai', []);

        if (
            ($config['provider'] ?? null) === 'peruri'
            && !empty($config['base_url'])
            && !empty($config['api_key'])
            && !empty($config['client_id'])
        ) {
            return new PeruriMeteraiProvider($config['base_url'], $config['api_key'], $config['client_id']);
        }

        return new NullMeteraiProvider();
    }

    /**
     * Request the stamp and persist the resulting status on the consultation.
     * Never writes "completed" unless the provider itself reported it.
     */
    public static function requestStamp(Consultation $consultation, string $documentAbsolutePath): void
    {
        $result = self::provider()->stamp($documentAbsolutePath, 'Agreement #' . $consultation->id);

        $consultation->meterai_status = $result['status'];
        $consultation->meterai_reference = $result['reference'];
        $consultation->meterai_error = $result['error'];
        $consultation->meterai_completed_at = $result['status'] === 'completed' ? now() : null;
        $consultation->save();
    }
}