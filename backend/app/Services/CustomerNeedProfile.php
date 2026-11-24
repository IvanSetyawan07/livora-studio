<?php

namespace App\Services;

/**
 * Menyimpan, menggabungkan, dan mengekstrak profil kebutuhan customer
 * (dipakai bersama oleh Livi Web Concierge dan Livi WhatsApp Bot).
 */
class CustomerNeedProfile
{
    public const SCALAR_KEYS = [
        'project_type',
        'service_interest',
        'space_or_dimension',
        'timeline',
        'location',
        'core_need_summary',
    ];

    public const ARRAY_KEYS = [
        'rooms',
        'furniture_needs',
        'style_preferences',
        'material_color_prefs',
    ];

    /**
     * Gabungkan profil lama dengan delta baru hasil pembelajaran AI (plus fallback ringan).
     * Nilai lama tetap dipertahankan kecuali diperbarui secara eksplisit.
     */
    public static function merge(array $existing, array $incoming, ?string $rawMessage = null): array
    {
        $base = self::normalize($existing);
        $delta = self::normalize($incoming);

        if ($rawMessage !== null && trim($rawMessage) !== '') {
            $heuristic = self::extractHeuristics($rawMessage);
            foreach (self::ARRAY_KEYS as $k) {
                if (!empty($heuristic[$k])) {
                    $delta[$k] = self::mergeUniqueList($delta[$k] ?? [], $heuristic[$k], 6);
                }
            }
            foreach (self::SCALAR_KEYS as $k) {
                if (empty($delta[$k]) && !empty($heuristic[$k]) && empty($base[$k])) {
                    $delta[$k] = $heuristic[$k];
                }
            }
        }

        $merged = $base;
        foreach (self::SCALAR_KEYS as $k) {
            if (!empty($delta[$k])) {
                $merged[$k] = $delta[$k];
            }
        }
        foreach (self::ARRAY_KEYS as $k) {
            $merged[$k] = self::mergeUniqueList($base[$k] ?? [], $delta[$k] ?? [], 6);
        }

        // Hapus key kosong agar JSON rapi dan ringkas
        return array_filter($merged, function ($v) {
            if (is_array($v)) {
                return count($v) > 0;
            }
            return $v !== null && $v !== '';
        });
    }

    public static function normalize(array $raw): array
    {
        $out = [];

        foreach (self::SCALAR_KEYS as $k) {
            if (!isset($raw[$k]) || !is_scalar($raw[$k])) {
                continue;
            }
            $val = trim((string) $raw[$k]);
            if ($val === '' || in_array(mb_strtolower($val), ['null', 'none', 'n/a', '-', 'belum diketahui', 'unknown'], true)) {
                continue;
            }
            $limit = $k === 'core_need_summary' ? 240 : 120;
            $out[$k] = mb_substr($val, 0, $limit);
        }

        foreach (self::ARRAY_KEYS as $k) {
            $val = $raw[$k] ?? [];
            if (is_string($val)) {
                $val = preg_split('/[,;]+/', $val) ?: [];
            }
            if (!is_array($val)) {
                continue;
            }
            $clean = [];
            foreach ($val as $item) {
                if (!is_scalar($item)) {
                    continue;
                }
                $s = trim((string) $item);
                if ($s === '' || in_array(mb_strtolower($s), ['null', 'none', 'n/a', '-'], true)) {
                    continue;
                }
                $clean[] = mb_substr($s, 0, 60);
            }
            $out[$k] = self::mergeUniqueList([], $clean, 6);
        }

        return $out;
    }

