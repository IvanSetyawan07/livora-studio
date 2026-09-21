<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Log;

class WhatsAppNotifier
{
    public static function provider(): WhatsAppProvider
    {
        $config = config('services.whatsapp', []);
        $selected = $config['provider'] ?? null;

        if ($selected === 'fonnte' && !empty($config['fonnte']['token'])) {
            return new FonnteWhatsAppProvider($config['fonnte']['token']);
        }

        if (
            $selected === 'twilio'
            && !empty($config['twilio']['sid'])
            && !empty($config['twilio']['auth_token'])
            && !empty($config['twilio']['from'])
        ) {
            return new TwilioWhatsAppProvider(
                $config['twilio']['sid'],
                $config['twilio']['auth_token'],
                $config['twilio']['from'],
            );
        }

        if (
            $selected === 'meta'
            && !empty($config['meta']['access_token'])
            && !empty($config['meta']['phone_number_id'])
        ) {
            return new MetaCloudWhatsAppProvider(
                $config['meta']['access_token'],
                $config['meta']['phone_number_id'],
                $config['meta']['api_version'] ?? 'v21.0',
            );
        }

        return new NullWhatsAppProvider();
    }

    /**
     * Send a WhatsApp notification. Never throws — always returns a result
     * array so callers can log/ignore it without risking the calling action.
     *
     * @return array{status: string, error: ?string}
     */
    public static function send(?string $phone, string $message): array
    {
        if (empty(trim((string) $phone))) {
            $error = 'No phone number on record for this consultation.';
            Log::warning('WhatsAppNotifier: ' . $error);
            return ['status' => 'skipped', 'error' => $error];
        }

        try {
            return self::provider()->send(self::normalizePhone($phone), $message);
        } catch (\Throwable $e) {
            Log::error('WhatsAppNotifier: unexpected failure — ' . $e->getMessage());
            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }

    /** Normalize a local Indonesian phone number into international format (62...). */
    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/[^0-9]/', '', $phone) ?? '';
        if (str_starts_with($digits, '0')) {
            $digits = '62' . substr($digits, 1);
        } elseif (str_starts_with($digits, '8')) {
            // e.g. "812-3456-7890" typed without the leading 0 / country code
            $digits = '62' . $digits;
        }
        return $digits;
    }
}