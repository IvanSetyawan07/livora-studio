// =============================================================
// LIVORA — ERD SCHEMA SOURCE OF TRUTH
// -------------------------------------------------------------
// Update this file whenever a table/relation changes in the
// backend (backend/database/migrations). The ERD page reads this
// file and re-renders itself automatically — no layout work
// needed, positions are generated per domain.
//
// Last synced with migrations up to: 2026_10_06_100000_shop_stage_3_4
// NOTE: the ERD page is ADMIN-ONLY (see <RequireRole> in App.tsx).
// =============================================================

export type Domain =
  | "auth"
  | "catalog"
  | "collection"
  | "project"
  | "experience"
  | "consultation"
  | "shop"
  | "aftercare"
  | "whatsapp"
  | "marketing"
  | "ai"
  | "support"
  | "analytics"
  | "system";

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
  { id: "shop", label: "Shop Orders (Pesan Furniture)", color: "#db2777" },
  { id: "aftercare", label: "Shop Aftercare", color: "#be123c" },
  { id: "whatsapp", label: "WhatsApp & Shop Ops", color: "#16a34a" },
  { id: "marketing", label: "Marketing & Wishlist", color: "#e11d48" },
  { id: "ai", label: "AI Marketing", color: "#7c3aed" },
  { id: "support", label: "AI Chat Support", color: "#eab308" },
  { id: "analytics", label: "Analytics Tracking", color: "#64748b" },
  { id: "system", label: "System & Audit", color: "#475569" },
];

