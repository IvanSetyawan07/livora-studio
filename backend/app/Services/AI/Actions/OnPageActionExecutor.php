<?php

namespace App\Services\AI\Actions;

use App\Models\AiRecommendation;
use App\Services\AI\AIProviderManager;

/**
 * Eksekutor untuk action_type "on_page" (rekomendasi SEO Agent).
 *
 * Livora belum punya CMS/endpoint live buat nulis balik meta tag ke situs,
 * jadi eksekusi di sini TIDAK mengklaim publish otomatis. Yang dilakukan:
 * minta AI menulis draft konkret (meta title + meta description siap pakai)
 * berdasarkan rekomendasinya, lalu hasilnya dikembalikan sebagai ringkasan —
 * otomatis masuk ke Activity Log lewat ActionController, tinggal di-copy
 * admin ke source code.
 */
class OnPageActionExecutor implements ActionExecutor
{
    public function __construct(private AIProviderManager $ai)
    {
    }

    public function handles(): string
    {
        return 'on_page';
    }

    public function execute(AiRecommendation $recommendation): string
    {
        $prompt = <<<TXT
Rekomendasi SEO on-page berikut perlu dieksekusi jadi draft konkret:

Judul rekomendasi : {$recommendation->title}
Deskripsi         : {$recommendation->description}
Alasan (why)      : {$recommendation->why}
Langkah disarankan: {$recommendation->suggested_action}

Tulis draft SIAP PAKAI untuk admin Livora Studio, dalam Bahasa Indonesia,
gaya brand interior & furniture premium:
- Meta Title (maksimal 60 karakter)
- Meta Description (maksimal 155 karakter)

Balas HANYA dengan format persis ini, tanpa basa-basi:
Meta Title: ...
Meta Description: ...
TXT;

        $result = $this->ai->ask(
            'Kamu adalah SEO copywriter untuk Livora Studio, brand interior & furniture premium di Indonesia.',
            $prompt,
            'seo',
        );

        $draft = trim($result['text']);

        if ($draft === '') {
            throw new \RuntimeException('AI provider tidak mengembalikan draft (respons kosong).');
        }

        return "Draft on-page dibuat otomatis oleh {$result['provider']}:\n\n{$draft}";
    }
}