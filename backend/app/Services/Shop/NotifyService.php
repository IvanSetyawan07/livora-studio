<?php

namespace App\Services\Shop;

use App\Models\ShopOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Notifikasi admin N1–N16 (rombak WA-first).
 * - Dedup: event_key unik (jenis + order + versi) — kejadian berulang memperbarui yang ada.
 * - Penerima per peran; admin tanpa peran dianggap owner; owner menerima semua Mendesak.
 * - Tutup otomatis saat kondisi terpenuhi (closeFor), catat siapa & kapan.
 * - Pengingat 50% / eskalasi 100% jalan lewat tick() tiap menit (scheduler), jam kerja saja;
 *   Mendesak dikecualikan dari penahanan jam kerja.
 */
class NotifyService
{
    /** type => [judul, kind, priority, penerima (peran), batas waktu (menit, null = tanpa)] */
    public const DEFS = [
        'N1' => ['Chat butuh admin', 'perlu_tindakan', 'mendesak', ['cs'], 15],
        'N2' => ['Pesanan baru dibuat bot', 'info', 'normal', ['cs'], null],
        'N3' => ['Pesanan perlu harga', 'perlu_tindakan', 'tinggi', ['cs', 'finance'], 240],
        'N4' => ['Customer minta revisi/nego', 'perlu_tindakan', 'tinggi', ['cs'], 240],
        'N5' => ['Penawaran disetujui customer', 'info', 'normal', ['cs', 'finance'], null],
        'N6' => ['Penawaran/tagihan hampir kedaluwarsa', 'perlu_tindakan', 'normal', ['cs'], null],
        'N7' => ['Bukti transfer masuk', 'perlu_tindakan', 'tinggi', ['finance'], 30],
        'N8' => ['Bukti tidak cocok', 'perlu_tindakan', 'mendesak', ['finance'], 30],
        'N9' => ['Pembayaran diterima, siapkan barang', 'perlu_tindakan', 'normal', ['production'], 1440],
        'N10' => ['Stok habis saat pembayaran masuk', 'perlu_tindakan', 'mendesak', ['cs', 'owner'], null],
        'N11' => ['Kirim besok tapi kurir/resi kosong', 'perlu_tindakan', 'mendesak', ['production'], null],
        'N12' => ['Dikirim 3 hari belum ada konfirmasi tiba', 'perlu_tindakan', 'normal', ['production'], 1440],
        'N13' => ['Customer konfirmasi barang diterima', 'info', 'normal', ['cs', 'production'], null],
        'N14' => ['Klaim/refund baru', 'perlu_tindakan', 'tinggi', ['production', 'finance'], 1440],
        'N15' => ['Gangguan sistem', 'sistem', 'mendesak', ['owner'], null],
        'N16' => ['Jendela chat tinggal 30 menit', 'info', 'tinggi', ['cs'], null],
        'N17' => ['Customer minta cek harga', 'perlu_tindakan', 'tinggi', ['cs'], 30],
    ];

