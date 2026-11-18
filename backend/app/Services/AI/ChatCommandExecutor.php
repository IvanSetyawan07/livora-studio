<?php

namespace App\Services\AI;

use App\Models\AiActivityLog;
use App\Models\AiApproval;
use App\Models\AiCampaign;
use App\Models\AiContentDraft;
use App\Models\AiInsight;
use App\Models\AiRecommendation;
use App\Models\AiSetting;
use App\Models\MarketingCampaign;
use App\Services\AI\Actions\ActionExecutorRegistry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;

/**
 * Eksekutor Perintah Otonom untuk Ask AI (ChatController).
 *
 * Memberikan kemampuan kepada AI untuk mengendalikan 100% fitur di AI Marketing
 * secara nyata: menjalankan agent, menyetujui/menolak rekomendasi, mengeksekusi
 * action ke platform/DB, membuat & menjadwalkan konten, membuat & mengelola
 * campaign, meriset pasar/video eksternal, memperbarui impact, mengatur routing
 * provider, dan menyimpan aturan pembelajaran baru.
 */
class ChatCommandExecutor
{
    public function __construct(
        private ActionExecutorRegistry $executors,
        private ImpactTrackerService $impactTracker,
        private CampaignSyncService $campaignSync,
        private MarketIntelligenceService $market,
        private BrandVideoRecommendationService $videoRecommender,
        private AiLearningMemoryService $learning,
        private AgentDependencyHealth $health,
    ) {
    }

    /**
     * @param  array<int, array<string, mixed>>  $operations
     * @return array<int, array{type: string, status: string, title: string, detail: string, href: string}>
     */
    public function executeBatch(array $operations): array
    {
        $receipts = [];

        foreach (array_slice($operations, 0, 6) as $op) {
            if (! is_array($op) || empty($op['type']) || ! is_string($op['type'])) {
                continue;
            }

            try {
                $receipt = $this->executeSingle($op);
                if ($receipt !== null) {
                    $receipts[] = $receipt;
                }
            } catch (Throwable $e) {
                $receipts[] = [
                    'type' => (string) $op['type'],
                    'status' => 'error',
                    'title' => 'Gagal menjalankan perintah '.$op['type'],
                    'detail' => $e->getMessage(),
                    'href' => '/admin/ai-marketing/activity',
                ];
            }
        }

        return $receipts;
    }

    /**
     * @param  array<string, mixed>  $op
     * @return array{type: string, status: string, title: string, detail: string, href: string}|null
     */
    private function executeSingle(array $op): ?array
    {
        $type = strtolower(trim((string) $op['type']));

        return match ($type) {
            'run_agent' => $this->opRunAgent($op),
            'approve_recommendation' => $this->opApproveRecommendation($op),
            'reject_recommendation' => $this->opRejectRecommendation($op),
            'execute_action' => $this->opExecuteAction($op),
            'reject_action' => $this->opRejectAction($op),
            'create_content_draft' => $this->opCreateContentDraft($op),
            'update_content_draft' => $this->opUpdateContentDraft($op),
            'delete_content_draft' => $this->opDeleteContentDraft($op),
            'push_draft_to_email' => $this->opPushDraftToEmail($op),
            'create_campaign' => $this->opCreateCampaign($op),
            'update_campaign' => $this->opUpdateCampaign($op),
            'sync_campaigns' => $this->opSyncCampaigns(),
            'refresh_impact' => $this->opRefreshImpact(),
            'analyze_market' => $this->opAnalyzeMarket($op),
            'recommend_videos' => $this->opRecommendVideos($op),
            'dismiss_insight' => $this->opDismissInsight($op),
            'set_provider_preference' => $this->opSetProviderPreference($op),
            'save_learning_rule' => $this->opSaveLearningRule($op),
            'record_ig_boost' => $this->opRecordIgBoost($op),
            default => null,
        };
    }

