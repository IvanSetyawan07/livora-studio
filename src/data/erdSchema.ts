// =============================================================
// LIVORA — ERD SCHEMA SOURCE OF TRUTH
// -------------------------------------------------------------
// Update this file whenever a table/relation changes in the
// backend (backend/database/migrations). The ERD page reads this
// file and re-renders itself automatically — no layout work
// needed, positions are generated per domain.
// =============================================================

export type Domain =
  | "auth"
  | "catalog"
  | "collection"
  | "project"
  | "experience"
  | "consultation"
  | "marketing"
  | "support"
  | "analytics";

export type TableDef = {
  name: string;
  domain: Domain;
  label?: string;
  columns: string[];
};

export type RelationDef = {
  from: string;
  to: string;
  label: string; // e.g. "1 — N"
};

export const DOMAINS: { id: Domain; label: string; color: string }[] = [
  { id: "auth", label: "Auth & Users", color: "#22c55e" },
  { id: "catalog", label: "Catalog & Items", color: "#2563eb" },
  { id: "collection", label: "Collections", color: "#a855f7" },
  { id: "project", label: "Projects", color: "#0ea5e9" },
  { id: "experience", label: "Furniture Experience", color: "#14b8a6" },
  { id: "consultation", label: "Consultations", color: "#f97316" },
  { id: "marketing", label: "Marketing & Wishlist", color: "#e11d48" },
  { id: "support", label: "AI Chat Support", color: "#eab308" },
  { id: "analytics", label: "Analytics Tracking", color: "#64748b" },
];

