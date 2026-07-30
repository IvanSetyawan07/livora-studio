<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportMessage;
use App\Models\SupportSession;
use Illuminate\Http\Request;

class SupportChatController extends Controller
{
    /** GET /api/admin/support/sessions */
    public function index(Request $request)
    {
        $status = $request->query('status');

        $sessions = SupportSession::query()
            ->with('admin:id,name')
            ->when($status && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderByRaw("CASE status WHEN 'pending_cs' THEN 0 WHEN 'active' THEN 1 WHEN 'bot' THEN 2 ELSE 3 END")
            ->orderByDesc('last_message_at')
            ->limit(120)
            ->get()
            ->map(function (SupportSession $s) {
                $last = $s->messages()->latest('id')->first();
                return [
                    'id'              => $s->id,
                    'status'          => $s->status,
                    'name'            => $s->name,
                    'email'           => $s->email,
                    'user_id'         => $s->user_id,
                    'admin_name'      => optional($s->admin)->name,
                    'request_reason'  => $s->request_reason,
                    'requested_at'    => optional($s->requested_at)->toIso8601String(),
                    'last_message'    => $last?->text,
                    'last_message_at' => optional($s->last_message_at)->toIso8601String(),
                    'unread_admin'    => $s->unread_admin,
                ];
            });

        return response()->json([
            'sessions' => $sessions,
            'pending'  => SupportSession::where('status', SupportSession::STATUS_PENDING_CS)->count(),
        ]);
    }

    /** GET /api/admin/support/sessions/{session}/messages?since=ID */
    public function messages(Request $request, SupportSession $session)
    {
        $since = (int) $request->query('since', 0);
        $messages = $session->messages()->when($since, fn ($q) => $q->where('id', '>', $since))->get();

        if (!$since) {
            $session->update(['unread_admin' => 0]);
        }

        return response()->json([
            'session'  => $this->sessionData($session),
            'messages' => $messages->map(fn ($m) => $this->messageData($m))->values(),
        ]);
    }

    /** POST /api/admin/support/sessions/{session}/accept */
    public function accept(Request $request, SupportSession $session)
    {
        $session->update([
            'status'       => SupportSession::STATUS_ACTIVE,
            'admin_id'     => $request->user()->id,
            'accepted_at'  => now(),
            'unread_admin' => 0,
            'unread_user'  => $session->unread_user + 1,
        ]);

        $session->messages()->create([
            'sender' => 'system',
            'text'   => 'Customer service Livora (' . $request->user()->name . ') telah bergabung. Silakan lanjutkan percakapan.',
        ]);
        $session->update(['last_message_at' => now()]);

        return response()->json($this->sessionData($session->fresh('admin')));
    }

    /** POST /api/admin/support/sessions/{session}/messages */
    public function store(Request $request, SupportSession $session)
    {
        $data = $request->validate(['text' => 'required|string|max:4000']);

        if ($session->status !== SupportSession::STATUS_ACTIVE) {
            $session->update([
                'status'      => SupportSession::STATUS_ACTIVE,
                'admin_id'    => $session->admin_id ?: $request->user()->id,
                'accepted_at' => $session->accepted_at ?: now(),
            ]);
        }

        $msg = $session->messages()->create([
            'sender'   => 'admin',
            'admin_id' => $request->user()->id,
            'text'     => $data['text'],
        ]);

        $session->update([
            'last_message_at' => now(),
            'unread_user'     => $session->unread_user + 1,
            'unread_admin'    => 0,
        ]);

        return response()->json($this->messageData($msg));
    }

    /** POST /api/admin/support/sessions/{session}/close */
    public function close(Request $request, SupportSession $session)
    {
        $session->update([
            'status'    => SupportSession::STATUS_CLOSED,
            'closed_at' => now(),
        ]);

        $session->messages()->create([
            'sender' => 'system',
            'text'   => 'Percakapan dengan customer service telah ditutup. Livora Concierge (AI) siap membantu lagi kapan saja.',
        ]);
        $session->update(['last_message_at' => now()]);

        return response()->json($this->sessionData($session->fresh()));
    }

    private function sessionData(SupportSession $session): array
    {
        return [
            'id'         => $session->id,
            'status'     => $session->status,
            'name'       => $session->name,
            'email'      => $session->email,
            'admin_name' => optional($session->admin)->name,
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
