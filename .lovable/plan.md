# Rencana: Admin Dashboard CRUD + Analytics

Saya akan membangun fitur ini di **backend Laravel** (sesuai stack project kamu yang sudah ada di `backend/`) + UI admin di React. Sebelum mulai, ada beberapa hal penting yang perlu saya konfirmasi karena fitur ini cukup besar.

---

## Yang akan dibangun

### 1. Backend (Laravel + Sanctum)
Tabel baru di MySQL/SQLite (pakai migrasi Laravel, **bukan** Supabase karena project kamu pakai Laravel):

- `scopes` — id, name, slug (Interior Design, Furniture, Construction, dll) — CRUD admin
- `projects` — id, title, subtitle (mis. "Batam"), description, location, year, hero_image, scope_id (FK), is_highlighted (bool, max 3 untuk landing page), order
- `project_photos` — id, project_id, title (mis. "Lobby"), image, caption
- `furniture_types` — id, name, slug (Chair, Sofa, Table, dll) — CRUD admin
- `items` — id, type_id (FK furniture_types), title, code, texture, finish, availability, image, description
- `themes` — id, name, slug — CRUD admin
- `categories` — id, name, slug — CRUD admin
- `item_theme` (pivot many-to-many)
- `item_category` (pivot many-to-many)
- `photo_items` — id, project_photo_id, item_id, x, y (koordinat tagging item pada foto) — opsional koordinat
- `item_views` — id, item_id, user_id (nullable), duration_seconds, viewed_at — untuk analytics
- `item_clicks` — id, item_id (atau project_id), user_id (nullable), clicked_at
- `user_sessions` — track login aktif (last_seen_at di tabel users)

Endpoint API (admin only via middleware `role:admin`):
- `GET/POST/PUT/DELETE /api/admin/projects`
- `GET/POST/PUT/DELETE /api/admin/projects/{id}/photos`
- `GET/POST/PUT/DELETE /api/admin/items`
- `GET/POST/PUT/DELETE /api/admin/scopes|themes|categories|furniture-types`
- `PUT /api/admin/landing/highlights` — pilih max 3 project
- `GET /api/admin/analytics/users` — jumlah user aktif
- `GET /api/admin/analytics/items` — click & view stats per item/project

Endpoint publik:
- `GET /api/projects` (+ filter `?scope=construction`)
- `GET /api/projects/{slug}`
- `GET /api/items` (+ filter `?theme=` `?category=` `?type=`)
- `GET /api/landing/highlights`
- `POST /api/track/click` & `POST /api/track/view` (untuk frontend kirim event)

Upload gambar pakai Laravel Storage (`storage/app/public`), disajikan via `/storage/...`.

### 2. Frontend Admin (React)
Layout admin baru dengan sidebar (sesuai permintaan "nyaman & aesthetic", mengikuti style Livora yang sudah ada — serif heading, neutral palette):

- `/admin` — overview: total users, users online, top-clicked items (chart bar pakai `recharts`)
- `/admin/projects` — list + form CRUD project, upload hero image, manage photos & tag items per foto
- `/admin/items` — list + form CRUD item dengan dropdown furniture type, multi-select themes & categories
- `/admin/taxonomies` — kelola Scopes, Furniture Types, Themes, Categories dalam 1 page (tabs)
- `/admin/landing` — pilih 3 highlighted projects (drag/checkbox)
- `/admin/analytics` — chart click/view per item & per project, breakdown by waktu

### 3. Frontend Public (update halaman yang sudah ada)
- `Projects.tsx` — fetch dari API, tombol filter scope
- `ProjectDetail.tsx` — render dari API, photos gallery dengan tagged items
- `Furniture.tsx` — fetch dari API, filter by theme/category/type
- `Index.tsx` (landing) — section "Our Project" pakai highlighted projects dari API
- Tracking: kirim `POST /api/track/view` saat user buka detail (dengan timer durasi via `beforeunload`), `POST /api/track/click` saat klik card

---

## Detail teknis

- **Auth admin route**: tambah middleware `EnsureUserIsAdmin` di Laravel yang cek `auth()->user()->role === 'admin'`
- **Validasi max 3 highlight**: validasi di controller `LandingController@updateHighlights`
- **Image upload**: pakai `request->file('image')->store('projects', 'public')` + return URL
- **Tracking durasi**: di frontend simpan `Date.now()` saat mount, kirim ke API saat unmount/route change
- **Charts**: pakai `recharts` (sudah ada di project)
- **Realtime user count**: polling tiap 30 detik untuk simplicity (bukan websocket)

---

## Pertanyaan sebelum saya mulai

Karena scope ini **sangat besar** (sekitar 15-20 file backend baru + 8-10 page admin + update 4 page publik), saya mau pastikan dulu:

1. **Stack backend** — saya konfirmasi pakai **Laravel** (yang sudah ada di `backend/`), bukan Lovable Cloud/Supabase. Setuju?
2. **Database** — pakai database Laravel yang sekarang (SQLite/MySQL sesuai `.env` backend kamu). Setuju?
3. **Approach pengerjaan** — karena besar, mau saya kerjakan **bertahap** (per fase) atau **sekaligus** (1 PR besar, lebih lama tapi langsung jadi)?
   - **Fase 1**: Backend models + migrations + API Projects & Scopes + UI admin Projects
   - **Fase 2**: Items + Furniture Types + Themes + Categories + UI admin
   - **Fase 3**: Landing highlights + update public pages
   - **Fase 4**: Analytics (tracking + charts)
4. **Tagging item di foto** — apakah perlu fitur klik koordinat (x,y) di foto untuk tag item, atau cukup pilih item dari dropdown saja (lebih simpel)?

Setelah kamu jawab, saya langsung mulai dari fase pertama.