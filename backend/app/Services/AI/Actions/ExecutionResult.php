<?php

namespace App\Services\AI\Actions;

/**
 * Hasil satu eksekusi aksi.
 * - $summary : teks Activity Log (untuk eksekusi nyata: diff before → after).
 * - $payload : null untuk draft; {before, after} untuk yang menulis ke DB.
 * - $wroteToDatabase : penanda jujur untuk response API.
 */
class ExecutionResult
{
    public function __construct(
        public readonly string $summary,
        public readonly ?array $payload = null,
        public readonly bool $wroteToDatabase = false,
    ) {
    }

    public static function draft(string $summary): self
    {
        return new self($summary, null, false);
    }

    /** @param array<string, mixed> $before @param array<string, mixed> $after */
    public static function changed(string $summary, array $before, array $after): self
    {
        return new self($summary, ['before' => $before, 'after' => $after], true);
    }
}
