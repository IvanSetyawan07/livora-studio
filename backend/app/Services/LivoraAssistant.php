<?php

namespace App\Services;

use App\Models\Catalog;
use App\Models\Collection;
use App\Models\Item;
use App\Models\Project;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;  

/**
 * Livora Concierge — AI assistant.
 *
 * Menggabungkan brand profile (static knowledge) + retrieval dari database
 * (items, collections, projects, catalogs), lalu memanggil Gemini API.
 *
 * PENTING: model (Gemini) HANYA memilih `type` + `slug` dari data yang sudah
 * disediakan di context. Gambar dan URL asli SELALU di-resolve ulang di sini
 * dari database — supaya tidak ada link/gambar hasil karangan model.
 */
class LivoraAssistant
{
    /**
     * Mapping tipe konten -> pola URL halaman detail di frontend.
     * SESUAIKAN kalau route React kamu bukan singular seperti ini.
     */
    private const FRONTEND_PATHS = [
        'item'       => '/items/%s',
        'collection' => '/collection/%s',
        'catalog'    => '/catalog/%s',
        'project'    => '/projects/%s',
    ];

    /** Halaman untuk booking konsultasi. Sesuaikan kalau path-nya beda. */
private const CONSULTATION_PATH = '/appointment';
/**
 * Sinonim EN<->ID untuk keyword furniture, supaya query "meja" tetap match
 * title bahasa Inggris ("table") dan sebaliknya. Ini cuma MEMPERLUAS kata
 * kunci pencarian, bukan mengganti kata kunci asli user.
 */
private const KEYWORD_SYNONYMS = [
    'meja'    => ['table'],
    'kursi'   => ['chair'],
    'sofa'    => ['couch'],
    'lemari'  => ['cabinet', 'wardrobe', 'closet'],
    'rak'     => ['shelf', 'shelving', 'rack'],
    'tidur'   => ['bed'],
    'kasur'   => ['mattress', 'bed'],
    'lampu'   => ['lamp', 'light', 'lighting'],
    'karpet'  => ['rug', 'carpet'],
    'cermin'  => ['mirror'],
    'bantal'  => ['pillow', 'cushion'],
    'gorden'  => ['curtain'],
    'partisi' => ['partition', 'divider'],
];
private const DAILY_QUOTA_LIMIT = 1500;
private const DAILY_QUOTA_BUFFER = 5;
    /** Brand/company knowledge — dipakai untuk pertanyaan profil perusahaan. */
    public const BRAND_PROFILE = <<<'TXT'
Livora Studio adalah studio interior design & furniture asal Indonesia (Bandung) yang menangani
residential, hospitality (hotel, cafe, restoran), dan commercial/office interior.

Layanan utama:
- Interior Design Consultation (konsep, layout, moodboard, 3D visual)
- Custom Furniture Manufacturing (kayu solid, veneer, upholstery, metal finishing)
- Furnishing & Styling (decorative, lighting, soft furnishing)
- Contractor / Project Execution (build & install)

Cara kerja / alur project:
1. Inquiry / Book Consultation lewat halaman Appointment di website.
2. Under Review — tim Livora meninjau kebutuhan.
3. Contacted & Meeting Scheduled (online atau on-site).
4. Consultation in Progress — konsep & penawaran.
5. DP Payment, penandatanganan agreement, lalu project berjalan dengan progress update 0–100%.
6. Completed & handover.

Katalog website: Furniture (per kategori & tipe), Collections (paket kurasi per ruangan),
Projects (portofolio), dan Catalog (editorial scene dengan hotspot produk).

Kebijakan komunikasi:
- Harga tidak dipublikasikan; harga selalu lewat konsultasi karena bergantung material,
  dimensi, finishing, dan volume.
- Estimasi lead time custom furniture umumnya beberapa minggu, tergantung kompleksitas —
  angka pasti harus dikonfirmasi consultant.
TXT;

