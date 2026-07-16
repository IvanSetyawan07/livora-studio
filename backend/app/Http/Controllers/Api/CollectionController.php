<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\CollectionStory;
use App\Models\CollectionPackage;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CollectionController extends Controller
{
    public function index() {
        return Collection::orderBy('display_order')->orderBy('name')->get();
    }

    public function show($slug) {
        return Collection::where('slug', $slug)
            ->with([
                'story',
                'packages.items.type',
                'items.type',
            ])
            ->firstOrFail();
    }

    public function store(Request $r) {
        $data = $this->validateData($r);
        $data['slug'] = $this->uniqueSlug($data['name']);
        if ($r->hasFile('hero_banner'))    $data['hero_banner']    = '/storage/'.$r->file('hero_banner')->store('collections','public');
        if ($r->hasFile('card_banner'))    $data['card_banner']    = '/storage/'.$r->file('card_banner')->store('collections','public');
        if ($r->hasFile('featured_image')) $data['featured_image'] = '/storage/'.$r->file('featured_image')->store('collections','public');
        return Collection::create($data);
    }

    public function update(Request $r, Collection $collection) {
        $data = $this->validateData($r);
        if ($r->hasFile('hero_banner'))    $data['hero_banner']    = '/storage/'.$r->file('hero_banner')->store('collections','public');
        if ($r->hasFile('card_banner'))    $data['card_banner']    = '/storage/'.$r->file('card_banner')->store('collections','public');
        if ($r->hasFile('featured_image')) $data['featured_image'] = '/storage/'.$r->file('featured_image')->store('collections','public');
        $collection->update($data);
        return $collection->fresh();
    }

    public function destroy(Collection $collection) {
        $collection->delete();
        return ['ok' => true];
    }

    // ─── STORY ───
    public function storyUpsert(Request $r, Collection $collection) {
        $data = $r->validate([
            'story_description' => 'nullable|string',
            'cta_text' => 'nullable|string|max:100',
            'cta_link' => 'nullable|string|max:255',
            'story_banner' => 'nullable|file|image',
        ]);
        if ($r->hasFile('story_banner')) {
            $data['story_banner'] = '/storage/'.$r->file('story_banner')->store('collections','public');
        }
        $data['collection_id'] = $collection->id;
        $story = CollectionStory::updateOrCreate(['collection_id' => $collection->id], $data);
        return $story;
    }

    // ─── PACKAGES ───
    public function packageStore(Request $r, Collection $collection) {
        $data = $r->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'banner' => 'nullable|file|image',
            'item_ids' => 'nullable|array',
            'item_ids.*' => 'integer|exists:items,id',
        ]);
        $itemIds = $data['item_ids'] ?? [];
        unset($data['item_ids']);
        $data['collection_id'] = $collection->id;
        $data['slug'] = Str::slug($data['name']).'-'.uniqid();
        if ($r->hasFile('banner')) $data['banner'] = '/storage/'.$r->file('banner')->store('collections','public');
        $pkg = CollectionPackage::create($data);
        if ($itemIds) $pkg->items()->sync($itemIds);
        return $pkg->load('items.type');
    }

    public function packageUpdate(Request $r, CollectionPackage $package) {
        $data = $r->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'banner' => 'nullable|file|image',
            'item_ids' => 'nullable|array',
            'item_ids.*' => 'integer|exists:items,id',
        ]);
        $itemIds = $data['item_ids'] ?? null;
        unset($data['item_ids']);
        if ($r->hasFile('banner')) $data['banner'] = '/storage/'.$r->file('banner')->store('collections','public');
        $package->update($data);
        if ($itemIds !== null) $package->items()->sync($itemIds);
        return $package->load('items.type');
    }

    public function packageDestroy(CollectionPackage $package) {
        $package->delete();
        return ['ok' => true];
    }

    private function validateData(Request $r) {
        return $r->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'display_order' => 'nullable|integer',
            'status' => 'nullable|string|in:published,draft',
            'seo_title' => 'nullable|string|max:200',
            'seo_description' => 'nullable|string|max:500',
            'cta_text' => 'nullable|string|max:100',
            'cta_link' => 'nullable|string|max:255',
            'hero_banner' => 'nullable|file|image',
            'card_banner' => 'nullable|file|image',
            'featured_image' => 'nullable|file|image',
        ]);
    }

    private function uniqueSlug($n) {
        $b = Str::slug($n); $s = $b; $i = 1;
        while (Collection::where('slug', $s)->exists()) $s = $b.'-'.$i++;
        return $s;
    }
}
