<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\AI\AIProviderManager;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __construct(protected AIProviderManager $manager)
    {
    }

    public function ask(Request $request)
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'context' => ['nullable', 'string'],
        ]);

        $systemPrompt = $this->systemPromptFor($validated['context'] ?? 'general');

        try {
            $result = $this->manager->ask($systemPrompt, $validated['message'], 'chat');
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Semua AI provider gagal merespons. Pastikan minimal satu provider (Gemini/Groq) sudah dikonfigurasi dan API key valid.',
                'error' => $e->getMessage(),
            ], 503);
        }

        return response()->json([
            'id' => 'msg_'.now()->timestamp.'_'.uniqid(),
            'role' => 'assistant',
            'text' => $result['text'],
            'createdAt' => now()->toISOString(),
        ]);
    }

    protected function systemPromptFor(string $context): string
    {
        return "Kamu adalah asisten AI Marketing untuk Livora Studio, platform interior design & furniture. "
            ."Jawab singkat dan relevan dengan konteks halaman '{$context}' di dashboard. "
            ."Jangan pernah mengarang data atau angka yang tidak kamu ketahui — kalau tidak ada data nyata, katakan terus terang.";
    }
}