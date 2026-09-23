<?php

namespace App\Services\AI\Actions;

/** Eksekutor draft untuk action_type "training". Lihat AbstractDraftActionExecutor. */
class TrainingActionExecutor extends AbstractDraftActionExecutor
{
    public function handles(): string
    {
        return 'training';
    }

    protected function roleLabel(): string
    {
        return 'trainer/pembuat materi pelatihan tim';
    }
}