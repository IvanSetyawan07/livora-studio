<?php

namespace App\Services\AI\Actions;

use App\Mail\ConsultationUpdateMail;
use App\Models\AiRecommendation;
use App\Models\Consultation;
use App\Services\AI\AIProviderManager;
use App\Services\ConsultationNotifier;
use App\Services\Shop\Ops;
use App\Services\WhatsApp\NullWhatsAppProvider;
use App\Services\WhatsApp\WhatsAppNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Throwable;

/**
 * Eksekutor NYATA untuk "follow_up":
 *  - Mengirim follow-up via WhatsApp (LiviBot / WhatsAppNotifier) bila nomor & provider aktif.
 *  - Mengirim Email follow-up via ConsultationUpdateMail ke lead konsultasi yang macet.
 *  - Bila target khusus WA & provider WA belum aktif di .env, membuat draft pesan + link wa.me jujur.
 */
class FollowUpActionExecutor implements ActionExecutor
{
    private const MAX_RECIPIENTS = 20;

    public function __construct(private AIProviderManager $ai)
    {
    }

    public function handles(): string
    {
        return 'follow_up';
    }

    public function execute(AiRecommendation $recommendation): ExecutionResult
    {
        if ($recommendation->target_type === 'wa_inquiry' && $recommendation->target_id) {
            return $this->executeWaInquiry($recommendation);
        }

        $leads = $this->consultationTargets($recommendation);

        if ($leads->isEmpty()) {
            // Fallback ke antrean cek harga WA yang tertunda bila konsultasi sudah aman semua
            if (Schema::hasTable('wa_price_inquiries')) {
                $waFallback = DB::table('wa_price_inquiries')->whereIn('status', ['pending', 'answered'])->latest()->first();
                if ($waFallback) {
                    return $this->executeWaInquiry($recommendation, (int) $waFallback->id);
                }
            }

            throw new ActionNotExecutableException(
                'Tidak ada lead konsultasi yang macet >= 2 hari atau antrean WA tertunda saat ini. Tidak ada pesan terkirim.'
            );
        }

        $message = $this->composeEmail($recommendation);
        // Pertahankan placeholder {nama} supaya setiap lead mendapat sapaan namanya masing-masing.
        $waText = $this->composeWhatsApp($recommendation, '{nama}');

        $emailsSent = [];
        $waSent = [];
        $failed = [];

        $waConfigured = ! (WhatsAppNotifier::provider() instanceof NullWhatsAppProvider);
        $mailDriver = (string) config('mail.default', '');
        $mailHost = (string) config('mail.mailers.smtp.host', '');
        $mailReady = $mailDriver !== '' && ! ($mailDriver === 'smtp' && $mailHost === 'mailpit');

        foreach ($leads as $c) {
            $sentAnyForLead = false;

            if ($waConfigured && filled($c->phone)) {
                $personalized = str_replace('{nama}', trim((string) $c->first_name) ?: 'Kak', $waText);
                if (Ops::sendWa($c->phone, $personalized)) {
                    $waSent[] = ['id' => $c->id, 'phone' => $c->phone];
                    $sentAnyForLead = true;
                }
            }

            if (filled($c->email) && $mailReady) {
                try {
                    Mail::to($c->email)->send(new ConsultationUpdateMail(
                        $c,
                        $message['subject'],
                        'Halo '.trim($c->first_name.' '.$c->last_name).',',
                        $message['paragraphs'],
                        [],
                        ConsultationNotifier::link($c),
                    ));
                    $emailsSent[] = ['id' => $c->id, 'email' => $c->email];
                    $sentAnyForLead = true;
                } catch (Throwable $e) {
                    $failed[] = ['id' => $c->id, 'email' => $c->email, 'error' => $e->getMessage()];
                }
            }

            if ($sentAnyForLead) {
                $c->touch();
            }
        }

        if ($emailsSent === [] && $waSent === []) {
            $waLinks = $leads->filter(fn ($c) => filled($c->phone))->take(5)->map(function ($c) use ($waText) {
                $phone = WhatsAppNotifier::normalizePhone((string) $c->phone);
                $body = str_replace('{nama}', trim((string) $c->first_name) ?: 'Kak', $waText);

                return "- {$c->first_name} ({$phone}): https://wa.me/{$phone}?text=".rawurlencode($body);
            })->implode("\n");

            return ExecutionResult::draft(
                "Template follow-up disiapkan (MAIL SMTP produksi & WHATSAPP_PROVIDER belum aktif di server untuk pengiriman otomatis).\n"
                ."Subjek Email: {$message['subject']}\n\nDraft WhatsApp:\n{$waText}\n"
                .($waLinks !== '' ? "\nLink WhatsApp langsung:\n{$waLinks}" : '')
            );
        }

        $parts = [];
        if ($waSent !== []) {
            $parts[] = count($waSent).' WhatsApp terkirim';
        }
        if ($emailsSent !== []) {
            $parts[] = count($emailsSent).' email terkirim';
        }
        if ($failed !== []) {
            $parts[] = count($failed).' gagal';
        }

        $summary = implode(', ', $parts)." untuk follow-up lead konsultasi.\nSubjek: {$message['subject']}";

        return ExecutionResult::changed(
            $summary,
            ['emails_sent' => 0, 'wa_sent' => 0],
            ['emails_sent' => count($emailsSent), 'wa_sent' => count($waSent), 'failed' => $failed]
        );
    }

