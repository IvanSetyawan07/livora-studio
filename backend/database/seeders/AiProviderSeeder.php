<?php

namespace Database\Seeders;

use App\Models\AiProvider;
use Illuminate\Database\Seeder;

class AiProviderSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['gemini', 'groq', 'anthropic'] as $key) {
            AiProvider::updateOrCreate(
                ['provider' => $key],
                [
                    'model' => config("ai.providers.{$key}.model"),
                    'status' => filled(config("ai.providers.{$key}.api_key")) ? 'connected' : 'not_connected',
                ]
            );
        }
    }
}