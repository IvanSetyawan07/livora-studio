<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use App\Models\CatalogScene;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CatalogSceneController extends Controller
{
    // GET /catalogs/{catalog}/scenes — public, dipakai halaman detail
    public function index(Catalog $catalog)
    {
        return response()->json($catalog->scenes()->orderBy('order')->get());
    }

    // POST /admin/catalogs/{catalog}/scenes
    public function store(Request $request, Catalog $catalog)
    {
        $validated = $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:8192',
            'alt'   => 'nullable|string|max:255',
        ]);

        $nextOrder = (int) ($catalog->scenes()->max('order') ?? 0) + 1;
        $sceneKey  = $this->nextSceneKey($catalog);

        $path = $request->file('image')->storeAs(
            "catalog/{$catalog->slug}",
            "{$sceneKey}.jpg",
            'public'
        );

        $scene = $catalog->scenes()->create([
            'scene_key' => $sceneKey,
            'image'     => $path,
            'alt'       => $validated['alt'] ?? null,
            'order'     => $nextOrder,
        ]);

        return response()->json($scene, 201);
    }

    // POST/PUT /admin/catalogs/{catalog}/scenes/{scene}
    public function update(Request $request, Catalog $catalog, CatalogScene $scene)
    {
        abort_unless($scene->catalog_id === $catalog->id, 404);

        $validated = $request->validate([
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:8192',
            'alt'   => 'nullable|string|max:255',
            'order' => 'nullable|integer',
        ]);

        if ($request->hasFile('image')) {
            if ($scene->image) {
                Storage::disk('public')->delete($scene->image);
            }
            $validated['image'] = $request->file('image')->storeAs(
                "catalog/{$catalog->slug}",
                "{$scene->scene_key}.jpg",
                'public'
            );
        }

        $scene->update($validated);

        return response()->json($scene);
    }

    // DELETE /admin/catalogs/{catalog}/scenes/{scene}
    public function destroy(Catalog $catalog, CatalogScene $scene)
    {
        abort_unless($scene->catalog_id === $catalog->id, 404);

        if ($scene->image) {
            Storage::disk('public')->delete($scene->image);
        }

        // Hapus hotspot yang nempel di scene ini biar gak jadi data yatim
        $catalog->hotspots()->where('scene_number', $scene->scene_key)->delete();

        $scene->delete();

        return response()->json(null, 204);
    }

    // POST /admin/catalogs/{catalog}/scenes/reorder
    // Body: { order: [{ id, order }, ...] }
    public function reorder(Request $request, Catalog $catalog)
    {
        $validated = $request->validate([
            'order'          => 'required|array',
            'order.*.id'     => 'required|integer|exists:catalog_scenes,id',
            'order.*.order'  => 'required|integer',
        ]);

        foreach ($validated['order'] as $row) {
            $catalog->scenes()->where('id', $row['id'])->update(['order' => $row['order']]);
        }

        return response()->json($catalog->scenes()->orderBy('order')->get());
    }

    private function nextSceneKey(Catalog $catalog): string
    {
        $existing = $catalog->scenes()->pluck('scene_key')->all();
        $i = 1;
        while (in_array("scene-{$i}", $existing, true)) {
            $i++;
        }
        return "scene-{$i}";
    }
}