export const TABLES: TableDef[] = [
  // ---------- AUTH ----------
  { name: "users", domain: "auth", columns: ["id", "name", "email", "password", "role (admin|user|sales)", "admin_role (owner|cs|finance|production)", "phone", "address", "avatar_url", "provider", "provider_id", "language", "login_count", "last_login_at", "last_ip", "last_seen_at", "phone_verified_at", "wa_opt_in", "wa_opt_out_at", "terms_accepted_at", "terms_version", "privacy_version", "created_at"] },
  { name: "user_activities", domain: "auth", columns: ["id", "user_id →users", "type (login|logout|page_view|item_view|register)", "path", "ip", "user_agent", "meta", "created_at"] },
  { name: "personal_access_tokens", domain: "auth", columns: ["id", "tokenable_id", "name", "token", "abilities"] },
  { name: "admin_trusted_devices", domain: "auth", columns: ["id", "user_id →users", "token_hash", "ip_address", "user_agent", "expires_at", "last_used_at"] },

  // ---------- CATALOG / ITEMS ----------
  { name: "items", domain: "catalog", columns: ["id", "type_id →furniture_types", "collection_id →collections", "title", "slug", "code", "texture", "finish", "availability", "image", "description", "meta_title", "meta_description", "stock", "price", "weight_kg", "width_cm", "depth_cm", "height_cm", "material_detail", "warehouse_note", "fulfillment_type (ready_stock|made_to_order)", "discount_type (percent|amount)", "discount_value"] },
  { name: "furniture_types", domain: "catalog", columns: ["id", "name", "slug", "image"] },
  { name: "themes", domain: "catalog", columns: ["id", "name", "slug"] },
  { name: "categories", domain: "catalog", columns: ["id", "name", "slug"] },
  { name: "item_theme", domain: "catalog", columns: ["item_id →items", "theme_id →themes"] },
  { name: "category_item", domain: "catalog", columns: ["item_id →items", "category_id →categories"] },
  { name: "taxonomy_banners", domain: "catalog", columns: ["id", "taxonomy_type", "taxonomy_slug", "image", "title"] },
  { name: "catalogs", domain: "catalog", columns: ["id", "title", "tagline", "about_title", "slug", "category", "taxonomy", "description", "cover_image", "featured", "deleted_at"] },
  { name: "catalog_scenes", domain: "catalog", columns: ["id", "catalog_id →catalogs", "image", "title", "sort_order"] },
  { name: "hotspots", domain: "catalog", columns: ["id", "catalog_id →catalogs", "scene", "item_id →items", "x", "y", "label", "description"] },
  { name: "catalog_item_layouts", domain: "catalog", columns: ["id", "catalog_id →catalogs", "item_slug (logical →items.slug)", "pos_x", "pos_y", "width", "height", "UNIQUE(catalog_id, item_slug)"] },

  // ---------- COLLECTIONS ----------
  { name: "collections", domain: "collection", columns: ["id", "name", "slug", "description", "short_description", "hero_banner", "card_banner", "featured_image", "display_order", "status", "seo_title", "seo_description", "cta_text", "cta_link"] },
  { name: "collection_stories", domain: "collection", columns: ["id", "collection_id →collections", "story_banner", "story_description", "cta_text", "cta_link"] },
  { name: "collection_packages", domain: "collection", columns: ["id", "collection_id →collections", "name", "slug", "description", "banner", "sort_order"] },
  { name: "collection_package_item", domain: "collection", columns: ["package_id →collection_packages", "item_id →items", "sort_order"] },

  // ---------- PROJECTS ----------
  { name: "projects", domain: "project", columns: ["id", "title", "slug", "subtitle", "description", "meta_title", "meta_description", "location", "year", "hero_image", "scope_id →scopes", "is_highlighted", "sort_order"] },
  { name: "scopes", domain: "project", columns: ["id", "name", "slug"] },
  { name: "project_photos", domain: "project", columns: ["id", "project_id →projects", "title", "image", "caption", "sort_order"] },
  { name: "photo_items", domain: "project", columns: ["project_photo_id →project_photos", "item_id →items"] },
  { name: "project_layouts", domain: "project", columns: ["id", "project_id →projects", "title", "subtitle", "description", "image", "sort_order"] },
  { name: "project_rooms", domain: "project", columns: ["id", "project_layout_id →project_layouts", "title", "area", "description", "specs (json)", "image", "sort_order"] },
  { name: "project_room_hotspots", domain: "project", columns: ["id", "project_room_id →project_rooms", "label", "x", "y", "item_slug (logical →items.slug)", "description", "image", "sort_order"] },

  // ---------- FURNITURE EXPERIENCE ----------
  { name: "furniture_variants", domain: "experience", columns: ["id", "item_id →items", "variant_name", "category", "color_name", "color_code", "material_name", "preview_image", "furniture_image", "is_default", "sort_order", "is_active"] },
  { name: "furniture_gallery", domain: "experience", columns: ["id", "item_id →items", "variant_id →furniture_variants", "image", "title", "alt_text", "sort_order"] },
  { name: "furniture_lifestyle", domain: "experience", columns: ["id", "item_id →items", "image", "caption", "layout_type", "width_percentage", "sort_order"] },
  { name: "furniture_stories", domain: "experience", columns: ["id", "item_id →items", "title", "description", "feature_image"] },
  { name: "furniture_story_cards", domain: "experience", columns: ["id", "story_id →furniture_stories", "title", "description", "icon", "sort_order"] },

  // ---------- CONSULTATIONS (My Consultation) ----------
  { name: "consultations", domain: "consultation", columns: ["id", "user_id →users", "assigned_admin_id →users", "first_name", "last_name", "email", "phone", "contact_method", "consultation_type", "service_type", "project_type", "estimated_area", "preferred_style", "message", "attachments", "status", "admin_notes", "rejection_reason", "meeting_date / meeting_time / meeting_type", "meeting_location", "meeting_link", "follow_up_date", "dp_amount", "dp_paid_at", "final_payment_amount / _requested_at / _paid_at", "agreement_* (content, pdf, signature, signer ip/device, hash)", "livora_countersigned_at / signer / signature", "meterai_* (status, serial, reference, mode, applied/completed_at)", "project_progress", "handover_issued_at", "final_agreement_verified_at", "final_agreement_verified_by →users", "terms_accepted / privacy_accepted + versions", "consent_accepted_at", "created_at"] },
  { name: "consultation_status_histories", domain: "consultation", columns: ["id", "consultation_id →consultations", "previous_status", "new_status", "changed_by →users", "note", "created_at"] },
  { name: "consultation_messages", domain: "consultation", columns: ["id", "consultation_id →consultations", "sender_type", "sender_id →users", "body", "meeting_link", "attachment_url", "attachment_type", "attachment_name", "read_at", "created_at"] },
  { name: "consultation_stage_files", domain: "consultation", columns: ["id", "consultation_id →consultations", "stage", "kind (invoice|payment_proof|agreement|signed_agreement|progress_photo|other)", "file_path", "note", "uploaded_by →users", "review_status", "reviewed_by →users", "reviewed_at", "rejection_reason", "created_at"] },
  { name: "consultation_progress_updates", domain: "consultation", columns: ["id", "consultation_id →consultations", "percentage", "note", "photos (json)", "created_by →users", "created_at"] },
  { name: "consultation_progress_comments", domain: "consultation", columns: ["id", "progress_update_id →consultation_progress_updates", "consultation_id →consultations", "user_id →users", "author_type", "body", "created_at"] },
  { name: "consultation_activities", domain: "consultation", columns: ["id", "consultation_id →consultations", "audience (user|admin|both)", "type", "title", "body", "data (json)", "actor_id →users", "user_read_at", "admin_read_at", "created_at"] },
  { name: "consultation_visits", domain: "consultation", columns: ["id", "consultation_id →consultations", "title", "visit_date", "summary", "photos (json)", "created_by →users", "created_at"] },

  // ---------- SHOP ORDERS (Pesan Furniture) — NEW ----------
  { name: "cart_items", domain: "shop", columns: ["id", "user_id →users", "item_id →items", "variant_id →furniture_variants", "quantity", "note", "selected", "UNIQUE(user_id, item_id, variant_id)", "created_at"] },
  { name: "shop_orders", domain: "shop", columns: ["id", "code (LVR-XXXXXX, unique)", "user_id →users", "created_by →users", "status (menunggu_wa … selesai, see ShopOrder::FLOW)", "order_type (ready_stock|made_to_order|mixed)", "source (web|manual)", "customer_name / customer_phone / customer_email", "note", "wa_consent", "idempotency_key", "form_token / form_token_expires_at", "shipping (json)", "custom_spec (json, MTO)", "quote_version", "subtotal", "product_discount", "extra_discount (type/value/reason)", "dpp", "ppn", "shipping_fee / installation_fee / other_fee", "grand_total", "quote_sent_at / quote_expires_at / quote_approved_at", "paid_at", "sla_due_at", "spec_reviewed_by →users", "spec_approved_at", "spec_revised", "production_started_at", "courier / tracking_number / delivery_date", "shipped_at / received_at", "expires_at", "project_id (logical →projects)", "created_at"] },
  { name: "shop_order_items", domain: "shop", columns: ["id", "order_id →shop_orders", "item_id →items", "variant_id →furniture_variants", "title (snapshot)", "code", "variant_name", "image", "fulfillment_type", "quantity", "note", "unit_price", "unit_discount", "discount_label"] },
  { name: "stock_holds", domain: "shop", columns: ["id", "order_id →shop_orders", "item_id →items", "quantity", "status (held|reserved|released)", "expires_at"] },
  { name: "shop_payments", domain: "shop", columns: ["id", "order_id →shop_orders", "kind", "method (bca_transfer|qris)", "amount", "status (pending|menunggu_verifikasi|paid|expired|failed|void)", "gateway_ref (unique)", "qr_payload", "qr_url", "webhook_event_id (unique)", "expires_at", "paid_at", "verified_by →users"] },
  { name: "shop_payment_proofs", domain: "shop", columns: ["id", "payment_id →shop_payments", "file_path", "amount", "status (menunggu|acc|tolak)", "reason", "verified_by →users", "verified_at"] },
  { name: "shop_documents", domain: "shop", columns: ["id", "number", "type (INV)", "title (Tagihan|Invoice)", "status (belum_dibayar|lunas|kedaluwarsa|batal)", "order_id →shop_orders", "payment_id →shop_payments", "snapshot (json)", "pdf_path", "version", "issued_at", "paid_at", "UNIQUE(number, version)"] },
  { name: "document_counters", domain: "shop", columns: ["id", "type", "year", "month", "last_value", "UNIQUE(type, year, month)"] },
  { name: "shop_deliveries", domain: "shop", columns: ["id", "order_id →shop_orders", "scheduled_date", "courier", "tracking_number", "bast_photos (json)", "bast_signature_path", "receiver_name", "received_at", "notes"] },
  { name: "shop_order_changes", domain: "shop", columns: ["id", "order_id →shop_orders", "description", "price_delta", "ppn", "total", "status (dikirim|disetujui|ditolak|dibayar|batal)", "payment_id →shop_payments", "created_by →users", "responded_at"] },

  // ---------- SHOP AFTERCARE — NEW ----------
  { name: "shop_claims", domain: "aftercare", columns: ["id", "order_id →shop_orders", "user_id →users", "type (kerusakan|salah_ukuran|garansi|lainnya)", "description", "photos (json)", "status (diajukan|ditinjau|disetujui|ditolak|selesai)", "resolution", "handled_by →users"] },
  { name: "shop_refunds", domain: "aftercare", columns: ["id", "order_id →shop_orders", "payment_id →shop_payments", "amount", "reason", "status (diajukan|disetujui|dikirim|selesai|ditolak)", "bank_name", "account_number (encrypted)", "account_holder", "transfer_proof_path", "admin_note", "requested_by →users", "approved_by →users", "approved_at", "sent_at"] },

  // ---------- WHATSAPP & SHOP OPS — NEW ----------
  { name: "wa_sessions", domain: "whatsapp", columns: ["id", "phone (unique)", "user_id →users", "order_id →shop_orders", "status (bot|menunggu_cs|aktif|selesai)", "trigger", "fail_count", "assigned_to →users", "last_inbound_at", "handoff_at"] },
  { name: "wa_messages", domain: "whatsapp", columns: ["id", "message_id (unique)", "phone", "order_id →shop_orders", "direction (in|out)", "type", "body", "raw (json)", "is_note", "sent_by (logical →users)", "status"] },
  { name: "wa_failed_messages", domain: "whatsapp", columns: ["id", "phone", "body", "order_id (logical →shop_orders)", "error", "attempts", "resolved_at"] },
  { name: "webhook_logs", domain: "whatsapp", columns: ["id", "source (midtrans|whatsapp)", "event_id", "status (ok|rejected|error)", "error", "payload (json)", "created_at"] },
  { name: "funnel_events", domain: "whatsapp", columns: ["id", "event", "order_id (logical →shop_orders)", "user_id (logical →users)", "session_id", "meta (json)", "created_at"] },
  { name: "shop_settings", domain: "whatsapp", columns: ["id", "key (unique)", "value"] },

  // ---------- MARKETING ----------
  { name: "marketing_campaigns", domain: "marketing", columns: ["id", "campaign_name", "subject", "section_label", "headline", "body", "hero_image", "hero_image_alt", "cta_label", "cta_url", "signature", "target (all|selected|segment)", "user_ids", "segment", "status (draft|scheduled|sent)", "scheduled_at", "sent_at", "sent_count"] },
  { name: "wishlists", domain: "marketing", columns: ["id", "user_id →users", "wishlistable_type", "wishlistable_id", "UNIQUE(user_id, type, id)", "created_at"] },

  // ---------- AI MARKETING (/admin/ai-marketing) ----------
  { name: "ai_agents", domain: "ai", columns: ["id", "key (seo|content|ads|leads|cro)", "name", "purpose", "status", "connection_state", "last_run_at", "capabilities (json)", "dependencies (json)", "href"] },
  { name: "ai_insights", domain: "ai", columns: ["id", "title", "description", "type", "severity", "confidence", "source (json)", "agent_key", "reasoning", "what_happened", "why_it_matters", "expected_impact", "metrics (json)", "analytics_href", "recommendation_id (logical →ai_recommendations)"] },
  { name: "ai_recommendations", domain: "ai", columns: ["id", "insight_id →ai_insights", "title", "description", "action_type", "target_type (item|project)", "target_id", "risk", "status", "expected_impact", "confidence", "agent_key", "priority", "why", "suggested_action", "change_from", "change_to"] },
  { name: "ai_approvals", domain: "ai", columns: ["id", "recommendation_id →ai_recommendations", "title", "summary", "agent_key", "risk", "status", "requested_at", "decided_by", "decided_at"] },
  { name: "ai_impact_records", domain: "ai", columns: ["id", "recommendation_id →ai_recommendations", "title", "agent_key", "approved_at", "metric_label", "before_value", "after (json)", "change_pct (json)", "result", "ai_conclusion"] },
  { name: "ai_activity_log", domain: "ai", columns: ["id", "actor", "agent_key", "message", "payload (json)", "kind", "recommendation_id (logical →ai_recommendations)", "next_review_at"] },
  { name: "ai_usage_logs", domain: "ai", columns: ["id", "agent_key", "provider", "model", "input_tokens", "output_tokens", "duration_ms", "cost", "status", "error_message", "user_id →users"] },
  { name: "ai_providers", domain: "ai", columns: ["id", "provider (unique)", "model", "status", "latency_ms", "success_rate", "rate-limit columns"] },
  { name: "ai_routing_strategies", domain: "ai", columns: ["id", "name", "automatic", "quality", "speed", "cost_efficiency", "task_routing (json)", "is_active"] },
  { name: "ai_campaigns", domain: "ai", columns: ["id", "name", "channel", "health", "status", "summary", "budget_daily", "goals / plan (json)", "active_experiments (json)", "related_recommendation_ids (json)", "spark / metric (json)"] },
  { name: "ai_settings", domain: "ai", columns: ["id", "key (unique)", "value (sensitive keys encrypted)"] },

  // ---------- SUPPORT / AI CHAT ----------
  { name: "support_sessions", domain: "support", columns: ["id", "visitor_id", "user_id →users", "admin_id →users", "name", "email", "ip_address", "visitor_number", "status", "request_reason", "requested_at", "accepted_at", "closed_at", "last_message_at", "unread_admin", "unread_user"] },
  { name: "support_messages", domain: "support", columns: ["id", "support_session_id →support_sessions", "sender (user|ai|cs)", "admin_id →users", "text", "meta (json)", "created_at"] },

  // ---------- ANALYTICS ----------
  { name: "item_clicks", domain: "analytics", columns: ["id", "target_type (item|project|collection|catalog)", "target_id", "user_id (logical →users)", "clicked_at"] },
  { name: "item_views", domain: "analytics", columns: ["id", "target_type", "target_id", "user_id (logical →users)", "duration_seconds", "viewed_at"] },

  // ---------- SYSTEM & AUDIT ----------
  { name: "audit_logs", domain: "system", columns: ["id", "user_id →users", "action", "object_type", "object_id", "before (json)", "after (json)", "ip_address", "created_at"] },
  { name: "content_translations", domain: "system", columns: ["id", "translatable_type", "translatable_id", "locale", "field", "value", "source (manual|ai)", "UNIQUE per record/locale/field"] },
];