export const TABLES: TableDef[] = [
  // ---------- AUTH ----------
  { name: "users", domain: "auth", columns: ["id", "name", "email", "password", "role", "phone", "address", "provider", "provider_id", "language", "last_seen_at", "created_at"] },
  { name: "user_activities", domain: "auth", columns: ["id", "user_id →users", "action", "context", "ip", "created_at"] },
  { name: "personal_access_tokens", domain: "auth", columns: ["id", "tokenable_id", "name", "token", "abilities"] },

  // ---------- CATALOG / ITEMS ----------
  { name: "items", domain: "catalog", columns: ["id", "type_id →furniture_types", "collection_id →collections", "title", "slug", "code", "texture", "finish", "availability", "image", "description", "stock", "price", "weight_kg", "width_cm", "depth_cm", "height_cm", "material_detail", "warehouse_note"] },
  { name: "furniture_types", domain: "catalog", columns: ["id", "name", "slug", "image"] },
  { name: "themes", domain: "catalog", columns: ["id", "name", "slug"] },
  { name: "categories", domain: "catalog", columns: ["id", "name", "slug"] },
  { name: "item_theme", domain: "catalog", columns: ["item_id →items", "theme_id →themes"] },
  { name: "category_item", domain: "catalog", columns: ["item_id →items", "category_id →categories"] },
  { name: "taxonomy_banners", domain: "catalog", columns: ["id", "taxonomy_type", "taxonomy_slug", "image", "title"] },
  { name: "catalogs", domain: "catalog", columns: ["id", "title", "tagline", "about_title", "slug", "category", "taxonomy", "description", "cover_image", "featured", "deleted_at"] },
  { name: "catalog_scenes", domain: "catalog", columns: ["id", "catalog_id →catalogs", "image", "title", "sort_order"] },
  { name: "hotspots", domain: "catalog", columns: ["id", "catalog_id →catalogs", "scene", "item_id →items", "x", "y", "label", "description"] },

  // ---------- COLLECTIONS ----------
  { name: "collections", domain: "collection", columns: ["id", "name", "slug", "description", "short_description", "hero_banner", "card_banner", "featured_image", "display_order", "status", "seo_title", "seo_description", "cta_text", "cta_link"] },
  { name: "collection_stories", domain: "collection", columns: ["id", "collection_id →collections", "story_banner", "story_description", "cta_text", "cta_link"] },
  { name: "collection_packages", domain: "collection", columns: ["id", "collection_id →collections", "name", "slug", "description", "banner", "sort_order"] },
  { name: "collection_package_item", domain: "collection", columns: ["package_id →collection_packages", "item_id →items", "sort_order"] },

  // ---------- PROJECTS ----------
  { name: "projects", domain: "project", columns: ["id", "title", "slug", "subtitle", "description", "location", "year", "hero_image", "scope_id →scopes", "is_highlighted", "sort_order"] },
  { name: "scopes", domain: "project", columns: ["id", "name", "slug"] },
  { name: "project_photos", domain: "project", columns: ["id", "project_id →projects", "title", "image", "caption", "sort_order"] },
  { name: "photo_items", domain: "project", columns: ["project_photo_id →project_photos", "item_id →items"] },

  // ---------- FURNITURE EXPERIENCE ----------
  { name: "furniture_variants", domain: "experience", columns: ["id", "item_id →items", "variant_name", "category", "color_name", "color_code", "material_name", "preview_image", "furniture_image", "is_default", "sort_order", "is_active"] },
  { name: "furniture_gallery", domain: "experience", columns: ["id", "item_id →items", "variant_id →furniture_variants", "image", "title", "alt_text", "sort_order"] },
  { name: "furniture_lifestyle", domain: "experience", columns: ["id", "item_id →items", "image", "caption", "layout_type", "width_percentage", "sort_order"] },
  { name: "furniture_stories", domain: "experience", columns: ["id", "item_id →items", "title", "description", "feature_image"] },
  { name: "furniture_story_cards", domain: "experience", columns: ["id", "story_id →furniture_stories", "title", "description", "icon", "sort_order"] },

  // ---------- CONSULTATIONS ----------
  { name: "consultations", domain: "consultation", columns: ["id", "user_id →users", "name", "email", "phone", "location", "project_type", "looking_for", "contact_method", "question", "status", "stage", "meeting_link", "meeting_at", "dp_amount", "paid_at", "agreement_file", "created_at"] },
  { name: "consultation_status_histories", domain: "consultation", columns: ["id", "consultation_id →consultations", "from_status", "to_status", "note", "created_at"] },
  { name: "consultation_messages", domain: "consultation", columns: ["id", "consultation_id →consultations", "sender", "body", "attachment_path", "attachment_type", "read_at", "created_at"] },
  { name: "consultation_stage_files", domain: "consultation", columns: ["id", "consultation_id →consultations", "stage", "file_path", "label"] },
  { name: "consultation_progress_updates", domain: "consultation", columns: ["id", "consultation_id →consultations", "stage", "title", "description", "created_at"] },

  // ---------- MARKETING ----------
  { name: "marketing_campaigns", domain: "marketing", columns: ["id", "campaign_name", "subject", "section_label", "headline", "body", "hero_image", "cta_label", "cta_url", "target", "user_ids", "segment", "status", "scheduled_at", "sent_at", "sent_count"] },
  { name: "wishlists", domain: "marketing", columns: ["id", "user_id →users", "target_type", "target_id", "created_at"] },

  // ---------- SUPPORT / AI CHAT ----------
  { name: "support_sessions", domain: "support", columns: ["id", "visitor_id", "user_id →users", "status", "mode (ai|cs)", "ip", "visitor_number", "last_activity_at"] },
  { name: "support_messages", domain: "support", columns: ["id", "session_id →support_sessions", "sender (user|ai|cs)", "body", "attachment", "created_at"] },

  // ---------- ANALYTICS ----------
  { name: "item_clicks", domain: "analytics", columns: ["id", "target_type (item|project|collection|catalog)", "target_id", "user_id →users", "clicked_at"] },
  { name: "item_views", domain: "analytics", columns: ["id", "target_type", "target_id", "user_id →users", "duration_seconds", "viewed_at"] },
];

