<?php

namespace App\Services\AI\Actions;

use App\Models\AiRecommendation;

/**
 * Dispatcher eksekusi per action_type.
 *
 * Registry ini SENGAJA kosong untuk tipe yang belum punya integrasi tulis
 * (push campaign, publish konten, dst). Tidak ada fallback "anggap sukses":
 * caller wajib memeriksa supports() dan melaporkan kegagalan apa adanya.
 */
class ActionExecutorRegistry
{
    /** @var array<string, ActionExecutor> */
    protected array $executors = [];

    /** @param iterable<ActionExecutor> $executors */
    public function __construct(iterable $executors = [])
    {
        foreach ($executors as $executor) {
            $this->register($executor);
        }
    }

    public function register(ActionExecutor $executor): void
    {
        $this->executors[$executor->handles()] = $executor;
    }

    public function supports(?string $actionType): bool
    {
        return $actionType !== null && isset($this->executors[$actionType]);
    }

    public function executorFor(?string $actionType): ?ActionExecutor
    {
        return $actionType === null ? null : ($this->executors[$actionType] ?? null);
    }

    /** @return string ringkasan hasil eksekusi */
    public function execute(AiRecommendation $recommendation): string
    {
        $executor = $this->executorFor($recommendation->action_type);

        if (!$executor) {
            throw new ActionNotExecutableException(
                "Execution not implemented for action type \"{$recommendation->action_type}\"."
            );
        }

        return $executor->execute($recommendation);
    }
}
