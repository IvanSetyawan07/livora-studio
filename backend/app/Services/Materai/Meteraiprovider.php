<?php

namespace App\Services\Meterai;

interface MeteraiProvider
{
    /**
     * Request an e-meterai (Indonesian stamp duty) be affixed to a document.
     *
     * Implementations must NEVER report "completed" unless a real provider
     * transaction actually succeeded.
     *
     * @return array{status: string, reference: ?string, error: ?string}
     */
    public function stamp(string $documentAbsolutePath, string $documentLabel): array;
}