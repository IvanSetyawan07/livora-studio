<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\SupportMessage;
use App\Models\SupportSession;
use App\Models\Wishlist;
use App\Services\CustomerNeedProfile;
use App\Services\LivoraAssistant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * Chat publik (widget di website — Livi Design & Furniture Concierge).
 *
 * Flow:
 *  status = bot        -> setiap pesan user dijawab Livi (AI Concierge + pembelajaran kebutuhan user)
 *  status = pending_cs -> user sudah minta CS, menunggu admin accept
 *  status = active     -> live chat user <-> admin (bot berhenti menjawab)
 *  status = closed     -> percakapan ditutup admin, kembali ke bot saat user menulis lagi
 */
class SupportChatController extends Controller
{
    /** POST /api/support/session — ambil / buat sesi untuk visitor. */
    public function session(Request $request, LivoraAssistant $assistant)
    {
        $data = $request->validate([
            'visitor_id' => 'required|string|max:80',
            'name'       => 'nullable|string|max:120',
            'email'      => 'nullable|email|max:180',
        ]);

        $loginUser = auth('sanctum')->user();
        $ip = $request->ip();

        $session = SupportSession::where('visitor_id', $data['visitor_id'])
            ->orderByDesc('id')
            ->first();

        if (!$session) {
            $visitorNumber = optional(
                SupportSession::where('ip_address', $ip)->whereNotNull('visitor_number')->first()
            )->visitor_number;

            if (!$visitorNumber) {
                $visitorNumber = (SupportSession::max('visitor_number') ?? 0) + 1;
            }

            $priorProfile = $loginUser ? $this->loadUserPriorProfile($loginUser->id) : [];

            $createData = [
                'visitor_id'      => $data['visitor_id'],
                'user_id'         => optional($loginUser)->id,
                'name'            => $data['name'] ?? optional($loginUser)->name,
                'email'           => $data['email'] ?? optional($loginUser)->email,
                'ip_address'      => $ip,
                'visitor_number'  => $visitorNumber,
                'status'          => SupportSession::STATUS_BOT,
                'last_message_at' => now(),
            ];
            if (!empty($priorProfile) && $this->hasProfileColumn()) {
                $createData['customer_profile'] = $priorProfile;
            }

            $session = SupportSession::create($createData);
            if (!empty($priorProfile) && !$this->hasProfileColumn()) {
                Cache::put("support-profile:{$session->id}", $priorProfile, now()->addDays(7));
            }

            $firstName = $loginUser && $loginUser->name
                ? trim(explode(' ', trim((string) $loginUser->name))[0])
                : null;
            $greeting = $firstName
                ? "Halo {$firstName}! Saya Livi, asisten desain & furnitur showroom Livora ✨ Ceritakan ruangan yang ingin ditata, gaya yang disukai, atau furnitur yang sedang dicari — saya bantu pilihkan opsi paling pas."
                : "Halo! Saya Livi, asisten desain & furnitur showroom Livora ✨ Ceritakan ruangan yang ingin ditata, gaya yang disukai, atau furnitur yang sedang dicari — saya bantu pilihkan opsi paling pas.";

            $session->messages()->create([
                'sender' => 'bot',
                'text'   => $greeting,
                'meta'   => [
                    'quick_replies' => [
                        'Rekomendasi sofa ruang tamu',
                        'Inspirasi gaya Modern & Japandi',
                        'Info layanan interior Livora',
                    ],
                ],
            ]);
        }

        if ($loginUser && !$session->user_id) {
            $updates = [
                'user_id' => $loginUser->id,
                'name'    => $session->name ?: $loginUser->name,
                'email'   => $session->email ?: $loginUser->email,
            ];
            $existingProfile = $this->readProfile($session);
            if (empty($existingProfile)) {
                $priorProfile = $this->loadUserPriorProfile($loginUser->id);
                if (!empty($priorProfile)) {
                    if ($this->hasProfileColumn()) {
                        $updates['customer_profile'] = $priorProfile;
                    } else {
                        Cache::put("support-profile:{$session->id}", $priorProfile, now()->addDays(7));
                    }
                }
            }
            $session->update($updates);
        }

        if (!$session->ip_address) {
            $session->update(['ip_address' => $ip]);
        }

        return response()->json($this->payload($session->fresh('messages')));
    }

