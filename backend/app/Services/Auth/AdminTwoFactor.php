<?php

namespace App\Services\Auth;

use App\Mail\AdminLoginCodeMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
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
    public const RESEND_COOLDOWN_SECONDS = 40;

    protected static ?bool $challengeTableExists = null;

    public function required(User $user, ?string $deviceToken): bool
    {
        if ($user->role !== 'admin') {
            return false;
        }

        // Tombol darurat: set ADMIN_2FA_ENABLED=false di .env server (lalu php artisan config:clear)
        // untuk mematikan sementara (misalnya email server belum dikonfigurasi).
        if (!config('auth.admin_2fa_enabled', true)) {
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
        $state = $this->loadState($challenge);
        if (!$state) {
            return null;
        }
        $elapsed = now()->timestamp - (int) ($state['sent_at'] ?? 0);
        if ($elapsed < self::RESEND_COOLDOWN_SECONDS) {
            return [
                'cooldown'    => true,
                'retry_after' => max(1, self::RESEND_COOLDOWN_SECONDS - $elapsed),
            ];
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
        $state = $this->loadState($challenge);
        if (!$state) {
            return ['ok' => false, 'error' => 'expired'];
        }

        if (($state['attempts'] ?? 0) >= self::MAX_ATTEMPTS) {
            $this->deleteState($challenge);
            return ['ok' => false, 'error' => 'locked'];
        }

        if (!hash_equals($state['code_hash'], hash('sha256', $challenge.'|'.trim($code)))) {
            $state['attempts'] = ($state['attempts'] ?? 0) + 1;
            $expiresAt = Carbon::createFromTimestamp((int) $state['expires_at']);
            $this->saveState($challenge, $state, $expiresAt->isFuture() ? $expiresAt : now()->addSecond());
            return ['ok' => false, 'error' => 'invalid', 'remaining' => self::MAX_ATTEMPTS - $state['attempts']];
        }

        $this->deleteState($challenge);
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
        $mailer = (string) config('mail.default', 'smtp');
        if (app()->environment('production') && in_array($mailer, ['log', 'array'], true)) {
            Log::error('Pengaturan MAIL_MAILER masih non-pengirim pada environment production', [
                'user_id' => $user->id,
                'mailer'  => $mailer,
            ]);
            throw new \RuntimeException(
                "Pengaturan email server belum aktif (MAIL_MAILER={$mailer}). Atur SMTP di .env server atau nonaktifkan ADMIN_2FA_ENABLED sementara."
            );
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = now()->addMinutes(self::CODE_TTL_MINUTES);

        try {
            Mail::to($user->email)->send(new AdminLoginCodeMail($user, $code, self::CODE_TTL_MINUTES));
        } catch (\Throwable $e) {
            Log::error('Gagal kirim kode login admin', [
                'user_id' => $user->id,
                'email'   => $user->email,
                'mailer'  => $mailer,
                'host'    => config('mail.mailers.smtp.host'),
                'port'    => config('mail.mailers.smtp.port'),
                'from'    => config('mail.from.address'),
                'error'   => $e->getMessage(),
            ]);
            throw new \RuntimeException('Kode verifikasi gagal dikirim. Periksa pengaturan email server.');
        }

        $this->saveState($challenge, [
            'user_id'    => $user->id,
            'code_hash'  => hash('sha256', $challenge.'|'.$code),
            'attempts'   => 0,
            'sent_at'    => now()->timestamp,
            'expires_at' => $expiresAt->timestamp,
            'context'    => $context,
        ], $expiresAt);
    }

    protected function hasChallengeTable(): bool
    {
        if (self::$challengeTableExists === null) {
            try {
                self::$challengeTableExists = Schema::hasTable('admin_two_factor_challenges');
            } catch (\Throwable $e) {
                self::$challengeTableExists = false;
            }
        }

        return self::$challengeTableExists;
    }

    protected function loadState(string $challenge): ?array
    {
        if ($this->hasChallengeTable()) {
            $hash = hash('sha256', $challenge);
            $row = DB::table('admin_two_factor_challenges')
                ->where('challenge_hash', $hash)
                ->first();

            if (!$row) {
                return null;
            }

            $expiresTs = Carbon::parse($row->expires_at)->timestamp;
            if ($expiresTs <= now()->timestamp) {
                $this->deleteState($challenge);
                return null;
            }

            $context = json_decode((string) $row->context, true);

            return [
                'user_id'    => (int) $row->user_id,
                'code_hash'  => (string) $row->code_hash,
                'attempts'   => (int) $row->attempts,
                'sent_at'    => (int) $row->sent_at,
                'expires_at' => $expiresTs,
                'context'    => is_array($context) ? $context : [],
            ];
        }

        $state = Cache::get($this->key($challenge));
        if (!is_array($state) || (int) ($state['expires_at'] ?? 0) <= now()->timestamp) {
            return null;
        }

        return $state;
    }

    protected function saveState(string $challenge, array $state, Carbon $expiresAt): void
    {
        if ($this->hasChallengeTable()) {
            $nowStr = now()->toDateTimeString();
            try {
                DB::table('admin_two_factor_challenges')->where('expires_at', '<', $nowStr)->delete();
            } catch (\Throwable $e) {
                // abaikan kegagalan pembersihan baris kedaluwarsa
            }

            DB::table('admin_two_factor_challenges')->upsert(
                [[
                    'challenge_hash' => hash('sha256', $challenge),
                    'user_id'        => (int) $state['user_id'],
                    'code_hash'      => (string) $state['code_hash'],
                    'attempts'       => (int) ($state['attempts'] ?? 0),
                    'sent_at'        => (int) $state['sent_at'],
                    'expires_at'     => $expiresAt->toDateTimeString(),
                    'context'        => json_encode($state['context'] ?? []),
                    'created_at'     => $nowStr,
                    'updated_at'     => $nowStr,
                ]],
                ['challenge_hash'],
                ['user_id', 'code_hash', 'attempts', 'sent_at', 'expires_at', 'context', 'updated_at']
            );
            return;
        }

        Cache::put($this->key($challenge), $state, $expiresAt);
    }

    protected function deleteState(string $challenge): void
    {
        if ($this->hasChallengeTable()) {
            DB::table('admin_two_factor_challenges')
                ->where('challenge_hash', hash('sha256', $challenge))
                ->delete();
        }
        Cache::forget($this->key($challenge));
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