    /** Buat/perbarui notifikasi. $keyExtra membedakan versi (mis. versi penawaran). */
    public static function notify(string $type, ?int $orderId = null, array $vars = [], string $keyExtra = '', ?int $conversationId = null): void
    {
        $def = self::DEFS[$type] ?? null;
        if (!$def) return;
        [$title, $kind, $priority, $roles, $dueMin] = $def;

        // Di luar jam kerja: tahan yang bukan Mendesak — dikirim sebagai ringkasan di awal jam kerja.
        if ($priority !== 'mendesak' && !ShopSettings::withinBusinessHours()) {
            try {
                DB::table('shop_settings')->updateOrInsert(
                    ['key' => 'held_notifications'],
                    ['value' => json_encode(array_merge(
                        (array) (json_decode((string) (DB::table('shop_settings')->where('key', 'held_notifications')->value('value') ?? '[]'), true) ?: []),
                        [['type' => $type, 'order_id' => $orderId, 'vars' => $vars, 'key_extra' => $keyExtra, 'at' => now()->toIso8601String()]]
                    )), 'updated_at' => now(), 'created_at' => now()]
                );
            } catch (\Throwable $e) { /* antrean tahan gagal — abaikan, notifikasi bukan alur kritis */ }

            return;
        }

        $eventKey = $type.':'.($orderId ?? 0).':'.$keyExtra;
        $body = $vars['body'] ?? self::body($type, $orderId, $vars);
        $link = $vars['link'] ?? self::link($type, $orderId, $conversationId);
        $data = [
            'type' => $type, 'title' => $title, 'kind' => $kind, 'priority' => $priority, 'body' => $body, 'link' => $link,
            'roles' => json_encode($roles), 'order_id' => $orderId, 'conversation_id' => $conversationId,
            'status' => 'open', 'due_at' => $dueMin ? now()->addMinutes($dueMin) : null, 'updated_at' => now(),
        ];
        try {
            $exists = DB::table('admin_notifications')->where('event_key', $eventKey)->first();
                        if ($exists) {
                if ($exists->status === 'open') {
                    DB::table('admin_notifications')->where('id', $exists->id)->update($data);
                } elseif ($kind === 'perlu_tindakan' && $exists->status === 'done') {
                    DB::table('admin_notifications')->where('id', $exists->id)->update($data + [
                        'status' => 'open', 'reminder_count' => 0, 'escalated_at' => null, 'done_by' => null, 'done_at' => null, 'read_by' => null,
                    ]);
                }
            } else {
                DB::table('admin_notifications')->insert($data + ['event_key' => $eventKey, 'created_at' => now()]);
            }
            if ($orderId) self::timeline($orderId, 'notification', $title, ['type' => $type, 'body' => $body]);
        } catch (\Throwable $e) {
            Log::warning('Notifikasi gagal dibuat', ['type' => $type, 'error' => $e->getMessage()]);
        }
    }

    /** Tutup otomatis semua notifikasi terbuka untuk satu peristiwa pesanan. */
    public static function closeFor(string $type, int $orderId, ?int $byUserId = null): void
    {
        DB::table('admin_notifications')
             ->where('type', $type)->where('status', 'open')
            ->when($orderId > 0, fn ($q) => $q->where('order_id', $orderId), fn ($q) => $q->whereNull('order_id'))
            ->update(['status' => 'done', 'done_by' => $byUserId, 'done_at' => now(), 'updated_at' => now()]);
    }

    /** Kirim notifikasi yang tertahan di luar jam kerja sebagai satu ringkasan. */
    public static function flushHeld(): void
    {
        $raw = DB::table('shop_settings')->where('key', 'held_notifications')->value('value');
        $held = json_decode((string) $raw, true) ?: [];
        if (!$held || !ShopSettings::withinBusinessHours()) return;
        DB::table('shop_settings')->where('key', 'held_notifications')->update(['value' => '[]', 'updated_at' => now()]);
        self::notify('N2', null, ['body' => 'Ringkasan di luar jam kerja: '.count($held).' peristiwa menunggu. Buka Pantau Proses untuk meninjau.'], 'held-'.now()->format('YmdHi'));
    }

    /** Pemeriksa batas waktu: 50% pengingat (maks 3x, jam kerja), 100% eskalasi ke Owner. */
        public static function closeConversation(int $conversationId, ?int $byUserId = null, array $types = ['N1', 'N16']): void
    {
        DB::table('admin_notifications')
            ->whereIn('type', $types)->where('conversation_id', $conversationId)->where('status', 'open')
            ->update(['status' => 'done', 'done_by' => $byUserId, 'done_at' => now(), 'updated_at' => now()]);
    }

