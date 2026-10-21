<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Shop\LiviBot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Simulator WhatsApp + Log AI + Uji Skenario (admin).
 * Simulator menjalankan mesin bot sungguhan dalam mode nyata terhadap
 * percakapan nomor uji — seluruh alur bisa diuji tanpa Meta.
 */
class BotSimulatorController extends Controller
{
    /** POST /api/admin/shop/bot/chat — kirim pesan sebagai customer uji. */
    public function chat(Request $request)
    {
        $data = $request->validate([
            'phone' => 'required|string|max:30',
            'text' => 'nullable|string|max:2000',
            'type' => 'nullable|string|in:text,image,audio,sticker,location',
        ]);
        $phone = 'sim-'.preg_replace('/\D/', '', $data['phone']);
        $result = app(LiviBot::class)->handle($phone, $data['text'] ?? '', $data['type'] ?? 'text', [], false);

        return $result + ['conversation' => $this->conversationState($phone)];
    }

    /** GET /api/admin/shop/bot/conversation?phone=... — state + riwayat untuk panel samping. */
    public function conversation(Request $request)
    {
        $phone = 'sim-'.preg_replace('/\D/', '', (string) $request->query('phone'));
        $messages = DB::table('wa_messages')->where('phone', $phone)->latest('id')->limit(50)->get()->reverse()->values();

        return ['conversation' => $this->conversationState($phone), 'messages' => $messages];
    }

    /** POST /api/admin/shop/bot/reset — reset percakapan uji. */
    public function reset(Request $request)
    {
        $phone = 'sim-'.preg_replace('/\D/', '', (string) $request->input('phone'));
        DB::table('wa_conversations')->where('phone', $phone)->delete();
        DB::table('wa_messages')->where('phone', $phone)->delete();

        return ['ok' => true];
    }

    protected function conversationState(string $phone): ?array
    {
        $c = DB::table('wa_conversations')->where('phone', $phone)->first();
        if (!$c) return null;

        return [
            'state' => $c->state, 'mode' => $c->mode, 'last_intent' => $c->last_intent,
            'collected' => json_decode((string) $c->collected, true), 'fail_count' => $c->fail_count,
            'cart_id' => $c->cart_id, 'order_id' => $c->order_id,
        ];
    }

    // ── Log AI ──

    /** GET /api/admin/shop/bot/logs */
    public function logs(Request $request)
    {
        $q = DB::table('wa_ai_logs')->latest('id');
        if ($request->query('phone')) $q->where('phone', 'like', '%'.$request->query('phone').'%');
        if ($request->query('flag')) $q->where('flag', $request->query('flag'));
        if ($request->query('date')) $q->whereDate('created_at', $request->query('date'));

        return $q->paginate(50);
    }

    /** POST /api/admin/shop/bot/logs/{id}/bad — tandai jawaban buruk + catatan. */
    public function markBad(int $id, Request $request)
    {
        DB::table('wa_ai_logs')->where('id', $id)->update([
            'marked_bad' => true, 'note' => substr((string) $request->input('note'), 0, 1000),
        ]);

        return ['ok' => true];
    }

    // ── Uji Skenario ──

    public function scenarios()
    {
        return DB::table('bot_scenarios')->where('active', true)->orderBy('id')->get();
    }

    public function saveScenario(Request $request)
    {
        $data = $request->validate([
            'id' => 'nullable|integer', 'name' => 'required|string|max:120',
            'transcript' => 'required|array', 'expectations' => 'nullable|array',
        ]);
        $row = ['name' => $data['name'], 'transcript' => json_encode($data['transcript']),
            'expectations' => json_encode($data['expectations'] ?? []), 'updated_at' => now()];
        if (!empty($data['id'])) {
            DB::table('bot_scenarios')->where('id', $data['id'])->update($row);
            $id = $data['id'];
        } else {
            $id = DB::table('bot_scenarios')->insertGetId($row + ['created_at' => now()]);
        }

        return ['ok' => true, 'id' => $id];
    }

    /** POST /api/admin/shop/bot/scenarios/run — jalankan semua skenario, kembalikan lolos/gagal. */
    public function runScenarios()
    {
        $bot = app(LiviBot::class);
        $out = [];
        foreach (DB::table('bot_scenarios')->where('active', true)->get() as $sc) {
            $phone = 'test-'.$sc->id;
            DB::table('wa_conversations')->where('phone', $phone)->delete();
            $failures = [];
            $last = null;
            foreach (json_decode((string) $sc->transcript, true) ?: [] as $turn) {
                if (($turn['from'] ?? '') !== 'customer') continue;
                $last = $bot->handle($phone, $turn['text'] ?? '', $turn['type'] ?? 'text', [], false);
            }
            foreach (json_decode((string) $sc->expectations, true) ?: [] as $exp) {
                $rule = $exp['rule'] ?? '';
                $fail = match ($rule) {
                    'no_price' => collect($last['replies'] ?? [])->contains(fn ($r) => preg_match('/rp\s?[\d.,]+/i', $r['body'] ?? '')),
                    'handoff' => ($last['mode'] ?? '') !== 'menunggu_admin',
                    'state' => ($last['state'] ?? '') !== ($exp['value'] ?? ''),
                    'flag' => ($last['flag'] ?? '') !== ($exp['value'] ?? ''),
                    default => false,
                };
                if ($fail) $failures[] = $rule.($exp['value'] ?? '');
            }
            DB::table('wa_conversations')->where('phone', $phone)->delete();
            $out[] = ['id' => $sc->id, 'name' => $sc->name, 'pass' => !$failures, 'failures' => $failures];
        }

        return ['results' => $out, 'passed' => collect($out)->where('pass', true)->count(), 'total' => count($out)];
    }
}
