<?php

namespace App\Services\AI\Actions;

use App\Mail\ConsultationUpdateMail;
use App\Models\AiRecommendation;
use App\Models\Consultation;
use App\Services\AI\AIProviderManager;
use App\Services\ConsultationNotifier;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Throwable;

/**
 * Eksekutor NYATA untuk "follow_up": mengirim email follow-up sungguhan ke
 * lead konsultasi yang macet.
 *
 * Target:
 *  - target_type=consultation + target_id => hanya konsultasi itu.
 *  - selain itu => lead berstatus new_inquiry/under_review/contacted yang
 *    tidak disentuh >= 3 hari, maks 20 orang.
 * Satu pesan AI (bahasa Indonesia) dipakai untuk semua penerima; nama
 * pelanggan disisipkan otomatis. Tidak ada janji diskon/harga.
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
        $leads = $this->targets($recommendation);

        if ($leads->isEmpty()) {
            throw new ActionNotExecutableException('Tidak ada lead yang perlu di-follow-up saat ini (semua sudah ditangani atau tidak punya email). Tidak ada email terkirim.');
        }

        $message = $this->compose($recommendation);
        $sent = [];
        $failed = [];

        foreach ($leads as $c) {
            try {
                Mail::to($c->email)->send(new ConsultationUpdateMail(
                    $c,
                    $message['subject'],
                    'Halo '.trim($c->first_name.' '.$c->last_name).',',
                    $message['paragraphs'],
                    [],
                    ConsultationNotifier::link($c),
                ));
                $c->touch();
                $sent[] = ['id' => $c->id, 'email' => $c->email];
            } catch (Throwable $e) {
                $failed[] = ['id' => $c->id, 'email' => $c->email, 'error' => $e->getMessage()];
            }
        }

        if ($sent === []) {
            throw new RuntimeException('Semua email follow-up gagal dikirim: '.($failed[0]['error'] ?? 'unknown').'. Periksa pengaturan MAIL_* di server.');
        }

        $summary = count($sent).' email follow-up terkirim ke lead konsultasi'
            .($failed ? ', '.count($failed).' gagal' : '').".\nSubjek: {$message['subject']}\n"
            .'Penerima: '.collect($sent)->pluck('email')->implode(', ');

        return ExecutionResult::changed($summary, ['emails_sent' => 0], ['emails_sent' => count($sent), 'recipients' => $sent, 'failed' => $failed]);
    }

    private function targets(AiRecommendation $rec)
    {
        if ($rec->target_type === 'consultation' && $rec->target_id) {
            return Consultation::whereKey($rec->target_id)->whereNotNull('email')->get();
        }

        return Consultation::query()
            ->whereIn('status', [Consultation::STATUS_NEW_INQUIRY, Consultation::STATUS_UNDER_REVIEW, Consultation::STATUS_CONTACTED])
            ->whereNotNull('email')
            ->where('updated_at', '<=', now()->subDays(3))
            ->orderBy('updated_at')
            ->limit(self::MAX_RECIPIENTS)
            ->get();
    }

    /** @return array{subject: string, paragraphs: list<string>} */
    private function compose(AiRecommendation $rec): array
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
            throw new RuntimeException('Respons AI tidak sesuai format email. Tidak ada email terkirim.');
        }

        $paragraphs = array_values(array_filter(array_map('trim', preg_split('/\n\s*\n/', trim($b[1])))));

        return ['subject' => mb_substr(trim($s[1]), 0, 120), 'paragraphs' => array_slice($paragraphs, 0, 3)];
    }
}
