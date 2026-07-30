<?php

namespace App\Services;

use App\Models\Catalog;
use App\Models\Collection;
use App\Models\Item;
use App\Models\Project;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Livora Concierge — AI assistant.
 *
 * Menggabungkan brand profile (static knowledge) + retrieval dari database
 * (items, collections, projects, catalogs), lalu memanggil Claude API.
 */
class LivoraAssistant
{
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
        $context = $this->buildContext($message, $options);

        $systemPrompt = $this->systemPrompt($context);

        $messages = [];
        foreach ($history as $h) {
            $role = ($h['role'] ?? 'user') === 'user' ? 'user' : 'assistant';
            $text = trim((string) ($h['text'] ?? ''));
            if ($text === '') {
                continue;
            }
            $messages[] = ['role' => $role, 'content' => $text];
        }
        $messages[] = ['role' => 'user', 'content' => $message];

        $apiKey = config('services.anthropic.api_key');
        if (!$apiKey) {
            return [
                'reply' => 'Maaf, asisten AI kami sedang tidak aktif. Mau saya hubungkan ke customer service Livora?',
                'needs_escalation' => true,
            ];
        }

        try {
            $response = Http::timeout(45)->withHeaders([
                'x-api-key'         => $apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model'      => config('services.anthropic.model', 'claude-sonnet-4-5'),
                'max_tokens' => 700,
                'system'     => $systemPrompt,
                'messages'   => $messages,
            ]);

            if (!$response->successful()) {
                Log::error('Claude API error: ' . $response->body());
                throw new \RuntimeException('Claude API request failed');
            }

            $textBlock = collect($response->json('content', []))->firstWhere('type', 'text');
            $rawText   = $textBlock['text'] ?? '';
            $cleaned   = trim(preg_replace('/```json|```/', '', $rawText));
            $parsed    = json_decode($cleaned, true);

            if (!is_array($parsed) || !isset($parsed['reply'])) {
                return [
                    'reply' => $rawText !== '' ? $rawText : 'Maaf, saya belum bisa menjawab itu. Mau saya hubungkan ke customer service kami?',
                    'needs_escalation' => $rawText === '',
                ];
            }

            return [
                'reply' => (string) $parsed['reply'],
                'needs_escalation' => (bool) ($parsed['needs_escalation'] ?? false),
            ];
        } catch (\Throwable $e) {
            Log::error('LivoraAssistant error: ' . $e->getMessage());
            return [
                'reply' => 'Maaf, saya sedang tidak bisa memproses pertanyaan itu. Mau saya hubungkan ke customer service kami?',
                'needs_escalation' => true,
            ];
        }
    }

    private function systemPrompt(string $context): string
    {
        $brand = self::BRAND_PROFILE;

        return <<<PROMPT
Kamu adalah Livora Concierge, asisten AI resmi Livora Studio.

Peranmu: menjawab pertanyaan tentang profil perusahaan, layanan, alur kerja, dan product knowledge
(furniture, material, finishing, koleksi, project) berdasarkan informasi di bawah.

Aturan:
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
- Balas HANYA JSON valid, tanpa teks lain:
{"reply": "isi jawaban", "needs_escalation": true atau false}

Profil Livora:
{$brand}

Data produk relevan:
{$context}
PROMPT;
    }

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
        if (!empty($keywords)) {
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
                ->limit(5)
                ->get();

            foreach ($items as $item) {
                $chunks[] = '[Item] ' . $this->describeItem($item);
            }

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
                ->get(['id', 'title', 'subtitle', 'description', 'location', 'year']);

            foreach ($projects as $p) {
                $chunks[] = "[Project] {$p->title} ({$p->location}, {$p->year}) — {$p->description}";
            }

            $collections = Collection::query()
                ->where(function ($q) use ($keywords) {
                    foreach ($keywords as $kw) {
                        $q->orWhere('title', 'like', "%{$kw}%")
                          ->orWhere('description', 'like', "%{$kw}%");
                    }
                })
                ->limit(3)
                ->get(['id', 'title', 'description']);

            foreach ($collections as $c) {
                $chunks[] = "[Collection] {$c->title} — {$c->description}";
            }

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
                ->get(['id', 'title', 'description', 'category', 'taxonomy']);

            foreach ($catalogs as $cat) {
                $chunks[] = "[Catalog] {$cat->title} (Kategori: {$cat->category}, Gaya: {$cat->taxonomy}) — {$cat->description}";
            }
        }

        return implode("\n", $chunks);
    }

    private function describeItem(Item $item): string
    {
        $parts = [];
        $parts[] = $item->title;
        if (!empty($item->description)) {
            $parts[] = $item->description;
        }
        $meta = [];
        if (!empty($item->texture))      { $meta[] = "Material/tekstur: {$item->texture}"; }
        if (!empty($item->finish))       { $meta[] = "Finishing: {$item->finish}"; }
        if (!empty($item->availability)) { $meta[] = "Ketersediaan: {$item->availability}"; }
        if (!empty($item->slug))         { $meta[] = "Halaman: /items/{$item->slug}"; }

        return implode(' — ', $parts) . (empty($meta) ? '' : ' (' . implode(', ', $meta) . ')');
    }

    private function extractKeywords(string $message): array
    {
        $stopwords = ['yang', 'dan', 'atau', 'saya', 'kamu', 'ada', 'ini', 'itu', 'untuk', 'dengan',
            'apakah', 'apa', 'bagaimana', 'mau', 'bisa', 'tentang', 'produk', 'the', 'and', 'is',
            'are', 'for', 'about', 'this', 'that', 'you'];

        $words = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower(trim($message)));
        $words = array_filter($words ?: [], fn ($w) => mb_strlen($w) > 2 && !in_array($w, $stopwords, true));

        return array_slice(array_values(array_unique($words)), 0, 8);
    }
}
