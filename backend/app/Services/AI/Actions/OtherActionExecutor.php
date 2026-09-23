<?php

namespace App\Services\AI\Actions;

/** Eksekutor draft untuk action_type "other". Lihat AbstractDraftActionExecutor. */
class OtherActionExecutor extends AbstractDraftActionExecutor
{
    public function handles(): string
    {
        return 'other';
    }

    protected function roleLabel(): string
    {
        return 'asisten operasional umum';
    }
}