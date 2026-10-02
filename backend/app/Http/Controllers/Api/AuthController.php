<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Google_Client;

class AuthController extends Controller
{
    /**
     * Real-time cek apakah email sudah terdaftar — dipakai di form Register.
     */
    public function checkEmail(Request $request)
    {
        $data = $request->validate(['email' => 'required|email']);
        $exists = \App\Models\User::where('email', $data['email'])->exists();
        return response()->json(['exists' => $exists]);
    }

        public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required',
            'email' => 'required|email|unique:users',
            'phone' => 'nullable|string|max:32',
            'password' => 'required|min:8',
            'terms_accepted'  => 'accepted',
            'terms_version'   => 'required|string|max:20',
            'privacy_version' => 'required|string|max:20',
        ]);

        $user = \App\Models\User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => $validated['password'], // auto-hash via $casts
            'role' => 'user',
            'terms_accepted_at' => now(),
            'terms_version'     => $validated['terms_version'],
            'privacy_version'   => $validated['privacy_version'],
        ]);

        UserActivity::log($user->id, 'register', $request);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Register berhasil',
            'token' => $token,
            'user' => $user
        ]);
    }

    /**
     * Kirim tautan reset password. Respons selalu sama (tidak membocorkan
     * apakah email terdaftar). Token disimpan ter-hash, berlaku 60 menit.
     */
    public function forgotPassword(Request $request)
    {
        $data = $request->validate(['email' => 'required|email|max:255']);
        $user = \App\Models\User::where('email', $data['email'])->first();

        if ($user) {
            $token = Str::random(64);
            \Illuminate\Support\Facades\DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                ['token' => Hash::make($token), 'created_at' => now()]
            );
            $link = rtrim(config('app.frontend_url'), '/').'/reset-password?token='.$token.'&email='.urlencode($user->email);
            try {
                \Illuminate\Support\Facades\Mail::raw(
                    "Halo {$user->name},\n\nKami menerima permintaan untuk mengatur ulang password akun Livora Anda.\n\nBuat password baru melalui tautan berikut (berlaku 60 menit):\n{$link}\n\nJika Anda tidak meminta ini, abaikan email ini — password Anda tetap aman.\n\nSalam,\nLIVORA",
                    fn ($m) => $m->to($user->email)->subject('Atur ulang password akun Livora')
                );
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Forgot password mail failed: '.$e->getMessage());
            }
        }

        return response()->json(['message' => 'Jika email terdaftar, tautan reset telah dikirim.']);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $row = \Illuminate\Support\Facades\DB::table('password_reset_tokens')->where('email', $data['email'])->first();
        $valid = $row && Hash::check($data['token'], $row->token)
            && now()->diffInMinutes(\Illuminate\Support\Carbon::parse($row->created_at)) <= 60;

        if (!$valid) {
            return response()->json(['message' => 'Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.'], 422);
        }

        $user = \App\Models\User::where('email', $data['email'])->firstOrFail();
        $user->password = Hash::make($data['password']);
        $user->save();
        $user->tokens()->delete(); // keluarkan semua sesi lama
        try { app(\App\Services\Auth\AdminTwoFactor::class)->revokeAll($user); } catch (\Throwable $e) {}
        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->where('email', $data['email'])->delete();
        UserActivity::log($user->id, 'password_reset', $request);

        return response()->json(['message' => 'Password berhasil diperbarui. Silakan masuk.']);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        if (!Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Email atau password salah'
            ], 401);
        }

        $user = Auth::user();

        $twoFactor = app(\App\Services\Auth\AdminTwoFactor::class);
        if ($twoFactor->required($user, $request->input('device_token'))) {
            try {
                return response()->json($twoFactor->start($user, ['provider' => null]));
            } catch (\RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 503);
            }
        }

        $user->login_count = (int) ($user->login_count ?? 0) + 1;
        $user->last_login_at = now();
        $user->last_ip = $request->ip();
        $user->save();

        UserActivity::log($user->id, 'login', $request);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil',
            'token' => $token,
            'user' => $user
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        UserActivity::log($request->user()->id, 'logout', $request);
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil'
        ]);
    }
/**
 * User update profil sendiri (nama, phone, address). Email sengaja
 * tidak diizinkan diganti sendiri di endpoint ini untuk menghindari
 * konflik dengan akun Google yang sudah terhubung — bisa dibuka lagi
 * nanti kalau dibutuhkan.
 */