    public function reply(string $message, array $history = [], array $options = []): array
{
    $quotaKey = 'gemini_quota_' . now('UTC')->format('Y-m-d');
    $requestId = (string) \Illuminate\Support\Str::uuid();
    $startedAt = microtime(true);

    // Atomic: Cache::increment tidak punya race condition seperti get() + put()
    $used = Cache::increment($quotaKey);
    if ($used === 1) {
        Cache::put($quotaKey, 1, now('UTC')->endOfDay());
    }

    if ($used > self::DAILY_QUOTA_LIMIT - self::DAILY_QUOTA_BUFFER) {
        return [
            'reply' => 'Concierge AI kami sedang ramai dipakai hari ini 🙏 Coba lagi beberapa saat lagi, atau saya hubungkan langsung ke customer service kami sekarang?',
            'needs_escalation' => true,
            'recommendations' => [],
            'show_consultation' => false,
        ];
    }

    $context = $this->buildContext($message, $options);
    $systemPrompt = $this->systemPrompt($context);

    $contents = [];
    foreach ($history as $h) {
        $role = ($h['role'] ?? 'user') === 'user' ? 'user' : 'model';
        $text = trim((string) ($h['text'] ?? ''));
        if ($text === '') {
            continue;
        }
        $contents[] = ['role' => $role, 'parts' => [['text' => $text]]];
    }
    $contents[] = ['role' => 'user', 'parts' => [['text' => $message]]];

    $apiKey = config('services.gemini.api_key');
    if (!$apiKey) {
        return [
            'reply' => 'Maaf, asisten AI kami sedang tidak aktif. Mau saya hubungkan ke customer service Livora?',
            'needs_escalation' => true,
            'recommendations' => [],
            'show_consultation' => false,
        ];
    }

    $model = config('services.gemini.model');
    if (!$model) {
        Log::critical('LivoraAssistant: GEMINI_MODEL tidak diset di .env/config');
        return [
            'reply' => 'Maaf, asisten AI kami sedang tidak aktif. Mau saya hubungkan ke customer service Livora?',
            'needs_escalation' => true,
            'recommendations' => [],
            'show_consultation' => false,
        ];
    }

    try {
        $response = Http::timeout(45)->withHeaders([
            'x-goog-api-key' => $apiKey,
            'content-type'   => 'application/json',
        ])->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", [
            'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
            'contents'           => $contents,
            'generationConfig'   => [
                'responseMimeType' => 'application/json',
                'maxOutputTokens'  => 1536,
                'thinkingConfig'   => ['thinkingLevel' => 'low'],
            ],
        ]);

