<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admins = [
            ['email' => 'admin.bagusivan@gmail.com', 'name' => 'Admin', 'password' => 'adminivan1'],
            ['email' => 'admin.raineradriand@gmail.com', 'name' => 'Admin 2', 'password' => 'adminrainer2'],
            ['email' => 'admin.lala@gmail.com', 'name' => 'Admin', 'password' => 'adminlala3'],
            ['email' => 'admin.adit@gmail.com', 'name' => 'Admin', 'password' => 'adminadit4'],
            ['email' => 'admin.cinde@gmail.com', 'name' => 'Admin', 'password' => 'admincinde5'],
            ['email' => 'admin.christie@gmail.com', 'name' => 'Admin', 'password' => 'adminchristie6'],
        ];

        foreach ($admins as $admin) {
            \App\Models\User::updateOrCreate(
                ['email' => $admin['email']],
                [
                    'name' => $admin['name'],
                    'password' => $admin['password'], // auto-hash via $casts
                    'role' => 'admin',
                ]
            );
        }

        $this->call([
            LivoraSeeder::class,
        ]);
    }
}