export const RELATIONS: RelationDef[] = [
  // ----- auth -----
  { from: "users", to: "user_activities", label: "1 — N" },
  { from: "users", to: "personal_access_tokens", label: "1 — N" },
  { from: "users", to: "admin_trusted_devices", label: "1 — N" },
  // ----- catalog -----
  { from: "furniture_types", to: "items", label: "1 — N" },
  { from: "collections", to: "items", label: "1 — N" },
  { from: "items", to: "item_theme", label: "1 — N" },
  { from: "themes", to: "item_theme", label: "1 — N" },
  { from: "items", to: "category_item", label: "1 — N" },
  { from: "categories", to: "category_item", label: "1 — N" },
  { from: "catalogs", to: "catalog_scenes", label: "1 — N" },
  { from: "catalogs", to: "hotspots", label: "1 — N" },
  { from: "items", to: "hotspots", label: "1 — N" },
  { from: "catalogs", to: "catalog_item_layouts", label: "1 — N" },
  // ----- collections -----
  { from: "collections", to: "collection_stories", label: "1 — 1" },
  { from: "collections", to: "collection_packages", label: "1 — N" },
  { from: "collection_packages", to: "collection_package_item", label: "1 — N" },
  { from: "items", to: "collection_package_item", label: "1 — N" },
  // ----- projects -----
  { from: "scopes", to: "projects", label: "1 — N" },
  { from: "projects", to: "project_photos", label: "1 — N" },
  { from: "project_photos", to: "photo_items", label: "1 — N" },
  { from: "items", to: "photo_items", label: "1 — N" },
  { from: "projects", to: "project_layouts", label: "1 — N" },
  { from: "project_layouts", to: "project_rooms", label: "1 — N" },
  { from: "project_rooms", to: "project_room_hotspots", label: "1 — N" },
  // ----- furniture experience -----
  { from: "items", to: "furniture_variants", label: "1 — N" },
  { from: "items", to: "furniture_gallery", label: "1 — N" },
  { from: "furniture_variants", to: "furniture_gallery", label: "1 — N" },
  { from: "items", to: "furniture_lifestyle", label: "1 — N" },
  { from: "items", to: "furniture_stories", label: "1 — 1" },
  { from: "furniture_stories", to: "furniture_story_cards", label: "1 — N" },
  // ----- consultations -----
  { from: "users", to: "consultations", label: "1 — N" },
  { from: "consultations", to: "consultation_status_histories", label: "1 — N" },
  { from: "consultations", to: "consultation_messages", label: "1 — N" },
  { from: "consultations", to: "consultation_stage_files", label: "1 — N" },
  { from: "consultations", to: "consultation_progress_updates", label: "1 — N" },
  { from: "consultation_progress_updates", to: "consultation_progress_comments", label: "1 — N" },
  { from: "consultations", to: "consultation_progress_comments", label: "1 — N" },
  { from: "consultations", to: "consultation_activities", label: "1 — N" },
  { from: "consultations", to: "consultation_visits", label: "1 — N" },
  // ----- shop orders (NEW) -----
  { from: "users", to: "cart_items", label: "1 — N" },
  { from: "items", to: "cart_items", label: "1 — N" },
  { from: "furniture_variants", to: "cart_items", label: "1 — N" },
  { from: "users", to: "shop_orders", label: "1 — N" },
  { from: "shop_orders", to: "shop_order_items", label: "1 — N" },
  { from: "items", to: "shop_order_items", label: "1 — N" },
  { from: "furniture_variants", to: "shop_order_items", label: "1 — N" },
  { from: "shop_orders", to: "stock_holds", label: "1 — N" },
  { from: "items", to: "stock_holds", label: "1 — N" },
  { from: "shop_orders", to: "shop_payments", label: "1 — N" },
  { from: "shop_payments", to: "shop_payment_proofs", label: "1 — N" },
  { from: "shop_orders", to: "shop_documents", label: "1 — N" },
  { from: "shop_payments", to: "shop_documents", label: "1 — N" },
  { from: "shop_orders", to: "shop_deliveries", label: "1 — N" },
  { from: "shop_orders", to: "shop_order_changes", label: "1 — N" },
  { from: "shop_payments", to: "shop_order_changes", label: "1 — N" },
  { from: "projects", to: "shop_orders", label: "linked via project_id (logical)" },
  // ----- shop aftercare (NEW) -----
  { from: "shop_orders", to: "shop_claims", label: "1 — N" },
  { from: "users", to: "shop_claims", label: "1 — N" },
  { from: "shop_orders", to: "shop_refunds", label: "1 — N" },
  { from: "shop_payments", to: "shop_refunds", label: "1 — N" },
  // ----- whatsapp & ops (NEW) -----
  { from: "users", to: "wa_sessions", label: "1 — N" },
  { from: "shop_orders", to: "wa_sessions", label: "1 — N" },
  { from: "shop_orders", to: "wa_messages", label: "1 — N" },
  { from: "shop_orders", to: "wa_failed_messages", label: "logical (order_id)" },
  { from: "shop_orders", to: "funnel_events", label: "logical (order_id)" },
  // ----- marketing -----
  { from: "users", to: "wishlists", label: "1 — N" },
  // ----- AI marketing -----
  { from: "ai_insights", to: "ai_recommendations", label: "1 — N" },
  { from: "ai_recommendations", to: "ai_approvals", label: "1 — N" },
  { from: "ai_recommendations", to: "ai_impact_records", label: "1 — N" },
  { from: "ai_recommendations", to: "ai_activity_log", label: "logical (recommendation_id)" },
  { from: "users", to: "ai_usage_logs", label: "1 — N" },
  // ----- support -----
  { from: "users", to: "support_sessions", label: "1 — N" },
  { from: "support_sessions", to: "support_messages", label: "1 — N" },
  // ----- analytics -----
  { from: "users", to: "item_clicks", label: "1 — N" },
  { from: "users", to: "item_views", label: "1 — N" },
  { from: "items", to: "item_clicks", label: "tracked as target" },
  { from: "collections", to: "item_clicks", label: "tracked as target" },
  { from: "catalogs", to: "item_clicks", label: "tracked as target" },
  { from: "projects", to: "item_clicks", label: "tracked as target" },
  // ----- system -----
  { from: "users", to: "audit_logs", label: "1 — N" },
];

