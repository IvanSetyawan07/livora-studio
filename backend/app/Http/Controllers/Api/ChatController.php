<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\Project;
use App\Models\Collection;
use App\Models\Catalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class ChatController extends Controller
{
    /**
     * POST /api/chat
     * Body: { message: string, conversation_history: [{ role: "user"|"bot", text: string }] }
     * Response: { reply: string, needs_escalation: boolean }
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:2000',
            'conversation_history' => 'array',
            'conversation_history.*.role' => 'in:user,bot',
            'conversation_history.*.text' => 'string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Invalid request.'], 422);
        }

        $message = $request->input('message');
        $history = $request->input('conversation_history', []);

        // 1) Retrieval — cari data relevan di katalog produk sebelum tanya LLM
        $context = $this->searchProductContext($message);

        // 2) Susun system prompt + kirim ke LLM
        try {
            $result = $this->askClaude($message, $history, $context);
        } catch (\Throwable $e) {
            Log::error('Chat LLM error: ' . $e->getMessage());
            return response()->json([
                'reply' => 'Maaf, saya sedang tidak bisa memproses pertanyaan itu. Mau saya hubungkan langsung ke tim consultant kami?',
                'needs_escalation' => true,
            ]);
        }

        return response()->json($result);
    }

    /**
     * Cari data relevan dari Item, Project, Collection, Catalog berdasarkan pesan user.
     * Nama kolom disesuaikan dengan migration asli:
     * - items: title, description, availability (kategori via pivot category_item, tipe via furniture_types)
     * - projects: title, subtitle, description, location, year
     * - catalogs: title, description, category, taxonomy
     * - collections: title, description (asumsi — konfirmasi ke base migration collections kalau beda)
     */
    private function searchProductContext(string $message): string
    {
        $keywords = $this->extractKeywords($message);
        if (empty($keywords)) {
            return '';
        }

        $chunks = [];

        $items = Item::query()
            ->where(function ($q) use ($keywords) {
                foreach ($keywords as $kw) {
                    $q->orWhere('title', 'like', "%{$kw}%")
                      ->orWhere('description', 'like', "%{$kw}%")
                      ->orWhere('texture', 'like', "%{$kw}%")
                      ->orWhere('finish', 'like', "%{$kw}%");
                }
            })
            ->limit(5)
            ->get(['id', 'title', 'description', 'availability', 'texture', 'finish']);

        foreach ($items as $item) {
            $chunks[] = "[Item] {$item->title} — {$item->description} (Ketersediaan: {$item->availability}, Finish: {$item->finish})";
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

        foreach ($projects as $project) {
            $chunks[] = "[Project] {$project->title} ({$project->location}, {$project->year}) — {$project->description}";
        }

        // TODO: konfirmasi nama kolom asli tabel `collections` (asumsi: title, description)
        $collections = Collection::query()
            ->where(function ($q) use ($keywords) {
                foreach ($keywords as $kw) {
                    $q->orWhere('title', 'like', "%{$kw}%")
                      ->orWhere('description', 'like', "%{$kw}%")
                      ->orWhere('short_description', 'like', "%{$kw}%");
                }
            })
            ->limit(3)
            ->get(['id', 'title', 'description']);

        foreach ($collections as $collection) {
            $chunks[] = "[Collection] {$collection->title} — {$collection->description}";
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

        foreach ($catalogs as $catalog) {
            $chunks[] = "[Catalog] {$catalog->title} (Kategori: {$catalog->category}, Gaya: {$catalog->taxonomy}) — {$catalog->description}";
        }

        return implode("\n", $chunks);
    }

    /**
     * Ambil kata kunci sederhana dari pesan user (buang stopword umum bahasa Indonesia/Inggris).
     */
    private function extractKeywords(string $message): array
    {
        $stopwords = ['yang', 'dan', 'atau', 'saya', 'kamu', 'ada', 'ini', 'itu', 'untuk', 'dengan',
            'apakah', 'apa', 'bagaimana', 'mau', 'bisa', 'the', 'and', 'is', 'are', 'for', 'a', 'an'];

        $words = preg_split('/\s+/', mb_strtolower(trim($message)));
        $words = array_filter($words, fn ($w) => strlen($w) > 2 && !in_array($w, $stopwords));

        return array_values(array_unique($words));
    }

    /**
     * Panggil Claude API dengan system prompt + context hasil retrieval.
     * Model diminta membalas dalam format JSON supaya gampang di-parse.
     */
    private function askClaude(string $message, array $history, string $context): array
    {
        $systemPrompt = <<<PROMPT
Kamu adalah Livora Concierge, asisten virtual untuk Livora Studio — platform interior design dan furniture.

Aturan:
- Jawab HANYA berdasarkan informasi produk yang diberikan di bagian "Data produk relevan" di bawah. Jangan mengarang detail produk, harga, atau ketersediaan yang tidak ada di data tersebut.
- Livora tidak menampilkan harga pasti di data produk — kalau user tanya harga, arahkan untuk konsultasi dan set needs_escalation true.
- Kalau data produk relevan kosong atau tidak menjawab pertanyaan user, katakan dengan jujur kamu tidak punya info spesifik itu, dan tawarkan untuk menghubungkan ke tim consultant.
- Kalau user meminta jadwal survey, komplain, negosiasi, atau eksplisit minta bicara dengan manusia, set needs_escalation menjadi true.
- Gunakan Bahasa Indonesia yang ramah dan singkat, kecuali user menulis dalam Bahasa Inggris.
- Balas HANYA dalam format JSON valid seperti ini, tanpa teks lain di luar JSON:
{"reply": "isi jawaban di sini", "needs_escalation": true atau false}

Data produk relevan:
{$context}
PROMPT;

        $messages = [];
        foreach ($history as $h) {
            $messages[] = [
                'role' => $h['role'] === 'user' ? 'user' : 'assistant',
                'content' => $h['text'],
            ];
        }
        $messages[] = ['role' => 'user', 'content' => $message];

        $response = Http::withHeaders([
            'x-api-key' => config('services.anthropic.api_key'),
            'anthropic-version' => '2023-06-01',
            'content-type' => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => 'claude-sonnet-4-6',
            'max_tokens' => 500,
            'system' => $systemPrompt,
            'messages' => $messages,
        ]);

        if (!$response->successful()) {
            Log::error('Claude API error: ' . $response->body());
            throw new \RuntimeException('Claude API request failed');
        }

        $textBlock = collect($response->json('content', []))
            ->firstWhere('type', 'text');

        $rawText = $textBlock['text'] ?? '';

        $cleaned = trim(preg_replace('/```json|```/', '', $rawText));

        $parsed = json_decode($cleaned, true);

        if (!is_array($parsed) || !isset($parsed['reply'])) {
            return [
                'reply' => $rawText !== '' ? $rawText : 'Maaf, saya belum bisa menjawab itu. Mau saya hubungkan ke tim consultant kami?',
                'needs_escalation' => true,
            ];
        }

        return [
            'reply' => $parsed['reply'],
            'needs_escalation' => (bool) ($parsed['needs_escalation'] ?? false),
        ];
    }
}