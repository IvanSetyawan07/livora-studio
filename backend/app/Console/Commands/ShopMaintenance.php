<?php

namespace App\Console\Commands;

use App\Models\ShopPayment;
use App\Services\Shop\AftercareService;
use App\Services\Shop\MidtransGateway;
use App\Services\Shop\ShopOrderService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/** Rekonsiliasi harian Midtrans ↔ database + retensi data (UU PDP). */
class ShopMaintenance extends Command
{
    protected $signature = 'shop:maintenance';
    protected $description = 'Rekonsiliasi pembayaran QRIS dan hapus data lama sesuai masa retensi';

    public function handle(ShopOrderService $orders, AftercareService $after): int
    {
        $fixed = 0;
        if (MidtransGateway::configured()) {
            $base = config('services.midtrans.is_production') ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
            foreach (ShopPayment::whereIn('status', ['pending', 'expired'])->whereNotNull('gateway_ref')->where('created_at', '>', now()->subDays(7))->get() as $p) {
                $res = Http::withBasicAuth(config('services.midtrans.server_key'), '')->acceptJson()->timeout(15)->get("$base/v2/{$p->gateway_ref}/status");
                if (in_array($res->json('transaction_status'), ['settlement', 'capture'], true) && (int) round((float) $res->json('gross_amount')) === (int) $p->amount) {
                    $orders->markPaid($p, 'QRIS', $res->json('transaction_id'));
                    $fixed++;
                }
            }
        }
        $purged = $after->purgeOldData();
        $this->info("Rekonsiliasi: {$fixed} pembayaran diperbaiki. Retensi: ".json_encode($purged));

        return self::SUCCESS;
    }
}
