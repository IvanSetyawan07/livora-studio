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
        return $q->orderByDesc('id')->get();
    }

    public function show($slug)
    {
        $item = Item::with([
            'type','collection','themes','categories',
            'variants.gallery','gallery','lifestyle',
            'story.cards',
        ])->where('slug',$slug)->firstOrFail();

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
        if ($r->hasFile('image')) $data['image'] = '/storage/'.$r->file('image')->store('items','public');
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
        if ($r->hasFile('image')) $data['image'] = '/storage/'.$r->file('image')->store('items','public');
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
        ]);
    }

    private function uniqueSlug($title)
    {
        $base = Str::slug($title); $slug = $base; $i = 1;
        while (Item::where('slug',$slug)->exists()) $slug = $base.'-'.$i++;
        return $slug;
    }
}
