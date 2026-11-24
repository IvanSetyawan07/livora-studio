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
        'sofa', 'couch', 'sectional', 'meja', 'table', 'kursi', 'chair', 'armchair', 'stool',
        'lemari', 'cabinet', 'credenza', 'wardrobe', 'rak', 'shelf', 'tempat tidur', 'ranjang',
        'kasur', 'bed', 'lampu', 'lamp', 'lighting', 'karpet', 'rug', 'cermin', 'mirror',
        'bantal', 'cushion', 'gorden', 'partisi', 'coffee table', 'dining', 'side table',
        'console', 'nakas', 'bedside', 'tv cabinet', 'bench',
    ];

    /**
     * Klasifikasi satu pesan menjadi salah satu konstanta intent di atas.
     * Jika user menyebut info perusahaan/harga sekaligus menyebut barang atau gaya spesifik
     * (mis. "harga sofa ruang tamu modern"), kembalikan GENERAL agar retrieval produk/koleksi
     * tetap berjalan sambil tetap menjelaskan kebijakan konsultasi/harga.
     */
    public function classify(string $message): string
    {
        $text = mb_strtolower(trim($message));

        if ($text === '') {
            return self::GENERAL;
        }

        $hasCompany   = $this->matchesAny($text, self::COMPANY_INFO_PATTERNS);
        $hasPortfolio = $this->matchesAny($text, self::PORTFOLIO_PATTERNS);
        $hasProduct   = $this->matchesAny($text, self::PRODUCT_PATTERNS);
        $hasStyle     = $this->matchesAny($text, self::STYLE_MOOD_PATTERNS);

        if ($hasCompany) {
            if ($hasProduct || $hasStyle || $hasPortfolio) {
                return self::GENERAL;
            }
            return self::COMPANY_INFO;
        }

        if ($hasPortfolio && !$hasProduct) {
            return self::PORTFOLIO;
        }

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