    private function opRunAgent(array $op): array
    {
        $agentKey = strtolower(trim((string) ($op['agent_key'] ?? $op['agent'] ?? 'all')));
        $limit = max(1, min(6, (int) ($op['limit'] ?? 4)));

        $map = [
            'seo' => SeoAgentService::class,
            'content' => ContentAgentService::class,
            'ads' => AdsAgentService::class,
            'leads' => LeadsAgentService::class,
            'cro' => CroAgentService::class,
        ];

        $keysToRun = $agentKey === 'all' ? array_keys($map) : (isset($map[$agentKey]) ? [$agentKey] : []);
        if ($keysToRun === []) {
            throw new \InvalidArgumentException("Agent '{$agentKey}' tidak valid.");
        }

        $totalInsights = 0;
        $totalRecs = 0;
        $ran = [];

        foreach ($keysToRun as $k) {
            $svc = app($map[$k]);
            $res = $svc->run($limit);
            if (($res['status'] ?? '') === 'ok') {
                $totalInsights += (int) ($res['insights_created'] ?? 0);
                $totalRecs += (int) ($res['recommendations_created'] ?? 0);
                $ran[] = strtoupper($k);
            }
        }

        $this->health->refresh();

        $href = $agentKey === 'all' ? '/admin/ai-marketing/insights' : "/admin/ai-marketing/{$agentKey}";

        return [
            'type' => 'run_agent',
            'status' => 'ok',
            'title' => 'Analisis Agent Selesai ('.($ran ? implode(', ', $ran) : strtoupper($agentKey)).')',
            'detail' => "{$totalInsights} insight & {$totalRecs} rekomendasi baru berhasil dibuat.",
            'href' => $href,
        ];
    }

    private function opApproveRecommendation(array $op): array
    {
        $scope = strtolower((string) ($op['scope'] ?? ''));
        $id = $op['id'] ?? $op['recommendation_id'] ?? null;

        if ($scope === 'all_low_risk' || $id === 'all_low_risk') {
            $recs = AiRecommendation::where('status', 'pending')->where('risk', 'low')->get();
        } elseif ($scope === 'all_pending' || $id === 'all_pending') {
            $recs = AiRecommendation::where('status', 'pending')->limit(15)->get();
        } elseif ($id) {
            $recs = AiRecommendation::where('id', (int) $id)->get();
        } else {
            $recs = AiRecommendation::where('status', 'pending')->latest()->limit(1)->get();
        }

        $count = 0;
        foreach ($recs as $rec) {
            if ($rec->status !== 'pending') {
                continue;
            }
            $rec->update(['status' => 'approved']);
            $approval = AiApproval::ensureForRecommendation($rec);
            $approval->update([
                'status' => 'approved',
                'decided_by' => 'Admin via Ask AI',
                'decided_at' => now(),
            ]);
            $count++;
        }

        return [
            'type' => 'approve_recommendation',
            'status' => 'ok',
            'title' => "{$count} Rekomendasi Disetujui",
            'detail' => 'Rekomendasi telah dipindahkan ke halaman Actions dan siap dieksekusi.',
            'href' => '/admin/ai-marketing/ai-center/actions',
        ];
    }

    private function opRejectRecommendation(array $op): array
    {
        $id = (int) ($op['id'] ?? $op['recommendation_id'] ?? 0);
        $rec = $id > 0 ? AiRecommendation::find($id) : AiRecommendation::where('status', 'pending')->latest()->first();
        if (! $rec) {
            throw new \RuntimeException('Rekomendasi tidak ditemukan.');
        }

        $rec->update(['status' => 'rejected']);
        AiApproval::where('recommendation_id', $rec->id)->update([
            'status' => 'rejected',
            'decided_by' => 'Admin via Ask AI',
            'decided_at' => now(),
        ]);

        return [
            'type' => 'reject_recommendation',
            'status' => 'ok',
            'title' => "Rekomendasi #{$rec->id} Ditolak",
            'detail' => $rec->title,
            'href' => '/admin/ai-marketing/ai-center/recommendations',
        ];
    }

