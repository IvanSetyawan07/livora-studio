<?php

namespace App\Services;

/**
 * Sapaan pelanggan/tamu Livora: selalu "Bapak/Ibu", tidak pernah "Kak"/"Kakak".
 * Dipakai sebagai pengaman terakhir pada teks keluaran AI dan teks lama yang sudah tersimpan di database.
 */
class Sapaan
{
    public const DEFAULT = 'Bapak/Ibu';

    public static function normalize(?string $text): string
    {
        $text = (string) $text;
        if ($text === '') return '';
        $text = (string) preg_replace('/\b(?:kakak|kak)\b/iu', self::DEFAULT, $text);

        // "Bapak/Ibu Bapak/Ibu" (akibat penggantian berlapis) dijadikan satu
        return (string) preg_replace('/\b(?:Bapak\/Ibu[\s,]+)+(?=Bapak\/Ibu)/u', '', $text);
    }
}
