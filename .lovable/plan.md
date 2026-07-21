## Ringkasan review progres

**Yang sudah ada tapi bermasalah:**
- `backend/routes/api.php` mengimpor `App\Http\Controllers\Api\Admin\ConsultationController` — **file tidak ada** → backend 500 saat boot.
- `backend/app/Http/Controllers/Api/WishlistController.php` pakai `App\Models\Wishlist` — **model tidak ada** → endpoint wishlist gagal.
- `src/pages/Register.tsx` seluruh isinya dikomentari — halaman register tidak berfungsi.
- `Appointment.tsx` submit ke DB tapi **tidak mengirim email** ke user maupun admin (padahal ini requirement).
- `Navbar.tsx` sudah deteksi login, tapi hanya link `/profile` — belum ada dropdown Profile/Logout.
- Wishlist di `Profile.tsx` masih pakai icon `Heart` (lucide) — user minta ikon "pita" (Bookmark).
- Belum ada tombol simpan (bookmark) di halaman Item/Collection/Project/Catalog Detail.
- Belum ada halaman admin untuk lihat wishlist user + follow-up.

**Yang sudah OK:**
- Migration `consultations`, `consultation_status_histories`, `wishlists` sudah ada.
- Model `Consultation` + status history sudah lengkap.
- `AdminConsultations.tsx` list page sudah ada (list + change status + delete).
- `ConsultationController` public store sudah handle guest + logged-in user.

---

## Rencana perbaikan

### 1. Fix backend yang crash (P0)
- Buat `backend/app/Models/Wishlist.php` dengan konstanta TYPES = `['item','collection','project','catalog']` dan relasi polymorphic manual (via `resolveEntity` sudah ada di controller).
- Buat `backend/app/Http/Controllers/Api/Admin/ConsultationController.php` (namespace `Api\Admin`) — `index`, `show`, `update` (ubah status + catat history + optional assign admin + jadwal meeting), `destroy`, dan endpoint baru `confirmEmail(consultation)` yang kirim email konfirmasi manual.

### 2. Email flow appointment (Laravel Mail SMTP)
- Buat 3 Mailable:
  - `ConsultationReceived` — auto ke user setelah submit ("Kami sudah menerima permintaan konsultasimu").
  - `NewConsultationAdminAlert` — auto ke email admin (`config('mail.admin_address')`) berisi ringkasan + link ke admin detail.
  - `ConsultationConfirmed` — dikirim manual oleh admin via tombol "Confirm & Email User" (isi: status terkini, jadwal meeting kalau ada, admin notes/pesan).
- Update `ConsultationController::store` untuk `Mail::send(...)` dua email pertama (dibungkus try/catch supaya submit tetap sukses meski SMTP down).
- Route baru: `POST /admin/consultations/{consultation}/confirm-email` dengan body `{ subject, message }` opsional (fallback ke template default).
- Blade view template email di `resources/views/emails/consultation-*.blade.php` — style ringkas, brand Livora (serif heading, cream background).
- Config: pakai `MAIL_*` env yang sudah ada di Laravel. Kalau user belum set, akan otomatis nge-log ke `storage/logs` (fail-safe).

### 3. Frontend appointment
- Setelah submit sukses di `Appointment.tsx`, tampilkan modal konfirmasi: "Email konfirmasi sudah dikirim ke {email}. Tim kami akan meninjau dalam 1×24 jam."
- Di `src/pages/admin/AdminConsultationDetail.tsx` (baru): tampilkan semua data, status history timeline, textarea "Pesan tambahan untuk user", tombol besar **"Confirm & Email User"** — POST ke endpoint confirm-email.

### 4. Navbar profile dropdown
- Ganti `<Link to="/profile">` di `Navbar.tsx` jadi tombol dropdown (klik → panel kecil bawah avatar) berisi:
  - Nama + email user (header)
  - `Profile Detail` → `/profile`
  - `Wishlist` → `/profile?tab=wishlist`
  - `My Consultations` → `/profile?tab=consultations`
  - `Admin Panel` (khusus role admin) → `/admin`
  - `Logout`
