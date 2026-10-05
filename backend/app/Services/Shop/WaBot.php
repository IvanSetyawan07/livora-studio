<?php

namespace App\Services\Shop;

use App\Models\ShopOrder;
use App\Services\LivoraAssistant;
use App\Services\WhatsApp\WhatsAppNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Mesin bot WhatsApp (Tahap 2–4).
 * - aturan pasti dulu (STOP, TIM, STATUS, kode pesanan) → tanpa LLM
 * - pertanyaan bebas → LivoraAssistant (LLM) bila diaktifkan; bila gagal paham 2x → handoff
 * - sesi handoff: bot diam sampai admin menutup sesi
 * Mode simulasi ($simulate=true) tidak mengirim apa pun dan tidak mengubah data pesanan.
 */
class WaBot
{
    public const HANDOFF_WORDS = ['tim', 'admin', 'cs', 'manusia', 'operator', 'hubungi tim', 'nego', 'diskon', 'komplain', 'keluhan', 'rusak', 'custom', 'ubah ukuran', 'ganti ukuran', 'ubah dimensi'];

    public function __construct(protected ShopOrderService $orders) {}

    /** @return array{replies: string[], session: string, flow?: bool} */
    public function handle(string $phone, string $text, bool $simulate = false, ?string $type = 'text'): array
    {
        $phone = WhatsAppNotifier::normalizePhone($phone);
        $replies = [];
        $s = $this->session($phone, $simulate);
        $lower = mb_strtolower(trim($text));

        if (in_array($phone, (array) ShopSettings::get('blocklist', []), true)) {
            return ['replies' => [], 'session' => 'diblokir'];
        }
        if (strtoupper(trim($text)) === 'STOP') {
            if (!$simulate) {
                \App\Models\User::where('phone', $phone)->update(['wa_opt_out_at' => now(), 'wa_opt_in' => false]);
                ShopOrder::where('customer_phone', $phone)->update(['wa_consent' => false]);
            }
            return ['replies' => ['Baik, Anda tidak akan menerima pesan promosi lagi dari Livora.'], 'session' => $s['status']];
        }

        // Sesi sedang dipegang tim → bot diam
        if (in_array($s['status'], ['menunggu_cs', 'aktif'], true)) {
            return ['replies' => [], 'session' => $s['status']];
        }
        if (!ShopSettings::get('bot_enabled', true)) {
            return ['replies' => $this->handoff($phone, 'bot_mati', $simulate), 'session' => 'menunggu_cs'];
        }

        preg_match('/LVR-[A-Z0-9]{6}/i', $text, $match);
        $order = $match
            ? ShopOrder::where('code', strtoupper($match[0]))->first()
            : ShopOrder::where('customer_phone', $phone)->whereNotIn('status', ['selesai', 'dibatalkan', 'kedaluwarsa'])->latest()->first();

        // Pemicu handoff
        foreach (self::HANDOFF_WORDS as $w) {
            if ($lower === $w || preg_match('/\b'.preg_quote($w, '/').'\b/u', $lower)) {
                return ['replies' => $this->handoff($phone, $w, $simulate, $order), 'session' => 'menunggu_cs'];
            }
        }

        if ($match && !$order) {
            return ['replies' => ["Kode {$match[0]} tidak kami temukan. Periksa kembali kode di halaman Pesanan Saya, atau ketik TIM."], 'session' => 'bot'];
        }
        if ($order && $order->customer_phone && $order->customer_phone !== $phone) {
            return ['replies' => $this->handoff($phone, 'nomor_berbeda', $simulate, $order), 'session' => 'menunggu_cs'];
        }

        if ($order && in_array($order->status, ['menunggu_wa', 'wa_terhubung'], true) && ($match || $lower !== '')) {
            if ($simulate) {
                return ['replies' => [ShopSettings::template('form_link', ['nama' => $order->customer_name, 'kode' => $order->code, 'link' => '(tautan form)'])], 'session' => 'bot', 'flow' => WhatsAppFlow::configured()];
            }
            $this->orders->markWaConnected($order);
            \App\Models\User::where('id', $order->user_id)->whereNull('phone_verified_at')->update(['phone_verified_at' => now()]);
            $url = $this->orders->sendForm($order, false);
            DB::table('wa_sessions')->where('phone', $phone)->update(['order_id' => $order->id, 'fail_count' => 0]);
            if (WhatsAppFlow::configured() && WhatsAppFlow::sendShippingForm($order)) {
                return ['replies' => [], 'session' => 'bot', 'flow' => true];
            }
            return ['replies' => [ShopSettings::template('form_link', ['nama' => $order->customer_name, 'kode' => $order->code, 'link' => $url])], 'session' => 'bot'];
        }

        if (in_array($lower, ['status', 'cek status', 'cek pesanan'], true) || ($match && $order)) {
            if (!$order) return ['replies' => ['Belum ada pesanan aktif untuk nomor ini. Sebutkan kode pesanan Anda (contoh: LVR-AB12CD).'], 'session' => 'bot'];
            $label = ShopOrderService::LABELS[$order->status] ?? $order->status;
            $extra = $order->tracking_number ? " Resi: {$order->tracking_number} ({$order->courier})." : '';
            return ['replies' => ["Status pesanan {$order->code}: {$label}.{$extra} Detail: ".$this->orders->orderUrl($order)], 'session' => 'bot'];
        }

        if (in_array($lower, ['halo', 'hai', 'hi', 'hello', 'pagi', 'siang', 'sore', 'malam', 'p'], true) || $lower === '') {
            return ['replies' => [ShopSettings::template('greeting')], 'session' => 'bot'];
        }

        // Tahap 4: tanya jawab bebas dengan LLM
        if (ShopSettings::get('ai_answers_enabled', true)) {
            try {
                $ai = app(LivoraAssistant::class)->reply($text, $this->history($phone), ['channel' => 'whatsapp', 'session_id' => 'wa:'.$phone]);
                if (!empty($ai['needs_escalation'])) {
                    return ['replies' => array_merge(array_filter([$ai['reply'] ?? null]), $this->handoff($phone, 'ai_eskalasi', $simulate, $order)), 'session' => 'menunggu_cs'];
                }
                if (!empty($ai['reply'])) {
                    if (!$simulate) DB::table('wa_sessions')->where('phone', $phone)->update(['fail_count' => 0]);
                    return ['replies' => [$ai['reply']."\n\n(Asisten AI Livora · ketik TIM untuk tim kami)"], 'session' => 'bot'];
                }
            } catch (\Throwable $e) {
                Log::warning('WaBot AI gagal', ['error' => $e->getMessage()]);
            }
        }

        // gagal paham → setelah 2x serahkan ke tim
        $fails = $s['fail_count'] + 1;
        if (!$simulate) DB::table('wa_sessions')->where('phone', $phone)->update(['fail_count' => $fails]);
        if ($fails >= 2) {
            return ['replies' => $this->handoff($phone, 'gagal_paham', $simulate, $order), 'session' => 'menunggu_cs'];
        }

        return ['replies' => [ShopSettings::template('unknown')], 'session' => 'bot'];
    }