public function updateProfile(Request $request)
{
    $user = $request->user();

    $data = $request->validate([
        'name'    => 'required|string|max:150',
        'phone'   => 'nullable|string|max:32',
        'address' => 'nullable|string|max:500',
    ]);

    $user->fill($data);
    $user->save();

    return response()->json([
        'message' => 'Profil berhasil diperbarui',
        'user'    => $user,
    ]);
}

/**
 * User ganti password sendiri. Wajib masukkan password lama untuk verifikasi.
 * Kalau user login via Google dan belum pernah set password manual,
 * current_password akan gagal cocok — itu expected (arahkan mereka pakai
 * "Forgot Password" kalau kasus ini terjadi).
 */
public function changePassword(Request $request)
{
    $user = $request->user();

    $data = $request->validate([
        'current_password' => 'required|string',
        'new_password'      => 'required|string|min:8|confirmed',
    ]);

    if (!\Illuminate\Support\Facades\Hash::check($data['current_password'], $user->password)) {
        return response()->json(['message' => 'Password lama tidak sesuai'], 422);
    }

    $user->password = $data['new_password']; // auto-hash via $casts
    $user->save();

    return response()->json(['message' => 'Password berhasil diperbarui']);
}
    /**
     * Track a generic activity (page view, item view, etc.) from the frontend.
     */
    public function trackActivity(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|string|max:40',
            'path' => 'nullable|string|max:255',
            'meta' => 'nullable|array',
        ]);

        UserActivity::log($request->user()->id, $data['type'], $request, $data['meta'] ?? null, $data['path'] ?? null);

        return response()->json(['ok' => true]);
    }

    // -----------------------------------------------------------------
    // OAuth (Google / Apple) — placeholder scaffolding.
    // Wire real credentials via Laravel Socialite (config/services.php)
    // and set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / APPLE_* in .env.
    // For now: accept a provider id_token from the frontend, verify or
    // stub, then upsert the user and issue a Sanctum token.
    // -----------------------------------------------------------------
    public function oauthCallback(Request $request, string $provider)
    {
        if (!in_array($provider, ['google', 'apple'])) {
            return response()->json(['message' => 'Unsupported provider'], 400);
        }

        $data = $request->validate([
            'id_token'    => 'nullable|string',
            'email'       => 'nullable|email',
            'name'        => 'nullable|string',
            'provider_id' => 'nullable|string',
            'avatar_url'  => 'nullable|string',
            'terms_accepted'  => 'nullable|boolean',
            'terms_version'   => 'nullable|string|max:20',
            'privacy_version' => 'nullable|string|max:20',
        ]);

        // TODO: verify $data['id_token']

        // TODO: verify $data['id_token'] with the provider's public keys.
        // Until credentials are configured, accept the trusted-payload shape
        // above only in local/dev.
        if ($provider === 'google') {
    if (empty($data['id_token'])) {
        return response()->json(['message' => 'id_token wajib diisi'], 422);
    }

    \Log::info('Google OAuth attempt', [
        'id_token_length' => strlen($data['id_token']),
        'client_id' => config('services.google.client_id'),
    ]);

    $client = app()->makeWith(Google_Client::class, ['config' => ['client_id' => config('services.google.client_id')]]);

    try {
        $payload = $client->verifyIdToken($data['id_token']);
    } catch (\Throwable $e) {
        \Log::error('Google verifyIdToken threw exception', ['message' => $e->getMessage()]);
        return response()->json(['message' => 'Google verify error: ' . $e->getMessage()], 401);
    }

    \Log::info('Google verify result', ['payload_null' => is_null($payload)]);

    if (!$payload) {
        return response()->json(['message' => 'Token Google tidak valid'], 401);
    }

    $data['email']       = $payload['email'] ?? null;
    $data['name']        = $payload['name'] ?? ($data['name'] ?? null);
    $data['provider_id'] = $payload['sub'] ?? null;
    $data['avatar_url']  = $payload['picture'] ?? null;
} elseif (app()->environment('production')) {
    // Apple masih placeholder
    return response()->json([
        'message' => "$provider OAuth belum dikonfigurasi. Set kredensial provider terlebih dahulu."
    ], 501);
}

        $email = $data['email'] ?? null;
        if (!$email) {
            return response()->json(['message' => 'Email tidak tersedia dari provider'], 422);
        }

        $user = \App\Models\User::where('email', $email)->first();
        if (!$user) {
            // Akun baru lewat OAuth wajib menyetujui Terms & Privacy.
            // Frontend akan menampilkan konfirmasi lalu mengirim ulang dengan terms_accepted=true.
            if (empty($data['terms_accepted']) || empty($data['terms_version']) || empty($data['privacy_version'])) {
                return response()->json([
                    'code'    => 'terms_required',
                    'message' => 'Untuk membuat akun baru, setujui Terms of Service dan Privacy Policy terlebih dahulu.',
                    'email'   => $email,
                ], 422);
            }

            $user = \App\Models\User::create([
                'name'        => $data['name'] ?? Str::before($email, '@'),
                'email'       => $email,
                'password'    => Hash::make(Str::random(32)),
                'role'        => 'user',
                'provider'    => $provider,
                'provider_id' => $data['provider_id'] ?? null,
                'avatar_url'  => $data['avatar_url'] ?? null,
                'terms_accepted_at' => now(),
                'terms_version'     => $data['terms_version'],
                'privacy_version'   => $data['privacy_version'],
            ]);
        } else {
            $user->provider    = $user->provider ?? $provider;
            $user->provider_id = $user->provider_id ?? ($data['provider_id'] ?? null);
            if (!empty($data['avatar_url'])) $user->avatar_url = $data['avatar_url'];
        }

        $twoFactor = app(\App\Services\Auth\AdminTwoFactor::class);
        if ($twoFactor->required($user, $request->input('device_token'))) {
            $user->save();
            try {
                return response()->json($twoFactor->start($user, ['provider' => $provider]));
            } catch (\RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 503);
            }
        }

        $user->login_count   = (int) ($user->login_count ?? 0) + 1;
        $user->last_login_at = now();
        $user->last_ip       = $request->ip();
        $user->save();

        UserActivity::log($user->id, 'login', $request, ['provider' => $provider]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => "Login via $provider berhasil",
            'token'   => $token,
            'user'    => $user,
        ]);
    }

    /** POST /login/2fa — verifikasi kode admin lalu terbitkan token. */
    public function verifyTwoFactor(Request $request, \App\Services\Auth\AdminTwoFactor $twoFactor)
    {
        $data = $request->validate([
            'challenge' => 'required|string|max:100',
            'code'      => 'required|string|size:6',
            'remember'  => 'nullable|boolean',
        ]);

        $result = $twoFactor->verify($data['challenge'], $data['code']);
        if (!$result['ok']) {
            $messages = [
                'expired' => 'Kode sudah kedaluwarsa. Silakan masuk ulang.',
                'locked'  => 'Terlalu banyak percobaan salah. Silakan masuk ulang.',
                'invalid' => 'Kode salah. Sisa percobaan: '.($result['remaining'] ?? 0).'.',
            ];
            return response()->json([
                'code'    => $result['error'],
                'message' => $messages[$result['error']] ?? 'Verifikasi gagal.',
            ], 422);
        }

        $user = $result['user'];
        $provider = $result['context']['provider'] ?? null;

        $user->login_count = (int) ($user->login_count ?? 0) + 1;
        $user->last_login_at = now();
        $user->last_ip = $request->ip();
        $user->save();

        UserActivity::log($user->id, 'login', $request, array_filter(['provider' => $provider, 'two_factor' => 'email']));

        $deviceToken = null;
        if (!empty($data['remember'])) {
            try {
                $deviceToken = $twoFactor->trustDevice($user, $request);
            } catch (\Throwable $e) {
                $deviceToken = null;
            }
        }

        return response()->json([
            'message'      => 'Login berhasil',
            'token'        => $user->createToken('auth_token')->plainTextToken,
            'user'         => $user,
            'device_token' => $deviceToken,
        ]);
    }

    /** POST /login/2fa/resend */
    public function resendTwoFactor(Request $request, \App\Services\Auth\AdminTwoFactor $twoFactor)
    {
        $data = $request->validate(['challenge' => 'required|string|max:100']);

        try {
            $result = $twoFactor->resend($data['challenge']);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 503);
        }

        if ($result === null) {
            return response()->json(['code' => 'expired', 'message' => 'Sesi verifikasi berakhir. Silakan masuk ulang.'], 422);
        }
        if (!empty($result['cooldown'])) {
            return response()->json(['message' => 'Tunggu sebentar sebelum meminta kode baru.'], 429);
        }

        return response()->json(['message' => 'Kode baru telah dikirim.', 'email_masked' => $result['email_masked']]);
    }
}
