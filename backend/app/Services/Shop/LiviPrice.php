<?php

namespace App\Services\Shop;

use App\Models\Item;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Alur "cek harga lewat admin" untuk Livi.
 *
 *  1. Customer tanya harga → Livi: "Sebentar ya Kak, Livi cek dulu" → baris wa_price_inquiries (pending) + notifikasi N17.
 *  2. Admin mengisi harga manual di Inbox (info saja, BUKAN penawaran / pesanan).
 *  3. Livi meneruskan ke customer: satu pesan per barang (foto + harga + penjelasan diskon bila ada), lalu penutup.
 *
 * Aturan keras: semua angka berasal dari input admin. Diskon dihitung di PHP, bukan oleh LLM.
 * Harga di sini TIDAK menulis items.price / price_confirmed_at.
 */
class LiviPrice
{
    public const MAX_ITEMS = 5;

    // ───────────────────────────── Sisi customer: buat permintaan ─────────────────────────────

    /**
     * @param  array<int, array{item_id?: int, title?: string, code?: string, quantity?: int}>  $items
     * @return array{id: int, reused: bool}
     */
    public static function open(object $conv, string $phone, array $items, string $question = ''): array
    {
        $items = self::snapshot($items);
        $existing = DB::table('wa_price_inquiries')->where('conversation_id', $conv->id)->where('status', 'pending')->latest('id')->first();
        if ($existing) {
            // Pertanyaan harga kedua saat yang pertama belum dijawab: gabungkan barangnya, jangan bikin tiket ganda
            $merged = self::snapshot(array_merge((array) json_decode((string) $existing->items, true), $items));
            DB::table('wa_price_inquiries')->where('id', $existing->id)->update(['items' => json_encode($merged), 'updated_at' => now()]);

            return ['id' => (int) $existing->id, 'reused' => true];
        }

        $id = DB::table('wa_price_inquiries')->insertGetId([
            'conversation_id' => $conv->id, 'phone' => $phone, 'cart_id' => $conv->cart_id ?: null,
            'items' => json_encode($items), 'status' => 'pending', 'customer_question' => mb_substr($question, 0, 300),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $names = collect($items)->pluck('title')->filter()->implode(', ');
        NotifyService::notify('N17', $conv->order_id ?: null, [
            'body' => 'Chat '.($conv->wa_name ?: '+'.$phone).' menanyakan harga: '.($names ?: 'barang di keranjang').'. Isi harga di Inbox (info saja, bukan penawaran).',
        ], 'pi'.$id, (int) $conv->id);

        return ['id' => $id, 'reused' => false];
    }

    public static function pending(int $conversationId): ?object
    {
        return DB::table('wa_price_inquiries')->where('conversation_id', $conversationId)->where('status', 'pending')->latest('id')->first();
    }

    /** Jawaban admin terbaru (≤3 hari) untuk konteks tanya-jawab lanjutan. */
    public static function latestAnswered(int $conversationId): ?object
    {
        return DB::table('wa_price_inquiries')->where('conversation_id', $conversationId)->where('status', 'answered')
            ->where('answered_at', '>', now()->subDays(3))->latest('id')->first();
    }

    // ───────────────────────────── Sisi admin: detail & jawaban ─────────────────────────────

    /** Data untuk panel admin. */
    public static function present(?object $row): ?array
    {
        if (!$row) return null;
        $items = (array) json_decode((string) $row->items, true);
        $answers = collect((array) json_decode((string) ($row->answers ?? '[]'), true))->keyBy('item_id');
        $db = Item::whereIn('id', collect($items)->pluck('item_id')->filter())->get()->keyBy('id');

        return [
            'id' => (int) $row->id, 'status' => $row->status, 'question' => $row->customer_question,
            'admin_note' => $row->admin_note, 'created_at' => $row->created_at, 'answered_at' => $row->answered_at, 'relayed_at' => $row->relayed_at,
            'items' => collect($items)->map(function ($i) use ($db, $answers) {
                $it = $db[$i['item_id'] ?? 0] ?? null;
                $a = $answers[$i['item_id'] ?? 0] ?? null;

                return [
                    'item_id' => $i['item_id'] ?? null, 'title' => $i['title'] ?? $it?->title, 'code' => $i['code'] ?? $it?->code, 'quantity' => $i['quantity'] ?? 1,
                    'image' => $it?->image, 'dimensions' => ($it && $it->width_cm && $it->depth_cm && $it->height_cm) ? round($it->width_cm).' x '.round($it->depth_cm).' x '.round($it->height_cm).' cm' : null,
                    'reference_price' => $it && (int) $it->price > 0 ? (int) $it->price : null, // hanya petunjuk untuk admin, TIDAK dikirim ke customer
                    'answer' => $a,
                ];
            })->values()->all(),
        ];
    }

    /**
     * Simpan jawaban admin lalu teruskan ke customer.
     *
     * @param  array<int, array{item_id: int, price: int, discount_type?: ?string, discount_value?: ?int, note?: ?string}>  $answers
     * @return array{ok: bool, relayed: bool, error: ?string}
     */
    public static function answer(int $inquiryId, array $answers, ?string $adminNote, ?int $adminId): array
    {
        $row = DB::table('wa_price_inquiries')->find($inquiryId);
        if (!$row || $row->status !== 'pending') return ['ok' => false, 'relayed' => false, 'error' => 'Permintaan sudah dijawab atau tidak ditemukan.'];

        $items = collect((array) json_decode((string) $row->items, true))->keyBy('item_id');
        $clean = [];
        foreach ($answers as $a) {
            $itemId = (int) ($a['item_id'] ?? 0);
            if (!$items->has($itemId)) continue;
            $price = (int) ($a['price'] ?? 0);
            if ($price <= 0) continue;
            $type = in_array($a['discount_type'] ?? null, ['percent', 'nominal'], true) ? $a['discount_type'] : null;
            $value = $type ? max(0, (int) ($a['discount_value'] ?? 0)) : 0;
            if ($type === 'percent') $value = min($value, 90);
            $final = self::finalPrice($price, $type, $value);
            if ($type && $final >= $price) $type = null; // diskon 0 / tidak masuk akal → anggap tanpa diskon
            $clean[] = [
                'item_id' => $itemId, 'price' => $price, 'discount_type' => $type, 'discount_value' => $type ? $value : null,
                'final_price' => $type ? $final : $price, 'note' => ($n = trim((string) ($a['note'] ?? ''))) !== '' ? mb_substr($n, 0, 300) : null,
            ];
        }
        if (!$clean) return ['ok' => false, 'relayed' => false, 'error' => 'Isi minimal satu harga barang.'];

        DB::table('wa_price_inquiries')->where('id', $inquiryId)->update([
            'answers' => json_encode($clean), 'admin_note' => $adminNote !== null && trim($adminNote) !== '' ? mb_substr(trim($adminNote), 0, 500) : null,
            'status' => 'answered', 'answered_by' => $adminId, 'answered_at' => now(), 'updated_at' => now(),
        ]);
        NotifyService::closeConversation((int) $row->conversation_id, $adminId, ['N17']);

        $relayed = self::relay($inquiryId);

        return ['ok' => true, 'relayed' => $relayed, 'error' => null];
    }

    public static function finalPrice(int $price, ?string $type, int $value): int
    {
        return match ($type) {
            'percent' => (int) round($price * (100 - $value) / 100),
            'nominal' => max(0, $price - $value),
            default => $price,
        };
    }

    // ───────────────────────────── Relay ke customer ─────────────────────────────

    public static function relay(int $inquiryId): bool
    {
        $row = DB::table('wa_price_inquiries')->find($inquiryId);
        if (!$row || $row->status !== 'answered' || $row->relayed_at) return false;
        $conv = DB::table('wa_conversations')->find($row->conversation_id);
        if (!$conv) return false;

        $answers = collect((array) json_decode((string) $row->answers, true))->keyBy('item_id');
        $items = collect((array) json_decode((string) $row->items, true))->filter(fn ($i) => $answers->has($i['item_id'] ?? 0))->values();
        $db = Item::whereIn('id', $items->pluck('item_id'))->get()->keyBy('id');

        $facts = $items->map(function ($i) use ($answers, $db) {
            $a = $answers[$i['item_id']];
            $disc = null;
            if ($a['discount_type'] === 'percent') $disc = $a['discount_value'].'%';
            if ($a['discount_type'] === 'nominal') $disc = ShopOrderService::rp($a['discount_value']);

            return [
                'item_id' => $i['item_id'], 'nama' => $i['title'] ?? $db[$i['item_id']]->title ?? 'barang', 'jumlah' => (int) ($i['quantity'] ?? 1),
                'harga_normal' => ShopOrderService::rp($a['price']),
                'diskon' => $disc, 'harga_setelah_diskon' => $disc ? ShopOrderService::rp($a['final_price']) : null,
                'catatan_dari_tim' => $a['note'],
            ];
        })->all();

        $allowed = [];
        foreach ($answers as $a) {
            $allowed[] = (int) $a['price'];
            $allowed[] = (int) $a['final_price'];
            if ($a['discount_type'] === 'nominal') $allowed[] = (int) $a['discount_value'];
        }
        $hasDiscount = collect($facts)->contains(fn ($f) => $f['diskon'] !== null);
        $copy = self::compose($facts, $row->admin_note, $allowed, $hasDiscount, (bool) ShopSettings::withinBusinessHours());

        $isSim = str_starts_with((string) $row->phone, 'sim-');
        $send = function (array $msg) use ($row, $conv, $isSim) {
            if ($isSim) { // nomor uji simulator: cukup dicatat, tidak dikirim ke Meta
                DB::table('wa_messages')->insert(['phone' => $row->phone, 'conversation_id' => $conv->id, 'order_id' => $conv->order_id, 'direction' => 'out',
                    'type' => $msg['type'] ?? 'text', 'body' => $msg['body'] ?? '', 'payload' => json_encode($msg), 'status' => 'sent', 'created_at' => now(), 'updated_at' => now()]);

                return true;
            }

            return WaSender::send($row->phone, $msg, $conv->order_id ?: null, (int) $conv->id);
        };

        $okAll = true;
        foreach ($copy['items'] as $n => $c) {
            $url = self::imageUrl($db[$c['item_id']]->image ?? null);
            $msg = $url ? ['type' => 'image', 'body' => mb_substr($c['caption'], 0, 1000), 'url' => $url] : ['type' => 'text', 'body' => $c['caption']];
            $okAll = $send($msg) && $okAll;
            if ($n < count($copy['items']) - 1 && !$isSim) usleep(random_int(400000, 700000));
        }
        if (!$isSim) usleep(random_int(500000, 800000));
        $okAll = $send(['type' => 'buttons', 'body' => $copy['closing'], 'buttons' => [
            ['id' => 'btn_lanjut-pesan', 'title' => 'Lanjut pesan'], ['id' => 'btn_tanya-lagi', 'title' => 'Tanya lagi'], ['id' => 'btn_bicara-dengan-tim', 'title' => 'Bicara dengan tim'],
        ]]) && $okAll;

        // Livi lanjut ke mode ngobrol biasa; mode tetap 'bot' (admin tidak memegang chat)
        DB::table('wa_conversations')->where('id', $conv->id)->update(['state' => $conv->order_id ? 'menunggu_penawaran' : 'setelah_harga', 'last_intent' => null, 'fail_count' => 0, 'updated_at' => now()]);
        DB::table('wa_price_inquiries')->where('id', $inquiryId)->update(['relayed_at' => $okAll ? now() : null, 'updated_at' => now()]);
        if (!$okAll) Log::warning('LiviPrice relay sebagian gagal', ['inquiry' => $inquiryId]);

        return $okAll;
    }

    /**
     * @return array{items: array<int, array{item_id: int, caption: string}>, closing: string}
     */
    protected static function compose(array $facts, ?string $adminNote, array $allowed, bool $hasDiscount, bool $inHours): array
    {
        $ai = LiviLlm::composePriceReply($facts, $adminNote, $inHours);
        if ($ai) {
            $ok = true;
            $caps = [];
            foreach ($facts as $f) {
                $text = trim((string) ($ai['items'][$f['item_id']] ?? ''));
                $check = $text === '' ? ['ok' => false] : Guardrail::check($text, $allowed, true);
                // Angka "terselubung" (5,5 juta / 800rb) tidak terjangkau cek Rp → tolak, pakai versi aman
                if ($check['ok'] && preg_match('/\d+([.,]\d+)?\s?(juta|jt|ribu|rb)\b/i', $text)) $check['ok'] = false;
                // Harga resmi item harus benar-benar tampil di caption; kalau tidak, pakai versi aman
                $must = $f['harga_setelah_diskon'] ?? $f['harga_normal'];
                if (!$check['ok'] || !str_contains($text, $must)) { $ok = false; break; }
                $caps[] = ['item_id' => $f['item_id'], 'caption' => $text];
            }
            $closing = trim((string) ($ai['closing'] ?? ''));
            if ($ok && $closing !== '' && Guardrail::check($closing, $allowed, true)['ok']) return ['items' => $caps, 'closing' => $closing];
        }

        return self::fallback($facts, $adminNote, $inHours);
    }

    /** Versi tanpa AI: tetap ramah dan bervariasi, semua angka dari input admin. */
    protected static function fallback(array $facts, ?string $adminNote, bool $inHours): array
    {
        $caps = [];
        foreach ($facts as $f) {
            $name = $f['nama'];
            if ($f['diskon']) {
                $line = Arr::random([
                    "Untuk {$name}, harga normalnya {$f['harga_normal']} ya Kak. Kabar baiknya, tim kami kasih diskon {$f['diskon']}, jadi harganya {$f['harga_setelah_diskon']} 🎉",
                    "Ini {$name} ya Kak 😊 Harga normalnya {$f['harga_normal']}, dan sekarang ada diskon {$f['diskon']} sehingga jadi {$f['harga_setelah_diskon']} ✨",
                ]);
                if ($f['catatan_dari_tim']) $line .= "\n\nInfo dari tim: ".$f['catatan_dari_tim'];
            } else {
                $line = Arr::random([
                    "Untuk {$name}, harganya {$f['harga_normal']} ya Kak 😊",
                    "Ini {$name} ya Kak, harganya {$f['harga_normal']} ✨",
                ]);
                if ($f['catatan_dari_tim']) $line .= "\n\nInfo dari tim: ".$f['catatan_dari_tim'];
            }
            $caps[] = ['item_id' => $f['item_id'], 'caption' => $line];
        }
        $closing = "Itu info harga dari tim kami ya Kak. Harga ini untuk gambaran dulu, bukan pesanan. Harga final (termasuk ongkir & PPN) tim kirim lewat penawaran resmi kalau Kakak lanjut pesan 🙏".($adminNote ? "\n\n".$adminNote : '')."\n\nGimana Kak, mau lanjut atau ada yang mau ditanyakan lagi?";

        return ['items' => $caps, 'closing' => $closing];
    }

    protected static function snapshot(array $items): array
    {
        $out = [];
        foreach ($items as $i) {
            $id = (int) ($i['item_id'] ?? 0);
            if ($id <= 0 || isset($out[$id])) continue;
            $it = Item::find($id);
            $out[$id] = ['item_id' => $id, 'title' => $i['title'] ?? $it?->title, 'code' => $i['code'] ?? $it?->code, 'quantity' => max(1, (int) ($i['quantity'] ?? 1))];
            if (count($out) >= self::MAX_ITEMS) break;
        }

        return array_values($out);
    }

    protected static function imageUrl(?string $image): ?string
    {
        $image = trim((string) $image);
        if ($image === '') return null;
        if (preg_match('#^https?://#i', $image)) return $image;

        return url('/'.ltrim($image, '/'));
    }
}
