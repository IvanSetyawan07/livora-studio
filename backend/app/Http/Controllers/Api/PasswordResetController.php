<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    public function forgot(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        // Link di email mengarah ke halaman reset di frontend
        $frontend = rtrim(config('app.frontend_url', 'https://www.livoralcr.com'), '/');
        ResetPassword::createUrlUsing(function ($user, string $token) use ($frontend) {
            return $frontend . '/reset-password?token=' . $token
                . '&email=' . urlencode($user->getEmailForPasswordReset());
        });

        try {
            $status = Password::sendResetLink($data);
        } catch (\Throwable $e) {
            Log::error('forgot-password failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Gagal mengirim tautan. Coba lagi.'], 500);
        }

        if ($status === Password::RESET_THROTTLED) {
            return response()->json(['message' => 'Terlalu sering mencoba. Tunggu sebentar.'], 429);
        }

        // Respons sama untuk email terdaftar/tidak (mencegah user enumeration)
        return response()->json([
            'message' => 'Jika email terdaftar, tautan reset password telah dikirim.',
        ]);
    }

    public function reset(Request $request)
    {
        $data = $request->validate([
            'token'    => ['required', 'string'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $status = Password::reset(
            $data + ['password_confirmation' => $data['password']],
            function ($user, string $password) {
                $user->forceFill([
                    'password'       => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                $user->tokens()->delete();
                $user->tokens()->delete();
                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password berhasil diubah.']);
        }

        return response()->json(['message' => 'Tautan tidak valid atau sudah kedaluwarsa.'], 422);
    }
}
