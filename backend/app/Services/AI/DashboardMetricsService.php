<?php

namespace App\Services\AI;

/**
 * STUB Fase 3 — dikembalikan jujur sebagai "belum ada data yang cukup untuk
 * dihitung", BUKAN angka karangan. Logika hitung ASLI (dari Consultation
 * funnel, item_clicks, UserActivity, AiRecommendation pending) akan
 * menggantikan isi method-method ini di Fase 4. Controller & route tidak
 * perlu berubah lagi nanti — cukup isi ulang class ini.
 */
class DashboardMetricsService
{
    public function businessHealth(): array
    {
        return [
            'score' => 0,
            'status' => 'Needs Attention',
            'deltaLabel' => 'Belum ada data',
            'deltaDirection' => 'flat',
            'summary' => 'Skor kesehatan bisnis belum bisa dihitung karena service perhitungan data asli belum aktif (menunggu Fase 4).',
            'areasNeedingAttention' => 0,
        ];
    }

    public function priorities(): array
    {
        return [];
    }

    public function overviewKpis(): array
    {
        return [];
    }
}