        if (!$response->successful()) {
            Log::error('Gemini API error', [
                'request_id' => $requestId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            if ($response->status() === 429) {
                Cache::put($quotaKey, self::DAILY_QUOTA_LIMIT, now('UTC')->endOfDay());
            }
            throw new \RuntimeException('Gemini API request failed');
        }

        // Ambil semua part teks, skip part "thought" (reasoning internal model)
        // supaya tidak pernah bocor ke user.
        $parts = $response->json('candidates.0.content.parts', []);
        $rawText = '';
        foreach ($parts as $part) {
            if (!empty($part['thought'])) {
                continue;
            }
            $rawText .= $part['text'] ?? '';
        }

        $cleaned = trim(preg_replace('/```json|```/', '', $rawText));
        $parsed  = json_decode($cleaned, true);

        if (!is_array($parsed) || !isset($parsed['reply'])) {
            Log::warning('LivoraAssistant: gagal parse JSON dari model', ['raw' => $rawText]);
            return [
                'reply' => $rawText !== '' ? $rawText : 'Maaf, saya belum bisa menjawab itu. Mau saya hubungkan ke customer service kami?',
                'needs_escalation' => $rawText === '',
                'recommendations' => [],
                'show_consultation' => false,
            ];
        }

        $recommendations = $this->resolveRecommendations($parsed['recommendations'] ?? []);

        Log::info('LivoraAssistant reply', [
            'request_id' => $requestId,
            'duration_ms' => round((microtime(true) - $startedAt) * 1000),
            'needs_escalation' => (bool) ($parsed['needs_escalation'] ?? false),
            'recommendation_count' => count($recommendations),
        ]);

        return [
            'reply' => (string) $parsed['reply'],
            'needs_escalation' => (bool) ($parsed['needs_escalation'] ?? false),
            'recommendations' => $recommendations,
            'show_consultation' => (bool) ($parsed['show_consultation'] ?? false),
        ];
    } catch (\Throwable $e) {
        Log::error('LivoraAssistant error: ' . $e->getMessage());
        return [
            'reply' => 'Maaf, saya sedang tidak bisa memproses pertanyaan itu. Mau saya hubungkan ke customer service kami?',
            'needs_escalation' => true,
            'recommendations' => [],
            'show_consultation' => false,
        ];
    }
}
 private function systemPrompt(string $context): string
    {
        $brand = self::BRAND_PROFILE;

        return <<<PROMPT
Kamu adalah Livora Concierge, asisten AI resmi Livora Studio.

Peranmu: menjawab pertanyaan tentang profil perusahaan, layanan, alur kerja, dan product knowledge
(furniture, material, finishing, koleksi, project) berdasarkan informasi di bawah, sekaligus
merekomendasikan konten yang relevan (furniture / collection / catalog / project) supaya user
bisa langsung melihat kartu visualnya di chat.

Aturan jawaban:
- Untuk pertanyaan profil/layanan/alur kerja, jawab dari bagian "Profil Livora".
- Untuk pertanyaan produk, jawab dari bagian "Data produk relevan". Jangan mengarang spesifikasi,
  dimensi, stok, atau harga yang tidak tercantum.
- Harga tidak pernah disebut angka pastinya. Kalau user tanya harga/penawaran/diskon, jelaskan
  bahwa harga ditentukan lewat konsultasi, lalu set needs_escalation true.
- Kalau data produk yang relevan kosong, katakan jujur kamu belum punya detail spesifiknya dan
  tawarkan bantuan customer service (needs_escalation true).
- Set needs_escalation true bila user minta jadwal survey, komplain, negosiasi, pemesanan, atau
  eksplisit minta bicara dengan manusia/CS.
- Bahasa Indonesia yang hangat, ringkas, dan profesional. Balas dalam Bahasa Inggris jika user
  menulis dalam Bahasa Inggris.
- Jawaban maksimal ~120 kata, boleh pakai bullet pendek.
- JANGAN PERNAH menulis URL atau menyebut nama file gambar di dalam teks "reply". Semua link dan
  gambar HANYA lewat field "recommendations" di bawah — sistem yang akan mengisi gambar & link asli.

Aturan rekomendasi (field "recommendations"):
- Setiap entri WAJIB pakai "slug" yang benar-benar tercantum di bagian "Data produk relevan" di
  bawah (lihat "Slug: ..." pada tiap baris [Item]/[Collection]/[Catalog]/[Project]). JANGAN mengarang
  slug yang tidak ada di context.
- Maksimal 3 rekomendasi. Prioritaskan kualitas relevansi, bukan jumlah.
- "type" harus salah satu dari: "item", "collection", "catalog", "project".
- Kalau user bertanya soal suasana/gaya ruangan ("cozy", "tenang", "scandinavian", "minimalis") →
  rekomendasikan "collection" atau "catalog" yang relevan.
- Kalau user bertanya soal barang spesifik ("sofa", "meja kopi", "kursi makan") → rekomendasikan
  "item".
- Kalau user minta lihat portofolio/project → rekomendasikan "project".
- Kalau tidak ada yang benar-benar relevan di context, kirim array kosong — jangan memaksakan.

Set "show_consultation" true kalau user tampak siap lanjut ke tahap konsultasi (misalnya sudah
menentukan pilihan, atau minta booking/jadwal).

Balas HANYA JSON valid, tanpa teks lain, dengan format persis ini:
{
  "reply": "isi jawaban natural, tanpa URL/nama file",
  "needs_escalation": true atau false,
  "show_consultation": true atau false,
  "recommendations": [
    {"type": "item atau collection atau catalog atau project", "slug": "slug-yang-ada-di-context"}
  ]
}

Profil Livora:
{$brand}

Data produk relevan:
{$context}
PROMPT;
    }

    /**
     * Ubah daftar {type, slug} dari model menjadi kartu lengkap (judul, gambar,
     * url) dengan query ulang ke database. Slug yang tidak ditemukan di-skip
     * diam-diam (bukan error) supaya tidak ada card kosong/rusak yang tampil.
     */
    private function resolveRecommendations(array $items): array
    {
        $cards = [];

        foreach (array_slice($items, 0, 3) as $rec) {
            $type = is_array($rec) ? ($rec['type'] ?? null) : null;
            $slug = is_array($rec) ? ($rec['slug'] ?? null) : null;
            if (!$type || !$slug || !isset(self::FRONTEND_PATHS[$type])) {
                continue;
            }

            $card = match ($type) {
                'item'       => $this->cardFromItem($slug),
                'collection' => $this->cardFromCollection($slug),
                'catalog'    => $this->cardFromCatalog($slug),
                'project'    => $this->cardFromProject($slug),
                default      => null,
            };

            if ($card) {
                $cards[] = $card;
            }
        }

        return $cards;
    }