    protected function handoff(string $phone, string $trigger, bool $simulate, ?ShopOrder $order = null): array
    {
        $msg = ShopSettings::withinBusinessHours() ? ShopSettings::template('handoff') : ShopSettings::template('off_hours');
        if (!$simulate) {
            DB::table('wa_sessions')->where('phone', $phone)->update([
                'status' => 'menunggu_cs', 'trigger' => $trigger, 'handoff_at' => now(), 'fail_count' => 0,
                'order_id' => $order?->id ?? DB::raw('order_id'), 'updated_at' => now(),
            ]);
            $this->orders->notifyAdmins('Chat WhatsApp menunggu tim', "Nomor {$phone} minta dibantu tim (pemicu: {$trigger}).");
        }

        return [$msg];
    }

    protected function session(string $phone, bool $simulate): array
    {
        $row = DB::table('wa_sessions')->where('phone', $phone)->first();
        if (!$row) {
            if ($simulate) return ['status' => 'bot', 'fail_count' => 0];
            DB::table('wa_sessions')->insert(['phone' => $phone, 'status' => 'bot', 'last_inbound_at' => now(), 'created_at' => now(), 'updated_at' => now(),
                'user_id' => \App\Models\User::where('phone', $phone)->value('id')]);
            return ['status' => 'bot', 'fail_count' => 0];
        }
        if (!$simulate) {
            $status = $row->status === 'selesai' ? 'bot' : $row->status;
            DB::table('wa_sessions')->where('id', $row->id)->update(['last_inbound_at' => now(), 'status' => $status, 'updated_at' => now()]);
            return ['status' => $status, 'fail_count' => (int) $row->fail_count];
        }

        return ['status' => $row->status === 'selesai' ? 'bot' : $row->status, 'fail_count' => (int) $row->fail_count];
    }

    protected function history(string $phone): array
    {
        return DB::table('wa_messages')->where('phone', $phone)->where('is_note', false)->latest('id')->limit(8)->get()->reverse()
            ->map(fn ($m) => ['role' => $m->direction === 'in' ? 'user' : 'assistant', 'content' => (string) $m->body])->values()->all();
    }
}

