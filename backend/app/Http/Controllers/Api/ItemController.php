<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ItemController extends Controller
{
    public function index(Request $r)
    {
        $q = Item::with(['type','collection','themes','categories']);
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
            $related = Item::with('type')
                ->where('collection_id', $item->collection_id)
                ->where('id','!=',$item->id)
                ->limit(8)->get();
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
        unset($data['theme_ids'], $data['category_ids']);
        $data['slug'] = $this->uniqueSlug($data['title']);
        if ($r->hasFile('image')) $data['image'] = \App\Services\ImageOptimizer::storePublicWebp($r->file('image'), 'items');
        $item = Item::create($data);
        $item->themes()->sync($themes);
        $item->categories()->sync($cats);
        return response()->json($item->load(['type','collection','themes','categories']), 201);
    }

    public function update(Request $r, Item $item)
    {
        $data = $this->validateData($r);
        $themes = $data['theme_ids'] ?? null; $cats = $data['category_ids'] ?? null;
        unset($data['theme_ids'], $data['category_ids']);
        if ($r->hasFile('image')) $data['image'] = \App\Services\ImageOptimizer::storePublicWebp($r->file('image'), 'items');
        $item->update($data);
        if ($themes !== null) $item->themes()->sync($themes);
        if ($cats !== null)   $item->categories()->sync($cats);
        return $item->load(['type','collection','themes','categories']);
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
                $item->discount_type = $data['discount_type'] ?? 'PERCENTAGE';
                $item->discount_value = $val;
                $item->promo_badge_text = $data['promo_badge_text'] ?? null;
                $item->promo_start_date = $data['promo_start_date'] ?? null;
                $item->promo_end_date = $data['promo_end_date'] ?? null;
            } else {
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
        ]);
    }

    private function uniqueSlug($title)
    {
        $base = Str::slug($title); $slug = $base; $i = 1;
        while (Item::where('slug',$slug)->exists()) $slug = $base.'-'.$i++;
        return $slug;
    }
}
