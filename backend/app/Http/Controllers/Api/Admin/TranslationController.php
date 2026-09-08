<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use App\Models\Category;
use App\Models\Collection;
use App\Models\FurnitureType;
use App\Models\Item;
use App\Models\Project;
use App\Models\Theme;
use App\Services\Translation\AiTranslator;
use Illuminate\Http\Request;

/**
 * Panel dwibahasa untuk konten yang diinput admin.
 *
 * - show()      : nilai dasar + nilai per bahasa (apa adanya, tanpa fallback)
 * - store()     : simpan terjemahan satu bahasa (manual)
 * - autoTranslate(): isi bahasa tujuan dari bahasa sumber lewat AI, hasilnya
 *   dikembalikan ke form supaya admin bisa mengedit sebelum menyimpan.
 */
class TranslationController extends Controller
{
    private const TYPES = [
        'item' => Item::class,
        'collection' => Collection::class,
        'catalog' => Catalog::class,
        'project' => Project::class,
        'theme' => Theme::class,
        'category' => Category::class,
        'furniture-type' => FurnitureType::class,
    ];

    private const LOCALES = ['id', 'en'];

    public function show(string $type, int $id)
    {
        $model = $this->resolve($type, $id);

        return response()->json([
            'type' => $type,
            'id' => $id,
            'fields' => $model->translatableFields(),
            'base' => $this->baseValues($model),
            'translations' => [
                'id' => $model->rawTranslations('id'),
                'en' => $model->rawTranslations('en'),
            ],
        ]);
    }

    public function store(Request $request, string $type, int $id)
    {
        $data = $request->validate([
            'locale' => ['required', 'in:'.implode(',', self::LOCALES)],
            'values' => ['required', 'array'],
            'values.*' => ['nullable', 'string'],
            'source' => ['nullable', 'in:manual,ai'],
        ]);

        $model = $this->resolve($type, $id);
        $model->setTranslations($data['locale'], $data['values'], $data['source'] ?? 'manual');

        return response()->json([
            'message' => 'Terjemahan tersimpan.',
            'translations' => $model->rawTranslations($data['locale']),
        ]);
    }

    public function autoTranslate(Request $request, AiTranslator $translator, string $type, int $id)
    {
        $data = $request->validate([
            'from' => ['required', 'in:'.implode(',', self::LOCALES)],
            'to' => ['required', 'in:'.implode(',', self::LOCALES), 'different:from'],
            'save' => ['nullable', 'boolean'],
        ]);

        $model = $this->resolve($type, $id);

        // Bahasa sumber: pakai terjemahan bahasa itu kalau ada, kalau tidak
        // pakai nilai dasar dari tabel aslinya. Tidak pernah mengarang isi.
        $source = array_merge(
            $this->baseValues($model),
            array_filter($model->rawTranslations($data['from']), fn ($v) => is_string($v) && trim($v) !== ''),
        );

        try {
            $result = $translator->translate($source, $data['from'], $data['to']);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Terjemahan otomatis gagal: '.$e->getMessage(),
            ], 502);
        }

        if (!$result['values']) {
            return response()->json([
                'message' => 'Tidak ada teks yang bisa diterjemahkan pada konten ini.',
            ], 422);
        }

        if ($request->boolean('save')) {
            $model->setTranslations($data['to'], $result['values'], 'ai');
        }

        return response()->json([
            'locale' => $data['to'],
            'values' => $result['values'],
            'provider' => $result['provider'],
            'model' => $result['model'],
            'saved' => $request->boolean('save'),
        ]);
    }

    private function baseValues($model): array
    {
        $values = [];
        foreach ($model->translatableFields() as $field) {
            $values[$field] = $model->getAttribute($field);
        }

        return $values;
    }

    private function resolve(string $type, int $id)
    {
        $class = self::TYPES[$type] ?? null;
        abort_if(!$class, 404, "Tipe konten '{$type}' tidak dikenal.");

        /** @var \Illuminate\Database\Eloquent\Model $model */
        $model = $class::findOrFail($id);

        return $model;
    }
}
