<?php

namespace App\Http\Controllers\Api;

use App\Models\Catalog;
use App\Models\Hotspot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;

class HotspotController extends Controller
{
    /**
     * Get all hotspots for a catalog
     * GET /api/catalogs/{catalogId}/hotspots
     */
    public function index(Catalog $catalog)
    {
        $hotspots = $catalog->hotspots()->orderBy('scene_number')->orderBy('created_at')->get();
        return response()->json($hotspots);
    }

    /**
     * Get hotspots for a specific scene
     * GET /api/catalogs/{catalogId}/hotspots/{scene}
     * Example: GET /api/catalogs/1/hotspots/scene-1
     */
    public function getByScene(Catalog $catalog, string $scene)
    {
        try {
            $hotspots = $catalog->hotspots()
                ->where('scene_number', $scene)
                ->orderBy('created_at')
                ->get();

            return response()->json($hotspots);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch hotspots',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create a new hotspot
     * POST /api/catalogs/{catalogId}/hotspots
     * Body: {
     *   scene_number: "scene-1",
     *   label: "Lounge Chair",
     *   x: 28.5,
     *   y: 55.0,
     *   item_slug: "lounge-chair-oslo" (optional),
     *   description: "..." (optional)
     * }
     */
    public function store(Request $request, Catalog $catalog)
    {
        // Validation
        $validated = $request->validate([
            'scene_number' => ['required', 'string', 'regex:/^scene-\d+$/'],
            'label' => 'required|string|max:255',
            'x' => 'required|numeric|min:0|max:100',
            'y' => 'required|numeric|min:0|max:100',
            'item_slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        try {
            // Create hotspot
            $hotspot = $catalog->hotspots()->create([
                'scene_number' => $validated['scene_number'],
                'label' => $validated['label'],
                'x' => (float) $validated['x'],
                'y' => (float) $validated['y'],
                'item_slug' => $validated['item_slug'] ?? null,
                'description' => $validated['description'] ?? null,
            ]);

            return response()->json($hotspot, 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create hotspot',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get a specific hotspot
     * GET /api/catalogs/{catalogId}/hotspots/{id}
     */
    public function show(Catalog $catalog, string $id)
    {
        try {
            $hotspot = Hotspot::where('catalog_id', $catalog->id)
                ->findOrFail($id);

            return response()->json($hotspot);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Hotspot not found',
            ], 404);
        }
    }

    /**
     * Update a hotspot
     * PUT /api/catalogs/{catalogId}/hotspots/{id}
     * Body: { label, x, y, item_slug, description } (any field optional)
     */
    public function update(Request $request, Catalog $catalog, string $id)
    {
        // Validation
        $validated = $request->validate([
            'scene_number' => ['sometimes', 'string', 'regex:/^scene-\d+$/'],
            'label' => 'sometimes|string|max:255',
            'x' => 'sometimes|numeric|min:0|max:100',
            'y' => 'sometimes|numeric|min:0|max:100',
            'item_slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        try {
            // Find hotspot (ensure it belongs to this catalog)
            $hotspot = Hotspot::where('catalog_id', $catalog->id)
                ->findOrFail($id);

            // Convert x,y to float if provided
            if (isset($validated['x'])) {
                $validated['x'] = (float) $validated['x'];
            }
            if (isset($validated['y'])) {
                $validated['y'] = (float) $validated['y'];
            }

            // Update hotspot
            $hotspot->update($validated);

            return response()->json($hotspot);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Hotspot not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update hotspot',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a hotspot
     * DELETE /api/catalogs/{catalogId}/hotspots/{id}
     */
    public function destroy(Catalog $catalog, string $id)
    {
        try {
            $hotspot = Hotspot::where('catalog_id', $catalog->id)
                ->findOrFail($id);

            $hotspot->delete();

            return response()->json(null, 204);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Hotspot not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete hotspot',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Batch update/create hotspots
     * POST /api/catalogs/{catalogId}/hotspots/batch
     * Body: { hotspots: [...] }
     */
    public function batch(Request $request, Catalog $catalog)
    {
        $validated = $request->validate([
            'hotspots' => 'required|array',
            'hotspots.*.scene_number' => 'required|string',
            'hotspots.*.label' => 'required|string',
            'hotspots.*.x' => 'required|numeric|min:0|max:100',
            'hotspots.*.y' => 'required|numeric|min:0|max:100',
            'hotspots.*.item_slug' => 'nullable|string',
            'hotspots.*.description' => 'nullable|string',
        ]);

        try {
            // Delete existing hotspots
            $catalog->hotspots()->delete();

            // Create new hotspots
            $created = [];
            foreach ($validated['hotspots'] as $hotspotData) {
                $hotspot = $catalog->hotspots()->create([
                    'scene_number' => $hotspotData['scene_number'],
                    'label' => $hotspotData['label'],
                    'x' => (float) $hotspotData['x'],
                    'y' => (float) $hotspotData['y'],
                    'item_slug' => $hotspotData['item_slug'] ?? null,
                    'description' => $hotspotData['description'] ?? null,
                ]);
                $created[] = $hotspot;
            }

            return response()->json($created, 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to batch update hotspots',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
