<?php

namespace App\Services\AI\Actions;

use App\Models\AiRecommendation;
use App\Services\AI\AIProviderManager;

/**
 * Basis untuk eksekutor "generate draft konkret via AI" — pola yang sama
 * persis dengan OnPageActionExecutor, dipakai ulang untuk action_type lain
 * yang belum (dan untuk sementara tidak akan) punya integrasi tulis
 * otomatis ke sistem eksternal (CMS, ads platform, dll).
 *
 * PENTING: ini BUKAN eksekusi nyata ke platform. Ini menghasilkan
 * instruksi/draft siap pakai untuk admin, supaya tombol "Approve & Execute"
 * tidak selalu gagal 422 untuk mayoritas rekomendasi, TANPA mengklaim
 * publish otomatis yang sebenarnya belum ada. Activity Log tetap mencatat
 * hasilnya sebagai teks, bukan status "published ke situs".
 */
abstract class AbstractDraftActionExecutor implements ActionExecutor
{
    public function __construct(protected AIProviderManager $ai)
    {
    }

    /** Label singkat untuk system prompt, mis. "SEO teknikal", "konten", "operasional". */
    abstract protected function roleLabel(): string;

    public function execute(AiRecommendation $recommendation): string
    {
        $prompt = <<<TXT
Rekomendasi berikut perlu dieksekusi jadi langkah/draft KONKRET yang bisa
langsung dikerjakan admin Livora Studio (brand interior & furniture premium):

Judul rekomendasi : {$recommendation->title}
Deskripsi         : {$recommendation->description}
Alasan (why)      : {$recommendation->why}
Langkah disarankan: {$recommendation->suggested_action}

Tulis dalam Bahasa Indonesia, format checklist bernomor, maksimal 6 poin,
setiap poin harus bisa langsung dikerjakan (bukan saran umum/abstrak).
Balas HANYA dengan checklist-nya, tanpa basa-basi pembuka/penutup.
TXT;

        $result = $this->ai->ask(
            "Kamu adalah {$this->roleLabel()} untuk Livora Studio, brand interior & furniture premium di Indonesia.",
            $prompt,
            'seo',
        );

        $draft = trim($result['text']);

        if ($draft === '') {
            throw new \RuntimeException('AI provider tidak mengembalikan draft (respons kosong).');
        }

        return "Checklist eksekusi dibuat otomatis oleh {$result['provider']} (belum dipublish otomatis ke sistem — perlu dikerjakan manual oleh admin):\n\n{$draft}";
    }
}