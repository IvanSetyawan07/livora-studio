Scope besar — saya pecah jadi 6 fase supaya bisa dikerjakan bertahap dan tetap stabil. Semua fase menggunakan backend Laravel + Supabase Storage yang sudah ada, tidak menambah backend baru.

---

## Fase 1 — Fix UI kecil (cepat, dikerjakan duluan)

1. **Form Appointment fit position** — perbaiki container `Appointment.tsx` supaya form konsultasi center, padding konsisten di mobile & desktop, tidak overflow.
2. **Tombol kembali / X di halaman Profile** — tambahkan tombol back (panah kiri) di kiri atas halaman `Profile.tsx` yang navigate(-1) atau ke `/`.
3. **Avatar & nama user** — di Navbar dropdown dan Profile header, ganti dari email jadi "nama depan" user (`user.name.split(' ')[0]`). Inisial avatar diambil dari huruf pertama nama, bukan email.
4. **Global Hero Preloader** — buat `HeroPreloader.tsx` full-screen overlay Livora (logo + progress). Menunggu `document.fonts.ready` + preload gambar hero halaman aktif via `<link rel="preload">` dinamis. Pasang di `App.tsx`. Kombinasi dengan `loading="eager"` + `fetchpriority="high"` untuk LCP image tiap page.

---

## Fase 2 — Appointment: cancel, history, timeline, chat

Backend:
- Migration tambahan: `consultations` +kolom `cancelled_at`, `cancelled_by`, `cancel_reason`. Tabel baru `consultation_messages` (id, consultation_id, sender_id, sender_role, body, attachments json, read_at, created_at) + `consultation_meetings` (id, consultation_id, provider enum['zoom','meet','custom'], join_url, host_url, meeting_id, passcode, starts_at, description, created_by).
- Endpoint user: `POST /consultations/{id}/cancel` (hanya kalau status belum `completed`/`cancelled`), `GET/POST /consultations/{id}/messages` (chat 2 arah).
- Endpoint admin: `GET /admin/consultations/{id}/history` (gabungan status history + messages + meeting events, urut waktu), `POST /admin/consultations/{id}/meeting` (kirim Zoom link + deskripsi ke user, otomatis buat message + email notif).
- Update Mail: template baru `ConsultationMeetingScheduled` (isi tombol "Join Zoom", tanggal, deskripsi).

Frontend user:
- `Profile.tsx` tab Consultations: tombol "Batalkan" (modal alasan) untuk consultation aktif; timeline history per consultation (status + pesan admin + jadwal meeting).
- Chat drawer di Navbar: ikon chat (badge unread) muncul kalau user login & punya konsultasi aktif. Klik → panel chat mirip WA (list konsultasi kiri, bubble kanan). Polling `/consultations/me/unread` tiap 20 detik untuk notif. Menampilkan pesan admin + tombol Join Zoom kalau ada.

Frontend admin:
- `AdminConsultationDetail.tsx`: tab **History** (timeline lengkap: created → status changes → messages → meeting scheduled → cancelled), tab **Chat** (kirim pesan ke user), form "Schedule Zoom Meeting" (URL, waktu, deskripsi) yang otomatis kirim email + masuk ke chat user.

---

## Fase 3 — PDF Catalog dinamis

- Library: `@react-pdf/renderer` (React-native, cocok dengan design system Livora, mendukung image + font custom, output vektor untuk teks → high-res).
- Struktur: `src/lib/pdf/CatalogPdf.tsx` (dokumen), `src/lib/pdf/pdfTheme.ts` (font Playfair + Inter, warna & spacing dari `index.css`), fungsi `generateCatalogPdf(catalogSlug)`.
- Data flow: pakai endpoint yang sudah ada (`GET /catalogs/{slug}` + hotspots + item detail per hotspot). Kalau data item detail belum lengkap dalam 1 request, batching parallel `Promise.all` fetch item by slug.
- Struktur halaman dinamis (jumlah page ikut data):
  1. Cover — hero image full bleed + logo + judul room + kategori.
  2. Room intro — deskripsi + main image + meta.
  3. Room implementation — grid adaptif (1/2/3-4/5+ images auto pagination).
  4. Items index — daftar semua item (nomor + nama + kategori + thumbnail).
  5. Item detail pages — 1 halaman per item dengan hero image + spec (dimensions, material, finish, color, category, variants). Field kosong disembunyikan.
  6. Item gallery — kalau item punya >1 image, halaman gallery adaptif.
  7. Materials & finishing — hanya kalau ada data.
  8. Closing — logo, tagline, kontak, website.
- Header/footer konsisten (nomor halaman, nama room kecil di footer).
- Tombol "Download Full Catalog PDF" di `CatalogDetail.tsx` (di bawah hero). State: idle → "Generating your Livora catalog..." → auto download `Livora_{RoomName}_Catalog.pdf`.
- QA: setelah generate, dev-side saya render → convert ke image lewat script → periksa overflow/potong sebelum ship.

---

## Fase 4 — Analytics: periode, history, grafik bulanan, export PDF

