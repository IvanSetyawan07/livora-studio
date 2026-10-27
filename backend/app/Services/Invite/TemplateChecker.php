<?php

namespace App\Services\Invite;

use Illuminate\Support\Facades\Http;

class TemplateChecker
{
    public function check(string $name, string $lang, bool $hasButtons): array
    {
        $cfg    = config('services.whatsapp.meta', []);
        $wabaId = $cfg['business_account_id'] ?? null;
        $token  = $cfg['access_token'] ?? null;
        $ver    = $cfg['api_version'] ?? 'v21.0';

        if (!$wabaId || !$token) {
            return $this->fail('config_missing', 'META_WHATSAPP_BUSINESS_ACCOUNT_ID belum diisi di .env (atau access token kosong). Isi lalu jalankan php artisan config:cache.');
        }
        if (trim($name) === '') {
            return $this->fail('no_name', 'Nama template belum diisi di pengaturan acara.');
        }

        try {
            $res = Http::withToken($token)->timeout(20)->get(
                "https://graph.facebook.com/{$ver}/{$wabaId}/message_templates",
                [
                    'name'   => $name,
                    'fields' => 'name,language,status,category,components,rejected_reason',
                    'limit'  => 50,
                ]
            );
        } catch (\Throwable $e) {
            return $this->fail('network', 'Tidak bisa terhubung ke Meta: ' . $e->getMessage());
        }

        if ($res->failed()) {
            $code = (int) $res->json('error.code');
            $msg = match (true) {
                $code === 190 => 'Access token tidak valid atau sudah kedaluwarsa. Buat token baru lalu perbarui .env.',
                in_array($code, [10, 100, 200], true) => 'Meta menolak akses ke WABA ini. Pastikan WABA ID benar dan token punya izin whatsapp_business_management untuk WABA tersebut.',
                default => 'Meta menolak permintaan (kode ' . $code . ').',
            };
            return $this->fail('meta_error', $msg, ['meta_error' => $res->json('error.message')]);
        }

        $all  = collect($res->json('data', []));
        $same = $all->filter(fn ($t) => ($t['name'] ?? '') === $name)->values();

        if ($same->isEmpty()) {
            return $this->fail(
                'not_found',
                "Template \"{$name}\" tidak ditemukan di WABA ini. Periksa ejaan nama (huruf kecil, pakai underscore) dan pastikan template dibuat di WABA yang memiliki nomor Livi.",
                ['found' => false]
            );
        }

        $languages = $same->map(fn ($t) => [
            'language' => $t['language'] ?? '?',
            'status'   => $t['status'] ?? '?',
        ])->all();

        $match = $same->firstWhere('language', $lang);
        if (!$match) {
            $tersedia = collect($languages)->map(fn ($l) => "{$l['language']} ({$l['status']})")->implode(', ');
            return $this->fail(
                'lang_mismatch',
                "Template ada, tapi tidak punya versi bahasa \"{$lang}\". Bahasa yang tersedia: {$tersedia}. Ubah Bahasa template di pengaturan acara agar sama, atau tambahkan terjemahan di Meta.",
                ['found' => true, 'category' => $same->first()['category'] ?? null, 'languages' => $languages]
            );
        }

        $status = strtoupper($match['status'] ?? '');
        $checks = $this->checkComponents($match['components'] ?? [], $hasButtons);
        $gagalKomponen = collect($checks)->where('ok', false)->pluck('detail')->all();

        if ($status !== 'APPROVED') {
            $alasan = $match['rejected_reason'] ?? null;
            $message = match ($status) {
                'PENDING', 'IN_APPEAL' => 'Template masih menunggu review Meta. Pengiriman baru bisa setelah statusnya APPROVED.',
                'REJECTED'             => 'Template DITOLAK Meta' . ($alasan && $alasan !== 'NONE' ? " (alasan: {$alasan})" : '') . '. Perbaiki lalu ajukan ulang di WhatsApp Manager.',
                'PAUSED'               => 'Template sedang DIJEDA Meta karena kualitas rendah. Tunggu atau buat template baru.',
                'DISABLED'             => 'Template DINONAKTIFKAN Meta. Buat template baru.',
                default                => "Status template \"{$status}\" belum bisa dipakai untuk mengirim.",
            };
            $ok = false;
        } elseif ($gagalKomponen) {
            $message = 'Template APPROVED, tapi komponennya tidak cocok dengan yang dikirim aplikasi: ' . implode(' ', $gagalKomponen);
            $ok = false;
        } else {
            $message = 'Template siap dipakai: APPROVED dan komponennya cocok.';
            $ok = true;
        }

        return [
            'ok'           => $ok,
            'found'        => true,
            'status'       => $status,
            'category'     => $match['category'] ?? null,
            'languages'    => $languages,
            'lang_matched' => true,
            'checks'       => $checks,
            'message'      => $message,
        ];
    }

    private function checkComponents(array $components, bool $hasButtons): array
    {
        $by = collect($components)->keyBy(fn ($c) => strtoupper($c['type'] ?? ''));

        $header   = $by->get('HEADER');
        $format   = strtoupper($header['format'] ?? '');
        $headerOk = $format === 'IMAGE';

        $text = $by->get('BODY')['text'] ?? '';
        preg_match_all('/\{\{\s*([^}\s]+)\s*\}\}/', $text, $m);
        $vars   = count(array_unique($m[1] ?? []));
        $bodyOk = $vars === 1;

        $btns = collect($by->get('BUTTONS')['buttons'] ?? []);
        $qr   = $btns->filter(fn ($b) => strtoupper($b['type'] ?? '') === 'QUICK_REPLY')->count();
        if ($hasButtons) {
            $btnOk     = $qr === 2 && $btns->count() === 2;
            $btnDetail = $btnOk ? 'Tombol: 2 QUICK_REPLY, sesuai.'
                : "Aplikasi mengirim 2 tombol QUICK_REPLY, tetapi template punya {$btns->count()} tombol ({$qr} QUICK_REPLY).";
        } else {
            $btnOk     = $btns->isEmpty();
            $btnDetail = $btnOk ? 'Tanpa tombol, sesuai.'
                : 'Template punya tombol, padahal pengaturan acara "template punya tombol" dimatikan.';
        }

        return [
            [
                'key' => 'header', 'ok' => $headerOk,
                'detail' => $headerOk ? 'Header: IMAGE, sesuai.'
                    : 'Header template harus berformat IMAGE, tetapi di Meta ' . ($header ? "berformat {$format}." : 'tidak ada header.'),
            ],
            [
                'key' => 'body', 'ok' => $bodyOk,
                'detail' => $bodyOk ? 'Body: 1 variabel, sesuai.'
                    : "Body template harus punya tepat 1 variabel (nama tamu), tetapi di Meta ada {$vars}.",
            ],
            ['key' => 'buttons', 'ok' => $btnOk, 'detail' => $btnDetail],
        ];
    }

    private function fail(string $code, string $message, array $extra = []): array
    {
        return array_merge([
            'ok' => false, 'found' => false, 'status' => null, 'category' => null,
            'languages' => [], 'lang_matched' => false, 'checks' => [],
            'code' => $code, 'message' => $message,
        ], $extra);
    }
}