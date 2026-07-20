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
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required',
            'email' => 'required|email|unique:users',
            'phone' => 'nullable|string|max:32',
            'password' => 'required|min:6'
        ]);

        $user = \App\Models\User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => $validated['password'], // auto-hash via $casts
            'role' => 'user',
        ]);

        UserActivity::log($user->id, 'register', $request);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Register berhasil',
            'token' => $token,
            'user' => $user
        ]);
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
        'new_password'      => 'required|string|min:6|confirmed',
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
        ]);

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

    $client = new Google_Client(['client_id' => config('services.google.client_id')]);

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
            $user = \App\Models\User::create([
                'name'        => $data['name'] ?? Str::before($email, '@'),
                'email'       => $email,
                'password'    => Hash::make(Str::random(32)),
                'role'        => 'user',
                'provider'    => $provider,
                'provider_id' => $data['provider_id'] ?? null,
                'avatar_url'  => $data['avatar_url'] ?? null,
            ]);
        } else {
            $user->provider    = $user->provider ?? $provider;
            $user->provider_id = $user->provider_id ?? ($data['provider_id'] ?? null);
            if (!empty($data['avatar_url'])) $user->avatar_url = $data['avatar_url'];
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
}
