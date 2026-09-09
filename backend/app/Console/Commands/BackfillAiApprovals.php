<?php

namespace App\Console\Commands;

use App\Models\AiApproval;
use App\Models\AiRecommendation;
use Illuminate\Console\Command;

class BackfillAiApprovals extends Command
{
    protected $signature = 'ai:backfill-approvals';

    protected $description = 'Buat baris ai_approvals untuk recommendation lama yang belum punya pendamping';

    public function handle(): int
    {
        $created = 0;

        AiRecommendation::query()
            ->whereDoesntHave('approvals')
            ->chunkById(200, function ($recs) use (&$created) {
                foreach ($recs as $rec) {
                    AiApproval::ensureForRecommendation($rec);
                    $created++;
                }
            });

        $this->info("{$created} approval dibuat.");

        return self::SUCCESS;
    }
}
