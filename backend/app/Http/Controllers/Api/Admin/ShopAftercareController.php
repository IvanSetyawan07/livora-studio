<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ShopOrder;
use App\Services\Shop\AftercareService;
use App\Services\Shop\Ops;
use App\Services\Shop\ShopOrderService;
use App\Services\Shop\ShopSettings;
use App\Services\Shop\WaBot;
use App\Services\WhatsApp\WhatsAppNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/** Tahap 3–4 sisi admin: produksi, BAST, klaim, refund, change order, inbox, pengaturan, kesehatan, funnel, simulator. */
class ShopAftercareController extends Controller
{
    public function __construct(protected AftercareService $after, protected ShopOrderService $orders) {}

    protected function order(string $code): ShopOrder
    {
        return ShopOrder::with('items')->where('code', $code)->firstOrFail();
    }

    // ── Pesanan ──
    public function startProduction(Request $r, string $code)
    {
        $this->after->startProduction($this->order($code), $r->user());

        return ['ok' => true];
    }

    public function bast(Request $r, string $code)
    {
        $r->validate(['photos' => 'required|array|min:1|max:8', 'photos.*' => 'image|max:10240', 'signature' => 'nullable|image|max:10240',
            'receiver_name' => 'required|string|max:120', 'notes' => 'nullable|string|max:1000']);
        $photos = collect($r->file('photos'))->map(fn ($f) => $f->store('shop-bast', 'local'))->all();
        $sig = $r->file('signature')?->store('shop-bast', 'local');
        $this->after->saveBast($this->order($code), $photos, $sig, $r->input('receiver_name'), $r->input('notes'));

        return ['ok' => true];
    }

    public function linkProject(Request $r, string $code)
    {
        $r->validate(['project_id' => 'nullable|integer|exists:projects,id']);
        $o = $this->order($code);
        $before = ['project_id' => $o->project_id];
        $o->project_id = $r->input('project_id');
        $o->save();
        AuditLog::record('order.project_linked', $o, $before, ['project_id' => $o->project_id]);

        return ['ok' => true];
    }

    public function projects()
    {
        return DB::table('projects')->orderBy('title')->get(['id', 'title']);
    }

    public function extras(string $code)
    {
        $o = $this->order($code);

        return [
            'delivery' => DB::table('shop_deliveries')->where('order_id', $o->id)->first(),
            'claims' => DB::table('shop_claims')->where('order_id', $o->id)->latest()->get(),
            'refunds' => DB::table('shop_refunds')->where('order_id', $o->id)->latest()->get()->map(fn ($x) => $this->presentRefund($x, request())),
            'changes' => DB::table('shop_order_changes')->where('order_id', $o->id)->latest()->get(),
            'has_mto' => $o->hasMto(),
            'custom_spec' => $o->custom_spec,
            'spec_approved_at' => $o->spec_approved_at,
            'production_started_at' => $o->production_started_at,
            'sla_due_at' => $o->sla_due_at,
            'project_id' => $o->project_id,
        ];
    }

    public function file(Request $r)
    {
        $path = (string) $r->query('path');
        abort_unless(preg_match('#^shop-(bast|claims|refunds)/[A-Za-z0-9._-]+$#', $path) && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path);
    }

    // ── Klaim ──
    public function claims(Request $r)
    {
        return DB::table('shop_claims')->join('shop_orders', 'shop_orders.id', '=', 'shop_claims.order_id')
            ->when($r->query('status'), fn ($q, $s) => $q->whereIn('shop_claims.status', explode(',', $s)))
            ->select('shop_claims.*', 'shop_orders.code', 'shop_orders.customer_name', 'shop_orders.customer_phone', 'shop_orders.received_at')
            ->latest('shop_claims.created_at')->limit(200)->get()
            ->map(fn ($c) => (array) $c + ['photos' => json_decode($c->photos ?? '[]', true)]);
    }

    public function updateClaim(Request $r, int $claim)
    {
        $d = $r->validate(['status' => 'required|in:ditinjau,disetujui,ditolak,selesai', 'resolution' => 'nullable|string|max:2000']);
        $this->after->updateClaim($claim, $d['status'], $d['resolution'] ?? null, $r->user());

        return ['ok' => true];
    }

