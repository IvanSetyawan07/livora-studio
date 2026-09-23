<?php

namespace App\Services\AI\Actions;

/** Eksekutor draft untuk action_type "content". Lihat AbstractDraftActionExecutor. */
class ContentActionExecutor extends AbstractDraftActionExecutor
{
    public function handles(): string
    {
        return 'content';
    }

    protected function roleLabel(): string
    {
        return 'content writer/editor';
    }
}