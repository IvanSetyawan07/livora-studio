<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FurnitureVariant;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ItemController extends Controller
{
    public function index(Request $r)
    {
        $q = Item::with(['type','collection','themes','categories','variants']);
        if ($t = $r->query('type'))       $q->whereHas('type', fn($x) => $x->where('slug',$t));
        if ($t = $r->query('theme'))      $q->whereHas('themes', fn($x) => $x->where('slug',$t));
        if ($t = $r->query('category'))   $q->whereHas('categories', fn($x) => $x->where('slug',$t));
        if ($t = $r->query('collection')) $q->whereHas('collection', fn($x) => $x->where('slug',$t));
        
        // Filter promo
        if ($r->boolean('promo')) {
            $q->where('is_on_promo', true);
        }

        // Sorting
        $sort = $r->query('sort');
        if ($sort === 'discount_desc') {
            $q->orderByDesc('discount_value')->orderByDesc('id');
        } elseif ($sort === 'name_asc') {
            $q->orderBy('title', 'asc')->orderByDesc('id');
        } elseif ($sort === 'name_desc') {
            $q->orderBy('title', 'desc')->orderByDesc('id');
        } elseif ($sort === 'price_asc') {
            $q->orderBy('final_price', 'asc')->orderByDesc('id');
        } elseif ($sort === 'price_desc') {
            $q->orderByDesc('final_price')->orderByDesc('id');
        } else {
            $q->orderByDesc('id');
        }

        $items = $q->get();
        if (!$this->isStaff()) $items->each->makeHidden(self::INTERNAL_FIELDS);
        return $items;
    }

    /** Field internal yang tidak boleh terlihat pengunjung publik (termasuk harga). */
    private const INTERNAL_FIELDS = ['stock', 'warehouse_note', 'price', 'original_price', 'final_price'];

    private function isStaff(): bool
    {
        $u = auth('sanctum')->user();
        return $u && in_array($u->role, ['admin', 'sales'], true);
    }

    public function show($slug)
    {
        $item = Item::with([
            'type','collection','themes','categories',
            'variants.gallery','gallery','lifestyle',
            'story.cards',
        ])->where('slug',$slug)->firstOrFail();
        if (!$this->isStaff()) $item->makeHidden(self::INTERNAL_FIELDS);

        $related = [];
        if ($item->collection_id) {
            $related = Item::with(['type', 'collection', 'variants'])
                ->where('collection_id', $item->collection_id)
                ->where('id','!=',$item->id)
                ->limit(8)->get();
            if (!$this->isStaff()) $related->each->makeHidden(self::INTERNAL_FIELDS);
        }
        $arr = $item->toArray();
        $arr['related'] = $related;
        return $arr;
    }

    /**
     * Admin-only: rincian internal item (stok, harga, dimensi, material lengkap)
     * + daftar item serupa. Dipakai halaman Admin QR Scan / Item Detail.
     */
    public function adminShow($slug)
    {
        $item = Item::with(['type','collection','themes','categories','variants'])
            ->where('slug', $slug)->orWhere('code', $slug)->firstOrFail();

        $similar = Item::with(['type','collection'])
            ->where('id', '!=', $item->id)
            ->where(function ($q) use ($item) {
                if ($item->type_id)       $q->orWhere('type_id', $item->type_id);
                if ($item->collection_id) $q->orWhere('collection_id', $item->collection_id);
            })
            ->orderByRaw('CASE WHEN type_id = ? THEN 0 ELSE 1 END', [$item->type_id])
            ->limit(24)
            ->get();

        return [
            'item'    => $item,
            'similar' => $similar,
        ];
    }

    public function store(Request $r)
    {
        $data = $this->validateData($r);
        $themes = $data['theme_ids'] ?? []; $cats = $data['category_ids'] ?? [];
        unset($data['theme_ids'], $data['category_ids'], $data['colors_json']);
        $data['slug'] = $this->uniqueSlug($data['title']);
        if ($r->hasFile('image')) $data['image'] = \App\Services\ImageOptimizer::storePublicWebp($r->file('image'), 'items');
        $item = DB::transaction(function () use ($r, $data, $themes, $cats) {
            $item = Item::create($data);
            $item->themes()->sync($themes);
            $item->categories()->sync($cats);
            if ($r->has('colors_json')) {
                $this->syncColorVariants($r, $item);
            }
            return $item;
        });
        return response()->json($item->load(['type','collection','themes','categories','variants']), 201);
    }

    public function update(Request $r, Item $item)
    {
        $data = $this->validateData($r);
        $themes = $data['theme_ids'] ?? null; $cats = $data['category_ids'] ?? null;
        unset($data['theme_ids'], $data['category_ids'], $data['colors_json']);
        if ($r->hasFile('image')) $data['image'] = \App\Services\ImageOptimizer::storePublicWebp($r->file('image'), 'items');
        DB::transaction(function () use ($r, $item, $data, $themes, $cats) {
            $item->update($data);
            if ($themes !== null) $item->themes()->sync($themes);
            if ($cats !== null)   $item->categories()->sync($cats);
            if ($r->has('colors_json')) {
                $this->syncColorVariants($r, $item);
            }
        });
        return $item->load(['type','collection','themes','categories','variants']);
    }

    /**
     * Sinkronisasi daftar warna/swatch dari form AdminItems ke tabel furniture_variants.
     * Hanya dijalankan bila request menyertakan field colors_json agar endpoint lain
     * (mis. update internal backoffice) tidak menyentuh varian yang sudah ada.
     */
    private function syncColorVariants(Request $r, Item $item): void
    {
        $raw = $r->input('colors_json');
        $rows = is_string($raw) ? json_decode($raw, true) : (is_array($raw) ? $raw : null);
        if (!is_array($rows)) {
            return;
        }

        $allowedCategories = ['fabric', 'leather', 'wood', 'metal', 'marble', 'other'];
        $existingMap = $item->variants()->get()->keyBy('id');
        $keepIds = [];
        $hasDefault = false;
        $createdOrUpdated = [];

        foreach (array_values($rows) as $idx => $row) {
            if (!is_array($row)) continue;
            $colorName = trim((string) ($row['color_name'] ?? ''));
            if ($colorName === '') continue;

            $rawCode = strtoupper(trim((string) ($row['color_code'] ?? '#D8CFC2')));
            if (!preg_match('/^#([0-9A-F]{3}|[0-9A-F]{6}|[0-9A-F]{8})$/', $rawCode)) {
                $rawCode = '#D8CFC2';
            }

            $category = strtolower(trim((string) ($row['category'] ?? 'fabric')));
            if (!in_array($category, $allowedCategories, true)) {
                $category = 'fabric';
            }

            $materialName = trim((string) ($row['material_name'] ?? ''));
            $isDefault = !empty($row['is_default']) && !$hasDefault;
            if ($isDefault) {
                $hasDefault = true;
            }

            $uploadedImagePath = null;
            $fileKey = !empty($row['image_field']) && is_string($row['image_field'])
                ? $row['image_field']
                : "color_image_{$idx}";
            if ($r->hasFile($fileKey)) {
                $uploaded = $r->file($fileKey);
                if ($uploaded && $uploaded->isValid() && str_starts_with((string) $uploaded->getMimeType(), 'image/')) {
                    $uploadedImagePath = \App\Services\ImageOptimizer::storePublicWebp($uploaded, 'variants');
                }
            }

            $rowId = isset($row['id']) && is_numeric($row['id']) ? (int) $row['id'] : null;
            /** @var FurnitureVariant|null $existing */
            $existing = $rowId ? $existingMap->get($rowId) : null;

            if ($existing) {
                $prevColor = trim((string) ($existing->color_name ?? ''));
                $prevVariantName = trim((string) ($existing->variant_name ?? ''));
                $nextVariantName = ($prevVariantName === '' || $prevVariantName === $prevColor)
                    ? $colorName
                    : $prevVariantName;

                $payload = [
                    'variant_name'  => Str::limit($nextVariantName, 150, ''),
                    'category'      => $category,
                    'color_name'    => Str::limit($colorName, 100, ''),
                    'color_code'    => $rawCode,
                    'material_name' => $materialName !== '' ? Str::limit($materialName, 100, '') : null,
                    'sort_order'    => $idx,
                    'is_active'     => true,
                    'is_default'    => $isDefault,
                ];
                if ($uploadedImagePath !== null) {
                    $payload['furniture_image'] = $uploadedImagePath;
                } elseif (!empty($row['remove_image'])) {
                    $payload['furniture_image'] = null;
                }

                $existing->update($payload);
                $keepIds[] = $existing->id;
                $createdOrUpdated[] = $existing;
            } else {
                $created = FurnitureVariant::create([
                    'item_id'         => $item->id,
                    'variant_name'    => Str::limit($colorName, 150, ''),
                    'category'        => $category,
                    'color_name'      => Str::limit($colorName, 100, ''),
                    'color_code'      => $rawCode,
                    'material_name'   => $materialName !== '' ? Str::limit($materialName, 100, '') : null,
                    'furniture_image' => $uploadedImagePath,
                    'sort_order'      => $idx,
                    'is_active'       => true,
                    'is_default'      => $isDefault,
                ]);
                $keepIds[] = $created->id;
                $createdOrUpdated[] = $created;
            }
        }

        // Hapus warna yang dihapus admin dari daftar
        if (count($keepIds) > 0) {
            $item->variants()->whereNotIn('id', $keepIds)->delete();
        } else {
            $item->variants()->delete();
        }

        // Pastikan tepat 1 warna pertama menjadi default jika belum ada yang ditandai
        if (!$hasDefault && count($createdOrUpdated) > 0) {
            $createdOrUpdated[0]->update(['is_default' => true]);
        }
    }

    public function destroy(Item $item)
    {
        $item->delete();
        return response()->json(['ok' => true]);
    }

    /**
     * Bulk-assign diskon ke beberapa item sekaligus.
     * Jika discount_value <= 0, promo pada item tersebut akan dihapus.
     */
    public function bulkDiscount(Request $r)
    {
        $data = $r->validate([
            'item_ids'         => 'required|array|min:1',
            'item_ids.*'       => 'integer|exists:items,id',
            'discount_type'    => 'nullable|string|in:PERCENTAGE,FIXED_AMOUNT',
            'discount_value'   => 'nullable|numeric|min:0',
            'promo_badge_text' => 'nullable|string|max:100',
            'promo_start_date' => 'nullable|date',
            'promo_end_date'   => 'nullable|date',
        ]);

        $items = Item::whereIn('id', $data['item_ids'])->get();
        $updated = 0;

        foreach ($items as $item) {
            $val = (float) ($data['discount_value'] ?? 0);
            if ($val > 0) {
                $item->is_on_promo = true;
                $item->discount_type = $data['discount_type'] ?? 'PERCENTAGE';
                $item->discount_value = $val;
                $item->promo_badge_text = $data['promo_badge_text'] ?? null;
                $item->promo_start_date = $data['promo_start_date'] ?? null;
                $item->promo_end_date = $data['promo_end_date'] ?? null;
            } else {
                $item->is_on_promo = false;
                $item->discount_type = null;
                $item->discount_value = 0;
                $item->promo_badge_text = null;
                $item->promo_start_date = null;
                $item->promo_end_date = null;
            }
            $item->save(); // hook saving otomatis hitung final_price & is_on_promo
            $updated++;
        }

        return response()->json([
            'ok' => true,
            'updated_count' => $updated,
            'message' => "Berhasil memperbarui promo untuk {$updated} item.",
        ]);
    }

    private function validateData(Request $r)
    {
        return $r->validate([
            'title' => 'required|string|max:200',
            'code' => 'nullable|string|max:100',
            'texture' => 'nullable|string|max:200',
            'finish' => 'nullable|string|max:200',
            'availability' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'type_id' => 'nullable|exists:furniture_types,id',
            'collection_id' => 'nullable|exists:collections,id',
            'theme_ids' => 'nullable|array',
            'theme_ids.*' => 'integer|exists:themes,id',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'integer|exists:categories,id',
            'image' => 'nullable|file|image',
            'stock' => 'nullable|integer|min:0',
            'price' => 'nullable|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'discount_type' => 'nullable|string|in:PERCENTAGE,FIXED_AMOUNT',
            'discount_value' => 'nullable|numeric|min:0',
            'final_price' => 'nullable|numeric|min:0',
            'is_on_promo' => 'nullable|boolean',
            'promo_badge_text' => 'nullable|string|max:100',
            'promo_start_date' => 'nullable|date',
            'promo_end_date' => 'nullable|date',
            'weight_kg' => 'nullable|numeric|min:0',
            'width_cm' => 'nullable|numeric|min:0',
            'depth_cm' => 'nullable|numeric|min:0',
            'height_cm' => 'nullable|numeric|min:0',
            'material_detail' => 'nullable|string',
            'warehouse_note' => 'nullable|string',
            'meta_title' => 'nullable|string|max:70',
            'meta_description' => 'nullable|string|max:180',
            'colors_json' => 'nullable|string',
        ]);
    }

    private function uniqueSlug($title)
    {
        $base = Str::slug($title); $slug = $base; $i = 1;
        while (Item::where('slug',$slug)->exists()) $slug = $base.'-'.$i++;
        return $slug;
    }
}
