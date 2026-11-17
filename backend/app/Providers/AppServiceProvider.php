<?php

namespace App\Providers;

use App\Services\AI\Actions\ActionExecutorRegistry;
use App\Services\AI\Actions\ContentActionExecutor;
use App\Services\AI\Actions\FollowUpActionExecutor;
use App\Services\AI\Actions\MetaCampaignActionExecutor;
use App\Services\AI\AIProviderManager;
use App\Services\Marketing\MetaAdsClient;
use App\Services\AI\Actions\OnPageActionExecutor;
use App\Services\AI\Actions\OtherActionExecutor;
use App\Services\AI\Actions\ProcessChangeActionExecutor;
use App\Services\AI\Actions\TechnicalSeoActionExecutor;
use App\Services\AI\Actions\TrainingActionExecutor;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Daftarin semua ActionExecutor nyata & draft checklist di sini.
        // Action_type yang tidak terdaftar tetap mengembalikan HTTP 422 eksplisit.
        $this->app->singleton(ActionExecutorRegistry::class, function ($app) {
            return new ActionExecutorRegistry([
                $app->make(OnPageActionExecutor::class),
                $app->make(TechnicalSeoActionExecutor::class),
                $app->make(ContentActionExecutor::class),
                $app->make(ProcessChangeActionExecutor::class),
                $app->make(FollowUpActionExecutor::class),
                $app->make(TrainingActionExecutor::class),
                $app->make(OtherActionExecutor::class),
                // Tindakan nyata ke Meta Ads (pause/activate/daily budget, dibatasi AI_MAX_BUDGET_CHANGE_PCT).
                new MetaCampaignActionExecutor('budget_shift', $app->make(AIProviderManager::class), $app->make(MetaAdsClient::class)),
                new MetaCampaignActionExecutor('campaign', $app->make(AIProviderManager::class), $app->make(MetaAdsClient::class)),
            ]);
        });
    }

    public function boot(): void
    {
        JsonResource::withoutWrapping();
    }
}