<?php

namespace App\Services;

use App\Mail\ConsultationUpdateMail;
use App\Models\Consultation;
use App\Models\User;
use App\Services\WhatsApp\WhatsAppNotifier;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Every customer-facing consultation milestone email in one place.
 *
 * All methods are best-effort: a delivery failure is logged and never
 * rolls back the business action that triggered it.
 */
class ConsultationNotifier
{
    /** Deep link into the customer's My Consultation page (login required). */
    public static function link(Consultation $c): string
    {
        $base = rtrim((string) (config('app.frontend_url') ?: config('app.url')), '/');
        return $base . '/profile/consultations?c=' . $c->id;
    }

    private static function money($amount): string
    {
        return 'Rp ' . number_format((float) $amount, 0, ',', '.');
    }

    private static function send(
        Consultation $c,
        string $subject,
        string $heading,
        array $paragraphs = [],
        array $rows = [],
        ?string $footnote = null,
    ): void {
        if (empty($c->email)) {
            return;
        }
        try {
            Mail::to($c->email)->send(new ConsultationUpdateMail(
                $c, $subject, $heading, $paragraphs, $rows, self::link($c), 'Buka My Consultation', $footnote,
            ));
        } catch (\Throwable $e) {
            Log::warning('ConsultationNotifier email failed [' . $subject . ']: ' . $e->getMessage());
        }
    }

    /** Email every registered admin — used for items that need admin attention. */
    public static function notifyAdmins(Consultation $c, string $subject, string $heading, array $paragraphs = [], array $rows = []): void
    {
        try {
            $admins = User::where('role', 'admin')->pluck('email')->filter()->all();
            foreach ($admins as $email) {
                Mail::to($email)->send(new ConsultationUpdateMail(
                    $c, $subject, $heading, $paragraphs, $rows, self::link($c), 'Buka di Dashboard Admin',
                ));
            }
        } catch (\Throwable $e) {
            Log::warning('ConsultationNotifier admin email failed: ' . $e->getMessage());
        }
    }

    public static function whatsapp(Consultation $c, string $message): void
    {
        WhatsAppNotifier::send($c->phone, $message);
    }

    // ── Milestones ───────────────────────────────────────────────────

    public static function approved(Consultation $c): void
    {
        self::send(
            $c,
            'Permintaan konsultasi Anda disetujui — Livora',
            'Permintaan konsultasi disetujui',
            [
                'Kabar baik! Permintaan konsultasi Anda telah kami setujui dan tim desain Livora akan segera menghubungi Anda.',
                'Seluruh perkembangan proyek — jadwal pertemuan, dokumen, pembayaran, dan progres pengerjaan — dapat Anda pantau di halaman <strong>My Consultation</strong>.',
            ],
            ['Layanan' => $c->service_type ?: '—', 'Jenis proyek' => $c->project_type ?: '—'],
        );
    }

    public static function meetingScheduled(Consultation $c): void
    {
        $rows = [];
        if ($c->meeting_date)     $rows['Tanggal'] = \Carbon\Carbon::parse($c->meeting_date)->translatedFormat('l, d F Y');
        if ($c->meeting_time)     $rows['Waktu'] = $c->meeting_time . ' WIB';
        if ($c->meeting_type)     $rows['Jenis pertemuan'] = match ($c->meeting_type) {
            'online'  => 'Online (video call)',
            'offline' => 'Tatap muka',
            'call'    => 'Telepon / WhatsApp call',
            default   => ucfirst((string) $c->meeting_type),
        };
        if ($c->meeting_location) $rows['Lokasi'] = $c->meeting_location;
        if ($c->meeting_link)     $rows['Tautan rapat'] = '<a href="' . e($c->meeting_link) . '">' . e($c->meeting_link) . '</a>';

        $name = trim($c->first_name . ' ' . (string) $c->last_name);

        self::send(
            $c,
            'Jadwal pertemuan konsultasi Anda — Livora',
            'Jadwal pertemuan dikonfirmasi',
            [
                'Pertemuan konsultasi atas nama <strong>' . e($name) . '</strong> telah dijadwalkan. Berikut detailnya:',
            ],
            $rows,
            $c->meeting_link
                ? 'Tautan rapat di atas dibuat khusus untuk pertemuan Anda. Mohon bergabung 5 menit sebelum waktu yang dijadwalkan.'
                : null,
        );
    }

    public static function agreementReady(Consultation $c): void
    {
        self::send(
            $c,
            'Dokumen perjanjian siap ditandatangani — Livora',
            'Dokumen perjanjian tersedia',
            [
                'Dokumen perjanjian proyek Anda sudah tersedia dan siap ditandatangani secara elektronik di halaman My Consultation.',
                'Setelah Anda menandatangani, dokumen akan ditandatangani balik oleh perwakilan Livora dan dibubuhi meterai elektronik.',
            ],
        );
    }

    public static function agreementFinalised(Consultation $c): void
    {
        self::send(
            $c,
            'Perjanjian telah ditandatangani kedua pihak — Livora',
            'Perjanjian final bermeterai',
            [
                'Perjanjian proyek Anda kini telah ditandatangani oleh Anda dan perwakilan Livora, serta telah dibubuhi meterai elektronik.',
                'Dokumen final dapat Anda lihat dan unduh kapan saja melalui halaman My Consultation.',
            ],
            array_filter([
                'Ditandatangani oleh'  => $c->agreement_signature_name,
                'Perwakilan Livora'    => $c->livora_countersigner_name,
                'Meterai elektronik'   => $c->meterai_status === 'completed' ? 'Sudah dibubuhkan' : null,
            ]),
        );
    }

