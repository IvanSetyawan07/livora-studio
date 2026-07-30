<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportMessage;
use App\Models\SupportSession;
use App\Services\LivoraAssistant;
use Illuminate\Http\Request;

/**
 * Chat publik (widget di website).
 *
 * Flow:
 *  status = bot        -> setiap pesan user dijawab AI (Livora Concierge)
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

        $session = SupportSession::where('visitor_id', $data['visitor_id'])
            ->orderByDesc('id')
            ->first();

        if (!$session) {
            $session = SupportSession::create([
                'visitor_id'      => $data['visitor_id'],
                'user_id'         => optional($request->user())->id,
                'name'            => $data['name'] ?? optional($request->user())->name,
                'email'           => $data['email'] ?? optional($request->user())->email,
                'status'          => SupportSession::STATUS_BOT,
                'last_message_at' => now(),
            ]);

            $session->messages()->create([
                'sender' => 'bot',
                'text'   => 'Hi, saya Livora Concierge — asisten AI Livora Studio. Tanyakan apa saja soal profil kami, layanan, atau detail produk furniture. Kalau butuh bantuan langsung, bilang saja untuk terhubung ke customer service.',
            ]);
        }

        if ($request->user() && !$session->user_id) {
            $session->update([
                'user_id' => $request->user()->id,
                'name'    => $session->name ?: $request->user()->name,
                'email'   => $session->email ?: $request->user()->email,
            ]);
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
            'visitor_id' => 'required|string|max:80',
            'text'       => 'required|string|max:2000',
            'item_slug'  => 'nullable|string|max:200',
            'item_name'  => 'nullable|string|max:200',
        ]);

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
                'item_slug' => $data['item_slug'] ?? null,
                'item_name' => $data['item_name'] ?? null,
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
                ->latest('id')->take(10)->get()->reverse()
                ->map(fn ($m) => ['role' => $m->sender === 'user' ? 'user' : 'bot', 'text' => $m->text])
                ->values()->all();

            $result = $assistant->reply($data['text'], $history, [
                'item_slug' => $data['item_slug'] ?? null,
            ]);

            $botMsg = $session->messages()->create([
                'sender' => 'bot',
                'text'   => $result['reply'],
                'meta'   => ['needs_escalation' => (bool) $result['needs_escalation']],
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

        $session->update([
            'status'         => SupportSession::STATUS_PENDING_CS,
            'name'           => $data['name'] ?? $session->name,
            'email'          => $data['email'] ?? $session->email,
            'request_reason' => $data['reason'] ?? null,
            'requested_at'   => now(),
            'unread_admin'   => $session->unread_admin + 1,
        ]);

        $session->messages()->create([
            'sender' => 'system',
            'text'   => 'Permintaan untuk berbicara dengan customer service sudah dikirim. Mohon tunggu sebentar, tim kami akan segera bergabung ke percakapan ini.',
        ]);

        return response()->json($this->payload($session->fresh('messages')));
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
            'id'            => $session->id,
            'status'        => $session->status,
            'admin_name'    => optional($session->admin)->name,
            'requested_at'  => optional($session->requested_at)->toIso8601String(),
            'accepted_at'   => optional($session->accepted_at)->toIso8601String(),
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
