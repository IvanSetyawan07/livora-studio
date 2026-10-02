<?php

namespace App\Services\Auth;

use App\Mail\AdminLoginCodeMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Verifikasi dua langkah untuk akun admin: kode 6 angka via email
 * (berlaku 10 menit, maks 5 percobaan), plus opsi "ingat perangkat" 30 hari.
 * Token login (Sanctum) BARU dibuat setelah kode benar.
 */
class AdminTwoFactor
{
    public const CODE_TTL_MINUTES = 10;
    public const MAX_ATTEMPTS = 5;
    public const TRUST_DAYS = 30;
    public const RESEND_COOLDOWN_SECONDS = 45;

    public function required(User $user, ?string $deviceToken): bool
    {
        if ($user->role !== 'admin') {
            return false;
        }

        return !$this->isTrusted($user, $deviceToken);
    }

    /** Buat challenge baru & kirim kode. Return payload untuk frontend. */
    public function start(User $user, array $context = []): array
    {
        $challenge = Str::random(48);
        $this->storeAndSend($challenge, $user, $context);

        return [
            'two_factor_required' => true,
            'challenge'           => $challenge,
            'email_masked'        => $this->mask($user->email),
            'expires_in'          => self::CODE_TTL_MINUTES * 60,
        ];
    }

    public function resend(string $challenge): ?array
    {
        $state = Cache::get($this->key($challenge));
        if (!$state) {
            return null;
        }
        if (now()->timestamp - ($state['sent_at'] ?? 0) < self::RESEND_COOLDOWN_SECONDS) {
            return ['cooldown' => true];
        }
        $user = User::find($state['user_id']);
        if (!$user) {
            return null;
        }
        $this->storeAndSend($challenge, $user, $state['context'] ?? []);

        return ['email_masked' => $this->mask($user->email)];
    }

    /**
     * @return array{ok: bool, user?: User, context?: array, error?: string}
     */
    public function verify(string $challenge, string $code): array
    {
        $key = $this->key($challenge);
        $state = Cache::get($key);
        if (!$state) {
            return ['ok' => false, 'error' => 'expired'];
        }

        if (($state['attempts'] ?? 0) >= self::MAX_ATTEMPTS) {
            Cache::forget($key);
            return ['ok' => false, 'error' => 'locked'];
        }

        if (!hash_equals($state['code_hash'], hash('sha256', $challenge.'|'.trim($code)))) {
            $state['attempts'] = ($state['attempts'] ?? 0) + 1;
            Cache::put($key, $state, now()->addSeconds(max(1, $state['expires_at'] - now()->timestamp)));
            return ['ok' => false, 'error' => 'invalid', 'remaining' => self::MAX_ATTEMPTS - $state['attempts']];
        }

        Cache::forget($key);
        $user = User::find($state['user_id']);
        if (!$user) {
            return ['ok' => false, 'error' => 'expired'];
        }

        return ['ok' => true, 'user' => $user, 'context' => $state['context'] ?? []];
    }

    public function trustDevice(User $user, Request $request): string
    {
        $token = Str::random(64);
        DB::table('admin_trusted_devices')->insert([
            'user_id'    => $user->id,
            'token_hash' => hash('sha256', $token),
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 250, ''),
            'expires_at' => now()->addDays(self::TRUST_DAYS),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $token;
    }

    /** Dipanggil saat reset password — semua perangkat tepercaya dicabut. */
    public function revokeAll(User $user): void
    {
        DB::table('admin_trusted_devices')->where('user_id', $user->id)->delete();
    }

    protected function isTrusted(User $user, ?string $deviceToken): bool
    {
        if (!$deviceToken || strlen($deviceToken) < 32) {
            return false;
        }

        try {
            $row = DB::table('admin_trusted_devices')
                ->where('user_id', $user->id)
                ->where('token_hash', hash('sha256', $deviceToken))
                ->where('expires_at', '>', now())
                ->first();
        } catch (\Throwable $e) {
            // Tabel belum dimigrasi → anggap tidak tepercaya (lebih aman).
            return false;
        }

        if ($row) {
            DB::table('admin_trusted_devices')->where('id', $row->id)->update(['last_used_at' => now()]);
            return true;
        }

        return false;
    }

    protected function storeAndSend(string $challenge, User $user, array $context): void
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = now()->addMinutes(self::CODE_TTL_MINUTES);

        Cache::put($this->key($challenge), [
            'user_id'    => $user->id,
            'code_hash'  => hash('sha256', $challenge.'|'.$code),
            'attempts'   => 0,
            'sent_at'    => now()->timestamp,
            'expires_at' => $expiresAt->timestamp,
            'context'    => $context,
        ], $expiresAt);

        try {
            Mail::to($user->email)->send(new AdminLoginCodeMail($user, $code, self::CODE_TTL_MINUTES));
        } catch (\Throwable $e) {
            Log::error('Gagal kirim kode login admin', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            throw new \RuntimeException('Kode verifikasi gagal dikirim. Periksa pengaturan email server.');
        }
    }

    protected function key(string $challenge): string
    {
        return 'admin-2fa:'.hash('sha256', $challenge);
    }

    protected function mask(string $email): string
    {
        [$name, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $visible = mb_substr($name, 0, min(2, mb_strlen($name)));

        return $visible.str_repeat('•', max(1, mb_strlen($name) - mb_strlen($visible))).'@'.$domain;
    }
}
