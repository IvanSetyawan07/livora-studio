<?php

namespace App\Http\Controllers\Api;  

use App\Http\Controllers\Controller;
use App\Models\FurnitureVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VariantController extends Controller
{
    public function index($itemId)
    {
        return FurnitureVariant::where('item_id', $itemId)
            ->orderBy('sort_order')
            ->get();
    }

    public function store(Request $request, $itemId)
    {
        $data = $request->validate([
            'variant_name'    => 'required|string|max:255',
            'category'        => 'required|in:fabric,leather,wood,metal,marble,other',
            'color_name'      => 'nullable|string|max:255',
            'color_code'      => 'nullable|string|max:9',
            'material_name'   => 'nullable|string|max:255',
            'description'     => 'nullable|string',
            'sort_order'      => 'integer',
            'is_active'       => 'boolean',
            'is_default'      => 'boolean',
            'preview_image'   => 'nullable|image|max:5120',
            'furniture_image' => 'nullable|image|max:5120',
        ]);

        $data['item_id'] = $itemId;

        if ($request->hasFile('preview_image')) {
            $data['preview_image'] = $request->file('preview_image')
                ->store('variants/preview', 'public');
        }

        if ($request->hasFile('furniture_image')) {
            $data['furniture_image'] = $request->file('furniture_image')
                ->store('variants/furniture', 'public');
        }

        // Ensure only ONE default per item
        if (!empty($data['is_default'])) {
            FurnitureVariant::where('item_id', $itemId)
                ->update(['is_default' => false]);
        }

        $variant = FurnitureVariant::create($data);

        return response()->json($variant, 201);
    }

    public function update(Request $request, $itemId, $variantId)
    {
        $variant = FurnitureVariant::where('item_id', $itemId)
            ->findOrFail($variantId);

        $data = $request->validate([
            'variant_name'    => 'sometimes|required|string|max:255',
            'category'        => 'sometimes|required|in:fabric,leather,wood,metal,marble,other',
            'color_name'      => 'nullable|string|max:255',
            'color_code'      => 'nullable|string|max:9',
            'material_name'   => 'nullable|string|max:255',
            'description'     => 'nullable|string',
            'sort_order'      => 'integer',
            'is_active'       => 'boolean',
            'is_default'      => 'boolean',
            'preview_image'   => 'nullable|image|max:5120',
            'furniture_image' => 'nullable|image|max:5120',
        ]);

        if ($request->hasFile('preview_image')) {
            if ($variant->preview_image) {
                Storage::disk('public')->delete($variant->preview_image);
            }
            $data['preview_image'] = $request->file('preview_image')
                ->store('variants/preview', 'public');
        }

        if ($request->hasFile('furniture_image')) {
            if ($variant->furniture_image) {
                Storage::disk('public')->delete($variant->furniture_image);
            }
            $data['furniture_image'] = $request->file('furniture_image')
                ->store('variants/furniture', 'public');
        }

        // Ensure only ONE default per item
        if (!empty($data['is_default'])) {
            FurnitureVariant::where('item_id', $itemId)
                ->where('id', '!=', $variant->id)
                ->update(['is_default' => false]);
        }

        $variant->update($data);

        return response()->json($variant);
    }

    public function destroy($itemId, $variantId)
    {
        $variant = FurnitureVariant::where('item_id', $itemId)
            ->findOrFail($variantId);

        if ($variant->preview_image) {
            Storage::disk('public')->delete($variant->preview_image);
        }
        if ($variant->furniture_image) {
            Storage::disk('public')->delete($variant->furniture_image);
        }

        $variant->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
