<?php

namespace App\Services\AI\Actions;

use App\Models\AiRecommendation;
use App\Services\AI\AIProviderManager;
use App\Services\Marketing\MetaAdsClient;
use RuntimeException;

/**
 * Eksekutor NYATA untuk "budget_shift" dan "campaign": mengubah campaign di
 * Meta Ads (Facebook + Instagram) lewat Marketing API.
 *
 * Operasi yang diizinkan (sengaja sempit):
 *  - pause            : status -> PAUSED
 *  - activate         : status -> ACTIVE
 *  - set_daily_budget : daily_budget baru, dibatasi ±AI_MAX_BUDGET_CHANGE_PCT (default 30%)
 *
 * Pengaman:
 *  - campaign harus milik META_ADS_ACCOUNT_ID.
 *  - tidak pernah membuat campaign baru / menaikkan budget di luar batas.
 *  - nilai lama dibaca langsung dari Meta dan disimpan sebagai {before, after}.
 */
class MetaCampaignActionExecutor implements ActionExecutor
{
    public function __construct(
        private string $type,
        private AIProviderManager $ai,
        private MetaAdsClient $meta,
    ) {
    }

    public function handles(): string
    {
        return $this->type;
    }

    public function execute(AiRecommendation $recommendation): ExecutionResult
    {
        if (! $this->meta->isConfigured()) {
            throw new ActionNotExecutableException(
                'Meta Ads belum tersambung, jadi tidak ada campaign yang bisa diubah. '
                .'Hubungkan Meta Ads di Settings (izin ads_management) lalu coba lagi.'
            );
        }

        $plan = $this->plan($recommendation);
        $campaign = $this->meta->campaign($plan['campaign_id']);

        if ($campaign['account_id'] !== $this->meta->accountId()) {
            throw new ActionNotExecutableException("Campaign {$plan['campaign_id']} bukan milik ad account Livora. Eksekusi dibatalkan.");
        }

        $before = ['campaign_id' => $campaign['id'], 'name' => $campaign['name'], 'status' => $campaign['status'], 'daily_budget' => $campaign['daily_budget']];
        $fields = [];

        switch ($plan['operation']) {
            case 'pause':
                $fields['status'] = 'PAUSED';
                break;
            case 'activate':
                $fields['status'] = 'ACTIVE';
                break;
            case 'set_daily_budget':
                if ($campaign['daily_budget'] === null) {
                    throw new ActionNotExecutableException(
                        "Campaign \"{$campaign['name']}\" memakai budget di level ad set / lifetime, bukan daily budget campaign. Ubah manual di Ads Manager."
                    );
                }
                $new = (int) round((float) $plan['value']);
                $maxPct = (float) env('AI_MAX_BUDGET_CHANGE_PCT', 30);
                $old = $campaign['daily_budget'];
                $changePct = $old > 0 ? abs($new - $old) / $old * 100 : 100;
                if ($new <= 0 || $changePct > $maxPct) {
                    throw new ActionNotExecutableException(sprintf(
                        'Perubahan budget %s → %s (%.0f%%) melebihi batas aman %.0f%%. Tidak ada yang diubah — lakukan manual di Ads Manager kalau memang disengaja.',
                        number_format($old, 0, ',', '.'), number_format($new, 0, ',', '.'), $changePct, $maxPct
                    ));
                }
                $fields['daily_budget'] = $new;
                break;
        }

        $this->meta->updateCampaign($campaign['id'], $fields);

        // Baca ulang dari Meta supaya "after" benar-benar kondisi di platform.
        $fresh = $this->meta->campaign($campaign['id']);
        $after = ['campaign_id' => $fresh['id'], 'name' => $fresh['name'], 'status' => $fresh['status'], 'daily_budget' => $fresh['daily_budget']];

        $summary = "Campaign Meta Ads \"{$campaign['name']}\" ({$campaign['id']}) diubah langsung di Meta.\n"
            ."Operasi: {$plan['operation']}. Status {$before['status']} → {$after['status']}, "
            .'daily budget '.($before['daily_budget'] ?? '-').' → '.($after['daily_budget'] ?? '-').".\n"
            ."Alasan AI: {$plan['reason']}";

        return ExecutionResult::changed($summary, $before, $after);
    }

    /** @return array{campaign_id: string, operation: string, value: ?float, reason: string} */
    private function plan(AiRecommendation $rec): array
    {
        $campaigns = collect($this->meta->campaignList())
            ->map(fn ($c) => "- {$c['id']} | {$c['name']} | {$c['status']} | daily_budget=".($c['daily_budget'] ?? '-'))
            ->implode("\n");

        if ($campaigns === '') {
            throw new ActionNotExecutableException('Ad account Meta tidak punya campaign, tidak ada yang bisa diubah.');
        }

        $prompt = <<<TXT
Terjemahkan rekomendasi iklan ini menjadi SATU operasi pada campaign Meta Ads yang ada.

Rekomendasi: {$rec->title}
Deskripsi : {$rec->description}
Langkah   : {$rec->suggested_action}
Perubahan : {$rec->change_from} -> {$rec->change_to}

Campaign yang tersedia (id | nama | status | daily_budget dalam satuan mata uang akun):
{$campaigns}

Operasi yang diizinkan: pause, activate, set_daily_budget.
Balas HANYA JSON: {"campaign_id":"...","operation":"...","value":angka_atau_null,"reason":"..."}
Kalau rekomendasi tidak bisa dipetakan ke salah satu operasi itu, balas {"operation":"none","reason":"..."}.
TXT;

        $res = $this->ai->ask('Kamu adalah spesialis Meta Ads untuk Livora Studio. Jawab hanya JSON valid.', $prompt, 'ads');
        $text = trim((string) ($res['text'] ?? ''));
        if (preg_match('/\{.*\}/s', $text, $m)) {
            $text = $m[0];
        }
        $json = json_decode($text, true);

        if (! is_array($json)) {
            throw new RuntimeException('Respons AI tidak bisa dibaca sebagai rencana eksekusi. Tidak ada yang diubah di Meta.');
        }
        if (($json['operation'] ?? 'none') === 'none' || ! in_array($json['operation'], ['pause', 'activate', 'set_daily_budget'], true)) {
            throw new ActionNotExecutableException('Rekomendasi ini tidak bisa dijalankan otomatis di Meta Ads: '.($json['reason'] ?? 'tidak ada operasi yang cocok').'.');
        }
        if (empty($json['campaign_id'])) {
            throw new RuntimeException('AI tidak menyebut campaign target. Tidak ada yang diubah.');
        }

        return [
            'campaign_id' => (string) $json['campaign_id'],
            'operation' => $json['operation'],
            'value' => isset($json['value']) ? (float) $json['value'] : null,
            'reason' => (string) ($json['reason'] ?? ''),
        ];
    }
}
