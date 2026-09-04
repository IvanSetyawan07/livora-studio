
# AI Marketing — Empty Charts That Become Live

## Temuan audit

Klaim sebelumnya bahwa cukup memasukkan kredensial lalu semua panel otomatis hidup **belum benar**. Saat ini banyak halaman memakai `OfflinePanel`, `LockedKpiCard`, dan `TableShell` statis. Komponen tersebut tidak mengambil data dan tidak dapat berubah menjadi grafik real. Backend juga baru memiliki integrasi live untuk Search Console dan data internal CRO; collector/API untuk GA4, Ads, Social, Local SEO, serta email stats belum tersedia.

## Hasil yang dibangun

- Semua grafik, KPI, donut, platform row, dan tabel lama tetap terlihat saat belum tersambung.
- Nilai kosong ditampilkan sebagai `—`; grafik mempertahankan sumbu, legend, dan empty plot; tabel mempertahankan header dengan body kosong.
- Setiap bagian mempunyai state konsisten: loading, not connected, connected-no-data, error, dan real data.
- Setelah kredensial valid dipasang dan cache konfigurasi dibersihkan, refresh/sync akan mengisi UI dengan data API asli tanpa perubahan frontend dan tanpa fixture.

## Tahapan implementasi

1. **Kontrak bersama** — definisikan status integrasi dan payload nullable untuk KPI, time series, breakdown, serta rows; tambahkan endpoint status/sync.
2. **Komponen visual** — ubah shell statis menjadi komponen state-aware yang selalu merender bentuk grafik/tabel, bukan menghapus isinya.
3. **Overview / GA4** — tarik traffic, engagement, conversions, dan time series real; gabungkan aman dengan KPI internal.
4. **Ads** — implement collector Meta Ads dan Google Ads untuk spend, leads, CPL, ROAS, budget split, creative health, dan campaign rows.
5. **Content / Social** — implement collector Meta Graph, TikTok, dan YouTube untuk follower, reach, engagement, cadence, serta trend per platform.
6. **Local SEO** — implement Google Business Profile untuk views, directions, calls, rating, reviews, dan performance trend.
7. **Leads / email** — isi funnel dari database internal; statistik delivery/open/click hanya dari provider email yang benar-benar terhubung.
8. **Verifikasi** — uji keadaan tanpa kredensial, kredensial parsial, connected-no-data, API error, dan data real; jalankan test terkait serta typecheck/build otomatis.

## Catatan teknis

- Kredensial tetap server-side; tidak pernah dikirim ke browser.
- Integrasi parsial menghidupkan hanya seri/panel yang sumbernya tersedia.
- Tidak ada angka nol palsu: `0` hanya ditampilkan jika API benar-benar mengembalikan nol.
- Pekerjaan dilakukan per integrasi agar setiap checkpoint dapat diaudit sebelum lanjut.