    /** Format ringkas untuk prompt AI agar Livi langsung paham profil user. */
    public static function toPromptText(array $profile): string
    {
        $p = self::normalize($profile);
        if (empty($p)) {
            return 'Belum ada profil kebutuhan tersimpan — pelajari pelan-pelan dari obrolan user tanpa terasa seperti menginterogasi.';
        }

        $lines = [];
        if (!empty($p['core_need_summary'])) {
            $lines[] = 'Ringkasan kebutuhan utama: ' . $p['core_need_summary'];
        }
        if (!empty($p['project_type'])) {
            $lines[] = 'Tipe properti/project: ' . $p['project_type'];
        }
        if (!empty($p['service_interest'])) {
            $lines[] = 'Layanan yang diminati: ' . $p['service_interest'];
        }
        if (!empty($p['rooms'])) {
            $lines[] = 'Ruangan: ' . implode(', ', $p['rooms']);
        }
        if (!empty($p['furniture_needs'])) {
            $lines[] = 'Furnitur dicari: ' . implode(', ', $p['furniture_needs']);
        }
        if (!empty($p['style_preferences'])) {
            $lines[] = 'Gaya/nuansa disukai: ' . implode(', ', $p['style_preferences']);
        }
        if (!empty($p['material_color_prefs'])) {
            $lines[] = 'Material/warna disukai: ' . implode(', ', $p['material_color_prefs']);
        }
        if (!empty($p['space_or_dimension'])) {
            $lines[] = 'Ukuran/ruang: ' . $p['space_or_dimension'];
        }
        if (!empty($p['timeline'])) {
            $lines[] = 'Timeline: ' . $p['timeline'];
        }
        if (!empty($p['location'])) {
            $lines[] = 'Lokasi: ' . $p['location'];
        }

        return implode("\n", $lines);
    }

    /** Ringkasan 1 baris untuk catatan handoff ke CS / Admin. */
    public static function toHandoffNote(array $profile): string
    {
        $p = self::normalize($profile);
        if (empty($p)) {
            return '';
        }
        if (!empty($p['core_need_summary'])) {
            return $p['core_need_summary'];
        }

        $parts = [];
        if (!empty($p['service_interest'])) $parts[] = $p['service_interest'];
        if (!empty($p['project_type'])) $parts[] = $p['project_type'];
        if (!empty($p['rooms'])) $parts[] = 'Ruang: ' . implode(', ', $p['rooms']);
        if (!empty($p['furniture_needs'])) $parts[] = 'Cari: ' . implode(', ', $p['furniture_needs']);
        if (!empty($p['style_preferences'])) $parts[] = 'Gaya: ' . implode(', ', $p['style_preferences']);
        if (!empty($p['location'])) $parts[] = 'Lokasi: ' . $p['location'];

        return implode(' · ', $parts);
    }

    /** Ekstrak keyword pencarian dari profil untuk membantu retrieval saat pesan pendek. */
    public static function toSearchTerms(array $profile): array
    {
        $p = self::normalize($profile);
        $terms = array_merge(
            $p['furniture_needs'] ?? [],
            $p['style_preferences'] ?? [],
            $p['material_color_prefs'] ?? [],
            $p['rooms'] ?? [],
        );

        $out = [];
        foreach ($terms as $t) {
            foreach (preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($t)) ?: [] as $w) {
                if (mb_strlen($w) >= 3) {
                    $out[] = $w;
                }
            }
        }

