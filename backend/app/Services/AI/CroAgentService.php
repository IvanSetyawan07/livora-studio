<?php

namespace App\Services\AI;

use App\Models\AiActivityLog;
use App\Models\AiAgent;
use App\Models\AiInsight;
use App\Models\AiRecommendation;
use App\Models\Consultation;
use App\Models\ConsultationStatusHistory;
use Illuminate\Support\Facades\DB;

/**
 * Fase 6 — Agent AI pertama yang benar-benar jalan (bukan stub/fixture).
 *
 * Prinsip yang dipegang di sini sama seperti DashboardMetricsService (Fase 4):
 * kalau data mentahnya belum cukup, atau responsnya nggak bisa di-parse
 * dengan aman, JANGAN dipaksa jadi insight — kembalikan status jujur dan
 * jangan tulis apapun ke ai_insights/ai_recommendations. Lebih baik kosong
 * daripada mengarang.
 */
class CroAgentService
{
    private const AGENT_KEY = 'cro';

    /** Minimal jumlah consultation supaya analisis funnel dianggap punya makna statistik. */
    public const MIN_SAMPLE = 5;

    private const STAGES = [
        Consultation::STATUS_NEW_INQUIRY,
        Consultation::STATUS_UNDER_REVIEW,
        Consultation::STATUS_CONTACTED,
        Consultation::STATUS_MEETING_SCHEDULED,
        Consultation::STATUS_IN_PROGRESS,
        Consultation::STATUS_DP_PENDING,
        Consultation::STATUS_PROJECT_PAID,
        Consultation::STATUS_PROJECT_RUNNING,
        Consultation::STATUS_COMPLETED,
    ];

    public function __construct(private AIProviderManager $ai)
    {
    }

    /**
     * Jalankan satu siklus analisis CRO. Dipanggil dari command `ai:run-agent cro`.
     *
     * @return array{status: string, message?: string, insights_created?: int, recommendations_created?: int, provider?: string, raw?: string}
     */
    public function run(int $limit = 5): array
    {
        $snapshot = $this->buildFunnelSnapshot();

        if ($snapshot === null) {
            return [
                'status' => 'empty',
                'message' => 'Data funnel belum cukup (minimal '.self::MIN_SAMPLE.' consultation) untuk '
                    .'dianalisis secara jujur. Tidak ada insight yang dibuat.',
            ];
        }

        try {
            $result = $this->ai->ask(
                $this->systemPrompt($limit),
                $this->userPrompt($snapshot),
                self::AGENT_KEY
            );
        } catch (\Throwable $e) {
            AiActivityLog::create([
                'actor' => 'AI',
                'agent_key' => self::AGENT_KEY,
                'message' => 'CRO Agent gagal generate insight: '.$e->getMessage(),
                'kind' => 'system',
            ]);

            return ['status' => 'error', 'message' => $e->getMessage()];
        }

        $items = $this->parseResponse($result['text']);

        if (empty($items)) {
            AiActivityLog::create([
                'actor' => 'AI',
                'agent_key' => self::AGENT_KEY,
                'message' => 'CRO Agent merespons tapi tidak menghasilkan insight yang valid (format JSON '
                    .'tidak sesuai skema). Tidak ada data yang ditulis.',
                'kind' => 'system',
            ]);

            return [
                'status' => 'error',
                'message' => 'Respons AI tidak bisa di-parse jadi insight yang valid.',
                'raw' => $result['text'],
            ];
        }

        $items = array_slice($items, 0, $limit);

        $insightsCreated = 0;
        $recommendationsCreated = 0;

        foreach ($items as $item) {
            $insight = AiInsight::create([
                'title' => $item['title'],
                'description' => $item['description'],
                'type' => $item['type'],
                'severity' => $item['severity'],
                'confidence' => $this->clampConfidence($item['confidence']),
                'source' => ['Lead Data'],
                'agent_key' => self::AGENT_KEY,
                'reasoning' => $item['reasoning'],
                'what_happened' => $item['what_happened'],
                'why_it_matters' => $item['why_it_matters'],
                'expected_impact' => $item['expected_impact'],
                'metrics' => null,
                'analytics_href' => null,
            ]);
            $insightsCreated++;

            $recData = $item['recommendation'] ?? null;

            if (is_array($recData) && $this->isValidRecommendation($recData)) {
                $recommendation = AiRecommendation::create([
                    'insight_id' => $insight->id,
                    'title' => $recData['title'],
                    'description' => $recData['description'],
                    'action_type' => $recData['action_type'] ?? 'process_change',
                    'risk' => in_array($recData['risk'] ?? null, ['low', 'medium', 'high'], true)
                        ? $recData['risk'] : 'low',
                    'status' => 'pending',
                    'expected_impact' => $recData['expected_impact'] ?? $item['expected_impact'],
                    'confidence' => $this->clampConfidence($recData['confidence'] ?? $item['confidence']),
                    'agent_key' => self::AGENT_KEY,
                    'priority' => in_array($recData['priority'] ?? null, ['low', 'medium', 'high'], true)
                        ? $recData['priority'] : 'medium',
                    'why' => $recData['why'] ?? null,
                    'suggested_action' => $recData['suggested_action'] ?? null,
                ]);

                $insight->update(['recommendation_id' => $recommendation->id]);
                $recommendationsCreated++;
            }
        }

        AiAgent::where('key', self::AGENT_KEY)->update([
            'status' => 'active',
            'connection_state' => 'connected',
            'last_run_at' => now(),
        ]);

        AiActivityLog::create([
            'actor' => 'AI',
            'agent_key' => self::AGENT_KEY,
            'message' => "CRO Agent menghasilkan {$insightsCreated} insight baru "
                ."({$recommendationsCreated} disertai rekomendasi) dari analisis funnel konsultasi, "
                ."via provider {$result['provider']}.",
            'kind' => 'insight',
        ]);

        return [
            'status' => 'ok',
            'insights_created' => $insightsCreated,
            'recommendations_created' => $recommendationsCreated,
            'provider' => $result['provider'],
        ];
    }

