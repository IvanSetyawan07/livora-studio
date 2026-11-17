<?php

namespace App\Console\Commands;

use App\Services\AI\ImpactTrackerService;
use Illuminate\Console\Command;

class RefreshAiImpact extends Command
{
    protected $signature = 'ai:refresh-impact';

    protected $description = 'Perbarui metrik 7/14/30 hari pada ai_impact_records dari data DB aktual';

    public function handle(ImpactTrackerService $tracker): int
    {
        $updated = $tracker->refreshAll();
        $this->info("Impact records diperbarui: {$updated}");

        return self::SUCCESS;
    }
}