    // ── Refund ──
    public function refunds(Request $r)
    {
        return DB::table('shop_refunds')->join('shop_orders', 'shop_orders.id', '=', 'shop_refunds.order_id')
            ->when($r->query('status'), fn ($q, $s) => $q->whereIn('shop_refunds.status', explode(',', $s)))
            ->select('shop_refunds.*', 'shop_orders.code', 'shop_orders.customer_name')
            ->latest('shop_refunds.created_at')->limit(200)->get()->map(fn ($x) => $this->presentRefund($x, $r));
    }

    public function createRefund(Request $r, string $code)
    {
        $d = $r->validate(['reason' => 'required|string|max:1000', 'amount' => 'nullable|integer|min:0',
            'bank_name' => 'nullable|string|max:60', 'account_number' => 'nullable|string|max:30', 'account_holder' => 'nullable|string|max:120']);
        $this->after->requestRefund($this->order($code), $r->user(), $d['reason'], $d, $d['amount'] ?? null);

        return ['ok' => true];
    }

    public function updateRefund(Request $r, int $refund)
    {
        $d = $r->validate(['action' => 'required|in:setujui,tolak,kirim,selesai', 'note' => 'nullable|string|max:1000',
            'amount' => 'nullable|integer|min:0', 'proof' => 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:10240']);
        if ($d['action'] === 'tolak' && blank($d['note'] ?? null)) abort(422, 'Alasan penolakan wajib diisi.');
        $d['proof_path'] = $r->file('proof')?->store('shop-refunds', 'local');
        $this->after->updateRefund($refund, $d['action'], $r->user(), $d);

        return ['ok' => true];
    }

    protected function presentRefund(object $x, Request $r): array
    {
        $role = $r->user()->admin_role ?: 'owner';
        $a = (array) $x;
        $a['account_number'] = in_array($role, ['owner', 'finance'], true) ? AftercareService::revealAccount($x->account_number) : AftercareService::maskAccount($x->account_number);

        return $a;
    }

    // ── Change order ──
    public function createChange(Request $r, string $code)
    {
        $d = $r->validate(['description' => 'required|string|max:1000', 'price_delta' => 'required|integer|min:0']);
        $this->after->createChange($this->order($code), $d['description'], $d['price_delta'], $r->user());

        return ['ok' => true];
    }

    // ── Inbox handoff ──
    public function sessions(Request $r)
    {
        return DB::table('wa_sessions')->leftJoin('shop_orders', 'shop_orders.id', '=', 'wa_sessions.order_id')
            ->leftJoin('users', 'users.id', '=', 'wa_sessions.assigned_to')
            ->when($r->query('status'), fn ($q, $s) => $q->whereIn('wa_sessions.status', explode(',', $s)))
            ->select('wa_sessions.*', 'shop_orders.code as order_code', 'shop_orders.customer_name', 'users.name as assignee')
            ->orderByRaw("CASE wa_sessions.status WHEN 'menunggu_cs' THEN 0 WHEN 'aktif' THEN 1 WHEN 'bot' THEN 2 ELSE 3 END")
            ->latest('wa_sessions.last_inbound_at')->limit(200)->get()
            ->map(function ($s) {
                $s->last_message = DB::table('wa_messages')->where('phone', $s->phone)->latest('id')->value('body');
                $s->window_left_minutes = $s->last_inbound_at ? max(0, 1440 - (int) now()->diffInMinutes($s->last_inbound_at)) : 0;
                return $s;
            });
    }

    public function messages(int $session)
    {
        $s = DB::table('wa_sessions')->find($session) ?? abort(404);

        return DB::table('wa_messages')->leftJoin('users', 'users.id', '=', 'wa_messages.sent_by')->where('wa_messages.phone', $s->phone)
            ->select('wa_messages.id', 'direction', 'type', 'body', 'is_note', 'wa_messages.status', 'wa_messages.created_at', 'users.name as sender')
            ->latest('wa_messages.id')->limit(200)->get()->reverse()->values();
    }

    public function sessionAction(Request $r, int $session)
    {
        $d = $r->validate(['action' => 'required|in:ambil,serahkan,tutup,ke_bot']);
        $s = DB::table('wa_sessions')->find($session) ?? abort(404);
        $upd = match ($d['action']) {
            'ambil' => ['status' => 'aktif', 'assigned_to' => $r->user()->id],
            'serahkan' => ['status' => 'menunggu_cs', 'assigned_to' => null],
            'tutup', 'ke_bot' => ['status' => 'selesai', 'assigned_to' => null, 'fail_count' => 0],
        };
        DB::table('wa_sessions')->where('id', $s->id)->update($upd + ['updated_at' => now()]);
        AuditLog::record('inbox.'.$d['action'], null, ['session' => $s->id, 'status' => $s->status], $upd);
        if (in_array($d['action'], ['tutup', 'ke_bot'], true)) Ops::sendWa($s->phone, ShopSettings::template('session_closed'), $s->order_id, $r->user()->id);

        return ['ok' => true];
    }

    public function reply(Request $r, int $session)
    {
        $d = $r->validate(['body' => 'required|string|max:4000', 'note' => 'nullable|boolean']);
        $s = DB::table('wa_sessions')->find($session) ?? abort(404);
        if ($r->boolean('note')) {
            DB::table('wa_messages')->insert(['phone' => $s->phone, 'order_id' => $s->order_id, 'direction' => 'out', 'type' => 'note',
                'body' => $d['body'], 'is_note' => true, 'sent_by' => $r->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            return ['ok' => true];
        }
        if (!$s->last_inbound_at || now()->diffInHours($s->last_inbound_at) >= 24) {
            abort(422, 'Jendela 24 jam sudah lewat. Di luar jendela, WhatsApp hanya mengizinkan pesan template yang disetujui Meta.');
        }
        if ($s->status !== 'aktif') {
            DB::table('wa_sessions')->where('id', $s->id)->update(['status' => 'aktif', 'assigned_to' => $r->user()->id, 'updated_at' => now()]);
        }
        $ok = Ops::sendWa($s->phone, $d['body'], $s->order_id, $r->user()->id);
        AuditLog::record('inbox.reply', null, null, ['session' => $s->id]);

        return ['ok' => $ok];
    }

    // ── Pengaturan (Owner) ──
    public function settings()
    {
        return ShopSettings::all() + ['wa_flow_configured' => \App\Services\Shop\WhatsAppFlow::configured()];
    }

    public function saveSettings(Request $r)
    {
        $d = $r->validate([
            'bot_enabled' => 'sometimes|boolean', 'ai_answers_enabled' => 'sometimes|boolean',
            'business_hours' => 'sometimes|array', 'business_hours.days' => 'array', 'business_hours.start' => 'date_format:H:i', 'business_hours.end' => 'date_format:H:i',
            'blocklist' => 'sometimes|array', 'blocklist.*' => 'string|max:20',
            'templates' => 'sometimes|array', 'templates.*' => 'string|max:1000',
            'shipping_zones' => 'sometimes|array', 'shipping_zones.*' => 'integer|min:0',
            'review_threshold' => 'sometimes|integer|min:0', 'quote_valid_days' => 'sometimes|integer|min:1|max:30',
            'sla_hours' => 'sometimes|integer|min:1|max:168', 'warranty_days' => 'sometimes|integer|min:0|max:3650',
            'return_days' => 'sometimes|integer|min:0|max:90', 'retention_days' => 'sometimes|integer|min:30|max:3650',
        ]);
        if (isset($d['blocklist'])) $d['blocklist'] = array_values(array_filter(array_map(fn ($p) => WhatsAppNotifier::normalizePhone($p), $d['blocklist'])));
        $before = array_intersect_key(ShopSettings::all(), $d);
        ShopSettings::set($d);
        AuditLog::record('settings.updated', null, $before, $d);

        return ShopSettings::all();
    }

    // ── Kesehatan ──
    public function health()
    {
        $last = fn ($src, $status = 'ok') => DB::table('webhook_logs')->where('source', $src)->where('status', $status)->max('created_at');

        return [
            'webhooks' => collect(['midtrans', 'whatsapp'])->mapWithKeys(fn ($s) => [$s => [
                'last_ok' => $last($s), 'last_rejected' => $last($s, 'rejected'), 'last_error' => $last($s, 'error'),
                'errors_24h' => DB::table('webhook_logs')->where('source', $s)->where('status', '!=', 'ok')->where('created_at', '>', now()->subDay())->count(),
            ]]),
            'failed_messages' => DB::table('wa_failed_messages')->whereNull('resolved_at')->latest()->limit(100)->get(),
            'sessions_waiting' => DB::table('wa_sessions')->where('status', 'menunggu_cs')->count(),
            'sla_overdue' => ShopOrder::where('status', 'menunggu_review_admin')->where('sla_due_at', '<', now())->count(),
            'unpaid_after_expiry' => DB::table('shop_payments')->where('status', 'paid')->whereColumn('paid_at', '>', 'expires_at')->where('paid_at', '>', now()->subDays(30))->count(),
            'config' => [
                'whatsapp_provider' => config('services.whatsapp.provider', env('WHATSAPP_PROVIDER')),
                'midtrans' => filled(config('services.midtrans.server_key')),
                'meta_token_expires_at' => env('META_WHATSAPP_TOKEN_EXPIRES_AT'),
                'mail' => config('mail.default'),
            ],
            'recent' => DB::table('webhook_logs')->latest('created_at')->limit(30)->get(['id', 'source', 'status', 'event_id', 'error', 'created_at']),
        ];
    }

    public function retryFailed(int $id)
    {
        $m = DB::table('wa_failed_messages')->find($id) ?? abort(404);
        $res = WhatsAppNotifier::send($m->phone, $m->body);
        $ok = ($res['status'] ?? '') === 'sent';
        DB::table('wa_failed_messages')->where('id', $id)->update($ok ? ['resolved_at' => now(), 'updated_at' => now()] : ['attempts' => $m->attempts + 1, 'error' => $res['error'] ?? null, 'updated_at' => now()]);

        return ['ok' => $ok, 'error' => $ok ? null : ($res['error'] ?? 'gagal')];
    }

    public function dismissFailed(int $id)
    {
        DB::table('wa_failed_messages')->where('id', $id)->update(['resolved_at' => now(), 'updated_at' => now()]);

        return ['ok' => true];
    }

    // ── Funnel ──
    public function funnel(Request $r)
    {
        $days = min(365, max(1, (int) $r->query('days', 30)));
        $steps = ['konsultasi_klik' => 'Klik Konsultasi', 'order_dibuat' => 'Pesanan dibuat', 'wa_masuk' => 'Pesan WA masuk', 'form_dibuka' => 'Form dibuka',
            'penawaran_disetujui' => 'Penawaran disetujui', 'dibayar' => 'Dibayar'];
        $counts = DB::table('funnel_events')->where('created_at', '>', now()->subDays($days))->selectRaw('event, COUNT(DISTINCT COALESCE(order_id, id)) as n')
            ->groupBy('event')->pluck('n', 'event');
        $mto = ShopOrder::where('created_at', '>', now()->subDays($days))->whereNotNull('spec_reviewed_by');

        return [
            'days' => $days,
            'steps' => collect($steps)->map(fn ($label, $k) => ['key' => $k, 'label' => $label, 'count' => (int) ($counts[$k] ?? 0)])->values(),
            'mto_reviewed' => (clone $mto)->count(),
            'mto_revised' => (clone $mto)->where('spec_revised', true)->count(),
            'handoffs' => DB::table('wa_sessions')->where('handoff_at', '>', now()->subDays($days))->count(),
            'handoff_triggers' => DB::table('wa_sessions')->where('handoff_at', '>', now()->subDays($days))->selectRaw('`trigger`, COUNT(*) as n')->groupBy('trigger')->pluck('n', 'trigger'),
        ];
    }

    // ── Simulator bot ──
    public function simulate(Request $r, WaBot $bot)
    {
        $d = $r->validate(['phone' => 'required|string|max:20', 'text' => 'required|string|max:1000']);

        return $bot->handle($d['phone'], $d['text'], true);
    }
}
