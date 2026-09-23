<?php

namespace App\Services\AI\Actions;

/** Eksekutor draft untuk action_type "follow_up". Lihat AbstractDraftActionExecutor. */
class FollowUpActionExecutor extends AbstractDraftActionExecutor
{
    public function handles(): string
    {
        return 'follow_up';
    }

    protected function roleLabel(): string
    {
        return 'sales/CRM follow-up specialist';
    }
}