export const RELATIONS: RelationDef[] = [
  { from: "users", to: "user_activities", label: "1 — N" },
  { from: "users", to: "personal_access_tokens", label: "1 — N" },
  { from: "furniture_types", to: "items", label: "1 — N" },
  { from: "collections", to: "items", label: "1 — N" },
  { from: "items", to: "item_theme", label: "1 — N" },
  { from: "themes", to: "item_theme", label: "1 — N" },
  { from: "items", to: "category_item", label: "1 — N" },
  { from: "categories", to: "category_item", label: "1 — N" },
  { from: "catalogs", to: "catalog_scenes", label: "1 — N" },
  { from: "catalogs", to: "hotspots", label: "1 — N" },
  { from: "items", to: "hotspots", label: "1 — N" },
  { from: "collections", to: "collection_stories", label: "1 — 1" },
  { from: "collections", to: "collection_packages", label: "1 — N" },
  { from: "collection_packages", to: "collection_package_item", label: "1 — N" },
  { from: "items", to: "collection_package_item", label: "1 — N" },
  { from: "scopes", to: "projects", label: "1 — N" },
  { from: "projects", to: "project_photos", label: "1 — N" },
  { from: "project_photos", to: "photo_items", label: "1 — N" },
  { from: "items", to: "photo_items", label: "1 — N" },
  { from: "items", to: "furniture_variants", label: "1 — N" },
  { from: "items", to: "furniture_gallery", label: "1 — N" },
  { from: "furniture_variants", to: "furniture_gallery", label: "1 — N" },
  { from: "items", to: "furniture_lifestyle", label: "1 — N" },
  { from: "items", to: "furniture_stories", label: "1 — 1" },
  { from: "furniture_stories", to: "furniture_story_cards", label: "1 — N" },
  { from: "users", to: "consultations", label: "1 — N" },
  { from: "consultations", to: "consultation_status_histories", label: "1 — N" },
  { from: "consultations", to: "consultation_messages", label: "1 — N" },
  { from: "consultations", to: "consultation_stage_files", label: "1 — N" },
  { from: "consultations", to: "consultation_progress_updates", label: "1 — N" },
  { from: "users", to: "wishlists", label: "1 — N" },
  { from: "users", to: "support_sessions", label: "1 — N" },
  { from: "support_sessions", to: "support_messages", label: "1 — N" },
  { from: "users", to: "item_clicks", label: "1 — N" },
  { from: "users", to: "item_views", label: "1 — N" },
  { from: "items", to: "item_clicks", label: "tracked as target" },
  { from: "collections", to: "item_clicks", label: "tracked as target" },
  { from: "catalogs", to: "item_clicks", label: "tracked as target" },
  { from: "projects", to: "item_clicks", label: "tracked as target" },
];

// Simple flows (feature level) for the "Flow" tab of the ERD page.
export const FLOWS: { title: string; steps: string[] }[] = [
  {
    title: "Discovery → Item Detail",
    steps: ["Landing / Collection / Catalog", "Category or Filter page", "Item Detail (variants, gallery, story)", "Track click + view (item_clicks / item_views)", "Save to wishlist or ask AI chat"],
  },
  {
    title: "Consultation (10 stage)",
    steps: ["Appointment form", "New inquiry", "Admin approve / reject", "Meeting scheduled → meeting done", "DP requested → paid", "Agreement uploaded", "Progress updates", "Completed"],
  },
  {
    title: "AI Chat → CS Handover",
    steps: ["Visitor opens chat widget", "AI answers with product knowledge (RAG)", "Visitor requests CS", "Admin accepts in Chat Support", "Live CS conversation", "Idle 10 min → session reset"],
  },
  {
    title: "Marketing & Reporting",
    steps: ["Segment audience", "Compose campaign (draft → send)", "marketing_campaigns logs sent_count", "Analytics period (open → close date)", "Export PDF report"],
  },
  {
    title: "Admin QR Workflow",
    steps: ["Item saved → QR generated", "Admin scans QR (/admin/scan)", "Internal product sheet (stock, price, dimensions)", "Similar items list"],
  },
];