        return array_slice(array_values(array_unique($out)), 0, 8);
    }

    /** Ekstraksi sinyal dasar berbasis kata kunci agar tetap belajar walau pesan singkat. */
    private static function extractHeuristics(string $text): array
    {
        $lower = mb_strtolower($text);
        $out = [];

        $roomsMap = [
            'Living Room' => ['ruang tamu', 'living room', 'ruang keluarga', 'family room', 'lounge'],
            'Dining Room' => ['ruang makan', 'dining room', 'dining area'],
            'Bedroom'     => ['kamar tidur', 'kamar utama', 'master bedroom', 'bedroom'],
            'Home Office' => ['ruang kerja', 'home office', 'study room', 'kantor'],
            'Foyer'       => ['foyer', 'lobby', 'lobi', 'entryway'],
        ];
        foreach ($roomsMap as $label => $patterns) {
            foreach ($patterns as $pat) {
                if (str_contains($lower, $pat)) {
                    $out['rooms'][] = $label;
                    break;
                }
            }
        }

        $furnitureMap = [
            'Sofa'        => ['sofa', 'sectional', 'couch'],
            'Chair'       => ['kursi', 'armchair', 'lounge chair', 'chair', 'stool'],
            'Table'       => ['meja', 'coffee table', 'dining table', 'side table', 'console', 'table'],
            'Bed'         => ['tempat tidur', 'ranjang', 'kasur', 'bed frame', 'platform bed'],
            'Storage'     => ['lemari', 'credenza', 'cabinet', 'tv cabinet', 'rak', 'wardrobe'],
            'Lighting'    => ['lampu', 'pendant', 'floor lamp', 'lighting'],
            'Accessories' => ['karpet', 'cermin', 'aksesoris', 'accessories', 'dekorasi'],
        ];
        foreach ($furnitureMap as $label => $patterns) {
            foreach ($patterns as $pat) {
                if (preg_match('/\b' . preg_quote($pat, '/') . '\b/u', $lower)) {
                    $out['furniture_needs'][] = $label;
                    break;
                }
            }
        }

        $stylesMap = [
            'Japandi'        => ['japandi'],
            'Modern'         => ['modern'],
            'European'       => ['european', 'eropa', 'klasik modern'],
            'Scandinavian'   => ['scandinavian', 'nordic'],
            'Minimalist'     => ['minimalis', 'minimalist'],
            'Tropical Modern'=> ['tropis', 'tropical'],
            'Warm & Cozy'    => ['cozy', 'hangat', 'warm', 'tenang'],
        ];
        foreach ($stylesMap as $label => $patterns) {
            foreach ($patterns as $pat) {
                if (str_contains($lower, $pat)) {
                    $out['style_preferences'][] = $label;
                    break;
                }
            }
        }

        $materialsMap = [
            'Bouclé'     => ['boucle', 'bouclé'],
            'Linen'      => ['linen'],
            'Leather'    => ['kulit', 'leather'],
            'Travertine' => ['travertine'],
            'Marble'     => ['marmer', 'marble'],
            'Oak'        => ['oak'],
            'Walnut'     => ['walnut'],
            'Velvet'     => ['velvet', 'beludru'],
        ];
        foreach ($materialsMap as $label => $patterns) {
            foreach ($patterns as $pat) {
                if (str_contains($lower, $pat)) {
                    $out['material_color_prefs'][] = $label;
                    break;
                }
            }
        }

        if (preg_match('/\b(apartemen|apartment|penthouse)\b/u', $lower)) {
            $out['project_type'] = 'Apartemen';
        } elseif (preg_match('/\b(villa|vila)\b/u', $lower)) {
            $out['project_type'] = 'Villa';
        } elseif (preg_match('/\b(hotel|resort|hospitality)\b/u', $lower)) {
            $out['project_type'] = 'Hospitality / Hotel';
        } elseif (preg_match('/\b(kantor|office|komersial|commercial|cafe|restoran)\b/u', $lower)) {
            $out['project_type'] = 'Commercial / Office';
        } elseif (preg_match('/\b(rumah|hunian|residential)\b/u', $lower)) {
            $out['project_type'] = 'Rumah Tinggal';
        }

        if (preg_match('/\b(kontraktor|renovasi|bangun|arsitek|contractor|architecture)\b/u', $lower)) {
            $out['service_interest'] = 'Interior Contractor & Architecture';
        } elseif (preg_match('/\b(desain interior|styling|space planning|full interior|tata ruang)\b/u', $lower)) {
            $out['service_interest'] = 'Decorative Interior';
        } elseif (preg_match('/\b(fitting|material|aksesori)\b/u', $lower)) {
            $out['service_interest'] = 'Material & Fitting';
        } elseif (!empty($out['furniture_needs'])) {
            $out['service_interest'] = 'Loose Furniture';
        }

        return $out;
    }

    private static function mergeUniqueList(array $base, array $incoming, int $max): array
    {
        $seen = [];
        $result = [];
        foreach (array_merge($base, $incoming) as $item) {
            $s = trim((string) $item);
            if ($s === '') {
                continue;
            }
            $key = mb_strtolower($s);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $result[] = $s;
            if (count($result) >= $max) {
                break;
            }
        }
        return $result;
    }
}
