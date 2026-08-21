<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class SeedDummyUsers extends Command
{
    protected $signature = 'dummy:seed';
    protected $description = 'Create 20 dummy user accounts';

    public function handle()
    {
        $accounts = [
            ['dummy1@livoralcr.com','fdbydc87YF'],
            ['dummy2@livoralcr.com','0YJWXgTxkW'],
            ['dummy3@livoralcr.com','HHl6VcIExD'],
            ['dummy4@livoralcr.com','0z97K6i2CQ'],
            ['dummy5@livoralcr.com','PqeBFm3fLF'],
            ['dummy6@livoralcr.com','67yoFA0TH6'],
            ['dummy7@livoralcr.com','gIxHf0kv8v'],
            ['dummy8@livoralcr.com','8JQsFFKurS'],
            ['dummy9@livoralcr.com','RoPnsxRmgW'],
            ['dummy10@livoralcr.com','sYmCtqCO05'],
            ['dummy11@livoralcr.com','XGQ4sDf0ym'],
            ['dummy12@livoralcr.com','gG3GKRHQgu'],
            ['dummy13@livoralcr.com','Yh0gyzxE0z'],
            ['dummy14@livoralcr.com','MOj2Yodw47'],
            ['dummy15@livoralcr.com','PbnDSrpgiB'],
            ['dummy16@livoralcr.com','AXVNHrHqCl'],
            ['dummy17@livoralcr.com','7nokFpY10J'],
            ['dummy18@livoralcr.com','7jWkDOW5gT'],
            ['dummy19@livoralcr.com','NCkp1sOIRX'],
            ['dummy20@livoralcr.com','DFSNCEGPL5'],
        ];

        foreach ($accounts as $i => [$email, $pass]) {
            if (User::where('email', $email)->exists()) {
                $this->warn("Skip {$email}, sudah ada.");
                continue;
            }

            User::create([
                'name' => 'Dummy User ' . ($i + 1),
                'email' => $email,
                'password' => bcrypt($pass),
                'email_verified_at' => now(),
            ]);

            $this->info("Created: {$email}");
        }

        $this->info('Selesai — 20 dummy account dibuat.');
    }
}