<?php

namespace App\Services;

/**
 * Klasifikasi intent pesan user secara ringan (rule-based, tanpa panggilan
 * LLM tambahan) supaya retrieval di LivoraAssistant bisa lebih terarah dan
 * hemat token — hanya query tabel yang relevan dengan topik pesan.
 *
 * Kalau tidak yakin, selalu fallback ke 'general' (perilaku lama: query semua
 * tabel), supaya tidak ada risiko kehilangan hasil relevan.
 */
class IntentClassifier
{
    public const COMPANY_INFO = 'company_info';
    public const PRODUCT_SEARCH = 'product_search';
    public const PORTFOLIO = 'portfolio';
    public const STYLE_MOOD = 'style_mood';
    public const GENERAL = 'general';

    /** Kata kunci profil perusahaan / layanan / alur kerja / booking. */
    private const COMPANY_INFO_PATTERNS = [
        'booking', 'konsultasi', 'jadwal', 'appointment', 'proses project',
        'alur', 'bagaimana cara', 'cara kerja', 'layanan apa', 'jasa apa',
        'lokasi kantor', 'alamat', 'kontak', 'hubungi', 'jam operasional',
        'berapa lama', 'lead time', 'harga berapa', 'biaya', 'estimasi harga',
        'diskon', 'promo', 'pembayaran', 'dp ', 'garansi',
    ];

    /** Kata kunci portofolio / project. */
    private const PORTFOLIO_PATTERNS = [
        'project', 'portofolio', 'portfolio', 'hasil kerja', 'sudah pernah',
        'contoh pekerjaan', 'referensi kerja',
    ];

    /** Kata kunci gaya/suasana ruangan (bukan barang spesifik). */
    private const STYLE_MOOD_PATTERNS = [
        'gaya', 'suasana', 'tema', 'cozy', 'nyaman', 'tenang', 'hangat',
        'scandinavian', 'japandi', 'minimalis', 'industrial', 'modern',
        'klasik', 'natural', 'estetik', 'vibe', 'mood', 'nuansa',
    ];

    /** Kata kunci barang furniture spesifik. */
    private const PRODUCT_PATTERNS = [
        'sofa', 'meja', 'kursi', 'lemari', 'rak', 'tempat tidur', 'kasur',
        'lampu', 'karpet', 'cermin', 'bantal', 'gorden', 'partisi',
        'coffee table', 'dining', 'wardrobe', 'cabinet',
    ];

    /**
     * Klasifikasi satu pesan menjadi salah satu konstanta intent di atas.
     * Urutan pengecekan sengaja company_info dulu (paling spesifik/beresiko
     * kalau salah kategori — misal soal harga/booking harus selalu kena ini
     * duluan sebelum sempat dianggap product_search).
     */
    public function classify(string $message): string
    {
        $text = mb_strtolower(trim($message));

        if ($text === '') {
            return self::GENERAL;
        }

        if ($this->matchesAny($text, self::COMPANY_INFO_PATTERNS)) {
            return self::COMPANY_INFO;
        }

        if ($this->matchesAny($text, self::PORTFOLIO_PATTERNS)) {
            return self::PORTFOLIO;
        }

        // Kalau pesan menyebut barang spesifik DAN gaya, tetap anggap
        // product_search — user tetap ingin lihat barang, gaya cuma filter.
        $hasProduct = $this->matchesAny($text, self::PRODUCT_PATTERNS);
        $hasStyle = $this->matchesAny($text, self::STYLE_MOOD_PATTERNS);

        if ($hasProduct) {
            return self::PRODUCT_SEARCH;
        }

        if ($hasStyle) {
            return self::STYLE_MOOD;
        }

        return self::GENERAL;
    }

    private function matchesAny(string $text, array $patterns): bool
    {
        foreach ($patterns as $p) {
            if (str_contains($text, $p)) {
                return true;
            }
        }
        return false;
    }
}