    /** GET /api/support/session/{session}/messages?since=ID */
    public function messages(Request $request, SupportSession $session)
    {
        $this->authorizeVisitor($request, $session);

        $since = (int) $request->query('since', 0);
        $messages = $session->messages()->when($since, fn ($q) => $q->where('id', '>', $since))->get();

        if ($messages->isNotEmpty()) {
            $session->update(['unread_user' => 0]);
        }

        return response()->json([
            'session'  => $this->sessionData($session),
            'messages' => $messages->map(fn ($m) => $this->messageData($m))->values(),
        ]);
    }

    /** POST /api/support/session/{session}/messages */
    public function store(Request $request, SupportSession $session, LivoraAssistant $assistant)
    {
        $this->authorizeVisitor($request, $session);

        $data = $request->validate([
            'visitor_id'    => 'required|string|max:80',
            'text'          => 'required|string|max:2000',
            'item_slug'     => 'nullable|string|max:200',
            'item_name'     => 'nullable|string|max:200',
            'page_path'     => 'nullable|string|max:240',
            'category_slug' => 'nullable|string|max:120',
        ]);

        // Chat wajib login (menekan biaya AI & spam). Batas pesan ke AI per hari per akun.
        $loginUser = auth('sanctum')->user();
        if (!$loginUser) {
            return response()->json([
                'code'    => 'login_required',
                'message' => 'Silakan masuk untuk melanjutkan chat dengan Livi.',
            ], 401);
        }

        $quotaKey = null;
        if (in_array($session->status, [SupportSession::STATUS_BOT, SupportSession::STATUS_CLOSED], true)) {
            $limit = (int) config('services.support_chat.daily_ai_limit', 50);
            $quotaKey = 'support-ai-quota:'.$loginUser->id.':'.now()->toDateString();
            if ($limit > 0 && (int) Cache::get($quotaKey, 0) >= $limit) {
                return response()->json([
                    'code'    => 'daily_limit',
                    'message' => "Batas {$limit} pesan AI hari ini sudah tercapai. Anda tetap bisa minta bicara dengan tim Livora, atau lanjut besok.",
                ], 429);
            }
        }

        if ($session->status === SupportSession::STATUS_CLOSED) {
            $session->update([
                'status'    => SupportSession::STATUS_BOT,
                'admin_id'  => null,
                'closed_at' => null,
            ]);
        }

        $userMsg = $session->messages()->create([
            'sender' => 'user',
            'text'   => $data['text'],
            'meta'   => array_filter([
                'item_slug'     => $data['item_slug'] ?? null,
                'item_name'     => $data['item_name'] ?? null,
                'page_path'     => $data['page_path'] ?? null,
                'category_slug' => $data['category_slug'] ?? null,
            ]),
        ]);

        $session->update([
            'last_message_at' => now(),
            'unread_admin'    => $session->status === SupportSession::STATUS_BOT ? 0 : $session->unread_admin + 1,
        ]);

        $new = [$this->messageData($userMsg)];

        // Hanya bot yang menjawab saat sesi belum di-handle CS.
        if ($session->status === SupportSession::STATUS_BOT) {
            $history = $session->messages()
                ->where('id', '<', $userMsg->id)
                ->whereIn('sender', ['user', 'bot'])
                ->latest('id')->take(12)->get()->reverse()
                ->map(fn ($m) => ['role' => $m->sender === 'user' ? 'user' : 'bot', 'text' => $m->text])
                ->values()->all();

            if ($quotaKey) {
                Cache::add($quotaKey, 0, now()->endOfDay());
                Cache::increment($quotaKey);
            }

            $existingProfile = $this->readProfile($session);
            $wishlistTitles = $this->loadWishlistTitles($loginUser->id);

            $result = $assistant->reply($data['text'], $history, [
                'session_id'       => $session->id,
                'user_id'          => $loginUser->id,
                'item_slug'        => $data['item_slug'] ?? null,
                'page_path'        => $data['page_path'] ?? null,
                'category_slug'    => $data['category_slug'] ?? null,
                'customer_profile' => $existingProfile,
                'wishlist_titles'  => $wishlistTitles,
            ]);

            $learnedProfile = is_array($result['learned_profile'] ?? null)
                ? $result['learned_profile']
                : $existingProfile;

            $this->persistProfile($session, $learnedProfile, $loginUser->id);

            $botMsg = $session->messages()->create([
                'sender' => 'bot',
                'text'   => $result['reply'],
                'meta'   => [
                    'needs_escalation'  => (bool) ($result['needs_escalation'] ?? false),
                    'recommendations'   => $result['recommendations'] ?? [],
                    'quick_replies'     => $result['quick_replies'] ?? [],
                    'learned_profile'   => $learnedProfile,
                    'show_consultation' => (bool) ($result['show_consultation'] ?? false),
                    'consultation_url'  => $assistant->consultationUrl(),
                ],
            ]);
            $session->update(['last_message_at' => now()]);

            $new[] = $this->messageData($botMsg);
        }

        return response()->json([
            'session'  => $this->sessionData($session->fresh()),
            'messages' => $new,
        ]);
    }

