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
        protected function manualNotice(): string
    {
        return 'WAJIB DIKERJAKAN MANUAL — TIDAK ADA PERUBAHAN OTOMATIS. '
            .'Item SEO teknikal (redirect 301, canonical, structured data) menyentuh konfigurasi '
            .'server (.htaccess/nginx) dan berisiko merusak SEO kalau salah, jadi sistem hanya '
            .'menyiapkan checklist. Kerjakan di staging dulu, verifikasi, baru ke produksi.';
    }

}