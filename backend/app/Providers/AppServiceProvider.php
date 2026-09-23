<?php

namespace App\Providers;

use App\Services\AI\Actions\ActionExecutorRegistry;
use App\Services\AI\Actions\OnPageActionExecutor;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Daftarin semua ActionExecutor yang sudah beneran diimplementasikan di sini.
        // Action_type yang belum punya baris di bawah akan tetap jujur 422
        // (lihat ActionExecutorRegistry) — jangan didaftarin sampai eksekutornya jadi.
        $this->app->singleton(ActionExecutorRegistry::class, function ($app) {
            return new ActionExecutorRegistry([
                $app->make(OnPageActionExecutor::class),
            ]);
        });
    }

    public function boot(): void
    {
        JsonResource::withoutWrapping();
    }
}