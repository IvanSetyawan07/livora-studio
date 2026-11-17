<?php

namespace Database\Seeders;

use App\Models\AiRoutingStrategy;
use Illuminate\Database\Seeder;

class AiRoutingStrategySeeder extends Seeder
{
    public function run(): void
    {
        $geminiModel = config('ai.providers.gemini.model', 'gemini-3.6-flash');
        $groqModel = config('ai.providers.groq.model', 'openai/gpt-oss-120b');

        AiRoutingStrategy::updateOrCreate(
            ['name' => 'Balanced'],
            [
                'automatic' => true,
                'quality' => 88,
                'speed' => 86,
                'cost_efficiency' => 92,
                'is_active' => true,
                'task_routing' => [
                    [
                        'taskType' => 'SEO & Catalog Metadata Audit',
                        'routedTo' => "gemini ({$geminiModel})",
                        'reason' => 'Reasoning multimodal & akurasi panjang karakter title/description untuk Search Console dan produk Livora.',
                    ],
                    [
                        'taskType' => 'CRO, Funnel & Lead Scoring',
                        'routedTo' => "gemini ({$geminiModel})",
                        'reason' => 'Analisis korelasi konsultasi, WhatsApp inquiry, wishlist, dan drop-off funnel dengan JSON ketat.',
                    ],
                    [
                        'taskType' => 'Content, Copywriting & Email Drafts',
                        'routedTo' => "gemini ({$geminiModel}) → fallback groq ({$groqModel})",
                        'reason' => 'Gaya editorial interior & furniture premium dalam Bahasa Indonesia dengan fallback otomatis berbiaya rendah.',
                    ],
                    [
                        'taskType' => 'Ask AI Interactive Chat',
                        'routedTo' => 'preferred provider / fallback chain',
                        'reason' => 'Menjawab pertanyaan admin dengan snapshot metrik live dan fallback instan antar provider aktif.',
                    ],
                ],
            ]
        );
    }
}