    private function opExecuteAction(array $op): array
    {
        $scope = strtolower((string) ($op['scope'] ?? ''));
        $id = $op['id'] ?? $op['action_id'] ?? $op['approval_id'] ?? null;

        if ($scope === 'all_low_risk' || $id === 'all_low_risk') {
            $actions = AiApproval::with('recommendation')
                ->whereIn('status', ['pending', 'approved'])
                ->where('risk', 'low')
                ->limit(10)
                ->get();
        } elseif ($scope === 'all_approved' || $id === 'all_approved') {
            $actions = AiApproval::with('recommendation')
                ->where('status', 'approved')
                ->limit(10)
                ->get();
        } elseif ($scope === 'retry_failed' || $id === 'retry_failed') {
            $actions = AiApproval::with('recommendation')
                ->where('status', 'failed')
                ->limit(5)
                ->get();
        } elseif ($id) {
            $actions = AiApproval::with('recommendation')
                ->where(function ($q) use ($id) {
                    $q->where('id', (int) $id)->orWhere('recommendation_id', (int) $id);
                })
                ->limit(1)
                ->get();
        } else {
            $actions = AiApproval::with('recommendation')
                ->whereIn('status', ['approved', 'pending'])
                ->orderByRaw("CASE WHEN status = 'approved' THEN 0 ELSE 1 END")
                ->latest('requested_at')
                ->limit(1)
                ->get();
        }

        if ($actions->isEmpty()) {
            throw new \RuntimeException('Tidak ada action yang siap dieksekusi.');
        }

        $executedCount = 0;
        $summaries = [];

        foreach ($actions as $action) {
            $rec = $action->recommendation;
            if (! $rec) {
                continue;
            }
            $executor = $this->executors->for($rec->action_type);
            if (! $executor) {
                continue;
            }

            $result = $executor->execute($rec);

            DB::transaction(function () use ($action, $rec, $result) {
                $now = now();
                $action->update([
                    'status' => 'executed',
                    'decided_by' => 'Admin via Ask AI',
                    'decided_at' => $now,
                    'summary' => $action->summary."\n\n[Executed via Ask AI ".$now->toDateTimeString().'] '.$result->summary,
                ]);
                $rec->update(['status' => 'executed']);
                $this->impactTracker->recordExecution($rec, $now);

                AiActivityLog::create([
                    'actor' => 'AI',
                    'agent_key' => $action->agent_key,
                    'title' => 'Ask AI · Action Dieksekusi',
                    'message' => "Action \"{$action->title}\" dieksekusi langsung lewat Ask AI: {$result->summary}",
                    'kind' => 'action',
                    'recommendation_id' => $rec->id,
                    'href' => '/admin/ai-marketing/impact',
                ]);
            });

            $executedCount++;
            $summaries[] = $action->title;
        }

        return [
            'type' => 'execute_action',
            'status' => 'ok',
            'title' => "{$executedCount} Action Berhasil Dieksekusi",
            'detail' => implode(' · ', array_slice($summaries, 0, 3)),
            'href' => '/admin/ai-marketing/ai-center/actions',
        ];
    }

    private function opRejectAction(array $op): array
    {
        $id = (int) ($op['id'] ?? $op['action_id'] ?? 0);
        $action = $id > 0 ? AiApproval::find($id) : AiApproval::whereIn('status', ['pending', 'approved'])->latest('requested_at')->first();
        if (! $action) {
            throw new \RuntimeException('Action tidak ditemukan.');
        }

        $action->update([
            'status' => 'rejected',
            'decided_by' => 'Admin via Ask AI',
            'decided_at' => now(),
        ]);
        if ($action->recommendation) {
            $action->recommendation->update(['status' => 'rejected']);
        }

        return [
            'type' => 'reject_action',
            'status' => 'ok',
            'title' => "Action #{$action->id} Ditolak",
            'detail' => $action->title,
            'href' => '/admin/ai-marketing/ai-center/actions',
        ];
    }