    /** POST /api/support/session/{session}/request-cs */
    public function requestCs(Request $request, SupportSession $session)
    {
        $this->authorizeVisitor($request, $session);

        $data = $request->validate([
            'visitor_id' => 'required|string|max:80',
            'name'       => 'nullable|string|max:120',
            'email'      => 'nullable|email|max:180',
            'reason'     => 'nullable|string|max:500',
        ]);

        if (in_array($session->status, [SupportSession::STATUS_PENDING_CS, SupportSession::STATUS_ACTIVE], true)) {
            return response()->json($this->payload($session->load('messages')));
        }

        $learnedNote = CustomerNeedProfile::toHandoffNote($this->readProfile($session));
        $reasonInput = trim((string) ($data['reason'] ?? ''));
        $combinedReason = trim(implode(' — ', array_filter([$reasonInput, $learnedNote])));

        $session->update([
            'status'         => SupportSession::STATUS_PENDING_CS,
            'name'           => $data['name'] ?? $session->name,
            'email'          => $data['email'] ?? $session->email,
            'request_reason' => $combinedReason !== '' ? mb_substr($combinedReason, 0, 500) : null,
            'requested_at'   => now(),
            'unread_admin'   => $session->unread_admin + 1,
        ]);

        $session->messages()->create([
            'sender' => 'system',
            'text'   => 'Permintaan untuk berbicara dengan tim Livora sudah dikirim beserta ringkasan kebutuhanmu. Mohon tunggu sebentar, tim kami akan segera bergabung ke percakapan ini.',
        ]);

        $who = $session->name ?: optional($session->user)->name ?: 'Visitor #'.($session->visitor_number ?? $session->id);
        \App\Services\Shop\NotifyService::notify('N18', null, [
            'sender_name'  => $who,
            'source_label' => 'Live Chat Website',
            'reason'       => $combinedReason !== '' ? $combinedReason : 'Meminta berbicara dengan CS',
            'body'         => "Live chat website dari {$who}".($combinedReason !== '' ? " ({$combinedReason})" : '').' menunggu balasan admin.',
            'link'         => '/admin/support?session='.$session->id,
        ], 'support-'.$session->id);

        return response()->json($this->payload($session->fresh('messages')));
    }