    private function cardFromItem(string $slug): ?array
    {
        $item = Item::query()->with(['type', 'collection'])->where('slug', $slug)->first();
        if (!$item) {
            return null;
        }

        return [
            'type'        => 'item',
            'title'       => $item->title,
            'subtitle'    => optional($item->type)->name ?? optional($item->collection)->name,
            'description' => $this->shorten($item->description),
            'image'       => $this->absoluteUrl($this->firstNonEmpty($item, ['image', 'thumbnail', 'cover_image'])),
            'url'         => $this->frontendUrl('item', $item->slug),
        ];
    }

    private function cardFromCollection(string $slug): ?array
    {
        $c = Collection::query()->where('slug', $slug)->first();
        if (!$c) {
            return null;
        }

        return [
            'type'        => 'collection',
            'title'       => $c->name,
            'subtitle'    => 'Living Collection',
            'description' => $this->shorten($c->description),
            'image'       => $this->absoluteUrl($this->firstNonEmpty($c, ['card_banner', 'featured_image', 'hero_banner', 'thumbnail', 'image', 'cover_image', 'banner'])),
            'url'         => $this->frontendUrl('collection', $c->slug),
        ];
    }

    private function cardFromCatalog(string $slug): ?array
    {
        $cat = Catalog::query()->where('slug', $slug)->first();
        if (!$cat) {
            return null;
        }

        return [
            'type'        => 'catalog',
            'title'       => $cat->title,
            'subtitle'    => $cat->category ?? $cat->taxonomy,
            'description' => $this->shorten($cat->description),
            'image'       => $this->absoluteUrl($this->firstNonEmpty($cat, ['cover_image', 'scene_1_image', 'thumbnail', 'image', 'banner'])),
            'url'         => '/catalog/' . \Illuminate\Support\Str::slug($cat->category ?: 'all') . '/' . $cat->slug,
        ];
    }

    private function cardFromProject(string $slug): ?array
    {
        $p = Project::query()->where('slug', $slug)->first();
        if (!$p) {
            return null;
        }

        $subtitle = trim(($p->location ?? '') . ($p->year ? " · {$p->year}" : ''));

        return [
            'type'        => 'project',
            'title'       => $p->title,
            'subtitle'    => $subtitle !== '' ? $subtitle : null,
            'description' => $this->shorten($p->description),
            'image'       => $this->absoluteUrl($this->firstNonEmpty($p, ['hero_image', 'thumbnail', 'image', 'cover_image'])),
            'url'         => $this->frontendUrl('project', $p->slug),
        ];
    }

    /** Ambil field pertama yang tidak kosong dari sebuah model (dicoba berurutan). */
    private function firstNonEmpty($model, array $fields): ?string
    {
        foreach ($fields as $f) {
            if (!empty($model->{$f})) {
                return (string) $model->{$f};
            }
        }
        return null;
    }

    private function shorten(?string $text, int $limit = 90): ?string
    {
        if (!$text) {
            return null;
        }
        $text = trim($text);
        return mb_strlen($text) > $limit ? mb_substr($text, 0, $limit - 1) . '…' : $text;
    }

    private function frontendUrl(string $type, string $slug): string
    {
        $pattern = self::FRONTEND_PATHS[$type] ?? '/%s';
        return sprintf($pattern, $slug);
    }

    /** Path konsultasi, dipakai frontend saat show_consultation true. */
    public function consultationUrl(): string
    {
        return self::CONSULTATION_PATH;
    }

    /**
     * Ubah path storage relatif jadi URL absolut. Mengikuti pola yang sudah
     * dipakai di project ini: base URL storage = APP_URL tanpa "/api".
     */
    private function absoluteUrl(?string $path): ?string
{
    if (!$path) {
        return null;
    }
    if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
        return $path;
    }

    // Kembalikan path relatif "/storage/..." saja — frontend (imgUrl) yang
    // menempelkan origin backend, supaya tidak bergantung APP_URL yang bisa salah.
    $path = '/' . ltrim($path, '/');
    return str_starts_with($path, '/storage/') ? $path : '/storage' . $path;
}

    /** Retrieval dari database + item yang sedang dilihat user (kalau ada). */
    /** Retrieval dari database + item yang sedang dilihat user (kalau ada). */
