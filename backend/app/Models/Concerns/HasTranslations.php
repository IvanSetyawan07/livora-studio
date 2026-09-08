<?php

namespace App\Models\Concerns;

use App\Models\ContentTranslation;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Bikin sebuah model punya versi 2 bahasa tanpa mengubah tabel aslinya.
 *
 * Model tinggal mendeklarasikan:
 *   public array $translatable = ['title', 'description'];
 *
 * Saat model dibaca dan locale aktif punya baris terjemahan, nilai field
 * tersebut ditimpa. Kalau belum ada terjemahannya, nilai asli dipakai —
 * jadi konten lama tetap tampil, tidak pernah kosong.
 *
 * Query terjemahan dilakukan SATU KALI per (model, locale) per request
 * lalu disimpan di cache statis, supaya tidak jadi N+1 saat list panjang.
 */
trait HasTranslations
{
    /** @var array<string, array<int, array<string, string|null>>> */
    protected static array $translationCache = [];

    public static function bootHasTranslations(): void
    {
        static::retrieved(function ($model) {
            $model->applyTranslations();
        });
    }

    public function translations(): MorphMany
    {
        return $this->morphMany(ContentTranslation::class, 'translatable');
    }

    /** @return array<int, string> */
    public function translatableFields(): array
    {
        return property_exists($this, 'translatable') ? $this->translatable : [];
    }

    public function applyTranslations(?string $locale = null): void
    {
        $fields = $this->translatableFields();
        if (!$fields || !$this->getKey()) {
            return;
        }

        $locale = $locale ?: app()->getLocale();
        $values = static::translationsFor(static::class, $locale, (int) $this->getKey());

        foreach ($fields as $field) {
            $value = $values[$field] ?? null;
            if (is_string($value) && trim($value) !== '') {
                $this->setRawAttributes([$field => $value] + $this->getAttributes(), false);
                $this->syncOriginalAttribute($field);
            }
        }
    }

    /**
     * Ambil semua terjemahan untuk satu tipe model + locale, sekali saja.
     *
     * @return array<string, string|null>
     */
    protected static function translationsFor(string $type, string $locale, int $id): array
    {
        $cacheKey = $type.'|'.$locale;

        if (!array_key_exists($cacheKey, static::$translationCache)) {
            static::$translationCache[$cacheKey] = ContentTranslation::query()
                ->where('translatable_type', $type)
                ->where('locale', $locale)
                ->get(['translatable_id', 'field', 'value'])
                ->groupBy('translatable_id')
                ->map(fn ($rows) => $rows->pluck('value', 'field')->all())
                ->all();
        }

        return static::$translationCache[$cacheKey][$id] ?? [];
    }

    /** Dipakai admin: baca nilai per bahasa apa adanya (tanpa fallback). */
    public function rawTranslations(string $locale): array
    {
        return $this->translations()
            ->where('locale', $locale)
            ->pluck('value', 'field')
            ->all();
    }

    /** Simpan/ubah terjemahan satu bahasa. */
    public function setTranslations(string $locale, array $values, string $source = 'manual'): void
    {
        $allowed = $this->translatableFields();

        foreach ($values as $field => $value) {
            if (!in_array($field, $allowed, true)) {
                continue;
            }

            if ($value === null || trim((string) $value) === '') {
                $this->translations()->where('locale', $locale)->where('field', $field)->delete();
                continue;
            }

            $this->translations()->updateOrCreate(
                ['locale' => $locale, 'field' => $field],
                ['value' => (string) $value, 'source' => $source],
            );
        }

        static::$translationCache = [];
    }
}
