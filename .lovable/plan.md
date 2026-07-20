## Livora — Appointment System + Enhancements

Scope besar, jadi saya bagi jadi **4 batch berurutan**. Tiap batch selesai baru lanjut batch berikutnya, biar bisa kamu review.

**Prinsip yang saya pegang:**
- Landing page & desain existing TIDAK disentuh — hanya menambah.
- Footer existing dipakai apa adanya.
- Navbar existing hanya ditambah item "Make an Appointment".
- Google Login existing tidak diubah.
- Semua desain baru pakai palette warm-neutral + serif heading + muted gold (konsisten Livora, bukan SaaS card).

---

### BATCH 1 — Appointment Page (frontend) + Navbar

Frontend murni, belum submit ke DB (form tampilan dulu).

- `src/pages/Appointment.tsx` — halaman baru sesuai gambar referensi:
  - Hero full-width (dark warm interior, overlay), "DESIGN CONSULTATION" eyebrow, heading serif "Designing Spaces. Enriching Lives.", CTA gold outline.
  - Section "What Can We Help You With?" — 4 kartu dengan image + icon lingkaran, hover subtle zoom.
  - Section "How It Works" — 3 langkah editorial (01/02/03) dengan foto.
  - Section "The Right Questions" — split kiri text / kanan media dengan play button.
  - Section "How Would You Like to Meet?" — 3 kartu dark image (Showroom / Virtual / At Your Space).
  - Section "Why Choose Livora" — dark band, 4 value points, ikon minimal.
  - Form "Let's start your design journey." — grid rapi, cream background, muted gold CTA.
  - Footer existing.
- `src/components/livora/Navbar.tsx` — tambah item **Make an Appointment** (gold outline pill, cocok dengan style existing, jangan geser layout).
- Route `/appointment` di `src/App.tsx`.
- Micro-interactions: framer-motion fade + rise, gambar zoom halus.

### BATCH 2 — Backend Consultations + Admin CRUD

Ini backend Laravel (bukan Supabase — project pakai Laravel API).

- Migration `consultations` (semua field yang kamu sebut + attachments JSON + status enum + assigned_admin_id).
- Migration `consultation_status_history`.
- Model + Controller `ConsultationController` (store publik, admin index/show/update/destroy).
- Auto-link ke `user_id` bila token login ada, else lookup by email.
- Route: `POST /api/consultations` (publik), `GET/PATCH/DELETE /api/admin/consultations/*` (admin only).
- Frontend: form Appointment di batch 1 di-wire ke API + Zod validation + toast success.
- Halaman baru `src/pages/admin/AdminConsultations.tsx` — list + filter status + detail drawer + edit status/notes/assigned/meeting date.
- Menu "Consultations" di `AdminLayout` sidebar dengan badge unread.

### BATCH 3 — Messaging + Notifications + User Timeline

- Migration `consultation_messages` (sender_type user/admin, is_read, attachment).
- Migration `notifications` (recipient_id, type, payload JSON, read_at) — untuk admin & user.
- Endpoint messages (index, store) + endpoint notifications (list, mark-read).
- Frontend admin detail: panel chat premium di dalam drawer consultation (bukan bubble generic — pakai style Livora, avatar circle, timestamp light).
- Frontend user: halaman `/profile/consultations` menampilkan list + progress timeline vertical (Inquiry → Under Review → Contacted → Meeting Scheduled → In Progress → Completed) + chat.
- Bell icon di admin layout + di user profile dengan badge unread + polling ringan (setiap 30s).
- Tombol quick action di admin detail: "Contact via WhatsApp" (wa.me link + template), "Send Email" (mailto atau form).

### BATCH 4 — Extras

1. **Admin hapus user** — tombol Delete di `AdminUsers.tsx` (dropdown / trash icon) + confirmation dialog + `DELETE /api/admin/users/{id}` di backend, cascade activities.
2. **Global hero image preloader** — extract `Loader.tsx` logic, jadikan `HeroImagePreloader` yang cache list URL hero semua page utama, tampil di landing pertama load, skip di navigasi selanjutnya.
3. **Breadcrumb fix** — `Breadcrumb.tsx` sekarang refactor: baca dari route hierarchy (bukan `document.referrer`), fallback rapi bila masuk dari deep link, format konsisten `Home / Furniture / Sofa / Milano Sofa`.
4. **Email exists check di Register** — endpoint `POST /api/auth/check-email` (debounced call dari form register), inline error "Email already registered — sign in instead".
5. **Wishlist** (per-user list, admin bisa lihat isinya untuk keperluan marketing):
   - Migration `wishlists` polymorphic: `user_id`, `target_type` (item/collection/project/catalog), `target_id`, `created_at`.
   - Endpoint user: add / remove / list (grouped by type).
   - Tombol heart di card Item, Collection, Project, Catalog (toggle, subtle animation).
   - Halaman `/profile/wishlist` dengan tab per-type, kartu preview + remove.
   - Admin: `AdminUsers.tsx` rincian drawer → tab baru "Wishlist" menampilkan apa yang user simpan (marketing insight).

---

### Format response tiap batch

Setelah tiap batch, saya laporkan di chat:
```
✅ BATCH X selesai
- File dibuat: ...
- File diubah: ...
- Migration baru: ...
- Route baru: ...
- Belum dikerjakan (masuk batch berikutnya): ...
```

Saya mulai **BATCH 1** sekarang setelah plan ini kamu approve.