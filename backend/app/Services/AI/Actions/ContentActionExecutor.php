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
    /**
 * TODO (begitu tabel konten dibuat, mis. `articles` dengan kolom
 * title/slug/body/status):
 *   1. Ganti extends AbstractDraftActionExecutor -> implements ActionExecutor.
 *   2. Minta AI generate judul + isi artikel dari $recommendation.
 *   3. Article::create([... 'status' => 'draft']) — jangan pernah 'published'.
 *   4. Return ExecutionResult::changed($summary, ['article' => null],
 *      ['article' => ['id' => .., 'title' => .., 'status' => 'draft']]).
 *   5. Tetap lempar exception kalau AI/insert gagal.
 */
    protected function manualNotice(): string
    {
        return 'CATATAN: belum ada tabel konten (artikel/blog) di Livora, jadi eksekusi ini '
            .'TIDAK membuat draft di database dan tidak ada yang tayang. Ini murni draft teks — '
            .'copy ke CMS secara manual. Setelah tabel konten tersedia, executor ini akan '
            .'membuat baris berstatus draft otomatis.';
    }

}