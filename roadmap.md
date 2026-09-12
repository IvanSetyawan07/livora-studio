# Roadmap — Restore rich AI Marketing UI + live integrations

- [x] Overview: 6 KPI cards (live + locked), Performance chart panel, AI Insights, Social/Content Queue/Campaign panels, live sections
- [x] Audit semua halaman AI Marketing yang jadi "kurus" setelah cleanup dummy
- [x] SEO, Local SEO: kembalikan layout kaya (charts, tabel) dengan state honest
- [x] Ads, Content, Leads: layout kaya + locked panels per platform
- [ ] Buat kontrak status integrasi dan dataset nullable (loading/empty/not connected/error/data)
- [ ] Buat backend collector + endpoint real untuk GA4, Meta Ads, Google Ads, Meta Social, TikTok, YouTube, Google Business Profile, dan email stats
- [ ] Hubungkan semua KPI/chart/table ke endpoint real; render sumbu/legend/kolom saat kosong, nilai hanya saat data tersedia
- [ ] Tambahkan refresh/sync dan cache agar kredensial yang valid langsung menghidupkan panel tanpa perubahan kode
- [ ] CRO, Impact, Campaigns, Insights, Activity, Usage, Providers, Settings: rapikan/lengkapi
- [ ] Build + typecheck bersih
Prinsip: UI lengkap seperti desain awal; komponen grafik/tabel tetap dirender dalam keadaan kosong. Tidak ada fixture atau angka palsu.

# Roadmap — My Consultation full revamp

- [ ] Fix file URLs, persistent profile tabs, agreement access, and admin stage filters
- [ ] Add shared consultation activity notifications and user/admin unread badges
- [ ] Add automated email events with failure logging and retry visibility
- [ ] Add provider-ready automated WhatsApp delivery without blocking actions
- [ ] Redesign Profile, consultation cards/detail sheet, activity feed, chat, and Saved grid
- [ ] Add generated DP invoice and proof verification/rejection flow
- [ ] Add signature canvas, PDF stamping, audit metadata, and e-meterai payment state
- [ ] Add platform-aware meeting types and actions
- [ ] Add progress comments and final-payment gate at 85%
- [ ] Verify backend flows, frontend types, and desktop/mobile rendering

Blockers requiring external setup: production WhatsApp gateway credentials and ezmeterai API credentials.
