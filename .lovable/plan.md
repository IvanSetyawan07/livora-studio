## Ringkasan
Menambahkan fitur **Collection** dengan design language yang sama seperti Livora existing. Tidak mengubah homepage, navbar (hanya penambahan menu), footer, catalog, experience editor, atau admin dashboard yang sudah ada. Item data tetap menggunakan tabel `items` existing — tidak duplicate.

## Perubahan Navbar
- Tambah menu **COLLECTION** di overlay `menuLinks` (Navbar.tsx), posisinya tepat setelah CATALOG dropdown.
- Menu lain tidak diubah.

## Routing (frontend)
Tambah 3 route di `src/App.tsx`:
- `/collection` → CollectionLanding
- `/collection/:slug` → CollectionDetail
- `/collection/:slug/:category` → CollectionCategory

## Halaman Baru (Frontend)

**1. CollectionLanding (`/collection`)**
- Hero 85vh full-width + parallax ringan + text reveal (pakai animasi ala CatalogPage).
- Section "Explore Our Collections" — grid 3/2/1 kolom. Card: banner, name, description, "Explore Collection →".
- Hover: image zoom, shadow, card lift, arrow slide.

**2. CollectionDetail (`/collection/:slug`)**
- Hero large banner + name + description + CTA.
- Sticky horizontal tabs kategori: All, Sofa, Chair, Table, Cabinet, Bedroom, Decor, Lighting → klik ke `/collection/:slug/:category`.
- Section **Collection Story** (banner + description + CTA).
- Section **Collection Packages** (grid card: banner, title, jumlah item, tombol). Klik package → expand ke "Items Included" (data dari items existing).

**3. CollectionCategory (`/collection/:slug/:category`)**
- Sticky tabs kategori sama seperti detail.
- Grid item 3/2/1 kolom. Card: image, title, subtitle, plus button, hover zoom.
- Data diambil dari endpoint `/items?collection={slug}&type={category}` (query param existing sudah support `collection` & `type`; kalau belum, ditambahkan di ItemController — read-only).

## Perubahan Database (BACKEND — perlu approval)

Tabel `collections` existing dipertahankan (name, slug, description). Tambahan **4 tabel baru** + kolom baru di `collections`:

**Migration baru:** `2026_07_16_XXXXXX_extend_collections_for_landing.php`

- `collections` — tambah kolom: `short_description`, `hero_banner`, `card_banner`, `featured_image`, `display_order`, `status`, `seo_title`, `seo_description`.
- `collection_stories` — 1:1 dengan collection: `story_banner`, `story_description`, `cta_text`, `cta_link`.
- `collection_packages` — 1:N: `collection_id`, `name`, `slug`, `banner`, `sort_order`.
- `collection_package_item` — pivot M:N ke `items` existing: `package_id`, `item_id`, `sort_order`.

Tidak ada perubahan pada tabel `items`, `catalogs`, `furniture_types`, atau apapun yang existing selain `collections` (menambah kolom, non-destructive).

## Perubahan Backend (Laravel)
- `CollectionController` diperluas: field baru pada store/update, eager-load story + packages + items pada `show`.
- Controller baru: `CollectionStoryController`, `CollectionPackageController` untuk CRUD (admin only, di dalam `middleware('admin')`).
- `ItemController@index` diperluas: dukung query `?collection=slug&type=slug` (read-only, aman).
- Public GET endpoint: `/collections`, `/collections/{slug}` (sudah ada, diperluas payload-nya).

## Admin CRUD
Menu `Collections` di AdminLayout sudah ada. Halaman `AdminCollections.tsx` di-upgrade menjadi list + form editor lengkap:
- Field: name, slug, short_description, hero_banner, card_banner, featured_image, display_order, status, seo_title, seo_description.
- Tab **Story**: story_banner, story_description, CTA text/link.
- Tab **Packages**: list package (CRUD) → tiap package pilih item existing via multi-select (dari tabel items).

Tidak membuat halaman admin baru di luar menu Collections yang sudah ada.

## Animasi & Styling
- Reuse animasi Framer/CSS yang sudah dipakai di CatalogPage (fade-up, parallax, hover zoom, arrow slide, stagger).
- Container `max-w-7xl` + padding kiri/kanan konsisten dengan Homepage/Catalog. Hero full-width. Vertical spacing 80–120px.
- Typography: serif heading, sans body — reuse token existing.

## Yang TIDAK diubah
- Homepage, Navbar layout (hanya menambah 1 item), Footer, Catalog, Experience Editor, Admin Dashboard structure, styling global, route existing, tabel `items` / `catalogs` / `furniture_types` / `themes` / `categories`.

## Konfirmasi yang saya butuhkan sebelum mulai:
1. **OK untuk saya jalankan migration** yang: (a) menambah 8 kolom baru di tabel `collections`, (b) membuat 3 tabel baru (`collection_stories`, `collection_packages`, `collection_package_item`)? Migration non-destructive, data existing pada `collections` (name/slug/description) tetap.
2. Untuk **Package → Items**: cukup pilih dari items existing (multi-select) tanpa duplicate data, benar?
3. Kategori tabs (Sofa/Chair/Table/Cabinet/Bedroom/Decor/Lighting) — saya map ke `furniture_types` existing berdasarkan slug. Kalau ada slug yang belum ada di DB (mis. "Cabinet"/"Decor"/"Lighting"), tab tetap muncul tapi hasil kosong. OK?

Balas dengan **"OK, jalankan"** atau kasih catatan. Setelah approval, saya migrate DB dulu → lalu implement frontend + admin.
