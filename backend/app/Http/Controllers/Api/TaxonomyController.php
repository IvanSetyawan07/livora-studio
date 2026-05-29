<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Scope, FurnitureType, Theme, Category};
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TaxonomyController extends Controller
{
    private function model($type)
    {
        return match($type) {
            'scopes' => Scope::class,
            'furniture-types' => FurnitureType::class,
            'themes' => Theme::class,
            'categories' => Category::class,
            default => abort(404),
        };
    }

    public function index($type)        { $m = $this->model($type); return $m::orderBy('name')->get(); }
    public function store(Request $r, $type)
    {
        $m = $this->model($type);
        $data = $r->validate(['name' => 'required|string|max:100']);
        $base = Str::slug($data['name']); $slug = $base; $i = 1;
        while ($m::where('slug',$slug)->exists()) $slug = $base.'-'.$i++;
        $data['slug'] = $slug;
        return response()->json($m::create($data), 201);
    }
    public function update(Request $r, $type, $id)
    {
        $m = $this->model($type);
        $row = $m::findOrFail($id);
        $data = $r->validate(['name' => 'required|string|max:100']);
        $row->update($data);
        return $row;
    }
    public function destroy($type, $id)
    {
        $m = $this->model($type);
        $m::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }
}