    /** Kejadian berbasis waktu: N6 (H-1), N11, N12, N16 + pengingat H-1 ke customer. */
    public static function scan(): void
    {
        $service = app(ShopOrderService::class);

        foreach (ShopOrder::whereIn('status', ['penawaran', 'menunggu_bayar'])->whereBetween('quote_expires_at', [now(), now()->addDay()])->get() as $o) {
            self::notify('N6', $o->id, [], 'h1-v'.$o->quote_version);
            $sent = DB::table('shop_order_events')->where('order_id', $o->id)->where('event', 'reminder')->where('label', 'like', 'Pengingat H-1 v'.$o->quote_version.'%')->exists();
            if (!$sent && $o->customer_phone && $o->wa_consent) {
                $link = $o->status === 'penawaran' ? $service->confirmUrl($o) : $service->paymentUrl($o);
                Ops::sendWa($o->customer_phone, 'Halo Bapak/Ibu, pengingat: '.($o->status === 'penawaran' ? 'penawaran' : 'tagihan')." pesanan {$o->code} berlaku sampai ".$o->quote_expires_at->timezone('Asia/Jakarta')->translatedFormat('d F Y H:i').". Detail: {$link}", $o->id);
                self::timeline($o->id, 'reminder', 'Pengingat H-1 v'.$o->quote_version.' dikirim ke customer');
            }
        }

        $tomorrow = now('Asia/Jakarta')->addDay()->toDateString();
        foreach (ShopOrder::whereIn('status', ['siap_kirim', 'diproses'])->whereDate('delivery_date', $tomorrow)->get() as $o) {
            if (empty($o->courier) || empty($o->tracking_number)) {
                if (($o->shipping_method ?? null) !== 'showroom') self::notify('N11', $o->id, [], 'd'.$tomorrow);
            }
            $sent = DB::table('shop_order_events')->where('order_id', $o->id)->where('event', 'reminder')->where('label', 'Pengingat H-1 pengiriman '.$tomorrow)->exists();
            if (!$sent && $o->customer_phone && $o->wa_consent) {
                Ops::sendWa($o->customer_phone, "Halo Bapak/Ibu, pesanan {$o->code} dijadwalkan dikirim besok ({$tomorrow}). Mohon pastikan ada yang menerima ya.", $o->id);
                self::timeline($o->id, 'reminder', 'Pengingat H-1 pengiriman '.$tomorrow);
            }
        }

        foreach (ShopOrder::where('status', 'dikirim')->where('shipped_at', '<=', now()->subDays(3))->get() as $o) {
            self::notify('N12', $o->id, [], 's'.optional($o->shipped_at)->format('Ymd'));
        }

        foreach (DB::table('wa_conversations')->where('mode', 'dipegang_admin')->whereBetween('last_inbound_at', [now()->subHours(24), now()->subMinutes(23 * 60 + 30)])->get() as $c) {
            self::notify('N16', $c->order_id, ['phone' => $c->phone, 'body' => 'Jendela chat 24 jam dengan '.($c->wa_name ?: '+'.$c->phone).' tinggal ±30 menit. Balas sebelum tertutup.'],
                'c'.$c->id.'-'.strtotime((string) $c->last_inbound_at), $c->id);
        }
    }

    public static function tick(): void
    {
        try {
            self::scan();
        } catch (\Throwable $e) {
            Log::warning('NotifyService::scan gagal', ['error' => $e->getMessage()]);
        }
        self::flushHeld();
        $open = DB::table('admin_notifications')->where('status', 'open')->whereNotNull('due_at')->get();
        foreach ($open as $n) {
            $due = \Carbon\Carbon::parse($n->due_at);
            $created = \Carbon\Carbon::parse($n->created_at);
            $total = max(1, $created->diffInMinutes($due));
            $elapsed = $created->diffInMinutes(now());
            if (now()->gte($due)) {
                // Eskalasi: jadikan Mendesak, tambahkan owner sebagai penerima
                $roles = array_values(array_unique(array_merge(json_decode((string) $n->roles, true) ?: [], ['owner'])));
                DB::table('admin_notifications')->where('id', $n->id)->update([
                    'priority' => 'mendesak', 'roles' => json_encode($roles),
                    'escalated_at' => now(), 'due_at' => null, 'updated_at' => now(),
                ]);
                self::emailUrgent($n, $roles);
            } elseif ($elapsed >= $total / 2 && $n->reminder_count < 3 && ShopSettings::withinBusinessHours()) {
                DB::table('admin_notifications')->where('id', $n->id)->update([
                    'reminder_count' => $n->reminder_count + 1, 'updated_at' => now(),
                ]);
            }
        }
    }

