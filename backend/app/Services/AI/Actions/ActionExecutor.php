<?php

namespace App\Services\AI\Actions;

use App\Models\AiRecommendation;

/**
 * Kontrak eksekutor aksi nyata untuk sebuah recommendation.
 *
 * Satu implementasi = satu tipe aksi yang benar-benar bisa dijalankan ke
 * sistem/eksternal. Kalau tidak ada implementasi untuk sebuah action_type,
 * approval TIDAK boleh ditandai 'executed' — lihat ActionExecutorRegistry.
 */
interface ActionExecutor
{
    /** action_type yang ditangani eksekutor ini. */
    public function handles(): string;

    /**
     * Jalankan aksinya. Lempar exception kalau gagal.
     *
     * @return string ringkasan hasil eksekusi untuk activity log
     */
    public function execute(AiRecommendation $recommendation): string;
}