- Tetap tampilkan `<User />` icon + nama pendek di header. Klik di luar → tutup.

### 5. Wishlist: icon Bookmark + tombol simpan di detail pages
- Buat komponen `src/components/livora/SaveButton.tsx` — pakai `Bookmark` (lucide) dengan state "saved" (filled) vs "not saved" (outline). Props: `type`, `id`. Kalau belum login → toast "Login untuk menyimpan" + redirect.
- Pasang tombol ini di:
  - `ItemDetail.tsx` (pojok kanan atas card produk)
  - `CollectionDetail.tsx` (header)
  - `ProjectDetail.tsx` (header)
  - `CatalogDetail.tsx` (header)
- Ganti icon `Heart` di `Profile.tsx` tab Wishlist → `Bookmark`.

### 6. Admin wishlist view + follow-up
- Halaman `src/pages/admin/AdminWishlists.tsx` (baru): tabel semua user yang punya wishlist, kelompokkan per user. Kolom: nama user, email, jumlah item disimpan, item terbaru. Klik user → drawer dengan daftar entity disimpan + tombol:
  - **"Kirim email follow-up"** → modal, subject + message, POST ke endpoint baru `/admin/wishlists/{user}/message` (kirim email via Mailable `WishlistFollowUp`).
  - **"Hubungi via WhatsApp"** → link `wa.me/{phone}`.
- Endpoint backend: `GET /admin/wishlists` (grouped by user), `POST /admin/wishlists/{user}/message`.
- Link menu baru di `AdminLayout.tsx` sidebar: "Wishlist".

### 7. Fix kecil
- **Register.tsx**: uncomment + tambahkan real-time email-exist check (endpoint baru `POST /check-email` publik → `{ exists: bool }`). Kalau exists → tampilkan inline error + link "Sudah punya akun? Login". Backend `AuthController::checkEmail`.
- **Breadcrumb.tsx**: cek isi (37 baris), fix warna teks agar kontras di hero gelap + hilangkan segmen dinamis yang salah (mis. slug UUID). Detail bakal muncul saat implementasi.
- **Global Hero Preloader**: buat `src/components/livora/HeroPreloader.tsx` — fade-in overlay yang tunggu `document.fonts.ready` + gambar hero pertama (`<img>` invisible dengan `onLoad`). Pasang di layout root `App.tsx` supaya semua hero page konsisten.

### 8. Verifikasi
- Cek backend boot via `php artisan route:list` (di komentar, tidak run langsung).
- Cek build TypeScript pass.
- Manual smoke test lewat Playwright: login → submit appointment → cek toast → login sebagai admin → tekan Confirm & Email User → cek log email.

---

## Breaking changes / catatan penting untuk kamu

- **SMTP config wajib.** File `.env` backend harus punya `MAIL_MAILER=smtp`, `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, dan yang baru: `MAIL_ADMIN_ADDRESS=admin@livora.com`. Kalau belum diisi, email akan gagal tapi submit tetap masuk DB.
- Route wishlist yang tadinya salah nested (`/wishlist` route ada di dalam group `auth:sanctum` tapi indentasinya keluar) akan saya bereskan.
- Tombol `Heart` di beberapa tempat akan diganti `Bookmark` — icon berubah, arti sama.
- Halaman admin baru `/admin/wishlists` dan `/admin/consultations/:id`.

---

## Urutan eksekusi (kalau kamu setuju plan-nya)

Fase A (backend fix + email) → Fase B (navbar + save button + profile icon) → Fase C (admin wishlist page) → Fase D (register + breadcrumb + hero preloader).

Bilang **"lanjut"** untuk mulai fase A. Kalau ada bagian yang mau di-skip atau diubah urutannya, kasih tahu sekarang.
