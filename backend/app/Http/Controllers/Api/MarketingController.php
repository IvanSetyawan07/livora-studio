<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PromoBlast;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MarketingController extends Controller
{
    /**
     * List semua audience email yang bisa di-target (user terdaftar).
     */
    public function audience()
    {
        $users = User::query()
            ->select('id', 'name', 'email', 'role', 'created_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'total' => $users->count(),
            'users' => $users,
        ]);
    }

    /**
     * Kirim promo blast ke daftar user (by IDs) atau ke semua.
     */
    public function send(Request $request)
    {
        $data = $request->validate([
            'subject'    => 'required|string|max:200',
            'headline'   => 'required|string|max:200',
            'body'       => 'required|string',
            'cta_label'  => 'nullable|string|max:60',
            'cta_url'    => 'nullable|url|max:500',
            'hero_image' => 'nullable|url|max:500',
            'target'     => 'required|in:all,selected',
            'user_ids'   => 'array',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        $query = User::query()->whereNotNull('email');
        if ($data['target'] === 'selected') {
            $query->whereIn('id', $data['user_ids'] ?? []);
        }
        $users = $query->get();

        $sent = 0;
        $failed = [];
        foreach ($users as $user) {
            try {
                Mail::to($user->email)->send(new PromoBlast(
                    $user->name ?? 'there',
                    $data['subject'],
                    $data['headline'],
                    $data['body'],
                    $data['cta_label'] ?? null,
                    $data['cta_url'] ?? null,
                    $data['hero_image'] ?? null,
                ));
                $sent++;
            } catch (\Throwable $e) {
                Log::error('PromoBlast failed for ' . $user->email . ': ' . $e->getMessage());
                $failed[] = $user->email;
            }
        }

        return response()->json([
            'message' => "Terkirim ke {$sent} penerima.",
            'sent'    => $sent,
            'failed'  => $failed,
        ]);
    }
}
