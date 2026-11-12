<?php

namespace App\Console\Commands;

use App\Services\ImageOptimizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Mengonversi gambar PNG/JPG lama di storage publik menjadi WebP berkualitas tinggi
 * dan memperbarui referensi path-nya di database secara otomatis.
 */
class OptimizeStorageImages extends Command
{
    protected $signature = 'livora:optimize-images
                            {--quality=88 : Kualitas WebP (1-100)}
                            {--max=1920 : Dimensi sisi terpanjang maksimal (px)}
                            {--keep : Jangan hapus file PNG/JPG lama}';

    protected $description = 'Konversi gambar PNG/JPG di storage publik ke WebP dan perbarui path di database';

    /** @var array<int, array{0: string, 1: array<int, string>, 2: bool}> [tabel, kolom[], pakai prefix /storage/] */
    protected array $targets = [
        ['projects', ['hero_image'], true],
        ['project_photos', ['image'], true],
        ['project_spaces', ['image'], true],
        ['project_layouts', ['image'], true],
        ['project_rooms', ['image'], true],
        ['items', ['image'], true],
        ['item_variants', ['preview_image', 'furniture_image'], true],
        ['item_galleries', ['image'], true],
        ['item_lifestyles', ['image'], true],
        ['item_stories', ['feature_image'], true],
        ['collections', ['hero_banner', 'card_banner', 'featured_image', 'story_banner'], true],
        ['collection_packages', ['banner'], true],
        ['catalogs', ['cover_image'], false],
    ];

    public function handle(): int
    {
        if (!extension_loaded('gd') || !function_exists('imagewebp')) {
            $this->error('Ekstensi PHP GD dengan dukungan WebP tidak aktif di server ini.');
            return self::FAILURE;
        }

        $quality = max(50, min(95, (int) $this->option('quality')));
        $maxDim = max(600, min(2560, (int) $this->option('max')));
        $deleteOld = !$this->option('keep');

        $converted = 0;
        $found = 0;
        $skipped = 0;

        foreach ($this->targets as [$table, $cols, $prefixStorage]) {
            if (!Schema::hasTable($table)) continue;

            foreach ($cols as $col) {
                if (!Schema::hasColumn($table, $col)) continue;

                $rows = DB::table($table)
                    ->whereNotNull($col)
                    ->where(fn ($q) => $q->where($col, 'like', '%.png')->orWhere($col, 'like', '%.jpg')->orWhere($col, 'like', '%.jpeg'))
                    ->get(['id', $col]);

                foreach ($rows as $row) {
                    $found++;
                    $val = (string) $row->{$col};
                    $reason = null;
                    $newRel = ImageOptimizer::convertExisting($val, $maxDim, $quality, $deleteOld, $reason);
                    if (!$newRel) {
                        $skipped++;
                        $this->warn("Lewati [{$table}.{$col}#{$row->id}] {$val}: ".($reason ?? 'alasan tidak diketahui'));
                        continue;
                    }

                    $dbVal = $prefixStorage ? '/storage/'.$newRel : $newRel;
                    DB::table($table)->where('id', $row->id)->update([$col => $dbVal]);
                    $converted++;
                    $this->line("[{$table}.{$col}#{$row->id}] {$val} -> {$dbVal}");
                }
            }
        }

        $this->info("Ditemukan: {$found} baris | Dikonversi: {$converted} | Dilewati: {$skipped} (quality {$quality}, max {$maxDim}px).");

        return self::SUCCESS;
    }
}
