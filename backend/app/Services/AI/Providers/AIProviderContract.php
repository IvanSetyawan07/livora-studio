<?php

namespace App\Services\AI\Providers;

interface AIProviderContract
{
    public function key(): string;

    public function model(): string;

    public function isConfigured(): bool;

    public function complete(string $systemPrompt, string $userMessage, array $options = []): AIProviderResult;
}