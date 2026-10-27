<?php

namespace App\Console\Commands;

use App\Models\InviteEvent;
use App\Services\Invite\InviteService;
use Illuminate\Console\Command;

/** Tarik pendaftar Google Form (via Sheet) untuk semua acara aktif. */
class InvitePullSheets extends Command
{
    protected $signature = 'invite:pull-sheets';

    protected $description = 'Tarik pendaftar dari Google Sheet ke daftar tamu undangan';

    public function handle(): int
    {
        foreach (InviteEvent::where('is_active', true)->whereNotNull('sheet_csv_url')->get() as $e) {
            try {
                $r = InviteService::pullSheet($e);
                $filled = InviteService::autoFillSheetGuests($e);
                $this->info("{$e->name}: +{$r['added']} baru, {$r['updated']} diubah, {$filled} deskripsi diisi");
            } catch (\Throwable $ex) {
                $this->warn("{$e->name}: {$ex->getMessage()}");
            }
        }

        return self::SUCCESS;
    }
}