    public static function dpRequested(Consultation $c): void
    {
        self::send(
            $c,
            'Tagihan uang muka (DP) proyek Anda — Livora',
            'Permintaan pembayaran uang muka',
            [
                'Untuk memulai pengerjaan proyek, mohon lakukan pembayaran uang muka (DP) sesuai rincian berikut.',
                'Setelah transfer, unggah bukti pembayaran Anda pada halaman My Consultation agar dapat kami verifikasi.',
            ],
            ['Jumlah DP' => self::money($c->dp_amount)],
        );
    }

    public static function dpVerified(Consultation $c): void
    {
        self::send(
            $c,
            'Pembayaran uang muka diterima — Livora',
            'Uang muka terverifikasi',
            [
                'Terima kasih. Pembayaran uang muka Anda telah kami terima dan verifikasi. Proyek Anda siap dijalankan.',
            ],
            ['Jumlah DP' => self::money($c->dp_amount), 'Status' => 'Lunas / terverifikasi'],
        );
    }

    public static function progressUpdated(Consultation $c, int $percentage, ?string $note = null): void
    {
        self::send(
            $c,
            'Ada progres baru pada proyek Anda — Livora',
            'Pembaruan progres proyek',
            array_values(array_filter([
                'Hari ini ada progres baru pada proyek Anda yang dapat dilihat di halaman My Consultation, lengkap dengan foto dokumentasi.',
                $note ? 'Catatan tim: <em>' . e($note) . '</em>' : null,
            ])),
            ['Progres saat ini' => $percentage . '%'],
        );

        self::whatsapp($c, "Halo {$c->first_name}, ada progres baru pada proyek Livora Anda ({$percentage}%). Lihat detail & foto di: " . self::link($c));
    }

    public static function finalPaymentRequested(Consultation $c): void
    {
        self::send(
            $c,
            'Tagihan pelunasan proyek Anda — Livora',
            'Permintaan pelunasan',
            [
                'Proyek Anda telah mencapai tahap akhir. Berikut rincian tagihan pelunasan.',
                'Setelah transfer, unggah bukti pembayaran pada halaman My Consultation agar proyek dapat diselesaikan dan diserahterimakan.',
            ],
            ['Jumlah pelunasan' => self::money($c->final_payment_amount)],
        );
    }

    public static function finalPaymentVerified(Consultation $c): void
    {
        self::send(
            $c,
            'Pelunasan diterima — Livora',
            'Pelunasan terverifikasi',
            ['Terima kasih. Pembayaran pelunasan Anda telah kami terima dan verifikasi.'],
            ['Jumlah' => self::money($c->final_payment_amount), 'Status' => 'Lunas / terverifikasi'],
        );
    }

    public static function handoverReady(Consultation $c): void
    {
        self::send(
            $c,
            'Berita acara serah terima proyek — Livora',
            'Berita acara tersedia',
            [
                'Dokumen berita acara serah terima proyek Anda telah kami unggah dan dapat diunduh melalui halaman My Consultation.',
            ],
        );
    }

    public static function completed(Consultation $c): void
    {
        self::send(
            $c,
            'Proyek Anda telah selesai — Livora',
            'Proyek selesai',
            [
                'Dengan bangga kami sampaikan bahwa proyek Anda telah selesai. Terima kasih telah mempercayakan ruang Anda kepada Livora.',
                'Seluruh dokumentasi, dokumen perjanjian, dan berita acara tetap tersimpan di halaman My Consultation Anda.',
            ],
        );

        self::whatsapp($c, "Halo {$c->first_name}, proyek Livora Anda telah selesai. Dokumentasi lengkap: " . self::link($c));
    }

    /** Customer asked a question on a progress update. */
    public static function progressQuestion(Consultation $c, string $body, int $progressId): void
    {
        $name = trim($c->first_name . ' ' . (string) $c->last_name);
        self::notifyAdmins(
            $c,
            'Pertanyaan baru dari pelanggan — Livora',
            'Pertanyaan pada pembaruan progres',
            ['<strong>' . e($name) . '</strong> mengirim pertanyaan pada salah satu pembaruan progres proyek.'],
            ['Pertanyaan' => e($body), 'Konsultasi' => '#' . $c->id],
        );

        self::whatsapp($c, "Halo {$c->first_name}, pertanyaan Anda tentang progres proyek sudah kami terima. Tim Livora akan segera membalas di: " . self::link($c));
    }

    /** Livora replied to the customer's question. */
    public static function progressReply(Consultation $c, string $body): void
    {
        self::send(
            $c,
            'Balasan tim Livora atas pertanyaan Anda',
            'Balasan atas pertanyaan progres',
            ['Tim Livora telah membalas pertanyaan Anda:', '<em>' . e($body) . '</em>'],
        );

        self::whatsapp($c, "Halo {$c->first_name}, tim Livora sudah membalas pertanyaan Anda: " . self::link($c));
    }

    public static function visitDocumented(Consultation $c, string $title): void
    {
        self::send(
            $c,
            'Dokumentasi kunjungan proyek — Livora',
            'Dokumentasi kunjungan',
            ['Kami menambahkan dokumentasi kunjungan proyek Anda. Foto dan catatannya bisa dilihat di halaman My Consultation.'],
            ['Agenda' => e($title)],
        );
    }
}
