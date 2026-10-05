<?php

namespace App\Http\Controllers\Api\Shop;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Item;
use App\Models\StockHold;
use Illuminate\Http\Request;

/** Keranjang server — TIDAK pernah mengirim harga. */
class CartController extends Controller
{
    public function index(Request $request)
    {
        $lines = CartItem::with(['item:id,title,slug,code,image,stock,fulfillment_type,availability', 'variant:id,variant_name,color_name,preview_image,furniture_image'])
            ->where('user_id', $request->user()->id)->latest()->get();

        return response()->json($lines->map(fn ($l) => $this->present($l))->values());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'item_id' => 'required|integer|exists:items,id',
            'variant_id' => 'nullable|integer|exists:furniture_variants,id',
            'quantity' => 'nullable|integer|min:1|max:99',
            'note' => 'nullable|string|max:500',
        ]);
        $item = Item::with('variants')->findOrFail($data['item_id']);
        if ($item->variants()->where('is_active', true)->exists() && empty($data['variant_id'])) {
            return response()->json(['message' => 'Pilih varian terlebih dahulu.', 'code' => 'variant_required'], 422);
        }
        if (!empty($data['variant_id']) && !$item->variants()->whereKey($data['variant_id'])->exists()) {
            return response()->json(['message' => 'Varian tidak cocok dengan produk.'], 422);
        }
        $line = CartItem::firstOrNew([
            'user_id' => $request->user()->id, 'item_id' => $item->id, 'variant_id' => $data['variant_id'] ?? null,
        ]);
        $line->quantity = min(99, ($line->exists ? $line->quantity : 0) + ($data['quantity'] ?? 1));
        if (isset($data['note'])) $line->note = $data['note'];
        $line->selected = true;
        $line->save();

        return response()->json($this->present($line->load(['item', 'variant'])), 201);
    }

    public function update(Request $request, CartItem $cartItem)
    {
        abort_unless($cartItem->user_id === $request->user()->id, 404);
        $cartItem->fill($request->validate([
            'quantity' => 'sometimes|integer|min:1|max:99',
            'note' => 'sometimes|nullable|string|max:500',
            'selected' => 'sometimes|boolean',
        ]))->save();

        return response()->json($this->present($cartItem->load(['item', 'variant'])));
    }

    public function destroy(Request $request, CartItem $cartItem)
    {
        abort_unless($cartItem->user_id === $request->user()->id, 404);
        $cartItem->delete();

        return response()->noContent();
    }

    public function count(Request $request)
    {
        return ['count' => (int) CartItem::where('user_id', $request->user()->id)->sum('quantity')];
    }

    protected function present(CartItem $l): array
    {
        $item = $l->item;
        $avail = $item && ($item->fulfillment_type ?? 'ready_stock') === 'ready_stock' ? StockHold::available($item) : null;

        return [
            'id' => $l->id,
            'quantity' => $l->quantity,
            'note' => $l->note,
            'selected' => $l->selected,
            'item' => $item ? [
                'id' => $item->id, 'title' => $item->title, 'slug' => $item->slug, 'code' => $item->code,
                'image' => $l->variant?->furniture_image ?: $item->image,
                'fulfillment_type' => $item->fulfillment_type ?? 'ready_stock',
            ] : null,
            'variant' => $l->variant ? ['id' => $l->variant->id, 'name' => $l->variant->variant_name, 'color' => $l->variant->color_name] : null,
            // Hanya status, bukan angka stok.
            'availability' => $avail === null ? 'available' : ($avail <= 0 ? 'out_of_stock' : ($avail < $l->quantity ? 'limited' : 'available')),
        ];
    }
}