    private function opCreateContentDraft(array $op): array
    {
        if (! Schema::hasTable('ai_content_drafts')) {
            throw new \RuntimeException('Tabel ai_content_drafts belum tersedia.');
        }

        $channel = strtolower((string) ($op['channel'] ?? 'instagram'));
        if (! in_array($channel, ['instagram', 'facebook', 'email', 'tiktok', 'youtube', 'website'], true)) {
            $channel = 'instagram';
        }

        $title = trim((string) ($op['title'] ?? 'Draft Konten AI Livora'));
        $draft = AiContentDraft::create([
            'title' => $title,
            'channel' => $channel,
            'headline' => (string) ($op['headline'] ?? $title),
            'caption' => (string) ($op['caption'] ?? $op['description'] ?? ''),
            'body' => (string) ($op['body'] ?? $op['caption'] ?? $title),
            'cta_label' => (string) ($op['cta_label'] ?? 'Jadwalkan Konsultasi'),
            'status' => in_array($op['status'] ?? null, ['needs_review', 'approved', 'scheduled'], true)
                ? $op['status']
                : 'needs_review',
            'scheduled_for' => ! empty($op['scheduled_for']) ? $op['scheduled_for'] : null,
            'target_type' => in_array($op['target_type'] ?? null, ['item', 'project', 'promo_banner'], true)
                ? $op['target_type']
                : null,
            'target_id' => isset($op['target_id']) ? (int) $op['target_id'] : null,
        ]);

        return [
            'type' => 'create_content_draft',
            'status' => 'ok',
            'title' => "Draft Konten Dibuat ({$draft->channel})",
            'detail' => $draft->title,
            'href' => '/admin/ai-marketing/content',
        ];
    }

    private function opUpdateContentDraft(array $op): array
    {
        $id = (int) ($op['id'] ?? $op['draft_id'] ?? 0);
        $draft = $id > 0 ? AiContentDraft::find($id) : AiContentDraft::latest('created_at')->first();
        if (! $draft) {
            throw new \RuntimeException('Draft konten tidak ditemukan.');
        }

        $updates = [];
        foreach (['title', 'status', 'channel', 'caption', 'headline', 'body', 'cta_label', 'scheduled_for'] as $f) {
            if (array_key_exists($f, $op) && $op[$f] !== null) {
                $updates[$f] = $op[$f];
            }
        }
        $draft->update($updates);

        return [
            'type' => 'update_content_draft',
            'status' => 'ok',
            'title' => "Draft #{$draft->id} Diperbarui",
            'detail' => "{$draft->title} ({$draft->status})",
            'href' => '/admin/ai-marketing/content',
        ];
    }

    private function opDeleteContentDraft(array $op): array
    {
        $id = (int) ($op['id'] ?? $op['draft_id'] ?? 0);
        $draft = AiContentDraft::find($id);
        if (! $draft) {
            throw new \RuntimeException('Draft konten tidak ditemukan.');
        }
        $title = $draft->title;
        $draft->delete();

        return [
            'type' => 'delete_content_draft',
            'status' => 'ok',
            'title' => "Draft #{$id} Dihapus",
            'detail' => $title,
            'href' => '/admin/ai-marketing/content',
        ];
    }

