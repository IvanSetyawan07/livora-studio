# Status Rombak Total Sistem Order Furniture

Tanggal: 2026-10-21 · Cakupan: rombakan sesuai TUGAS_ROMBAK_TOTAL_SISTEM_ORDER_FURNITURE (WA-first, tanpa login, CRT-XXXX, bot Livi, token pages, N1–N16, Pantau Proses).

Legenda: ✅ selesai · 🟡 sebagian · ❌ belum

## Keputusan pakai ulang / ubah / ganti / hapus

| Komponen | Keputusan | Catatan |
|---|---|---|
| Nomor dokumen (DocumentNumber) | Pakai ulang | Sudah sesuai format NNN/INV/LCR-LF-AH/ROMAN/TAHUN |
| InvoiceCalculator, InvoicePdf | Pakai ulang + ubah | Renderer premium sudah ada; label Tagihan/Invoice dipertahankan |
| WaBot (lama) | Ganti | Digantikan LiviBot (state machine + AI + guardrail). Webhook sudah dialihkan; file lama belum dihapus agar rollback mudah |
| WhatsApp Flow (form pengiriman) | Pakai ulang | Tetap opsional di Pengaturan |
| Keranjang login (cart_items) | Ganti | Keranjang anonim localStorage + shop_carts CRT-XXXX. Endpoint lama masih ada untuk akun lama |
| Midtrans/QRIS | Nonaktif | Spesifikasi: transfer BCA + kode unik; slot QRIS "Segera hadir" |
| SheetsSync | Ubah | Ditambah tab Customer (satu baris per nomor WA) |

## Yang sudah selesai

- ✅ Migrasi `2026_10_21_100000_shop_rebuild_wa_first.php`: shop_carts, wa_conversations, wa_ai_logs, admin_notifications, bot_scenarios, kolom status baru (menunggu_harga, menunggu_verifikasi, bermasalah), confirm_token/payment_token, revision_note, kode unik, dsb.
- ✅ Migrasi `items.price_confirmed_at` (+weight/volume) — harga hanya boleh disebut bot bila terkonfirmasi tim.
- ✅ Migrasi `shop_notify_settings` (penerima notifikasi admin per kategori).
- ✅ `ShopCartService` — kode CRT-XXXX (4 jam, satu kali pakai).
- ✅ `LiviBot` — state machine, sapaan+kode, katalog, data pengiriman, status order, bukti transfer, handoff, bahasa Indonesia, STOP, jendela 24 jam, rate limit, fail-count.
- ✅ `Guardrail` — sistem prompt terkunci, tanpa harga sebelum penawaran, tanpa janji tanggal/diskon, anti prompt-injection, anti bocor data, filter keluaran (blokir "Rp" bila harga belum terkonfirmasi).
- ✅ `BotTools` — 11 tool (keranjang, katalog, harga terkonfirmasi, alamat, penawaran, status, pembayaran, bukti, dsb.).
- ✅ `ProofMatcher` — OCR bukti transfer, toleransi Rp1.000, rekening/NPWP harus cocok, bukti tak cocok disimpan & ditandai.
- ✅ `WaSender` — teks/gambar/dokumen/tombol/list, template luar jendela 24 jam, tanda terkirim.
- ✅ `NotifyService` — N1–N16, pengingat 50%, eskalasi 100%, dedupe, peran, push WA admin, ringkasan luar jam kerja, `tick()` dijadwalkan tiap menit.
- ✅ `ShopOrderService`: `createFromBot` (order dari keranjang CRT), `confirmOrder` (Konfirmasi → Tagihan + kode unik + N6), `requestRevision` (N4), `sendQuoteViaBot`.
- ✅ Webhook: signature fail-closed, dedupe, media (foto/pdf/audio/stiker/lokasi), dialihkan ke LiviBot.
- ✅ Controller publik: `ShopCartController` (CRT), `TokenPageController` (konfirmasi/revisi/pembayaran/unduh invoice, rate-limited).
- ✅ Controller admin: `BotSimulatorController` (chat, state, reset, log AI, tandai buruk, skenario), `NotificationController` (daftar, count, markRead).
- ✅ Rute baru di `routes/api.php` (publik + admin).
- ✅ Seeder `BotScenarioSeeder` — 20 skenario uji awal.
- ✅ Frontend: keranjang anonim (Cart.tsx), AddToCartButton tanpa login, halaman OrderConfirm & OrderPay (mobile-first, salin rekening/nominal, QRIS segera hadir), Pantau Proses (8 kolom, poll 20 dtk), Simulator WhatsApp (panel state/intent/tool), Log AI & Uji Skenario, lonceng notifikasi admin (poll 20 dtk, toast mendesak), menu admin baru.
- ✅ Typecheck frontend bersih (tsc).

