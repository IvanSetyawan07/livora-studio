<?php

namespace App\Services\AI\Actions;

/** Eksekutor draft untuk action_type "technical_seo". Lihat AbstractDraftActionExecutor. */
class TechnicalSeoActionExecutor extends AbstractDraftActionExecutor
{
    public function handles(): string
    {
        return 'technical_seo';
    }

    protected function roleLabel(): string
    {
        return 'spesialis SEO teknikal (redirect, canonical, structured data)';
    }
}