    /**
     * Kumpulkan data funnel ASLI dari Consultation + ConsultationStatusHistory.
     * Return null kalau sample-nya terlalu kecil untuk dianalisis secara jujur.
     */
    public function buildFunnelSnapshot(): ?array
    {
        $total = Consultation::count();

        if ($total < self::MIN_SAMPLE) {
            return null;
        }

        $countsByCurrentStatus = Consultation::query()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        // Berapa consultation yang PERNAH mencapai tiap stage (bukan cuma status saat ini),
        // dihitung dari histori perpindahan status.
        $everReached = [];
        foreach (self::STAGES as $stage) {
            $everReached[$stage] = ConsultationStatusHistory::where('new_status', $stage)
                ->distinct('consultation_id')
                ->count('consultation_id');
        }
        // Semua consultation pasti "melewati" new_inquiry secara konsep, meski row histori untuk
        // transisi awal belum tentu tercatat (kalau langsung dibuat dengan status itu).
        $everReached[Consultation::STATUS_NEW_INQUIRY] = max(
            $everReached[Consultation::STATUS_NEW_INQUIRY] ?? 0,
            $total
        );

        // Di tahap (previous_status) mana paling banyak consultation berakhir cancelled/rejected.
        $dropOffByPreviousStage = ConsultationStatusHistory::query()
            ->whereIn('new_status', [Consultation::STATUS_CANCELLED, Consultation::STATUS_REJECTED])
            ->whereNotNull('previous_status')
            ->select('previous_status', DB::raw('count(*) as total'))
            ->groupBy('previous_status')
            ->pluck('total', 'previous_status')
            ->toArray();

        // Rata-rata lama (jam) sebuah consultation "diam" di tiap stage sebelum pindah ke stage
        // berikutnya. Consultation yang masih diam di stage itu sampai sekarang (belum pindah)
        // sengaja tidak dihitung supaya rata-rata tidak bias oleh proses yang belum selesai.
        $histories = ConsultationStatusHistory::query()
            ->orderBy('consultation_id')
            ->orderBy('created_at')
            ->get(['consultation_id', 'previous_status', 'new_status', 'created_at']);

        $durationsByStage = [];
        foreach ($histories->groupBy('consultation_id') as $rows) {
            $rows = $rows->values();
            foreach ($rows as $i => $row) {
                $next = $rows[$i + 1] ?? null;
                if ($next === null) {
                    continue;
                }
                $durationsByStage[$row->new_status][] = $row->created_at->diffInHours($next->created_at);
            }
        }

        $avgHoursInStage = [];
        foreach ($durationsByStage as $stage => $vals) {
            $avgHoursInStage[$stage] = round(array_sum($vals) / count($vals), 1);
        }

        $now = now();
        $lostLast30d = Consultation::whereIn('status', [Consultation::STATUS_CANCELLED, Consultation::STATUS_REJECTED])
            ->where('updated_at', '>=', $now->copy()->subDays(30))
            ->count();
        $lostPrev30d = Consultation::whereIn('status', [Consultation::STATUS_CANCELLED, Consultation::STATUS_REJECTED])
            ->whereBetween('updated_at', [$now->copy()->subDays(60), $now->copy()->subDays(30)])
            ->count();

        return [
            'total_consultations' => $total,
            'counts_by_current_status' => $countsByCurrentStatus,
            'consultations_that_ever_reached_stage' => $everReached,
            'cancelled_or_rejected_count_by_previous_stage' => $dropOffByPreviousStage,
            'average_hours_spent_in_stage_before_moving_on' => $avgHoursInStage,
            'cancelled_or_rejected_last_30_days' => $lostLast30d,
            'cancelled_or_rejected_previous_30_days' => $lostPrev30d,
            'stage_order' => self::STAGES,
            'stage_labels' => Consultation::STATUS_LABELS,
        ];
    }

