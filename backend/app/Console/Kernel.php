<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        $schedule->command('shop:expire')->everyFifteenMinutes();
        $schedule->command('shop:maintenance')->dailyAt('02:00');
        // Google Sheets: kirim ulang order/dokumen yang gagal atau berubah (jaring pengaman untuk pengiriman real-time).
        $schedule->command('shop:sheets-sync')->everyFiveMinutes()->withoutOverlapping();
        // Notifikasi admin: pengingat 50%, eskalasi 100%, kirim ringkasan luar jam kerja.
        $schedule->call(fn () => \App\Services\Shop\NotifyService::tick())->everyMinute();

        // AI Marketing: analisis terjadwal & evaluasi dampak 7/14/30 hari.
        $schedule->command('ai:run-agent leads --limit=5')->dailyAt('07:00')->withoutOverlapping();
        $schedule->command('ai:run-agent cro --limit=5')->dailyAt('07:15')->withoutOverlapping();
        $schedule->command('ai:run-agent seo --limit=5')->weeklyOn(1, '07:30')->withoutOverlapping();
        $schedule->command('ai:run-agent content --limit=5')->twiceWeekly(2, 5, '07:45')->withoutOverlapping();
        $schedule->command('ai:run-agent ads --limit=5')->dailyAt('08:00')->withoutOverlapping();
        $schedule->command('ai:refresh-impact')->dailyAt('08:30')->withoutOverlapping();
        // $schedule->command('inspire')->hourly();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
