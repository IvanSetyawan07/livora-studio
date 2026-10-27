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
        // Sebar Undangan: tarik pendaftar Google Form dari Sheet.
        $schedule->command('invite:pull-sheets')->everyTenMinutes()->withoutOverlapping();
        $schedule->call(fn () => \App\Services\Shop\NotifyService::tick())->everyMinute();
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
