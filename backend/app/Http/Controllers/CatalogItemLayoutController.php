<?php

namespace App\Http\Controllers\Api;

use App\Models\Catalog;
use App\Models\CatalogItemLayout;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;

class CatalogItemLayoutController extends Controller
{
    /**
     * GET /api/catalogs/{catalog}/item-layouts (public)
     */
    public function index(Catalog $catalog)
    {
        return response()->json($catalog->itemLayouts()->get());
    }

    /**
     * POST /api/admin/catalogs/{catalog}/item-layouts (admin)
     * Body: { layouts: [{ item_slug, pos_x, pos_y, width, height }] }
     */
    public function save(Request $request, Catalog $catalog)
    {
        $validated = $request->validate([
            'layouts' => 'required|array',
            'layouts.*.item_slug' => 'required|string',
            'layouts.*.pos_x' => 'required|integer|min:0',
            'layouts.*.pos_y' => 'required|integer|min:0',
            'layouts.*.width' => 'required|integer|min:1|max:4',
            'layouts.*.height' => 'required|integer|min:1|max:3',
        ]);

        DB::transaction(function () use ($catalog, $validated) {
            foreach ($validated['layouts'] as $layout) {
                CatalogItemLayout::updateOrCreate(
                    ['catalog_id' => $catalog->id, 'item_slug' => $layout['item_slug']],
                    [
                        'pos_x' => $layout['pos_x'],
                        'pos_y' => $layout['pos_y'],
                        'width' => $layout['width'],
                        'height' => $layout['height'],
                    ]
                );
            }
        });

        return response()->json(['message' => 'Layout saved']);
    }
}