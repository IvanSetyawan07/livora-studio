<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\FurnitureVariant;
use App\Models\FurnitureGallery;
use App\Models\FurnitureLifestyle;
use App\Models\FurnitureStory;
use App\Models\FurnitureStoryCard;
use Illuminate\Http\Request;

class FurnitureExperienceController extends Controller
{
    // ---------- VARIANTS ----------
    public function variantsIndex(Item $item) { return $item->variants()->with('gallery')->get(); }

    public function variantStore(Request $r, Item $item) {
        $data = $this->validateVariant($r);
        if ($r->hasFile('preview_image')) $data['preview_image'] = '/storage/'.$r->file('preview_image')->store('variants','public');
        if ($r->hasFile('furniture_image')) $data['furniture_image'] = '/storage/'.$r->file('furniture_image')->store('variants','public');
        $data['item_id'] = $item->id;
        return FurnitureVariant::create($data);
    }
    public function variantUpdate(Request $r, FurnitureVariant $variant) {
        $data = $this->validateVariant($r);
        if ($r->hasFile('preview_image')) $data['preview_image'] = '/storage/'.$r->file('preview_image')->store('variants','public');
        if ($r->hasFile('furniture_image')) $data['furniture_image'] = '/storage/'.$r->file('furniture_image')->store('variants','public');
        $variant->update($data);
        return $variant;
    }
    public function variantDestroy(FurnitureVariant $variant) { $variant->delete(); return ['ok'=>true]; }

    private function validateVariant(Request $r) {
        return $r->validate([
            'variant_name'=>'required|string|max:150',
            'category'=>'required|string|in:fabric,leather,wood,metal,marble,other',
            'color_name'=>'nullable|string|max:100',
            'material_name'=>'nullable|string|max:100',
            'description'=>'nullable|string',
            'sort_order'=>'nullable|integer',
            'is_active'=>'nullable|boolean',
            'preview_image'=>'nullable|file|image|max:20480',
            'furniture_image'=>'nullable|file|image|max:20480',
        ]);
    }

    // ---------- GALLERY ----------
    public function galleryIndex(Item $item) { return $item->gallery()->get(); }

    public function galleryStore(Request $r, Item $item) {
        $data = $r->validate([
            'variant_id'=>'nullable|integer|exists:furniture_variants,id',
            'title'=>'nullable|string|max:200',
            'alt_text'=>'nullable|string|max:200',
            'sort_order'=>'nullable|integer',
            'image'=>'required|file|image|max:20480',
        ]);
        $data['image'] = '/storage/'.$r->file('image')->store('gallery','public');
        $data['item_id'] = $item->id;
        return FurnitureGallery::create($data);
    }
    public function galleryUpdate(Request $r, FurnitureGallery $gallery) {
        $data = $r->validate([
            'variant_id'=>'nullable|integer|exists:furniture_variants,id',
            'title'=>'nullable|string|max:200',
            'alt_text'=>'nullable|string|max:200',
            'sort_order'=>'nullable|integer',
            'image'=>'nullable|file|image|max:20480',
        ]);
        if ($r->hasFile('image')) $data['image'] = '/storage/'.$r->file('image')->store('gallery','public');
        $gallery->update($data);
        return $gallery;
    }
    public function galleryDestroy(FurnitureGallery $gallery) { $gallery->delete(); return ['ok'=>true]; }

    public function galleryReorder(Request $r, Item $item) {
        $data = $r->validate(['order'=>'required|array','order.*'=>'integer']);
        foreach ($data['order'] as $i => $id) {
            FurnitureGallery::where('id',$id)->where('item_id',$item->id)->update(['sort_order'=>$i]);
        }
        return ['ok'=>true];
    }

    // ---------- LIFESTYLE ----------
    public function lifestyleIndex(Item $item) { return $item->lifestyle()->get(); }

    public function lifestyleStore(Request $r, Item $item) {
        $data = $this->validateLifestyle($r);
        $data['image'] = '/storage/'.$r->file('image')->store('lifestyle','public');
        $data['item_id'] = $item->id;
        return FurnitureLifestyle::create($data);
    }
    public function lifestyleUpdate(Request $r, FurnitureLifestyle $lifestyle) {
        $data = $this->validateLifestyle($r, false);
        if ($r->hasFile('image')) $data['image'] = '/storage/'.$r->file('image')->store('lifestyle','public');
        $lifestyle->update($data);
        return $lifestyle;
    }
    public function lifestyleDestroy(FurnitureLifestyle $lifestyle) { $lifestyle->delete(); return ['ok'=>true]; }

    private function validateLifestyle(Request $r, bool $imageRequired = true) {
        return $r->validate([
            'image' => ($imageRequired ? 'required' : 'nullable').'|file|image|max:20480',
            'caption' => 'nullable|string',
            'layout_type' => 'nullable|string|in:full,half,masonry,custom',
            'width_percentage' => 'nullable|integer|min:10|max:100',
            'sort_order' => 'nullable|integer',
        ]);
    }

    // ---------- STORY ----------
    public function storyShow(Item $item) { return $item->story()->with('cards')->first(); }

    public function storyUpsert(Request $r, Item $item) {
        $data = $r->validate([
            'title' => 'nullable|string|max:200',
            'description' => 'nullable|string',
            'feature_image' => 'nullable|file|image|max:20480',
        ]);
        if ($r->hasFile('feature_image')) $data['feature_image'] = '/storage/'.$r->file('feature_image')->store('stories','public');
        $story = $item->story ?: new FurnitureStory(['item_id' => $item->id]);
        $story->fill($data)->save();
        return $story->load('cards');
    }

    public function cardStore(Request $r, FurnitureStory $story) {
        $data = $r->validate([
            'title'=>'required|string|max:200',
            'description'=>'nullable|string',
            'icon'=>'nullable|string|max:100',
            'sort_order'=>'nullable|integer',
        ]);
        $data['story_id'] = $story->id;
        return FurnitureStoryCard::create($data);
    }
    public function cardUpdate(Request $r, FurnitureStoryCard $card) {
        $data = $r->validate([
            'title'=>'required|string|max:200',
            'description'=>'nullable|string',
            'icon'=>'nullable|string|max:100',
            'sort_order'=>'nullable|integer',
        ]);
        $card->update($data);
        return $card;
    }
    public function cardDestroy(FurnitureStoryCard $card) { $card->delete(); return ['ok'=>true]; }
}
