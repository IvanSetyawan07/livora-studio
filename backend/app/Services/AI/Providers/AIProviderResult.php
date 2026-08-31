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
        public readonly ?int $rlRequestsLimit = null,
        public readonly ?int $rlRequestsRemaining = null,
        public readonly ?int $rlTokensLimit = null,
        public readonly ?int $rlTokensRemaining = null,
        public readonly ?\DateTimeInterface $rlRequestsResetAt = null,
        public readonly ?\DateTimeInterface $rlTokensResetAt = null,
        public readonly ?string $rlNote = null,
    ) {
    }
}