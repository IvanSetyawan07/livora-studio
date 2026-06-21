## Advanced Furniture Configurator & Product Experience Page

A premium product detail experience inspired by BoConcept, built natively in Livora LCR's existing visual language (serif headings, off-white/gold palette, generous whitespace, subtle fade transitions). No commerce — pure luxury catalog.

---

### 1. Backend (Laravel) — new tables & APIs

New migrations:

- `collections` — id, name, slug, description
- `furniture_variants` — id, item_id, variant_name, category (enum: fabric/leather/wood/metal/marble/other), color_name, material_name, preview_image, description, sort_order, is_active
- `furniture_gallery` — id, item_id, variant_id (nullable), image, title, alt_text, sort_order
- `furniture_lifestyle` — id, item_id, image, caption, layout_type (full/half/masonry/custom), width_percentage, sort_order
- `furniture_stories` — id, item_id, title, description, feature_image
- `furniture_story_cards` — id, story_id, title, description, icon, sort_order
- Add `collection_id` to existing `items` table

New API endpoints (`/api/items/{slug}` extended response + admin CRUD):

- `GET /items/{slug}` returns full nested payload (variants, gallery, lifestyle, story+cards, collection, related)
- `POST/PUT/DELETE /admin/items/{id}/variants`
- `POST/PUT/DELETE /admin/items/{id}/gallery` (+ reorder)
- `POST/PUT/DELETE /admin/items/{id}/lifestyle`
- `POST/PUT /admin/items/{id}/story` + nested cards
- `GET/POST/PUT/DELETE /admin/collections`

---

### 2. Frontend — `ItemDetail.tsx` rebuild

New section flow (top → bottom), keeping current Navbar/Breadcrumb/Footer:

1. **Hero split** — Left: main image with crossfade on variant change. Right: name, code, category chip, "Choose Your Design" configurator.
2. **Choose Your Design** — grouped variant cards (Fabric / Leather / Wood). Each card: preview swatch image, variant name, category label. Click → animated crossfade of main image + gallery + description. No reload.
3. **Interactive Gallery** — large carousel with arrows, swipe (touch), keyboard nav, thumbnail strip below. Updates per selected variant.
4. **Furniture In Real Spaces** — dynamic grid renderer reading `layout_type` + `width_percentage` per image (full/half/masonry/custom %). CSS grid with fractional widths.
5. **Storytelling** — editorial intro paragraph, large feature image, then 2×2 feature cards grid (title + description + optional icon).
6. **Explore The Collection** — auto-fetched siblings by `collection_id`, horizontal scroll card row (reuses existing related-items styling).

Animations: tailwind `animate-fade-in`, image crossfade via opacity transition, hover-scale on cards. No commerce UI anywhere.

---

### 3. Admin — `Admin → Furniture → Item Editor`

Extend `AdminItems.tsx` with tabbed editor per item:

- **Details** (existing fields + collection dropdown)
- **Variants** — table CRUD, image upload, sort
- **Gallery** — multi-upload, drag-and-drop reorder (dnd-kit), per-image alt/title
- **Lifestyle** — multi-upload, per-image layout dropdown + width % selector, live preview
- **Story** — single story form + nested cards CRUD
- **Collections** — separate top-level admin page for managing collection list

---

### Technical notes

- Stack stays as-is: Laravel backend, React/Vite frontend, axios via `@/lib/api`.
- Drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable`.
- Image uploads reuse existing `/storage/` flow via `Storage::disk('public')`.
- Frontend types extended in `src/lib/itemsApi.ts` (`ApiItem` gains nested arrays).
- All new public-facing reads are unauthenticated GETs (catalog). Admin writes go through existing `EnsureAdmin` middleware.
- Static-items fallback in `useItemBySlug` kept for offline dev; new fields degrade gracefully when absent.

---

### Scope confirmation needed

This is ~6 new tables, ~20 endpoints, a rebuilt detail page, and 4 new admin tabs. Before I start:

1. **Build order** — should I ship in phases (a) backend migrations + APIs → (b) public detail page → (c) admin CRUD, or all at once?
2. **Collections** — should existing items be auto-grouped by current `themes`/`type`, or do you want a brand-new `collections` taxonomy you'll populate manually?
3. **Existing item images** — keep the current single `image` field as a fallback when no gallery exists? (recommended: yes)
