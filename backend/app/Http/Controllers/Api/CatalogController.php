<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use App\Models\Hotspot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CatalogController extends Controller
{
    /**
     * Display a listing of the resource.
     * GET /api/catalogs?page=1&per_page=12&search=...&category=...&taxonomy=...
     */
    public function index(Request $request)
    {
        $query = Catalog::query();

        // Filter by category
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // Filter by taxonomy
        if ($request->filled('taxonomy')) {
            $query->where('taxonomy', $request->taxonomy);
        }

        // Search by title or slug
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        // Filter featured
        if ($request->filled('featured') && $request->featured === '1') {
            $query->where('featured', true);
        }

        // Pagination
        $per_page = $request->input('per_page', 12);
        $catalogs = $query->orderByDesc('created_at')->paginate($per_page);

        return response()->json([
            'data' => $catalogs->items(),
            'meta' => [
                'current_page' => $catalogs->currentPage(),
                'per_page' => $catalogs->perPage(),
                'total' => $catalogs->total(),
                'last_page' => $catalogs->lastPage(),
            ],
            'links' => [
                'next' => $catalogs->nextPageUrl(),
                'prev' => $catalogs->previousPageUrl(),
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     * POST /api/catalogs
     * Body: FormData dengan title, slug, category, taxonomy, description, images, hotspots
     */
    public function store(Request $request)
    {
        // Validation
        $validated = $request->validate([
            'title' => 'required|string|max:255|unique:catalogs',
            'slug' => 'required|string|max:255|unique:catalogs',
            'category' => 'required|string|max:255',
            'taxonomy' => 'required|string|max:255',
            'description' => 'required|string',
            'featured' => 'nullable|boolean',
            'cover_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'scene_1_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'scene_2_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'hotspots' => 'nullable|json',
        ]);

        try {
            // Upload cover image
            if ($request->hasFile('cover_image')) {
                $path = $request->file('cover_image')->store(
                    "catalog/{$validated['slug']}",
                    'public'
                );
                $validated['cover_image'] = $path;
            }

            // Upload scene images
            foreach (['scene_1_image', 'scene_2_image'] as $field) {
                $sceneKey = str_replace('_image', '', $field);
                if ($request->hasFile($field)) {
                    $path = $request->file($field)->storeAs(
                        "catalog/{$validated['slug']}",
                        "{$sceneKey}.jpg",
                        'public'
                    );
                    $validated[$field] = $path;
                }
            }

            // Create catalog
            $catalog = Catalog::create($validated);

            // Create hotspots if provided
            if ($request->filled('hotspots')) {
                $hotspots = json_decode($request->hotspots, true);
                if (is_array($hotspots)) {
                    foreach ($hotspots as $hotspot) {
                        $catalog->hotspots()->create([
                            'scene_number' => $hotspot['scene_number'] ?? 'scene-1',
                            'label' => $hotspot['label'],
                            'x' => (float) $hotspot['x'],
                            'y' => (float) $hotspot['y'],
                            'item_slug' => $hotspot['item_slug'] ?? null,
                            'description' => $hotspot['description'] ?? null,
                        ]);
                    }
                }
            }

            return response()->json($catalog, 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create catalog',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     * GET /api/catalogs/{id}
     */
    public function show(string $id)
    {
        try {
            $catalog = Catalog::findOrFail($id);
            return response()->json($catalog);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Catalog not found',
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     * PUT /api/catalogs/{id}
     * Body: FormData dengan field yang ingin di-update
     */
    public function update(Request $request, string $id)
    {
        try {
            $catalog = Catalog::findOrFail($id);

            // Validation
            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:255|unique:catalogs,title,' . $id,
                'slug' => 'sometimes|required|string|max:255|unique:catalogs,slug,' . $id,
                'category' => 'sometimes|required|string|max:255',
                'taxonomy' => 'sometimes|required|string|max:255',
                'description' => 'sometimes|required|string',
                'featured' => 'nullable|boolean',
                'cover_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
                'scene_1_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
                'scene_2_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
                'hotspots' => 'nullable|json',
            ]);

            // Handle cover image
            if ($request->hasFile('cover_image')) {
                if ($catalog->cover_image) {
                    Storage::disk('public')->delete($catalog->cover_image);
                }
                $path = $request->file('cover_image')->store(
                    "catalog/{$catalog->slug}",
                    'public'
                );
                $validated['cover_image'] = $path;
            }

            // Handle scene images
            foreach (['scene_1_image', 'scene_2_image'] as $field) {
                if ($request->hasFile($field)) {
                    $sceneKey = str_replace('_image', '', $field);
                    if ($catalog->$field) {
                        Storage::disk('public')->delete($catalog->$field);
                    }
                    $path = $request->file($field)->storeAs(
                        "catalog/{$catalog->slug}",
                        "{$sceneKey}.jpg",
                        'public'
                    );
                    $validated[$field] = $path;
                }
            }

            // Update catalog
            $catalog->update($validated);

            // Update hotspots if provided
            if ($request->filled('hotspots')) {
                // Delete existing hotspots
                $catalog->hotspots()->delete();

                // Create new hotspots
                $hotspots = json_decode($request->hotspots, true);
                if (is_array($hotspots)) {
                    foreach ($hotspots as $hotspot) {
                        $catalog->hotspots()->create([
                            'scene_number' => $hotspot['scene_number'] ?? 'scene-1',
                            'label' => $hotspot['label'],
                            'x' => (float) $hotspot['x'],
                            'y' => (float) $hotspot['y'],
                            'item_slug' => $hotspot['item_slug'] ?? null,
                            'description' => $hotspot['description'] ?? null,
                        ]);
                    }
                }
            }

            return response()->json($catalog);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Catalog not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update catalog',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * DELETE /api/catalogs/{id}
     */
    public function destroy(string $id)
    {
        try {
            $catalog = Catalog::findOrFail($id);

            // Delete images from storage
            if ($catalog->cover_image && Storage::disk('public')->exists($catalog->cover_image)) {
                Storage::disk('public')->delete($catalog->cover_image);
            }
            if ($catalog->scene_1_image && Storage::disk('public')->exists($catalog->scene_1_image)) {
                Storage::disk('public')->delete($catalog->scene_1_image);
            }
            if ($catalog->scene_2_image && Storage::disk('public')->exists($catalog->scene_2_image)) {
                Storage::disk('public')->delete($catalog->scene_2_image);
            }

            // Delete entire catalog folder
            if (Storage::disk('public')->exists("catalog/{$catalog->slug}")) {
                Storage::disk('public')->deleteDirectory("catalog/{$catalog->slug}");
            }

            // Delete hotspots (cascade by default, but explicit delete)
            $catalog->hotspots()->delete();

            // Delete catalog
            $catalog->delete();

            return response()->json(null, 204);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Catalog not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete catalog',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}