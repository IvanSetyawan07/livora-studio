<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Scope, FurnitureType, Theme, Category};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
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
        $rules = ['name' => 'required|string|max:100'];
        if ($type === 'furniture-types' && Schema::hasColumn('furniture_types', 'image')) {
            $rules['image'] = 'nullable|string|max:1000';
        }
        $data = $r->validate($rules);
        $base = Str::slug($data['name']); $slug = $base; $i = 1;
        while ($m::where('slug',$slug)->exists()) $slug = $base.'-'.$i++;
        $data['slug'] = $slug;
        return response()->json($m::create($data), 201);
    }
    public function update(Request $r, $type, $id)
    {
        $m = $this->model($type);
        $row = $m::findOrFail($id);
        $rules = ['name' => 'sometimes|required|string|max:100'];
        if ($type === 'furniture-types' && Schema::hasColumn('furniture_types', 'image')) {
            $rules['image'] = 'nullable|string|max:1000';
        }
        $data = $r->validate($rules);
        $row->update($data);
        return $row->fresh();
    }
    public function destroy($type, $id)
    {
        $m = $this->model($type);
        $m::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }
}