    private function opPushDraftToEmail(array $op): array
    {
        $id = (int) ($op['id'] ?? $op['draft_id'] ?? 0);
        $draft = $id > 0 ? AiContentDraft::find($id) : AiContentDraft::latest('created_at')->first();
        if (! $draft) {
            throw new \RuntimeException('Draft konten untuk dikirim ke Email Studio tidak ditemukan.');
        }

        $base = rtrim((string) config('app.frontend_url', 'https://livoralcr.com'), '/');
        $campaign = $draft->marketing_campaign_id
            ? MarketingCampaign::find($draft->marketing_campaign_id)
            : null;

        if (! $campaign) {
            $campaign = MarketingCampaign::create([
                'campaign_name' => 'AI Content: '.Str::limit($draft->title, 80),
                'subject' => $draft->headline ?: $draft->title,
                'section_label' => 'LIVORA JOURNAL',
                'headline' => $draft->headline ?: $draft->title,
                'body' => $draft->body ?: $draft->caption ?: $draft->title,
                'hero_image' => $draft->media_url,
                'hero_image_alt' => $draft->headline ?: $draft->title,
                'cta_label' => $draft->cta_label ?: 'Jelajahi Koleksi',
                'cta_url' => $draft->cta_url ?: $base.'/furniture',
                'signature' => "With warmth,\nThe Livora Team",
                'target' => 'all',
                'status' => 'draft',
            ]);
            $draft->update(['marketing_campaign_id' => $campaign->id]);
        }

        return [
            'type' => 'push_draft_to_email',
            'status' => 'ok',
            'title' => 'Draft Dikirim ke Email Marketing Studio',
            'detail' => $campaign->campaign_name,
            'href' => "/admin/marketing?campaignId={$campaign->id}",
        ];
    }

    private function opCreateCampaign(array $op): array
    {
        $name = trim((string) ($op['name'] ?? $op['title'] ?? 'Kampanye Strategis Livora'));
        $channel = trim((string) ($op['channel'] ?? 'Meta Ads + Instagram'));
        $status = in_array($op['status'] ?? null, ['Active', 'Paused', 'Draft', 'Ended'], true)
            ? $op['status']
            : 'Active';
        $health = in_array($op['health'] ?? null, ['Good', 'Fair', 'Needs Attention'], true)
            ? $op['health']
            : 'Good';

        $planSteps = [];
        if (! empty($op['plan']) && is_array($op['plan'])) {
            foreach (array_values($op['plan']) as $idx => $step) {
                $label = is_string($step) ? $step : ($step['label'] ?? $step['title'] ?? '');
                if ($label !== '') {
                    $planSteps[] = [
                        'id' => 'step_'.($idx + 1),
                        'label' => $label,
                        'state' => $idx === 0 ? 'active' : 'upcoming',
                    ];
                }
            }
        }
        if ($planSteps === []) {
            $planSteps = [
                ['id' => 'step_1', 'label' => 'Siapkan materi kreatif & copywriting sesuai positioning Livora', 'state' => 'active'],
                ['id' => 'step_2', 'label' => 'Aktifkan distribusi & pantau konversi konsultasi/WA LiviBot', 'state' => 'upcoming'],
                ['id' => 'step_3', 'label' => 'Evaluasi CPL, ROAS, dan tutup kebocoran funnel 7 hari pertama', 'state' => 'upcoming'],
            ];
        }

        $campaign = AiCampaign::create([
            'name' => $name,
            'channel' => $channel,
            'summary' => (string) ($op['summary'] ?? 'Kampanye berorientasi profit & konversi yang dibuat lewat Ask AI.'),
            'budget_daily' => ! empty($op['budget_daily']) ? (string) $op['budget_daily'] : null,
            'health' => $health,
            'status' => $status,
            'goals' => is_array($op['goals'] ?? null) ? $op['goals'] : [],
            'plan' => $planSteps,
            'active_experiments' => [],
            'related_recommendation_ids' => [],
            'spark' => [],
            'metric' => [
                'label' => 'Status',
                'value' => $status,
                'deltaLabel' => 'Dibuat via Ask AI',
                'deltaDirection' => 'flat',
            ],
        ]);

        return [
            'type' => 'create_campaign',
            'status' => 'ok',
            'title' => "Campaign Dibuat: {$campaign->name}",
            'detail' => "{$campaign->channel} · Status: {$campaign->status}",
            'href' => "/admin/ai-marketing/campaigns/{$campaign->id}",
        ];
    }

