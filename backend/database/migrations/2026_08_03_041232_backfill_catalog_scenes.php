<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $now = now();
        DB::table('catalogs')->orderBy('id')->chunk(50, function ($catalogs) use ($now) {
            foreach ($catalogs as $catalog) {
                if (!empty($catalog->scene_1_image)) {
                    DB::table('catalog_scenes')->insert([
                        'catalog_id' => $catalog->id,
                        'scene_key'  => 'scene-1',
                        'image'      => $catalog->scene_1_image,
                        'order'      => 1,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
                if (!empty($catalog->scene_2_image)) {
                    DB::table('catalog_scenes')->insert([
                        'catalog_id' => $catalog->id,
                        'scene_key'  => 'scene-2',
                        'image'      => $catalog->scene_2_image,
                        'order'      => 2,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        });
    }

    public function down(): void {}
};