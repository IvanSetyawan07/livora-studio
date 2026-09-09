<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Throwable;

class AiSetting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Key yang isinya kredensial jangka panjang → dienkripsi at-rest.
     * Sengaja daftar eksplisit (bukan enkripsi blanket) supaya setting
     * biasa seperti `preferred_ai_provider` tetap plaintext & mudah dibaca.
     */
    public const SENSITIVE_KEYS = [
        'google_oauth_connection',
    ];

    /** Prefix key yang juga dianggap sensitif (kredensial platform lain). */
    public const SENSITIVE_PREFIXES = [
        'meta_oauth_',
        'meta_access_token',
        'google_ads_credentials',
        'tiktok_oauth_',
    ];

    public static function isSensitiveKey(?string $key): bool
    {
        if (!$key) {
            return false;
        }

        if (in_array($key, self::SENSITIVE_KEYS, true)) {
            return true;
        }

        foreach (self::SENSITIVE_PREFIXES as $prefix) {
            if (str_starts_with($key, $prefix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Enkripsi/dekripsi transparan: pemanggil (GoogleOAuthTokenStore dll)
     * tetap membaca/menulis nilai apa adanya.
     */
    protected function value(): Attribute
    {
        return Attribute::make(
            get: function (?string $value, array $attributes) {
                if ($value === null || !self::isSensitiveKey($attributes['key'] ?? null)) {
                    return $value;
                }

                return self::tryDecrypt($value);
            },
            set: function (?string $value, array $attributes) {
                if ($value === null || !self::isSensitiveKey($attributes['key'] ?? $this->attributes['key'] ?? null)) {
                    return ['value' => $value];
                }

                return ['value' => Crypt::encryptString($value)];
            },
        );
    }

    /** Baris lama yang masih plaintext tetap terbaca (tidak bikin integrasi mati). */
    public static function tryDecrypt(string $value): string
    {
        try {
            return Crypt::decryptString($value);
        } catch (Throwable $e) {
            return $value;
        }
    }

    public static function isEncrypted(string $value): bool
    {
        try {
            Crypt::decryptString($value);

            return true;
        } catch (Throwable $e) {
            return false;
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $setting = static::query()->where('key', $key)->first();

        return $setting?->value ?? $default;
    }

    public static function set(string $key, ?string $value): void
    {
        $setting = static::firstOrNew(['key' => $key]);
        $setting->key = $key;
        $setting->value = $value;

        try {
            $setting->save();
        } catch (Throwable $e) {
            Log::error('Gagal menyimpan ai_setting', ['key' => $key, 'error' => $e->getMessage()]);
            throw $e;
        }
    }
}