    private function opUpdateCampaign(array $op): array
    {
        $id = (int) ($op['id'] ?? $op['campaign_id'] ?? 0);
        $campaign = $id > 0 ? AiCampaign::find($id) : AiCampaign::latest('updated_at')->first();
        if (! $campaign) {
            throw new \RuntimeException('Campaign tidak ditemukan.');
        }

        $updates = [];
        foreach (['status', 'health', 'summary', 'budget_daily', 'plan', 'goals'] as $f) {
            if (array_key_exists($f, $op) && $op[$f] !== null) {
                $updates[$f] = $op[$f];
            }
        }
        $campaign->update($updates);

        return [
            'type' => 'update_campaign',
            'status' => 'ok',
            'title' => "Campaign Diperbarui: {$campaign->name}",
            'detail' => "Status: {$campaign->status} · Health: {$campaign->health}",
            'href' => "/admin/ai-marketing/campaigns/{$campaign->id}",
        ];
    }

    private function opSyncCampaigns(): array
    {
        $count = $this->campaignSync->sync();

        return [
            'type' => 'sync_campaigns',
            'status' => 'ok',
            'title' => 'Sinkronisasi Campaign Selesai',
            'detail' => "{$count} campaign disinkronkan dari data terbaru.",
            'href' => '/admin/ai-marketing/campaigns',
        ];
    }

    private function opRefreshImpact(): array
    {
        $updated = $this->impactTracker->refreshAll();
        $learned = $this->learning->syncFromImpact();

        return [
            'type' => 'refresh_impact',
            'status' => 'ok',
            'title' => 'Evaluasi Impact & Self-Learning Diperbarui',
            'detail' => "{$updated} metrik impact dihitung ulang · {$learned} pola pembelajaran diekstrak.",
            'href' => '/admin/ai-marketing/impact',
        ];
    }

    private function opAnalyzeMarket(array $op): array
    {
        $focus = trim((string) ($op['focus'] ?? $op['query'] ?? ''));
        $res = $this->market->analyze($focus, true);
        $ideasCount = count($res['externalContentIdeas'] ?? []);

        return [
            'type' => 'analyze_market',
            'status' => 'ok',
            'title' => 'Riset Pasar & Kompetitor Diperbarui',
            'detail' => "{$ideasCount} ide konten eksternal & tren estetika baru ditemukan.",
            'href' => '/admin/ai-marketing',
        ];
    }

    private function opRecommendVideos(array $op): array
    {
        $query = trim((string) ($op['query'] ?? $op['topic'] ?? ''));
        $res = $this->videoRecommender->recommend([
            'query' => $query !== '' ? $query : null,
            'mode' => $query !== '' ? 'topic' : 'auto_brand',
            'scope' => ($op['scope'] ?? 'external') === 'all' ? 'all' : 'external',
            'platforms' => ['instagram', 'youtube', 'tiktok'],
        ]);

        $recs = $res['recommendations'] ?? [];
        $savedTitle = null;

        if (! empty($op['save_top_to_queue']) && ! empty($recs[0]) && Schema::hasTable('ai_content_drafts')) {
            $top = $recs[0];
            $ad = $top['livoraAdaptation'] ?? [];
            $draft = AiContentDraft::create([
                'title' => $ad['conceptTitle'] ?? ('Video '.strtoupper($top['platform']).': '.$top['title']),
                'channel' => $ad['recommendedChannel'] ?? $top['platform'],
                'headline' => $ad['hook'] ?? $top['title'],
                'caption' => $ad['captionDraft'] ?? $top['description'],
                'body' => ($top['reason'] ?? '')."\nReferensi: ".($top['url'] ?? ''),
                'cta_label' => 'Jadwalkan Konsultasi',
                'status' => 'needs_review',
                'meta' => [
                    'reference_url' => $top['url'] ?? null,
                    'reference_platform' => $top['platform'] ?? null,
                    'brand_fit_score' => $top['brandFitScore'] ?? 85,
                ],
            ]);
            $savedTitle = $draft->title;
        }

        return [
            'type' => 'recommend_videos',
            'status' => 'ok',
            'title' => count($recs).' Rekomendasi Video Lintas Platform Ditemukan',
            'detail' => $savedTitle
                ? "Top konsep \"{$savedTitle}\" otomatis disimpan ke Content Queue."
                : 'Buka Content Agent untuk melihat link video, alasan AI, dan shot list.',
            'href' => '/admin/ai-marketing/content',
        ];
    }