// Simple flows (feature level) for the "Flow" tab of the ERD page.
export const FLOWS: { title: string; steps: string[] }[] = [
  {
    title: "Discovery → Item Detail",
    steps: ["Landing / Collection / Catalog", "Category or Filter page", "Item Detail (variants, gallery, story)", "Track click + view (item_clicks / item_views)", "Save to wishlist or ask AI chat"],
  },
  {
    title: "Consultation (10 stage)",
    steps: ["Appointment form", "New inquiry", "Admin approve / reject", "Meeting scheduled → meeting done", "DP requested → paid", "Agreement generated, signed (user) + countersigned (admin) + e-Meterai", "Progress updates + comments (consultation_progress_*)", "Site visits + handover", "Final payment → completed"],
  },
  {
    title: "Pesan Furniture (Shop Order)",
    steps: [
      "Cart (cart_items) → checkout creates shop_orders (menunggu_wa) + shop_order_items snapshot",
      "WhatsApp connected → customer fills order form (form_token) → data_lengkap",
      "Made-to-order: admin reviews custom_spec (SLA, spec_reviewed_by) → menunggu_review_admin",
      "Admin sends quote (quote_version, PPN, fees) → penawaran → customer approves",
      "Stock held (stock_holds) → menunggu_bayar",
      "Payment: BCA transfer (shop_payment_proofs verified by admin) or QRIS Midtrans (webhook_logs)",
      "Tagihan → Invoice numbered via document_counters (shop_documents) → dibayar",
      "Production / packing → diproses → siap_kirim",
      "Delivery + BAST (shop_deliveries) → dikirim → diterima → selesai",
      "Aftercare: change orders, claims, refunds (shop_order_changes / shop_claims / shop_refunds)",
    ],
  },
  {
    title: "WhatsApp Bot → CS Handoff",
    steps: ["Inbound message stored (wa_messages, direction in)", "Bot answers via wa_sessions (status bot)", "Failed replies queued (wa_failed_messages)", "Customer asks for human / fail_count threshold → menunggu_cs", "Admin Inbox takes over (assigned_to, status aktif)", "Internal notes (is_note) + outbound replies", "Session selesai"],
  },
  {
    title: "AI Chat → CS Handover",
    steps: ["Visitor opens chat widget", "AI answers with product knowledge (RAG)", "Visitor requests CS", "Admin accepts in Chat Support", "Live CS conversation", "Idle 10 min → session reset"],
  },
  {
    title: "AI Marketing Approval Loop",
    steps: ["Agent run → ai_insights", "Insight → ai_recommendations (risk, confidence)", "Admin approves in ai_approvals", "Execution logged in ai_activity_log", "Impact measured in ai_impact_records (7 / 14 / 30 days)", "Token cost tracked in ai_usage_logs"],
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