    private function systemPrompt(int $limit): string
    {
        return <<<PROMPT
Kamu adalah CRO (Conversion Rate Optimization) Analyst untuk Livora Studio, platform interior
design & furniture custom di Indonesia. Tugasmu menganalisis data funnel konsultasi (dari inquiry
sampai project selesai) dan menemukan titik gesekan (friction) yang membuat calon klien batal atau
macet di funnel.

ATURAN KETAT — WAJIB DIIKUTI:
- Analisis HANYA berdasarkan angka yang diberikan di data funnel pada pesan user. JANGAN mengarang
  angka, nama fitur, channel marketing, atau asumsi apapun yang tidak ada di data tersebut.
- Kalau datanya ambigu atau sample-nya terlalu kecil untuk sebuah kesimpulan tertentu, JANGAN
  dipaksakan jadi insight. Lebih baik hasilkan insight lebih sedikit tapi akurat daripada banyak
  tapi mengada-ada.
- Maksimal {$limit} insight per respons.
- Isi field "recommendation" HANYA kalau ada langkah konkret yang bisa langsung dikerjakan tim
  Livora berdasarkan temuan itu. Kalau insight-nya murni observasi tanpa langkah jelas, set
  "recommendation" ke null — jangan dipaksakan.
- "confidence" (0-100) mencerminkan seberapa yakin kamu pola ini nyata secara statistik dari
  besarnya sample data yang diberikan, BUKAN seberapa penting insight-nya.
- "priority" pada recommendation mencerminkan urgensi + potensi dampak bisnis:
  "high" untuk drop-off besar di tahap awal funnel atau kerugian berulang yang jelas dari data,
  "medium" untuk pola yang perlu diperhatikan tapi belum kritis,
  "low" untuk observasi minor.
- Balas HANYA dengan JSON valid, TANPA teks pembuka/penutup, TANPA markdown code fence, PERSIS
  sesuai skema berikut:

{
  "insights": [
    {
      "title": "judul singkat, maksimal 12 kata",
      "description": "ringkasan 1-2 kalimat",
      "type": "opportunity" | "warning" | "trend" | "anomaly",
      "severity": "low" | "medium" | "high" | "critical",
      "confidence": 0-100,
      "reasoning": "kenapa kamu menyimpulkan ini, WAJIB sebut angka konkret dari data yang diberikan",
      "what_happened": "apa yang ditemukan di data, dalam bahasa yang mudah dibaca tim non-teknis",
      "why_it_matters": "dampak ke bisnis Livora kalau dibiarkan",
      "expected_impact": "perkiraan dampak KUALITATIF kalau diperbaiki — jangan karang angka rupiah spesifik",
      "recommendation": {
        "title": "judul singkat",
        "description": "ringkasan 1-2 kalimat",
        "action_type": "process_change" | "follow_up" | "content" | "training" | "other",
        "risk": "low" | "medium" | "high",
        "priority": "low" | "medium" | "high",
        "expected_impact": "string",
        "confidence": 0-100,
        "why": "alasan singkat kenapa ini direkomendasikan",
        "suggested_action": "langkah konkret yang bisa langsung dikerjakan tim Livora"
      } | null
    }
  ]
}
PROMPT;
    }

    private function userPrompt(array $snapshot): string
    {
        $json = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return "Data funnel konsultasi Livora Studio saat ini (semua angka nyata dari database, "
            ."bukan contoh):\n\n{$json}\n\nAnalisis data di atas dan hasilkan insight sesuai skema "
            ."yang sudah dijelaskan di system prompt.";
    }

    /**
     * Parse & validasi respons AI. Item yang tidak lolos validasi dibuang, BUKAN diperbaiki/ditebak,
     * supaya tidak ada data setengah-mengarang yang masuk ke database.
     */
    private function parseResponse(string $text): array
    {
        $clean = trim($text);
        $clean = preg_replace('/^```(json)?/i', '', $clean);
        $clean = preg_replace('/```$/', '', $clean);
        $clean = trim($clean);

        $data = json_decode($clean, true);

        if (!is_array($data) || !isset($data['insights']) || !is_array($data['insights'])) {
            return [];
        }

        $valid = [];
        foreach ($data['insights'] as $item) {
            if (is_array($item) && $this->isValidInsight($item)) {
                $valid[] = $item;
            }
        }

        return $valid;
    }

    private function isValidInsight(array $item): bool
    {
        foreach (['title', 'description', 'type', 'severity', 'reasoning', 'what_happened', 'why_it_matters', 'expected_impact'] as $field) {
            if (empty($item[$field]) || !is_string($item[$field])) {
                return false;
            }
        }

        if (!in_array($item['type'], ['opportunity', 'warning', 'trend', 'anomaly', 'recommendation', 'lead_intelligence'], true)) {
            return false;
        }

        if (!in_array($item['severity'], ['low', 'medium', 'high', 'critical'], true)) {
            return false;
        }

        if (!isset($item['confidence']) || !is_numeric($item['confidence'])) {
            return false;
        }

        return true;
    }

    private function isValidRecommendation(array $rec): bool
    {
        return !empty($rec['title']) && is_string($rec['title'])
            && !empty($rec['description']) && is_string($rec['description']);
    }

    private function clampConfidence(mixed $value): int
    {
        return (int) max(0, min(100, (int) round((float) $value)));
    }
}