Backend:
- Tabel `analytics_periods` (id, name, starts_at, ends_at, closed_at, closed_by, snapshot_json, created_at). Admin bisa "Start Period" & "Close Period" — closing menyimpan snapshot lengkap ke `snapshot_json`.
- Endpoint `GET /admin/analytics/periods`, `POST /admin/analytics/periods/start`, `POST /admin/analytics/periods/{id}/close`, `GET /admin/analytics/periods/{id}` (return snapshot).
- Endpoint `GET /admin/analytics/monthly?from=&to=` → agregasi per bulan: unique visitors, page views, top items, top projects, top catalogs, avg session, conversion (appointment submit / wishlist saves).

Frontend admin (`AdminAnalytics.tsx`):
- Header: tombol **Start Period** & **Close Period** + list history periode.
- Chart bulanan (recharts LineChart / BarChart): visitors per bulan, views per bulan, appointments per bulan.
- Detail marketing: top 10 items (clicks + views + avg time), top catalogs, top projects, wishlist saves count, appointment funnel (submitted → confirmed → completed → cancelled).
- Tombol **Download Report PDF** — generate PDF pakai `@react-pdf/renderer` dengan grafik (render chart ke SVG → embed sebagai `<Image>` via `html2canvas` fallback, atau pakai `victory` PDF-friendly). Isi: cover periode, executive summary, chart bulanan, top items table, insight & recommendations block.

---

## Fase 5 — Email marketing (broadcast promosi)

Backend:
- Tabel `email_campaigns` (id, subject, preheader, hero_image, body_html, cta_label, cta_url, status enum['draft','sending','sent'], recipient_filter json, sent_count, created_by, sent_at).
- Endpoint admin: CRUD campaigns + `POST /admin/campaigns/{id}/send` (enqueue kirim ke semua user dengan filter, pakai Mail queue Laravel).
- Mailable `MarketingCampaign` dengan Blade template editorial Livora (hero image, body, CTA button).
- **Compliance**: setiap email otomatis include footer unsubscribe link + tabel `email_unsubscribes` (user_id, unsubscribed_at). Filter recipient exclude user yang unsub.

Frontend admin (`AdminCampaigns.tsx`):
- List campaigns + status.
- Editor: subject, preheader, upload hero image (Supabase Storage), rich-text body (pakai `react-quill` atau textarea + markdown), CTA label + URL, target filter (all users / has appointment / has wishlist).
- Preview panel (WYSIWYG mirip hasil email).
- Tombol Send → confirm modal → status "sending" → real-time update sent_count.

**Catatan penting untuk kamu**: kirim email marketing perlu SMTP provider yang production-grade (Mailgun/SES/Postmark) dan sudah verifikasi domain, kalau tidak akan masuk spam / diblokir. Saya bikin infrastrukturnya, tapi kredensial SMTP kamu isi sendiri di `.env`.

---

## Fase 6 — Performance / preloading konten landing

Selain HeroPreloader (fase 1):
- Preload gambar hero via `<link rel="preload" as="image" fetchpriority="high">` di `<head>` untuk landing page (edit `index.html` + inject dinamis per route).
- Convert semua asset hero besar ke `webp`/`avif` via `vite-imagetools` (build-time, tanpa ubah source image).
- Add `loading="lazy"` + `decoding="async"` di semua image non-LCP.
- Prefetch route berikutnya (Collection/Catalog) pakai `<link rel="prefetch">` on hover Navbar.
- Lazy-load komponen berat (Recharts, react-pdf) via `React.lazy` supaya tidak masuk bundle awal.

---

## Urutan eksekusi yang saya usulkan

1. **Fase 1** (fix UI kecil + preloader) — cepat, langsung terlihat.
2. **Fase 2** (appointment cancel + chat + Zoom) — paling banyak logic backend.
3. **Fase 3** (PDF catalog).
4. **Fase 4** (analytics + PDF report).
5. **Fase 5** (email marketing).
6. **Fase 6** (perf polish).

---

## Yang perlu kamu konfirmasi sebelum saya mulai

1. **Setuju urutan 6 fase ini?** Atau ada yang mau didahulukan (misal PDF catalog duluan)?
2. **Chat consultation**: cukup polling tiap 20 detik, atau kamu mau real-time WebSocket? (WebSocket butuh Pusher/Reverb, biaya lebih.) Rekomendasi saya: polling dulu, upgrade kalau perlu.
3. **PDF library**: OK pakai `@react-pdf/renderer`? (alternatif: `pdfmake` atau `puppeteer` server-side — puppeteer paling akurat tapi butuh server node terpisah).
4. **Zoom integration**: cukup admin paste link Zoom manual, atau mau auto-create meeting via Zoom API? (auto butuh Zoom OAuth app + secret). Rekomendasi: manual paste dulu.
5. **Email marketing**: sudah ada SMTP transaction (Mailgun/SES/dll) yang mau dipakai? Tanpa itu, campaign akan gagal terkirim ke banyak alamat.

Balas dengan jawaban 5 poin di atas + **"lanjut fase 1"** kalau setuju urutannya, atau kasih tahu fase mana yang mau didahulukan.