public function buildContext(string $message, array $options = []): string
{
    $chunks = [];

    $focusSlug = $options['item_slug'] ?? null;
    if ($focusSlug) {
        $item = Item::query()->where('slug', $focusSlug)->first();
        if ($item) {
            $chunks[] = '[Item yang sedang dilihat user] ' . $this->describeItem($item);
        }
    }

    $keywords = $this->extractKeywords($message);
    $intent = (new \App\Services\IntentClassifier())->classify($message);

    if (!empty($keywords)) {
        // product_search / general → boleh query Item (style_mood skip,
        // karena user tanya suasana/gaya, bukan barang spesifik)
        if (in_array($intent, [
            \App\Services\IntentClassifier::PRODUCT_SEARCH,
            \App\Services\IntentClassifier::GENERAL,
        ], true)) {
            $items = Item::query()
                ->when($focusSlug, fn ($q) => $q->where('slug', '!=', $focusSlug))
                ->where(function ($q) use ($keywords) {
                    foreach ($keywords as $kw) {
                        $q->orWhere('title', 'like', "%{$kw}%")
                          ->orWhere('description', 'like', "%{$kw}%")
                          ->orWhere('texture', 'like', "%{$kw}%")
                          ->orWhere('finish', 'like', "%{$kw}%");
                    }
                })
                ->with(['type', 'collection'])
                ->limit(5)
                ->get();

            foreach ($items as $item) {
                $chunks[] = '[Item] ' . $this->describeItem($item);
            }
        }

        // portfolio / general → boleh query Project
        if (in_array($intent, [
            \App\Services\IntentClassifier::PORTFOLIO,
            \App\Services\IntentClassifier::GENERAL,
        ], true)) {
            $projects = Project::query()
                ->where(function ($q) use ($keywords) {
                    foreach ($keywords as $kw) {
                        $q->orWhere('title', 'like', "%{$kw}%")
                          ->orWhere('subtitle', 'like', "%{$kw}%")
                          ->orWhere('description', 'like', "%{$kw}%")
                          ->orWhere('location', 'like', "%{$kw}%");
                    }
                })
                ->limit(3)
                ->get(['id', 'title', 'subtitle', 'description', 'location', 'year', 'slug']);

            foreach ($projects as $p) {
                $chunks[] = "[Project] {$p->title} ({$p->location}, {$p->year}) — {$p->description} | Slug: {$p->slug}";
            }
        }

        // product_search / style_mood / general → boleh query Collection
        if (in_array($intent, [
            \App\Services\IntentClassifier::PRODUCT_SEARCH,
            \App\Services\IntentClassifier::STYLE_MOOD,
            \App\Services\IntentClassifier::GENERAL,
        ], true)) {
            $collections = Collection::query()
                ->where(function ($q) use ($keywords) {
                    foreach ($keywords as $kw) {
                        $q->orWhere('name', 'like', "%{$kw}%")
                          ->orWhere('description', 'like', "%{$kw}%");
                    }
                })
                ->limit(3)
                ->get(['id', 'name', 'description', 'slug']);

            foreach ($collections as $c) {
                $chunks[] = "[Collection] {$c->name} — {$c->description} | Slug: {$c->slug}";
            }
        }

        // style_mood / general → boleh query Catalog
        if (in_array($intent, [
            \App\Services\IntentClassifier::STYLE_MOOD,
            \App\Services\IntentClassifier::GENERAL,
        ], true)) {
            $catalogs = Catalog::query()
                ->where(function ($q) use ($keywords) {
                    foreach ($keywords as $kw) {
                        $q->orWhere('title', 'like', "%{$kw}%")
                          ->orWhere('description', 'like', "%{$kw}%")
                          ->orWhere('category', 'like', "%{$kw}%")
                          ->orWhere('taxonomy', 'like', "%{$kw}%");
                    }
                })
                ->limit(3)
                ->get(['id', 'title', 'description', 'category', 'taxonomy', 'slug']);

            foreach ($catalogs as $cat) {
                $chunks[] = "[Catalog] {$cat->title} (Kategori: {$cat->category}, Gaya: {$cat->taxonomy}) — {$cat->description} | Slug: {$cat->slug}";
            }
        }
    }

    // company_info: sengaja tidak query apapun di atas — brand profile
    // di systemPrompt() sudah cukup untuk jawab pertanyaan jenis ini.

    if (empty($chunks)) {
        $chunks = $this->generalPicks();
    }

    return implode("\n", $chunks);
}
    private function generalPicks(): array
{
    $chunks = [];

    $items = Item::query()->with(['type', 'collection'])
        ->inRandomOrder()->limit(4)->get();
    foreach ($items as $item) {
        $chunks[] = '[Item] ' . $this->describeItem($item);
    }

    $collections = Collection::query()->orderBy('display_order')
        ->limit(3)->get(['id', 'name', 'description', 'slug']);
    foreach ($collections as $c) {
        $chunks[] = "[Collection] {$c->name} — {$c->description} | Slug: {$c->slug}";
    }

    $catalogs = Catalog::query()->limit(2)
        ->get(['id', 'title', 'description', 'category', 'taxonomy', 'slug']);
    foreach ($catalogs as $cat) {
        $chunks[] = "[Catalog] {$cat->title} (Kategori: {$cat->category}, Gaya: {$cat->taxonomy}) — {$cat->description} | Slug: {$cat->slug}";
    }

    $projects = Project::query()->limit(2)
        ->get(['id', 'title', 'subtitle', 'description', 'location', 'year', 'slug']);
    foreach ($projects as $p) {
        $chunks[] = "[Project] {$p->title} ({$p->location}, {$p->year}) — {$p->description} | Slug: {$p->slug}";
    }

    if (empty($chunks)) {
        $chunks[] = $this->generalSummary();
    }

    return $chunks;
}

    private function generalSummary(): string
    {
        $collections = Collection::query()
            ->orderBy('display_order')
            ->limit(8)
            ->pluck('name')
            ->filter()
            ->implode(', ');

        $types = \App\Models\FurnitureType::query()
            ->limit(10)
            ->pluck('name')
            ->filter()
            ->implode(', ');

        $catalogs = Catalog::query()
            ->limit(5)
            ->pluck('title')
            ->filter()
            ->implode(', ');

        $lines = [];
        if ($collections !== '') { $lines[] = "Koleksi tersedia: {$collections}."; }
        if ($types !== '') { $lines[] = "Kategori furniture: {$types}."; }
        if ($catalogs !== '') { $lines[] = "Beberapa katalog: {$catalogs}."; }

        if (empty($lines)) {
            return '[Info umum] Data katalog belum tersedia saat ini.';
        }

        return "[Info umum]\n" . implode("\n", $lines);
    }

    private function describeItem($item)
    {
        $typeName = $item->type ? $item->type->name : null;
        $collectionName = $item->collection ? $item->collection->name : null;

        $parts = [];
        $parts[] = "Nama: {$item->title}";
        if ($typeName) $parts[] = "Kategori: {$typeName}";
        if ($collectionName) $parts[] = "Koleksi: {$collectionName}";
        if ($item->description) $parts[] = "Deskripsi: {$item->description}";
        if ($item->texture) $parts[] = "Tekstur: {$item->texture}";
        if ($item->finish) $parts[] = "Finishing: {$item->finish}";
        if ($item->availability) $parts[] = "Ketersediaan: {$item->availability}";
        $parts[] = "Slug: {$item->slug}";

        return implode(" | ", $parts);
    }

    private function extractKeywords(string $message): array
{
    $stopwords = ['yang', 'dan', 'atau', 'saya', 'kamu', 'ada', 'ini', 'itu', 'untuk', 'dengan',
        'apakah', 'apa', 'bagaimana', 'mau', 'bisa', 'tentang', 'produk', 'the', 'and', 'is',
        'are', 'for', 'about', 'this', 'that', 'you'];

    $words = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower(trim($message)));
    $words = array_filter($words ?: [], fn ($w) => mb_strlen($w) > 2 && !in_array($w, $stopwords, true));
    $words = array_values(array_unique($words));

    // Perluas kata kunci Indonesia dengan padanan Inggris (dan sebaliknya)
    // supaya tetap match kalau title/description produk ditulis dalam
    // bahasa Inggris di database. Kata kunci asli tetap dipertahankan,
    // sinonim cuma ditambahkan di belakang.
    $expanded = $words;
    foreach ($words as $w) {
        if (isset(self::KEYWORD_SYNONYMS[$w])) {
            foreach (self::KEYWORD_SYNONYMS[$w] as $syn) {
                $expanded[] = $syn;
            }
        }
    }

    return array_slice(array_values(array_unique($expanded)), 0, 12);
}
}