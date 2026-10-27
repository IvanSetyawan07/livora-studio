<?php

/*
|--------------------------------------------------------------------------
| Livora C4 — konfigurasi auto-sync
|--------------------------------------------------------------------------
| Modul C4 MEMBACA website (skema database, route, kelas PHP, config) lalu
| menulis hasilnya HANYA ke tabel c4_*. Tidak ada jalur sebaliknya: mengubah
| diagram tidak pernah mengubah website.
|
| Semua aturan di bawah ini bisa diedit tanpa menyentuh kode scanner.
| Tidak ada nilai rahasia (API key, password) yang dibaca ke diagram — config
| hanya dicek "terisi atau tidak" (boolean).
*/

return [
    'enabled' => env('C4_ENABLED', true),

    // Token untuk endpoint ingest frontend dari CI (header X-C4-Token).
    // Kosong = endpoint publik ingest dinonaktifkan (upload manual lewat UI tetap bisa).
    'ingest_token' => env('C4_INGEST_TOKEN'),

    // Sinkronisasi otomatis
    'schedule' => [
        'enabled' => env('C4_SCHEDULE', true),
        'frequency' => 'hourly', // hourly | everyFifteenMinutes | daily | dll (method Schedule Laravel)
    ],
    'sync_on_migrate' => env('C4_SYNC_ON_MIGRATE', true), // jalankan sync setelah `php artisan migrate`

    // false = Model Eloquent tidak jadi komponen sendiri (hanya jadi relasi komponen → tabel)
    'include_models' => false,

    // Tabel teknis Laravel yang tidak perlu tampil di diagram
    'ignore_tables' => [
        'migrations', 'failed_jobs', 'password_reset_tokens', 'password_resets',
        'cache', 'cache_locks', 'sessions', 'jobs', 'job_batches',
        // tabel milik modul ini sendiri
        'c4_domains', 'c4_elements', 'c4_relations', 'c4_layouts', 'c4_sync_runs',
    ],

    // Kelas yang tidak dianggap komponen (regex pada nama lengkap kelas)
    'ignore_class_regex' => '~(Exception|Contract|Interface|Handler|ServiceProvider)$~',

    // Modul C4 sendiri tidak ikut digambar (ubah ke true jika ingin melihatnya di diagram)
    'include_self' => false,

    /*
    | Lapisan kode → container. `dir` relatif terhadap app/.
    | Folder baru (Jobs, Listeners, Observers, dst.) otomatis ikut jika ada.
    */
    'layers' => [
        ['dir' => 'Http/Controllers', 'layer' => 'Controller', 'container' => 'api', 'enabled' => true],
        ['dir' => 'Services',         'layer' => 'Service',    'container' => 'api', 'enabled' => true],
        ['dir' => 'Mail',             'layer' => 'Mailable',   'container' => 'api', 'enabled' => true],
        ['dir' => 'Jobs',             'layer' => 'Job',        'container' => 'api', 'enabled' => true],
        ['dir' => 'Listeners',        'layer' => 'Listener',   'container' => 'api', 'enabled' => true],
        ['dir' => 'Observers',        'layer' => 'Observer',   'container' => 'api', 'enabled' => true],
        ['dir' => 'Notifications',    'layer' => 'Notification', 'container' => 'api', 'enabled' => true],
        ['dir' => 'Policies',         'layer' => 'Policy',     'container' => 'api', 'enabled' => true],
        ['dir' => 'Http/Middleware',  'layer' => 'Middleware', 'container' => 'api', 'enabled' => false],
        ['dir' => 'Console/Commands', 'layer' => 'Command',    'container' => 'scheduler', 'enabled' => true],
    ],

    /*
    | Domain fitur — satu warna per fitur. Warna dipilih agar tetap terbaca
    | di kanvas gelap dan berpendar baik. Boleh diubah dari UI (tab "Domain").
    */
    'domains' => [
        'core'         => ['name' => 'Platform Inti',            'color' => '#e2e8f0', 'description' => 'Sistem, container, dan infrastruktur bersama.'],
        'auth'         => ['name' => 'Auth & Pengguna',          'color' => '#4ade80', 'description' => 'Login, OAuth, 2FA admin, peran & hak akses.'],
        'catalog'      => ['name' => 'Katalog & Item',           'color' => '#60a5fa', 'description' => 'Item, katalog, hotspot, taksonomi.'],
        'collection'   => ['name' => 'Koleksi',                  'color' => '#e879f9', 'description' => 'Koleksi, paket, dan cerita koleksi.'],
        'project'      => ['name' => 'Proyek',                   'color' => '#22d3ee', 'description' => 'Portofolio proyek, ruang, dan layout.'],
        'experience'   => ['name' => 'Furniture Experience',     'color' => '#2dd4bf', 'description' => 'Varian, galeri, lifestyle, dan story furnitur.'],
        'consultation' => ['name' => 'Konsultasi',               'color' => '#fb923c', 'description' => 'Alur konsultasi 10 tahap, agreement, meterai.'],
        'shop'         => ['name' => 'Pesanan (Shop)',           'color' => '#f472b6', 'description' => 'Keranjang, pesanan, pembayaran, pengiriman.'],
        'aftercare'    => ['name' => 'Aftercare',                'color' => '#fb7185', 'description' => 'Klaim, refund, dan perubahan pesanan.'],
        'whatsapp'     => ['name' => 'WhatsApp & Operasional',   'color' => '#a3e635', 'description' => 'Bot Livi, inbox WhatsApp, notifikasi admin.'],
        'marketing'    => ['name' => 'Marketing & Wishlist',     'color' => '#facc15', 'description' => 'Kampanye email dan wishlist.'],
        'ai'           => ['name' => 'AI Marketing',             'color' => '#a78bfa', 'description' => 'Agen AI, insight, rekomendasi, aksi, provider LLM.'],
        'support'      => ['name' => 'Chat Support (Concierge)', 'color' => '#38bdf8', 'description' => 'Concierge AI di website dan eskalasi ke CS.'],
        'analytics'    => ['name' => 'Analitik',                 'color' => '#94a3b8', 'description' => 'Pelacakan klik dan view.'],
        'system'       => ['name' => 'Sistem & Audit',           'color' => '#64748b', 'description' => 'Audit log, terjemahan konten, utilitas.'],
    ],

    /*
    | Aturan penentuan domain (urutan penting, yang cocok pertama menang).
    | Kunci = regex, nilai = key domain.
    */
    'domain_rules' => [
        'table' => [
            '~^ai_~'                                                              => 'ai',
            '~^support_~'                                                         => 'support',
            '~^(wa_|webhook_logs|funnel_events|shop_settings|bot_scenarios)~'     => 'whatsapp',
            '~^shop_(claims|refunds)~'                                            => 'aftercare',
            '~^(shop_|cart_items|stock_holds|document_counters)~'                 => 'shop',
            '~^consultation~'                                                     => 'consultation',
            '~^(users|user_activities|personal_access_tokens|admin_)~'            => 'auth',
            '~^collection~'                                                       => 'collection',
            '~^(project|photo_items|scopes)~'                                     => 'project',
            '~^furniture_(variants|gallery|lifestyle|stories|story_cards)~'       => 'experience',
            '~^(items|furniture_types|themes|categories|category_item|item_theme|taxonomy_banners|catalogs|catalog_|hotspots)~' => 'catalog',
            '~^(marketing_campaigns|wishlists)~'                                  => 'marketing',
            '~^(item_clicks|item_views)~'                                         => 'analytics',
            '~^(audit_logs|content_translations)~'                                => 'system',
        ],
        'class' => [
            '~Console\\\\Kernel$~'                                               => 'core',
            '~Controllers\\\\Api\\\\Ai\\\\|Services\\\\AI\\\\|Services\\\\(Marketing|Google|Meta)\\\\|Resources\\\\Ai\\\\|Models\\\\Ai~' => 'ai',
            '~Aftercare~'                                                         => 'aftercare',
            '~Shop\\\\(LiviBot|LiviLlm|BotTools|Guardrail|WaBot|WaSender|WhatsAppFlow|ProofMatcher|NotifyService|Ops|SheetsSync|ShopSettings)|Services\\\\WhatsApp|WebhookController|BotSimulator|ShopDatabaseController|Models\\\\Wa~' => 'whatsapp',
            '~Services\\\\Shop\\\\|Controllers\\\\Api\\\\Shop\\\\|Admin\\\\Shop|CartController|Models\\\\(Shop|Cart|Stock)~' => 'shop',
            '~Consultation|Agreement|Meterai~'                                    => 'consultation',
            '~SupportChat|LivoraAssistant|IntentClassifier~'                      => 'support',
            '~AdminLoginCode|AuthController|Auth\\\\|AdminUser|PasswordReset|AdminRole|AdminPermissions|EnsureAdmin|GoogleOAuth|UserLanguage|Models\\\\User~' => 'auth',
            '~Wishlist|MarketingCampaign|LivoraCampaign|PromoBlast~'              => 'marketing',
            '~Collection~'                                                        => 'collection',
            '~FurnitureExperience|Variant|FurnitureGallery|FurnitureStory|FurnitureLifestyle~' => 'experience',
            '~Project~'                                                           => 'project',
            '~Catalog|Item|Hotspot|Taxonomy|Theme|Category~'                      => 'catalog',
            '~Analytics|Tracking~'                                                => 'analytics',
            '~Translation|Audit~'                                                 => 'system',
        ],
        // untuk halaman frontend (path route React)
        'path' => [
            '~^/(admin/ai-marketing|ai)~'                                         => 'ai',
            '~^/admin/shop/aftercare~'                                            => 'aftercare',
            '~^/admin/shop/(inbox|bot|health|settings|database)~'                 => 'whatsapp',
            '~^/(admin/shop|cart|order|profile/orders)~'                          => 'shop',
            '~consultation|appointment~'                                          => 'consultation',
            '~^/admin/support~'                                                   => 'support',
            '~^/(login|register|forgot-password|reset-password|profile|admin/users|admin/roles)~' => 'auth',
            '~collection~'                                                        => 'collection',
            '~^/(admin/)?projects~'                                               => 'project',
            '~^/admin/(wishlists|marketing)~'                                     => 'marketing',
            '~^/admin/analytics~'                                                 => 'analytics',
            '~^/(erd|admin/c4)~'                                                  => 'system',
            '~^/(admin/)?(catalog|catalogs|furniture|items|taxonomies|landing|banners|scan)~' => 'catalog',
            '~^/(admin/)?sales~'                                                  => 'catalog',
        ],
    ],

    /*
    | Kerangka C4 level 1–2 (orang, sistem, container). Dibuat otomatis,
    | tetap bisa diedit dari UI (disimpan sebagai override).
    | `technology` boleh berisi placeholder {laravel} {db} {php}.
    */
    'skeleton' => [
        'system' => [
            'key' => 'livora', 'name' => 'Livora Platform',
            'description' => 'Website interior & furnitur Livora: katalog, konsultasi, pesan furnitur, bot WhatsApp, dan AI Marketing.',
        ],
        'persons' => [
            'customer' => ['name' => 'Customer / Pengunjung', 'description' => 'Menjelajah katalog, konsultasi, memesan furnitur, chat dengan Concierge & Livi.', 'domain' => 'catalog'],
            'staff'    => ['name' => 'Tim Internal',          'description' => 'Owner, CS, Finance, Produksi — mengelola konten, pesanan, konsultasi, AI Marketing.', 'domain' => 'auth'],
            'sales'    => ['name' => 'Sales Lapangan',        'description' => 'Scan QR dan melihat detail item.', 'domain' => 'catalog'],
        ],
        'containers' => [
            'spa'       => ['name' => 'Web App (SPA)',    'technology' => 'React · Vite · TypeScript · Tailwind', 'kind' => 'container', 'domain' => 'core',
                            'description' => 'Antarmuka publik dan panel admin. Hanya berbicara dengan Backend API.'],
            'api'       => ['name' => 'Backend API',      'technology' => '{laravel} · PHP {php} · Sanctum', 'kind' => 'container', 'domain' => 'core',
                            'description' => 'Logika bisnis, autentikasi, bot WhatsApp, agen AI, dan integrasi pihak ketiga.'],
            'db'        => ['name' => 'Database',         'technology' => '{db}', 'kind' => 'datastore', 'domain' => 'core',
                            'description' => 'Menyimpan seluruh data operasional Livora.'],
            'storage'   => ['name' => 'File Storage',     'technology' => 'Laravel Filesystem', 'kind' => 'datastore', 'domain' => 'core',
                            'description' => 'Foto produk, lampiran konsultasi, bukti transfer, dokumen PDF.'],
            'scheduler' => ['name' => 'Scheduler & CLI',  'technology' => 'Laravel Scheduler · Artisan', 'kind' => 'container', 'domain' => 'core',
                            'description' => 'Tugas terjadwal: expire pesanan, sinkronisasi Sheets, notifikasi, agen AI.'],
        ],
        'relations' => [
            ['person:customer', 'ctr:spa',     'Menjelajah, konsultasi, memesan', 'HTTPS',      'uses'],
            ['person:staff',    'ctr:spa',     'Mengelola konten & operasional',  'HTTPS',      'uses'],
            ['person:sales',    'ctr:spa',     'Scan QR & lihat detail item',     'HTTPS',      'uses'],
            ['ctr:spa',         'ctr:api',     'Memanggil API',                   'JSON/HTTPS · Axios · Sanctum', 'calls'],
            ['ctr:api',         'ctr:storage', 'Menyimpan & membaca file',        'Storage',    'data'],
            ['person:customer', 'ext:meta_graph', 'Chat WhatsApp dengan Livi',    'WhatsApp',   'uses'],
        ],
    ],

    /*
    | Sistem eksternal. Terdeteksi otomatis bila kode menyebut host / petunjuk
    | di bawah. Host lain yang tidak dikenal juga dibuat otomatis (ext:<host>).
    | `config_keys` hanya dipakai untuk menandai "sudah dikonfigurasi" (boolean).
    */
    'externals' => [
        'gemini' => [
            'name' => 'Google Gemini', 'domain' => 'ai', 'technology' => 'REST · generateContent',
            'description' => 'LLM utama: concierge, bot Livi, agen AI, penerjemah, baca bukti transfer.',
            'hosts' => ['generativelanguage.googleapis.com'], 'class_hints' => ['~Providers\\\\GeminiProvider$~'],
            'config_keys' => ['services.gemini.api_key'],
        ],
        'groq' => [
            'name' => 'Groq', 'domain' => 'ai', 'technology' => 'REST · OpenAI-compatible',
            'description' => 'Provider LLM fallback (gpt-oss).',
            'hosts' => ['api.groq.com'], 'class_hints' => ['~Providers\\\\GroqProvider$~'],
            'config_keys' => ['ai.providers.groq.api_key'],
        ],
        'anthropic' => [
            'name' => 'Anthropic Claude', 'domain' => 'ai', 'technology' => 'REST · Messages API',
            'description' => 'Provider LLM fallback dan endpoint /api/chat.',
            'hosts' => ['api.anthropic.com'], 'class_hints' => ['~Providers\\\\AnthropicProvider$~'],
            'config_keys' => ['ai.providers.anthropic.api_key', 'services.anthropic.api_key'],
        ],
        'meta_graph' => [
            'name' => 'Meta (WhatsApp Cloud · Graph · Ads)', 'domain' => 'whatsapp', 'technology' => 'Graph API',
            'description' => 'WhatsApp Cloud API, Facebook/Instagram, dan Marketing API Meta Ads.',
            'hosts' => ['graph.facebook.com'], 'config_keys' => ['services.meta_ads.access_token'],
        ],
        'google_apis' => [
            'name' => 'Google APIs', 'domain' => 'ai', 'technology' => 'REST · OAuth2',
            'description' => 'OAuth login, Search Console, YouTube, Sheets.',
            'hosts' => ['www.googleapis.com', 'oauth2.googleapis.com', 'sheets.googleapis.com', 'searchconsole.googleapis.com', 'www.youtube.com'],
            'config_keys' => ['services.google.client_id'],
        ],
        'google_ads' => [
            'name' => 'Google Ads', 'domain' => 'ai', 'technology' => 'REST',
            'description' => 'Performa iklan Google untuk Ads Agent.',
            'hosts' => ['googleads.googleapis.com'], 'config_keys' => [],
        ],
        'google_analytics' => [
            'name' => 'Google Analytics 4', 'domain' => 'ai', 'technology' => 'Analytics Data API',
            'description' => 'Trafik dan konversi untuk SEO/CRO Agent.',
            'hosts' => ['analyticsdata.googleapis.com'], 'config_keys' => [],
        ],
        'google_business' => [
            'name' => 'Google Business Profile', 'domain' => 'ai', 'technology' => 'REST',
            'description' => 'Data profil bisnis lokal untuk SEO lokal.',
            'hosts' => ['mybusiness.googleapis.com', 'mybusinessbusinessinformation.googleapis.com', 'businessprofileperformance.googleapis.com'],
            'config_keys' => [],
        ],
        'tiktok' => [
            'name' => 'TikTok Business', 'domain' => 'ai', 'technology' => 'REST',
            'description' => 'Metrik konten TikTok.',
            'hosts' => ['business-api.tiktok.com'], 'config_keys' => [],
        ],
        'midtrans' => [
            'name' => 'Midtrans', 'domain' => 'shop', 'technology' => 'REST · Snap',
            'description' => 'Gateway pembayaran.',
            'hosts' => ['api.midtrans.com', 'api.sandbox.midtrans.com'], 'config_keys' => [],
        ],
        'twilio' => [
            'name' => 'Twilio WhatsApp', 'domain' => 'whatsapp', 'technology' => 'REST',
            'description' => 'Provider WhatsApp alternatif.',
            'hosts' => ['api.twilio.com'], 'config_keys' => [],
        ],
        'fonnte' => [
            'name' => 'Fonnte', 'domain' => 'whatsapp', 'technology' => 'REST',
            'description' => 'Provider WhatsApp alternatif.',
            'hosts' => ['api.fonnte.com'], 'config_keys' => [],
        ],
        'peruri' => [
            'name' => 'Peruri e-Meterai', 'domain' => 'consultation', 'technology' => 'REST',
            'description' => 'Pembubuhan meterai elektronik pada agreement.',
            'hosts' => [], 'code_hints' => ['PeruriMeteraiProvider'], 'class_hints' => ['~PeruriMeteraiProvider$~'],
            'config_keys' => [],
        ],
    ],

    // Host yang hanya tautan/dokumentasi/aset — bukan integrasi
    'ignore_hosts' => [
        'livoralcr.com', 'www.livoralcr.com', 'api.livoralcr.com', 'localhost', '127.0.0.1',
        'wa.me', 'maps.google.com', 'www.google.com', 'instagram.com', 'www.instagram.com', 'www.facebook.com',
        'fonts.googleapis.com', 'fonts.gstatic.com', 'docs.guzzlephp.org', 'docs.github.com', 'github.com',
        'developer.mozilla.org', 'developers.facebook.com', 'www.twilio.com', 'fonnte.com',
        'schema.org', 'www.w3.org', 'example.com', 'laravel.com', 'getcomposer.org',
    ],
    // pola host yang selalu diabaikan (regex)
    'ignore_host_regex' => '~(^sqs\.|\.amazonaws\.com$|^docs\.|\.example\.)~',

    // Webhook / callback masuk: external → controller.
    'inbound' => [
        ['uri_contains' => 'webhooks/whatsapp',   'from' => 'meta_graph',   'label' => 'Webhook pesan WhatsApp masuk'],
        ['uri_contains' => 'webhooks/midtrans',   'from' => 'midtrans',     'label' => 'Notifikasi status pembayaran'],
        ['uri_contains' => 'auth/{provider}/callback', 'from' => 'google_apis', 'label' => 'OAuth callback'],
        ['uri_contains' => 'auth/google/callback', 'from' => 'google_apis', 'label' => 'OAuth callback'],
        ['uri_contains' => 'auth/meta-ads/callback', 'from' => 'meta_graph', 'label' => 'OAuth callback Meta Ads'],
    ],
];
