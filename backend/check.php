<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== Catalog dengan slug 'serenade-orange' (termasuk soft-deleted) ===\n";
$catalogs = App\Models\Catalog::withTrashed()
    ->where('slug', 'serenade-orange')
    ->get(['id', 'title', 'slug', 'deleted_at']);
echo $catalogs->toJson(JSON_PRETTY_PRINT) . "\n\n";

echo "=== Catalog id = 2 (termasuk soft-deleted) ===\n";
$catalog2 = App\Models\Catalog::withTrashed()->find(2, ['id', 'title', 'slug', 'deleted_at']);
echo $catalog2 ? $catalog2->toJson(JSON_PRETTY_PRINT) . "\n\n" : "TIDAK DITEMUKAN\n\n";

echo "=== Semua hotspot untuk catalog_id = 2 ===\n";
$hotspots = App\Models\Hotspot::where('catalog_id', 2)->get();
echo $hotspots->toJson(JSON_PRETTY_PRINT) . "\n\n";

echo "=== Total semua hotspot di database ===\n";
echo App\Models\Hotspot::count() . "\n\n";

echo "=== Semua catalog (ringkas) ===\n";
$allCatalogs = App\Models\Catalog::withTrashed()->get(['id', 'title', 'slug', 'deleted_at']);
echo $allCatalogs->toJson(JSON_PRETTY_PRINT) . "\n";