    /**
     * POST /api/support/session/{session}/resume-bot
     * Dipanggil saat live chat dengan CS idle terlalu lama — sesi dikembalikan ke AI.
     */
    public function resumeBot(Request $request, SupportSession $session)
    {
        $this->authorizeVisitor($request, $session);

        if (!in_array($session->status, [SupportSession::STATUS_PENDING_CS, SupportSession::STATUS_ACTIVE], true)) {
            return response()->json($this->payload($session->load('messages')));
        }

        $session->update([
            'status'    => SupportSession::STATUS_BOT,
            'admin_id'  => null,
            'closed_at' => null,
        ]);

        $session->messages()->create([
            'sender' => 'system',
            'text'   => 'Sesi live chat berakhir karena tidak ada aktivitas. Kamu kembali terhubung dengan Livi (AI Concierge). Ketik "customer service" kapan saja untuk terhubung lagi dengan tim kami.',
        ]);

        \App\Services\Shop\NotifyService::closeByEventKey('N18:0:support-'.$session->id);

        return response()->json($this->payload($session->fresh('messages')));
    }

    private function hasProfileColumn(): bool
    {
        static $has = null;
        if ($has === null) {
            $has = Schema::hasColumn('support_sessions', 'customer_profile');
        }
        return $has;
    }

    private function readProfile(SupportSession $session): array
    {
        if ($this->hasProfileColumn() && is_array($session->customer_profile)) {
            return $session->customer_profile;
        }
        $cached = Cache::get("support-profile:{$session->id}");
        if (is_array($cached)) {
            return $cached;
        }
        $lastMeta = $session->messages()
            ->where('sender', 'bot')
            ->latest('id')
            ->value('meta');
        if (is_array($lastMeta) && is_array($lastMeta['learned_profile'] ?? null)) {
            return $lastMeta['learned_profile'];
        }
        return [];
    }

    private function persistProfile(SupportSession $session, array $profile, ?int $userId): void
    {
        if (empty($profile)) {
            return;
        }
        if ($this->hasProfileColumn()) {
            $session->update(['customer_profile' => $profile]);
        }
        Cache::put("support-profile:{$session->id}", $profile, now()->addDays(7));
        if ($userId) {
            Cache::put("support-user-profile:{$userId}", $profile, now()->addDays(30));
        }
    }

    private function loadUserPriorProfile(int $userId): array
    {
        if ($this->hasProfileColumn()) {
            $prev = SupportSession::where('user_id', $userId)
                ->whereNotNull('customer_profile')
                ->latest('id')
                ->value('customer_profile');
            if (is_array($prev) && !empty($prev)) {
                return $prev;
            }
        }
        $cached = Cache::get("support-user-profile:{$userId}");
        return is_array($cached) ? $cached : [];
    }

    private function loadWishlistTitles(int $userId): array
    {
        try {
            $itemIds = Wishlist::where('user_id', $userId)
                ->where('wishlistable_type', 'item')
                ->latest('created_at')
                ->limit(6)
                ->pluck('wishlistable_id');
            if ($itemIds->isEmpty()) {
                return [];
            }
            return Item::whereIn('id', $itemIds)->pluck('title')->filter()->values()->all();
        } catch (\Throwable) {
            return [];
        }
    }

    private function authorizeVisitor(Request $request, SupportSession $session): void
    {
        $visitorId = $request->input('visitor_id', $request->query('visitor_id'));
        abort_unless($visitorId && $visitorId === $session->visitor_id, 403, 'Forbidden');
    }

    private function payload(SupportSession $session): array
    {
        return [
            'session'  => $this->sessionData($session),
            'messages' => $session->messages->map(fn ($m) => $this->messageData($m))->values(),
        ];
    }

    private function sessionData(SupportSession $session): array
    {
        return [
            'id'               => $session->id,
            'status'           => $session->status,
            'admin_name'       => optional($session->admin)->name,
            'customer_profile' => $this->readProfile($session),
            'requested_at'     => optional($session->requested_at)->toIso8601String(),
            'accepted_at'      => optional($session->accepted_at)->toIso8601String(),
        ];
    }

    private function messageData(SupportMessage $m): array
    {
        return [
            'id'         => $m->id,
            'sender'     => $m->sender,
            'text'       => $m->text,
            'meta'       => $m->meta,
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }
}