- ✅ Perbaikan 21-10: `NotifyService::notify` kini mengisi kolom `type` (sebelumnya semua insert N1–N16 gagal error 1364 di MariaDB). Insert lain ke admin_notifications, shop_order_events, wa_ai_logs, wa_conversations, wa_messages sudah dicek — semua kolom wajib terisi; wa_templates belum punya insert di kode.
- ✅ `WaSender::normalize` — tombol jadi `{id: btn_slug-judul, title ≤20}` maks 3; list row `{id, title ≤24, description ≤72}` maks 10; body/footer dipotong sesuai batas WA; id tombol tercatat di `wa_messages.payload`.
- ✅ Webhook membaca `button_reply`/`list_reply` (id + judul) dan meneruskannya ke LiviBot (`_reply`); LiviBot mengenali pilihan lewat id.
- ✅ Gagal kirim Meta: `Log::warning` berisi HTTP status + body respons (token disamarkan), ringkasan kode/pesan error disimpan di kolom baru `wa_messages.error_note` (migrasi `2026_10_21_130000_wa_messages_error_note.php`).

## Yang sebagian / belum

- 🟡 Email admin untuk notifikasi — `NotifyService::push` hanya push WA; email belum diimplementasikan (N1–N16 via lonceng + WA).
- 🟡 Sheets tab Customer — payload dikirim, tetapi Apps Script di sisi Google perlu menangani `tab: 'customer'` (dokumen panduan perlu diperbarui).
- ❌ AI vision baca bukti transfer — `ProofMatcher` pakai OCR/regex; vision AI (Gemini) belum disambungkan untuk bukti tanpa teks jelas.
- ❌ Verifikasi runtime — PHP tidak tersedia di sandbox, jadi `php -l`, migrasi, dan uji end-to-end belum bisa dijalankan di sini.

## Yang harus Anda lakukan di server

1. `php artisan migrate` — 4 migrasi baru (termasuk `wa_messages.error_note`).
2. `php artisan db:seed --class=BotScenarioSeeder` — 20 skenario uji.
3. Pastikan cron `php artisan schedule:run` jalan tiap menit (untuk `NotifyService::tick`, pengingat, eskalasi).
4. Isi `shop_notify_settings` (atau lewat Pengaturan Toko) untuk nomor WA penerima notifikasi admin.
5. Set `items.price_confirmed_at` untuk produk yang harganya boleh disebut bot (atau lewat admin Items).
6. Isi `SHOP_BOT_WA_NUMBER` / setting `bot_wa_number` untuk tombol wa.me di keranjang.
7. Perbarui Apps Script Google Sheets agar menerima tab `customer`.
8. Webhook Meta tetap mengarah ke `/api/webhooks/whatsapp` — tidak berubah.

## Belum teruji (wajib dicek setelah migrate)

- Alur lengkap: CRT → chat bot → data lengkap → penawaran → konfirmasi → tagihan → bukti → verifikasi → invoice.
- Simulator bot dengan nomor uji.
- 20 skenario uji (jalankan dari halaman Uji Skenario).
- OCR bukti transfer terhadap contoh bukti nyata.
