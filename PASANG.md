# Sinkron otomatis Pesanan → Google Sheets

## 1. Salin ke project
Ekstrak zip ini ke folder `livora-studio` (yang berisi `backend` dan `src`), timpa jika ditanya.
Lalu cek `git status` — harus hanya ini:
- baru    : backend/app/Services/Shop/SheetsSync.php
- baru    : backend/app/Console/Commands/ShopSheetsSync.php
- baru    : backend/database/migrations/2026_10_15_130000_add_sheets_sync_columns.php
- berubah : backend/app/Services/Shop/ShopOrderService.php, backend/app/Models/ShopOrder.php,
            backend/app/Models/ShopOrderItem.php, backend/app/Console/Kernel.php,
            backend/config/services.php, backend/.env.example
Kalau satu file berubah JAUH lebih banyak dari yang diharapkan (lihat perubahan.diff), jangan di-commit; kabari.

## 2. Apps Script (tab "Pesanan")
1. script.google.com → New project → tempel isi `apps-script/Code.gs`.
2. Project Settings → Script properties:  WEBHOOK_SECRET = (rahasia baru)   SPREADSHEET_ID = (ID spreadsheet tujuan)
3. Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone → Deploy → salin URL `/exec`.

## 3. Server
Tambah di `~/livora-repo/backend/.env`:
    SHOP_SHEETS_ORDERS_URL=<URL /exec dari langkah 2>
    SHOP_SHEETS_ORDERS_SECRET=<sama dengan WEBHOOK_SECRET>
Lalu:
    cd ~/livora-repo && git pull origin main
    cd backend
    php artisan migrate --force
    php artisan config:clear
    php artisan shop:sheets-sync --ping        # harus: Terhubung
    php artisan shop:sheets-sync --all         # isi semua order lama ke tab Pesanan
    crontab -l                                  # harus ada: * * * * * ... php artisan schedule:run

## Perintah
    php artisan shop:sheets-sync                 # kirim yang belum/gagal/berubah (otomatis tiap 5 menit)
    php artisan shop:sheets-sync --all           # kirim ulang semua order
    php artisan shop:sheets-sync --all --docs    # + kirim ulang semua dokumen ke Register Dokumen
