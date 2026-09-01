<?php

namespace App\Services\Google;

use App\Models\AiSetting;
use Throwable;

/**
 * Menentukan site property Search Console mana yang dipakai SEO Agent.
 *
 * Kenapa perlu class sendiri: SeoAgentService (analisis AI) dan
 * SeoController (kartu KPI) sama-sama butuh jawaban yang SAMA untuk
 * pertanyaan "property mana yang sedang kita baca?". Kalau logikanya
 * digandakan di dua tempat, angka di kartu KPI bisa beda property dengan
 * angka yang dianalisis AI — dan itu bug yang sangat susah dilihat.
 *
 * Prinsipnya tetap sama seperti CroAgentService: kalau jawabannya ambigu
 * (banyak property terverifikasi dan tidak ada yang jelas milik Livora),
 * JANGAN menebak — kembalikan null dan biarkan caller memberi pesan jujur.
 */
class SearchConsoleSiteResolver
{
    /** Override manual kalau admin punya lebih dari satu property. */
    public const SETTING_KEY = 'google_search_console_site';

    public function __construct(private GoogleSearchConsoleClient $client)
    {
    }

    /**
     * @return array{site: ?string, reason: ?string} `site` null = tidak bisa ditentukan,
     *         `reason` berisi penjelasan jujur untuk ditampilkan ke admin.
     */
    public function resolve(): array
    {
        $override = AiSetting::get(self::SETTING_KEY);

        if (is_string($override) && $override !== '') {
            return ['site' => $override, 'reason' => null];
        }

        try {
            $sites = $this->client->listSites();
        } catch (Throwable $e) {
            return ['site' => null, 'reason' => 'Tidak bisa membaca daftar property Search Console: '.$e->getMessage()];
        }

        // Property yang belum terverifikasi tidak akan mengembalikan data apapun,
        // jadi langsung dibuang supaya tidak jadi "diam-diam kosong".
        $verified = array_values(array_filter(
            $sites,
            fn ($site) => ($site['permissionLevel'] ?? '') !== 'siteUnverifiedUser'
        ));

        if (count($verified) === 0) {
            return ['site' => null, 'reason' => 'Akun Google yang terhubung belum punya property Search Console yang terverifikasi.'];
        }

        if (count($verified) === 1) {
            return ['site' => $verified[0]['siteUrl'], 'reason' => null];
        }

        // Lebih dari satu property: coba cocokkan dengan host aplikasi
        // (APP_URL) supaya tidak asal ambil yang pertama.
        $host = parse_url((string) config('app.url'), PHP_URL_HOST);
        $host = is_string($host) ? strtolower(preg_replace('/^www\./', '', $host)) : null;

        if ($host) {
            foreach ($verified as $site) {
                $siteUrl = strtolower($site['siteUrl']);
                if ($siteUrl === 'sc-domain:'.$host || str_contains($siteUrl, $host)) {
                    return ['site' => $site['siteUrl'], 'reason' => null];
                }
            }
        }

        $list = implode(', ', array_column($verified, 'siteUrl'));

        return [
            'site' => null,
            'reason' => 'Ada lebih dari satu property Search Console terverifikasi ('.$list.') dan tidak ada '
                .'yang cocok dengan APP_URL. Simpan pilihan manual di ai_settings key "'.self::SETTING_KEY.'".',
        ];
    }
}