    private function executeWaInquiry(AiRecommendation $recommendation, ?int $overrideId = null): ExecutionResult
    {
        if (! Schema::hasTable('wa_price_inquiries')) {
            throw new ActionNotExecutableException('Tabel wa_price_inquiries belum tersedia.');
        }

        $inquiryId = $overrideId ?? (int) $recommendation->target_id;
        $row = DB::table('wa_price_inquiries')->where('id', $inquiryId)->first();

        if (! $row || ! filled($row->phone)) {
            throw new ActionNotExecutableException("WA Inquiry #{$inquiryId} tidak ditemukan atau tanpa nomor WhatsApp.");
        }

        $items = json_decode((string) $row->items, true) ?: [];
        $itemName = $items[0]['title'] ?? 'produk Livora pilihan Anda';
        $msg = $this->composeWhatsApp($recommendation, 'Kak', $itemName);
        $normalized = WhatsAppNotifier::normalizePhone((string) $row->phone);

        if (! (WhatsAppNotifier::provider() instanceof NullWhatsAppProvider)) {
            if (Ops::sendWa($normalized, $msg)) {
                return ExecutionResult::changed(
                    "Follow-up WhatsApp terkirim ke {$normalized} terkait {$itemName} (WA Inquiry #{$inquiryId}).",
                    ['wa_sent' => 0],
                    ['wa_sent' => 1, 'phone' => $normalized, 'inquiry_id' => $inquiryId]
                );
            }

            throw new RuntimeException("Gagal mengirim WhatsApp ke {$normalized}. Periksa status koneksi WHATSAPP_PROVIDER.");
        }

        $waLink = 'https://wa.me/'.$normalized.'?text='.rawurlencode($msg);

        return ExecutionResult::draft(
            "Draft follow-up WhatsApp untuk Inquiry #{$inquiryId} ({$itemName}) siap dikirim manual (WHATSAPP_PROVIDER belum aktif di server):\n\n"
            ."Pesan:\n{$msg}\n\nLink buka chat langsung:\n{$waLink}"
        );
    }

    private function consultationTargets(AiRecommendation $rec)
    {
        if ($rec->target_type === 'consultation' && $rec->target_id) {
            return Consultation::whereKey($rec->target_id)->get();
        }

        return Consultation::query()
            ->whereIn('status', [Consultation::STATUS_NEW_INQUIRY, Consultation::STATUS_UNDER_REVIEW, Consultation::STATUS_CONTACTED])
            ->where(function ($q) {
                $q->whereNotNull('email')->orWhereNotNull('phone');
            })
            ->where('updated_at', '<=', now()->subDays(2))
            ->orderBy('updated_at')
            ->limit(self::MAX_RECIPIENTS)
            ->get();
    }

    private function composeWhatsApp(AiRecommendation $rec, string $namePlaceholder, ?string $itemHint = null): string
    {
        $itemLine = $itemHint ? "Produk terkait: {$itemHint}\n" : '';
        $prompt = <<<TXT
Tulis pesan WhatsApp singkat & hangat dari tim Livora Studio (showroom desain interior & custom furniture Jakarta).
Dasar rekomendasi: {$rec->title} — {$rec->suggested_action}
{$itemLine}
Aturan:
- Bahasa Indonesia santai tapi sopan (gunakan kata sapaan "Halo {nama}," di awal).
- Maksimal 2 paragraf singkat (2-4 kalimat total), maksimal 1-2 emoji wajar.
- Jangan mengarang harga, diskon, atau stok tertentu.
- Ajak berdiskusi atau menjadwalkan kunjungan showroom / konsultasi.
Balas HANYA teks pesan WhatsApp-nya.
TXT;

        $res = $this->ai->ask('Kamu adalah client relations specialist Livora Studio Jakarta.', $prompt, 'leads');
        $text = trim((string) ($res['text'] ?? ''));

        if ($text === '') {
            return "Halo {$namePlaceholder}, terima kasih telah menghubungi Livora Studio. Apakah ada detail interior atau furniture yang masih ingin didiskusikan dengan tim kami? Kami siap membantu jadwalkan konsultasi atau kunjungan showroom di Jakarta 😊";
        }

        return str_contains($text, '{nama}') ? str_replace('{nama}', $namePlaceholder, $text) : $text;
    }

    /** @return array{subject: string, paragraphs: list<string>} */
    private function composeEmail(AiRecommendation $rec): array
    {
        $prompt = <<<TXT
Tulis email follow-up singkat untuk calon klien yang sudah mengajukan konsultasi interior ke Livora Studio tapi belum lanjut.
Dasar rekomendasi: {$rec->title} — {$rec->suggested_action}

Aturan: Bahasa Indonesia sopan, maksimal 3 paragraf pendek, tanpa sapaan nama (sudah ditambahkan otomatis),
tanpa janji diskon/harga/garansi, ajak membalas atau membuka My Consultation.
Balas HANYA dengan format:
Subject: ...
Body:
paragraf 1

paragraf 2
TXT;

        $res = $this->ai->ask('Kamu adalah tim client relations Livora Studio, brand interior premium.', $prompt, 'leads');
        $text = trim((string) ($res['text'] ?? ''));

        if (! preg_match('/Subject\s*:\s*(.+)/i', $text, $s) || ! preg_match('/Body\s*:\s*(.+)/is', $text, $b)) {
            return [
                'subject' => 'Tindak Lanjut Konsultasi Desain Interior — LIVORA Studio',
                'paragraphs' => [
                    'Terima kasih telah mempercayakan rencana ruang Anda kepada LIVORA Studio.',
                    'Tim desainer kami siap melanjutkan pembahasan kebutuhan tata ruang, material, dan furniture custom sesuai preferensi Anda melalui halaman My Consultation atau janji temu showroom.',
                ],
            ];
        }

        $paragraphs = array_values(array_filter(array_map('trim', preg_split('/\n\s*\n/', trim($b[1])))));

        return ['subject' => mb_substr(trim($s[1]), 0, 120), 'paragraphs' => array_slice($paragraphs, 0, 3)];
    }
}