    private function opDismissInsight(array $op): array
    {
        $id = (int) ($op['id'] ?? $op['insight_id'] ?? 0);
        $insight = AiInsight::find($id);
        if (! $insight) {
            throw new \RuntimeException('Insight tidak ditemukan.');
        }

        if (Schema::hasColumn('ai_insights', 'dismissed_at')) {
            $insight->update(['dismissed_at' => now()]);
        }

        return [
            'type' => 'dismiss_insight',
            'status' => 'ok',
            'title' => "Insight #{$insight->id} Disembunyikan",
            'detail' => $insight->title,
            'href' => '/admin/ai-marketing/insights',
        ];
    }

    private function opSetProviderPreference(array $op): array
    {
        $provider = strtolower(trim((string) ($op['provider'] ?? 'auto')));
        $val = in_array($provider, ['gemini', 'groq', 'anthropic'], true) ? $provider : null;
        AiSetting::set('preferred_ai_provider', $val);

        return [
            'type' => 'set_provider_preference',
            'status' => 'ok',
            'title' => 'Prioritas Provider AI Diperbarui',
            'detail' => $val ? 'Provider utama diatur ke '.strtoupper($val) : 'Mode urutan otomatis (Auto fallback)',
            'href' => '/admin/ai-marketing/providers',
        ];
    }

    private function opSaveLearningRule(array $op): array
    {
        $rule = trim((string) ($op['rule'] ?? $op['instruction'] ?? ''));
        if ($rule === '') {
            throw new \InvalidArgumentException('Isi aturan pembelajaran tidak boleh kosong.');
        }
        $category = (string) ($op['category'] ?? 'profit_focus');
        $saved = $this->learning->addRule($rule, $category, 'admin_chat');

        return [
            'type' => 'save_learning_rule',
            'status' => 'ok',
            'title' => 'Aturan Strategi & Pembelajaran AI Disimpan',
            'detail' => "[{$saved['category']}] {$saved['rule']}",
            'href' => '/admin/ai-marketing',
        ];
    }

    private function opRecordIgBoost(array $op): array
    {
        $spendRp = (float) ($op['spendRp'] ?? $op['spend_rp'] ?? $op['spend'] ?? 0);
        if ($spendRp <= 0) {
            throw new \InvalidArgumentException('Nominal biaya Boost IG harus lebih dari Rp 0.');
        }

        $entry = $this->learning->addIgBoostEntry([
            'title' => $op['title'] ?? 'Instagram Boost Post',
            'spendRp' => $spendRp,
            'date' => $op['date'] ?? now()->toDateString(),
            'reach' => (int) ($op['reach'] ?? 0),
            'clicks' => (int) ($op['clicks'] ?? 0),
            'leads' => (int) ($op['leads'] ?? 0),
            'notes' => $op['notes'] ?? null,
        ]);

        return [
            'type' => 'record_ig_boost',
            'status' => 'ok',
            'title' => 'Biaya Instagram Boost Dicatat & ROI Dihitung',
            'detail' => sprintf('%s · Rp %s (%s)', $entry['title'], number_format((float) $entry['spendRp'], 0, ',', '.'), $entry['date']),
            'href' => '/admin/ai-marketing/ads',
        ];
    }
}
