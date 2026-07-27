<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admins = [
            ['email' => 'admin.bagusivan@gmail.com', 'name' => 'Admin 3', 'password' => 'adminivan3'],
            ['email' => 'admin.raineradriand@gmail.com', 'name' => 'Admin 2', 'password' => 'adminrainer4'],
            ['email' => 'admin.lala@gmail.com', 'name' => 'Admin 5', 'password' => 'adminlala5'],
            ['email' => 'admin.adit@gmail.com', 'name' => 'Admin 6', 'password' => 'adminadit6'],
            ['email' => 'admin.cinde@gmail.com', 'name' => 'Admin 1', 'password' => 'admincinde1'],
            ['email' => 'admin.christie@gmail.com', 'name' => 'Admin 2', 'password' => 'adminchristie2'],
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