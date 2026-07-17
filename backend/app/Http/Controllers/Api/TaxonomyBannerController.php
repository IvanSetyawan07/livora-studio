<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaxonomyBanner;
use Illuminate\Http\Request;

class TaxonomyBannerController extends Controller
{
    public function index()
    {
        $banners = TaxonomyBanner::orderBy('taxonomy_key')->orderBy('position')->get();
        $grouped = $banners->groupBy('taxonomy_key');
        return response()->json($grouped);
    }

    public function byKey(string $key)
    {
        $banners = TaxonomyBanner::where('taxonomy_key', $key)
            ->orderBy('position')
            ->get();
        return response()->json($banners);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'taxonomy_key' => 'required|string|max:255',
            'image' => 'required|string',
            'path' => 'nullable|string',
            'title' => 'nullable|string|max:255',
        ]);

        $maxPosition = TaxonomyBanner::where('taxonomy_key', $validated['taxonomy_key'])->max('position');
        $validated['position'] = ($maxPosition ?? -1) + 1;

        $banner = TaxonomyBanner::create($validated);
        return response()->json($banner, 201);
    }

    public function update(Request $request, TaxonomyBanner $banner)
    {
        $validated = $request->validate([
            'image' => 'sometimes|string',
            'path' => 'nullable|string',
            'title' => 'nullable|string|max:255',
        ]);
        $banner->update($validated);
        return response()->json($banner);
    }

    public function destroy(TaxonomyBanner $banner)
    {
        $banner->delete();
        return response()->json(null, 204);
    }
}
