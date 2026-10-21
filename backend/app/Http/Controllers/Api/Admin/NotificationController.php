<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Notifikasi admin N1–N16: lonceng, daftar, angka menu, Tugas Saya.
 * Polling tiap 20 detik dari frontend. Perlu tindakan tetap ada sampai
 * kondisi terpenuhi (ditutup sistem), bukan ditutup manual.
 */
class NotificationController extends Controller
{
    /** GET /api/admin/notifications — daftar untuk peran saya. */
    public function index(Request $request)
    {
        $role = $request->user()->admin_role ?? 'owner';
        $q = DB::table('admin_notifications')->where('status', 'open')->latest('id');
        if ($role !== 'owner') {
            $q->where(fn ($w) => $w->whereJsonContains('roles', $role)->orWhereJsonContains('roles', 'owner'));
        }

        return $q->limit(100)->get()->map(fn ($n) => $this->shape($n, $request->user()->id));
    }

    /** GET /api/admin/notifications/count — angka untuk menu & judul tab. */
    public function count(Request $request)
    {
        $role = $request->user()->admin_role ?? 'owner';
        $q = DB::table('admin_notifications')->where('status', 'open');
        if ($role !== 'owner') {
            $q->where(fn ($w) => $w->whereJsonContains('roles', $role)->orWhereJsonContains('roles', 'owner'));
        }
        $rows = $q->get(['id', 'read_by', 'kind', 'priority']);
        $unread = $rows->filter(fn ($n) => !isset((json_decode((string) $n->read_by, true) ?: [])[$request->user()->id]));

        return [
            'unread' => $unread->count(),
            'urgent' => $unread->where('priority', 'mendesak')->count(),
            'tasks' => $rows->where('kind', 'perlu_tindakan')->count(),
        ];
    }

    /** POST /api/admin/notifications/{id}/read — tandai dibaca (angka Info berkurang). */
    public function markRead(int $id, Request $request)
    {
        $n = DB::table('admin_notifications')->where('id', $id)->first();
        abort_unless($n, 404);
        $read = json_decode((string) $n->read_by, true) ?: [];
        $read[$request->user()->id] = now()->toIso8601String();
        DB::table('admin_notifications')->where('id', $id)->update(['read_by' => json_encode($read), 'updated_at' => now()]);

        return ['ok' => true];
    }

    protected function shape(object $n, int $userId): array
    {
        $read = json_decode((string) $n->read_by, true) ?: [];

        return [
            'id' => $n->id, 'type' => $n->type, 'kind' => $n->kind, 'priority' => $n->priority,
            'title' => $n->title, 'body' => $n->body, 'link' => $n->link,
            'order_id' => $n->order_id, 'due_at' => $n->due_at, 'created_at' => $n->created_at,
            'read' => isset($read[$userId]),
        ];
    }
}
