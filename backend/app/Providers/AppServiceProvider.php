<?php

namespace App\Providers;

use App\Services\AI\Actions\ActionExecutorRegistry;
use App\Services\AI\Actions\ContentActionExecutor;
use App\Services\AI\Actions\FollowUpActionExecutor;
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
        // Daftarin semua ActionExecutor yang sudah beneran diimplementasikan di sini.
        // Action_type yang belum punya baris di bawah akan tetap jujur 422
        // (lihat ActionExecutorRegistry) — jangan didaftarin sampai eksekutornya jadi.
        //
        // technical_seo / content / process_change / follow_up / training / other
        // dijalankan lewat AbstractDraftActionExecutor: AI menghasilkan checklist
        // konkret siap kerja, BUKAN publish otomatis ke sistem — activity log
        // mencatatnya jujur sebagai draft, sama seperti pola OnPageActionExecutor.
        //
        // budget_shift & campaign SENGAJA tidak didaftarkan: itu menyangkut duit
        // beneran di ads platform, jangan dikasih eksekutor palsu — biarkan 422
        // sampai integrasi tulis Google/Meta Ads-nya benar-benar jadi.
        $this->app->singleton(ActionExecutorRegistry::class, function ($app) {
            return new ActionExecutorRegistry([
                $app->make(OnPageActionExecutor::class),
                $app->make(TechnicalSeoActionExecutor::class),
                $app->make(ContentActionExecutor::class),
                $app->make(ProcessChangeActionExecutor::class),
                $app->make(FollowUpActionExecutor::class),
                $app->make(TrainingActionExecutor::class),
                $app->make(OtherActionExecutor::class),
            ]);
        });
    }

    public function boot(): void
    {
        JsonResource::withoutWrapping();
    }
}