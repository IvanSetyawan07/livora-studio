<?php

namespace App\Services\AI\Actions;

use App\Models\AiRecommendation;
use App\Services\AI\AIProviderManager;

abstract class AbstractDraftActionExecutor implements ActionExecutor
{
    public function __construct(protected AIProviderManager $ai)
    {
    }

    abstract protected function roleLabel(): string;

    /** Kalimat peringatan di Activity Log. Boleh dipertegas per action_type. */
    protected function manualNotice(): string
    {
        return 'CATATAN: tidak ada data di sistem yang berubah oleh eksekusi ini. '
            .'Ini hanya draft/instruksi — pekerjaannya masih HARUS dikerjakan manual oleh admin.';
    }

    final public function execute(AiRecommendation $recommendation): string
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

        return "Checklist eksekusi dibuat otomatis oleh {$result['provider']}.\n"
            .$this->manualNotice()."\n\n{$draft}";
    }
}