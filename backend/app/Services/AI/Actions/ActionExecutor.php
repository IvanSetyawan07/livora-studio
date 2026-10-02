<?php

namespace App\Services\AI\Actions;

use App\Models\AiRecommendation;

/**
 * Kontrak eksekutor aksi untuk sebuah recommendation.
 *
 * Satu implementasi = satu action_type. Eksekutor yang menyentuh platform
 * nyata (Meta Ads, Facebook Page, email pelanggan, database situs) wajib
 * mengembalikan ExecutionResult::changed() dengan {before, after}. Yang
 * hanya menghasilkan checklist mengembalikan ExecutionResult::draft().
 * Gagal => lempar exception, status TIDAK boleh jadi 'executed'.
 */
interface ActionExecutor
{
    public function handles(): string;

    public function execute(AiRecommendation $recommendation): ExecutionResult;
}
