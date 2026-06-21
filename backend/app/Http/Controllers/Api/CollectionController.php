<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CollectionController extends Controller
{
    public function index() { return Collection::orderBy('name')->get(); }
    public function show($slug) { return Collection::where('slug',$slug)->with('items')->firstOrFail(); }

    public function store(Request $r) {
        $data = $r->validate(['name'=>'required|string|max:150','description'=>'nullable|string']);
        $data['slug'] = $this->uniqueSlug($data['name']);
        return Collection::create($data);
    }
    public function update(Request $r, Collection $collection) {
        $data = $r->validate(['name'=>'required|string|max:150','description'=>'nullable|string']);
        $collection->update($data);
        return $collection;
    }
    public function destroy(Collection $collection) { $collection->delete(); return ['ok'=>true]; }

    private function uniqueSlug($n){ $b=Str::slug($n);$s=$b;$i=1;while(Collection::where('slug',$s)->exists())$s=$b.'-'.$i++;return $s; }
}
