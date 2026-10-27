<?php

namespace App\Services\Invite;

class MetaErrorTranslator
{
    public static function translate(?int $code, ?string $original = null, array $ctx = []): string
    {
        $name = $ctx['template'] ?? 'template';
        $lang = $ctx['lang'] ?? '-';

        $map = [
            132001 => "Template \"{$name}\" (bahasa {$lang}) tidak ditemukan di akun WhatsApp Livi. Kemungkinan belum Approved, bahasanya tidak cocok, atau dibuat di WABA lain. Buka Pengaturan acara → Cek template.",
            132000 => 'Jumlah parameter template tidak sesuai. Pastikan body template hanya punya 1 variabel (nama tamu). Cek di Pengaturan acara → Cek template.',
            132012 => 'Format parameter template salah: tipe atau isi yang dikirim tidak sesuai dengan definisi template di Meta (mis. header bukan IMAGE atau link gambar tidak bisa diakses).',
            132015 => 'Template sedang dijeda Meta karena kualitas rendah. Tunggu atau buat template baru.',
            132016 => 'Template sudah dinonaktifkan Meta. Buat template baru.',
            131047 => 'Tamu belum membalas dalam 24 jam terakhir, jadi pesan biasa tidak bisa dikirim. Gunakan template yang sudah Approved.',
            131026 => 'Nomor tamu tidak terdaftar di WhatsApp atau tidak bisa menerima pesan. Periksa nomornya.',
            131049 => 'Meta menahan pesan promosi ini untuk menjaga kualitas penerima (penerima sudah banyak menerima pesan promosi). Coba lagi nanti atau kirim manual.',
            131053 => 'Meta tidak bisa mengunduh gambar undangan. Pastikan gambar JPG/PNG maksimal 5 MB dan tautannya bisa dibuka publik lewat HTTPS.',
            131056 => 'Terlalu banyak pesan ke nomor yang sama dalam waktu singkat. Tunggu beberapa menit lalu coba lagi.',
            130429 => 'Batas kecepatan kirim Meta tercapai. Tunggu sebentar lalu kirim ulang dengan jumlah lebih sedikit.',
            190    => 'Access token Meta tidak valid atau sudah kedaluwarsa. Buat token baru dan perbarui .env di server.',
        ];

        return $code && isset($map[$code]) ? $map[$code] : ($original ?: 'Pengiriman gagal (error tidak dikenal).');
    }
}