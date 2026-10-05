<?php

namespace App\Services\Shop;

use Illuminate\Support\Facades\DB;

/** NNN/INV/LCR-LF-AH/<bulan romawi>/<tahun>, reset tiap bulan, tidak pernah dipakai ulang. */
class DocumentNumber
{
    private const ROMAN = [1 => 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

    public static function format(int $seq, \DateTimeInterface $date, string $type = 'INV'): string
    {
        $division = config('services.shop.doc_division', 'LF');
        $initials = config('services.shop.doc_admin_initials', 'AH');

        return sprintf('%03d/%s/LCR-%s-%s/%s/%s', $seq, $type, $division, $initials,
            self::ROMAN[(int) $date->format('n')], $date->format('Y'));
    }

    /** Harus dipanggil di dalam DB::transaction. */
    public static function next(string $type = 'INV', ?\DateTimeInterface $date = null): string
    {
        $date ??= now();
        $year = (int) $date->format('Y');
        $month = (int) $date->format('n');

        DB::table('document_counters')->insertOrIgnore(['type' => $type, 'year' => $year, 'month' => $month, 'last_value' => 0]);
        $row = DB::table('document_counters')->where(compact('type', 'year', 'month'))->lockForUpdate()->first();
        $next = (int) $row->last_value + 1;
        DB::table('document_counters')->where('id', $row->id)->update(['last_value' => $next]);

        return self::format($next, $date, $type);
    }
}
