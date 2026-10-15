<?php

namespace App\Console\Commands;

use App\Services\Shop\SheetsSync;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ShopSheetsSync extends Command
{
    protected $signature = 'shop:sheets-sync
        {--ping : Tes koneksi ke Apps Script tab Pesanan (tidak menulis data)}
        {--all : Kirim ulang SEMUA order (isi data lama)}
        {--docs : Bersama --all: kirim ulang juga SEMUA dokumen ke Register Dokumen}
        {--limit=50 : Maksimal item per jalan (abaikan kalau --all)}';

    protected $description = 'Kirim order/dokumen yang belum (atau perlu di-update) ke Google Sheets; dijalankan scheduler tiap 5 menit';

    public function handle(): int
    {
        if ($this->option('ping')) {
            [$ok, $msg] = SheetsSync::ping();
            $ok ? $this->info($msg) : $this->error($msg);

            return $ok ? self::SUCCESS : self::FAILURE;
        }

        if (!SheetsSync::ordersEnabled() && !SheetsSync::docsEnabled()) {
            $this->warn('SHOP_SHEETS_ORDERS_URL dan SHOP_SHEETS_WEBHOOK_URL kosong — tidak ada yang dikirim.');

            return self::SUCCESS;
        }

        $all = (bool) $this->option('all');
        $limit = max(1, (int) $this->option('limit'));
        $failed = 0;

        if (SheetsSync::docsEnabled()) {
            $q = DB::table('shop_documents')->select('id')->orderBy('id');
            if (!($all && $this->option('docs'))) $q->whereNull('sheets_synced_at');
            if (!$all) $q->limit($limit);
            $ids = $q->pluck('id');
            $ok = 0;
            foreach ($ids as $id) { SheetsSync::syncDocument((int) $id) ? $ok++ : $failed++; }
            $this->info("Dokumen: {$ok} terkirim dari {$ids->count()}.");
        }

        if (SheetsSync::ordersEnabled()) {
            $q = DB::table('shop_orders')->select('id')->orderBy('id');
            if (!$all) {
                // belum pernah terkirim, atau berubah sejak terakhir terkirim
                $q->where(fn ($w) => $w->whereNull('sheets_synced_at')->orWhereColumn('updated_at', '>=', 'sheets_synced_at'));
                $q->limit($limit);
            }
            $ids = $q->pluck('id');
            $ok = 0;
            foreach ($ids as $id) {
                SheetsSync::syncOrder((int) $id) ? $ok++ : $failed++;
                if ($all) $this->line("  order #{$id} ".($ok + $failed).'/'.$ids->count());
            }
            $this->info("Order: {$ok} terkirim dari {$ids->count()}.");
        }

        if ($failed) $this->warn("{$failed} gagal — lihat storage/logs (cari \"Sinkron Google Sheets\"). Akan dicoba lagi otomatis.");

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
