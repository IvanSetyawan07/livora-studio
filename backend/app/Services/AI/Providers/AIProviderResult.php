<?php

namespace App\Services\AI\Providers;

final class AIProviderResult
{
    public function __construct(
        public readonly string $text,
        public readonly string $model,
        public readonly int $inputTokens,
        public readonly int $outputTokens,
        public readonly int $durationMs,
    ) {
    }
}