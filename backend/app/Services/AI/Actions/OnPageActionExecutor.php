<?php

namespace App\Services\AI\Actions;

use App\Models\AiRecommendation;
use App\Models\Item;
use App\Models\Project;
use App\Services\AI\AIProviderManager;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

/**
 * Eksekutor NYATA untuk action_type "on_page".
 *
 * Pengaman yang tidak boleh dilepas:
 *  - target_type + target_id WAJIB ada.
 *  - Kalau record sudah diubah manual SETELAH rekomendasi dibuat, eksekusi DITOLAK.
 *  - Nilai lama masuk payload ai_activity_log sebagai {before, after}.
 *  - AI gagal / respons tidak bisa di-parse => exception, status TIDAK executed.
 */
class OnPageActionExecutor implements ActionExecutor
{
    private const MAX_TITLE = 70;
    private const MAX_DESCRIPTION = 180;

    public function __construct(private AIProviderManager $ai)
    {
    }

    public function handles(): string
    {
        return 'on_page';
    }

    public function execute(AiRecommendation $recommendation): ExecutionResult
    {
        $record = $this->resolveTarget($recommendation);

        $this->guardAgainstManualEdit($recommendation, $record);

        $draft = $this->generateMeta($recommendation, $record);

        $before = [
            'target_type' => $recommendation->target_type,
            'target_id' => $record->getKey(),
            'meta_title' => $record->meta_title,
            'meta_description' => $record->meta_description,
        ];

        $record->update([
            'meta_title' => $draft['title'],
            'meta_description' => $draft['description'],
        ]);

        $after = [
            'target_type' => $recommendation->target_type,
            'target_id' => $record->getKey(),
            'meta_title' => $draft['title'],
            'meta_description' => $draft['description'],
        ];

        $label = $this->label($recommendation->target_type, $record);
        $oldTitle = $before['meta_title'] ?? '(kosong)';
        $oldDesc = $before['meta_description'] ?? '(kosong)';

        $summary = "Meta tag {$label} diubah langsung di database (provider {$draft['provider']}).\n"
            ."Meta title diubah dari '{$oldTitle}' jadi '{$draft['title']}' pada {$label}.\n"
            ."Meta description diubah dari '{$oldDesc}' jadi '{$draft['description']}' pada {$label}.\n"
            .'Nilai lama tersimpan di payload log ini kalau perlu dibatalkan manual.';

        return ExecutionResult::changed($summary, $before, $after);
    }

    /** @return Item|Project */
    private function resolveTarget(AiRecommendation $recommendation): Model
    {
        $type = $recommendation->target_type;
        $id = $recommendation->target_id;

        if (!$id || !in_array($type, ['item', 'project'], true)) {
            throw new ActionNotExecutableException(
                'Rekomendasi on-page ini tidak punya target record (target_type/target_id kosong), '
                .'jadi tidak ada yang bisa diubah otomatis. Jalankan ulang SEO Agent supaya '
                .'rekomendasinya terikat ke halaman item/project tertentu.'
            );
        }

        $record = $type === 'item' ? Item::find($id) : Project::find($id);

        if (!$record) {
            throw new ActionNotExecutableException(
                "Target {$type} #{$id} tidak ditemukan (kemungkinan sudah dihapus). Eksekusi dibatalkan."
            );
        }

        return $record;
    }

    private function guardAgainstManualEdit(AiRecommendation $recommendation, Model $record): void
    {
        $recordUpdatedAt = $record->updated_at;
        $recommendedAt = $recommendation->created_at;

        if ($recordUpdatedAt && $recommendedAt && $recordUpdatedAt->greaterThan($recommendedAt)) {
            throw new ActionTargetChangedException(
                'Data sudah berubah sejak rekomendasi ini dibuat, buat rekomendasi baru dulu. '
                ."({$this->label($recommendation->target_type, $record)} terakhir diubah "
                ."{$recordUpdatedAt->toDateTimeString()}, rekomendasi dibuat {$recommendedAt->toDateTimeString()}.)"
            );
        }
    }

    /** @return array{title: string, description: string, provider: string} */
    private function generateMeta(AiRecommendation $recommendation, Model $record): array
    {
        $currentTitle = $record->meta_title ?: '(belum ada)';
        $currentDesc = $record->meta_description ?: '(belum ada)';
        $context = trim((string) ($record->description ?? ''));
        $context = $context === '' ? '(tidak ada deskripsi)' : mb_substr($context, 0, 600);

        $prompt = <<<TXT
Tulis ulang meta tag SEO untuk satu halaman di situs Livora Studio.

Halaman         : {$record->title} (/{$this->pathPrefix($recommendation->target_type)}/{$record->slug})
Meta title kini : {$currentTitle}
Meta desc kini  : {$currentDesc}
Deskripsi halaman: {$context}

Rekomendasi SEO yang harus diterapkan:
Judul  : {$recommendation->title}
Alasan : {$recommendation->why}
Langkah: {$recommendation->suggested_action}

Aturan:
- Bahasa Indonesia, gaya brand interior & furniture premium, tanpa clickbait.
- Meta Title maksimal 60 karakter, sertakan nama halaman.
- Meta Description maksimal 155 karakter, satu kalimat ajakan yang wajar.
- Jangan mengarang klaim (garansi, diskon, penghargaan) yang tidak ada di data di atas.

Balas HANYA dengan format persis ini, tanpa basa-basi:
Meta Title: ...
Meta Description: ...
TXT;

        $result = $this->ai->ask(
            'Kamu adalah SEO copywriter untuk Livora Studio, brand interior & furniture premium di Indonesia.',
            $prompt,
            'seo',
        );

        $text = trim((string) ($result['text'] ?? ''));

        if ($text === '') {
            throw new RuntimeException('AI provider tidak mengembalikan draft meta tag (respons kosong). Tidak ada data yang diubah.');
        }

        preg_match('/Meta\s*Title\s*:\s*(.+)/i', $text, $titleMatch);
        preg_match('/Meta\s*Description\s*:\s*(.+)/i', $text, $descMatch);

        $title = trim($titleMatch[1] ?? '');
        $description = trim($descMatch[1] ?? '');

        if ($title === '' || $description === '') {
            throw new RuntimeException(
                'Respons AI tidak sesuai format (Meta Title / Meta Description tidak ditemukan). '
                .'Tidak ada data yang diubah.'
            );
        }

        if (mb_strlen($title) > self::MAX_TITLE || mb_strlen($description) > self::MAX_DESCRIPTION) {
            throw new RuntimeException(
                'Meta tag hasil AI melebihi batas panjang yang aman ('
                .mb_strlen($title).' karakter title / '.mb_strlen($description)
                .' karakter description). Tidak ada data yang diubah — jalankan ulang eksekusi.'
            );
        }

        return [
            'title' => $title,
            'description' => $description,
            'provider' => (string) ($result['provider'] ?? 'unknown'),
        ];
    }

    private function pathPrefix(?string $type): string
    {
        return $type === 'item' ? 'items' : 'projects';
    }

    private function label(?string $type, Model $record): string
    {
        $name = ucfirst($type ?? 'record');

        return "{$name}#{$record->getKey()} ({$record->slug})";
    }
}
