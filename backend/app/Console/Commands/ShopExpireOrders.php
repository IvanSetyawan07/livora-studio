<?php

namespace App\Console\Commands;

use App\Services\Shop\ShopOrderService;
use Illuminate\Console\Command;

class ShopExpireOrders extends Command
{
    protected $signature = 'shop:expire';

    protected $description = 'Kedaluwarsakan penawaran/tagihan/pesanan yang lewat batas dan lepas stok yang ditahan';

    public function handle(ShopOrderService $service): int
    {
        $this->info($service->expireStale().' pesanan dikedaluwarsakan.');

        return self::SUCCESS;
    }
}