    public static function timeline(int $orderId, string $event, string $label, array $meta = [], ?int $userId = null): void
    {
        try {
            DB::table('shop_order_events')->insert([
                'order_id' => $orderId, 'event' => $event, 'label' => $label,
                'meta' => $meta ? json_encode($meta) : null, 'user_id' => $userId, 'created_at' => now(),
            ]);
        } catch (\Throwable $e) { /* linimasa tidak boleh menggagalkan alur */ }
    }

    protected static function body(string $type, ?int $orderId, array $vars): string
    {
        $code = $orderId ? (ShopOrder::find($orderId)?->code ?? '#'.$orderId) : '';

        return $vars['message'] ?? match ($type) {
            'N17' => 'Customer menanyakan harga, mohon isi harga di Inbox.',
            'N1' => "Chat {$vars['phone']} butuh admin ({$vars['trigger']}).",
            'N2' => "Pesanan {$code} baru dibuat oleh bot.",
            'N3' => "Pesanan {$code} menunggu harga diisi.",
            'N4' => "Customer {$code} minta revisi/nego: ".($vars['note'] ?? '-'),
            'N5' => "Penawaran {$code} disetujui customer.",
            'N6' => "Penawaran/tagihan {$code} hampir atau sudah kedaluwarsa.",
            'N7' => "Bukti transfer untuk {$code} masuk, menunggu verifikasi.",
            'N8' => "Bukti transfer {$code} tidak cocok: ".($vars['reason'] ?? '-'),
            'N9' => "Pembayaran {$code} diterima — barang perlu disiapkan.",
            'N10' => "Stok habis saat pembayaran {$code} masuk.",
            'N11' => "Pesanan {$code} kirim besok tapi kurir/resi kosong.",
            'N12' => "Pesanan {$code} dikirim 3 hari tanpa konfirmasi tiba.",
            'N13' => "Customer {$code} menekan Barang sudah diterima.",
            'N14' => "Klaim/refund baru untuk {$code}.",
            'N15' => 'Gangguan sistem: '.($vars['reason'] ?? '-'),
            'N16' => "Jendela chat 24 jam dengan {$vars['phone']} tinggal ±30 menit.",
            default => $type,
        };
    }

    protected static function link(string $type, ?int $orderId, ?int $conversationId): string
    {
        return match ($type) {
            'N1', 'N16', 'N17' => '/admin/shop/inbox'.($conversationId ? '?c='.$conversationId : ''),
            'N7', 'N8' => '/admin/shop/payments',
            'N14' => '/admin/shop/aftercare',
            'N15' => '/admin/shop/health',
            default => $orderId ? '/admin/shop/orders/'.$orderId : '/admin/shop/orders',
        };
    }

    protected static function emailUrgent(object $n, array $roles): void
    {
        try {
            $emails = \App\Models\User::where('role', 'admin')
                ->where(fn ($q) => $q->whereIn('admin_role', $roles)->orWhereNull('admin_role'))
                ->pluck('email')->filter()->all();
            foreach ($emails as $email) {
                \Illuminate\Support\Facades\Mail::raw(
                    "[Livora] {$n->title}\n\n{$n->body}\n\nBuka: ".config('app.url').$n->link,
                    fn ($m) => $m->to($email)->subject('[Mendesak] '.$n->title)
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Email eskalasi gagal', ['error' => $e->getMessage()]);
        }
    }
}
