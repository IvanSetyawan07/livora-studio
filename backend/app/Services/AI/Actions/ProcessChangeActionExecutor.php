<?php

namespace App\Services\AI\Actions;

/** Eksekutor draft untuk action_type "process_change". Lihat AbstractDraftActionExecutor. */
class ProcessChangeActionExecutor extends AbstractDraftActionExecutor
{
    public function handles(): string
    {
        return 'process_change';
    }

    protected function roleLabel(): string
    {
        return 'konsultan operasional';
    }
}