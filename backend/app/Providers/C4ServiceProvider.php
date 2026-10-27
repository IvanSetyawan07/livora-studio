<?php

namespace App\Providers;

use App\Http\Controllers\Api\Admin\C4Controller;
use App\Http\Controllers\Api\C4IngestController;
use App\Services\C4\C4AutoSync;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Database\Events\MigrationsEnded;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

/**
 * Daftarkan di config/app.php → 'providers': App\Providers\C4ServiceProvider::class
 * Modul ini mandiri: route, jadwal, dan pemicu sync semuanya didaftarkan di sini.
 */
class C4ServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../../config/c4.php', 'c4');
    }

    public function boot(): void
    {
        if (!config('c4.enabled', true)) {
            return;
        }

        $this->registerRoutes();

        if ($this->app->runningInConsole()) {
            $this->commands([\App\Console\Commands\C4Sync::class]);

            // Otomatis: tiap jam (atau sesuai config)
            if (config('c4.schedule.enabled')) {
                $this->app->booted(function () {
                    $freq = (string) config('c4.schedule.frequency', 'hourly');
                    $event = $this->app->make(Schedule::class)->command('c4:sync --trigger=schedule');
                    method_exists($event, $freq) ? $event->{$freq}() : $event->hourly();
                    $event->withoutOverlapping()->runInBackground();
                });
            }
        }

        // Otomatis: setelah `php artisan migrate` (tabel baru langsung muncul di C4). Tidak pernah
        // membuat migrate gagal, dan dilewati saat unit test.
        if (config('c4.sync_on_migrate') && !$this->app->runningUnitTests()) {
            Event::listen(MigrationsEnded::class, function () {
                try {
                    if (Schema::hasTable('c4_elements')) {
                        $this->app->make(C4AutoSync::class)->run('migration');
                    }
                } catch (\Throwable $e) {
                    report($e);
                }
            });
        }
    }

    private function registerRoutes(): void
    {
        // Khusus Owner: diagram membuka struktur internal sistem.
        Route::prefix('api/admin/c4')
            ->middleware(['api', 'auth:sanctum', 'admin', 'admin_role:owner'])
            ->group(function () {
                $c = C4Controller::class;
                Route::get('graph', [$c, 'graph']);

                Route::post('elements', [$c, 'storeElement']);
                Route::put('elements/{element}', [$c, 'updateElement']);
                Route::delete('elements/{element}', [$c, 'destroyElement']);
                Route::post('elements/{element}/reset', [$c, 'resetElement']);

                Route::post('relations', [$c, 'storeRelation']);
                Route::put('relations/{relation}', [$c, 'updateRelation']);
                Route::delete('relations/{relation}', [$c, 'destroyRelation']);
                Route::post('relations/{relation}/reset', [$c, 'resetRelation']);

                Route::post('domains', [$c, 'storeDomain']);
                Route::put('domains/{domain}', [$c, 'updateDomain']);
                Route::delete('domains/{domain}', [$c, 'destroyDomain']);

                Route::get('layouts', [$c, 'layouts']);
                Route::put('layouts', [$c, 'saveLayout']);
                Route::delete('layouts', [$c, 'resetLayout']);

                Route::post('sync', [$c, 'sync'])->middleware('throttle:10,1');
                Route::get('sync-runs', [$c, 'syncRuns']);
                Route::post('purge-stale', [$c, 'purgeStale']);
                Route::post('ingest/frontend', [$c, 'ingestFrontend']);
            });

        // Untuk CI (token statis), tidak butuh login.
        Route::prefix('api/c4')->middleware(['api', 'throttle:30,1'])->group(function () {
            Route::post('ingest/frontend', [C4IngestController::class, 'frontend']);
        });
    }
}
