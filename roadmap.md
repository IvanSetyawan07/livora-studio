# Roadmap — Restore rich AI Marketing UI + live integrations

## MariaDB compatibility
- [x] Remove PostgreSQL column-comment statements and audit all backend SQL for MariaDB compatibility; no other PostgreSQL-only SQL found.
- [x] Add and run a regression check (PHPUnit: 1 test, 2 assertions) and PHP migration lint; production migration execution still requires server access.

- [x] Overview: 6 KPI cards (live + locked), Performance chart panel, AI Insights, Social/Content Queue/Campaign panels, live sections
- [x] Audit semua halaman AI Marketing yang jadi "kurus" setelah cleanup dummy
- [x] SEO, Local SEO: kembalikan layout kaya (charts, tabel) dengan state honest
- [x] Ads, Content, Leads: layout kaya + locked panels per platform
- [ ] Buat kontrak status integrasi dan dataset nullable (loading/empty/not connected/error/data)
- [ ] Buat backend collector + endpoint real untuk GA4, Meta Ads, Google Ads, Meta Social, TikTok, YouTube, Google Business Profile, dan email stats
- [ ] Hubungkan semua KPI/chart/table ke endpoint real; render sumbu/legend/kolom saat kosong, nilai hanya saat data tersedia
- [ ] Tambahkan refresh/sync dan cache agar kredensial yang valid langsung menghidupkan panel tanpa perubahan kode
- [ ] CRO, Impact, Campaigns, Insights, Activity, Usage, Providers, Settings: rapikan/lengkapi
- [x] Build + typecheck bersih
Prinsip: UI lengkap seperti desain awal; komponen grafik/tabel tetap dirender dalam keadaan kosong. Tidak ada fixture atau angka palsu.

# Roadmap — My Consultation full revamp

- [x] Fix file URLs, persistent profile tabs, agreement access, and admin stage filters
- [x] Add shared consultation activity notifications and user/admin unread badges
- [x] Add automated email events with failure logging and retry visibility
- [x] Add provider-ready automated WhatsApp delivery without blocking actions
- [x] Redesign Profile, consultation cards/detail sheet, activity feed, chat, and Saved grid
- [x] Add generated DP invoice and proof verification/rejection flow
- [x] Add signature canvas, PDF stamping, audit metadata, and e-meterai payment state
- [x] Add platform-aware meeting types and actions
- [x] Add progress comments and final-payment gate at 85%
- [ ] Verify backend flows, frontend types, and desktop/mobile rendering
- [x] Finish admin Consultation operational workspace: search/filter, all detail sections, desktop/mobile verification

Blockers requiring external setup: production WhatsApp gateway credentials and ezmeterai API credentials.

# Roadmap — Sistem Order Furniture (Toko) Tahap 1–4

- [x] Tahap 1: keranjang, checkout, order lifecycle, penawaran admin, pembayaran Midtrans/transfer/QRIS
- [x] Tahap 2: Proforma Invoice & Invoice PDF, verifikasi pembayaran, ongkir zona, Google Sheets sync, scan QR dokumen
- [x] Tahap 3: MTO review/SLA, produksi, pengiriman & BAST, klaim/garansi, refund, change order
- [x] Tahap 4: WA bot + AI, handoff inbox, business hours, blocklist, simulator, monitoring webhook, funnel, rekonsiliasi QRIS
- [x] Rename Tagihan → Proforma Invoice (PDF, UI, Sheets register)
- [x] Halaman pembayaran menampilkan rekening + total tagihan
- [x] Desain ulang PDF invoice premium (pita emas, tabel gelap, kotak pembayaran, blok tanda tangan)
- [x] Sistem peran admin (owner/cs/finance/production) + matriks hak akses
- [x] 2FA email admin + remember device 30 hari
- [ ] Server: jalankan semua migrasi + pasang cron scheduler (menunggu akses server)
- [ ] Isi kredensial: Midtrans, Meta WhatsApp, email SMTP, rekening bank, zona ongkir (menunggu user)
