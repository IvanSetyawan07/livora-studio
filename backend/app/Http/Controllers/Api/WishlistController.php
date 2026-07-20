<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Wishlist;
use App\Models\Item;
use App\Models\Collection;
use App\Models\Project;
use App\Models\Catalog;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    /**
     * List semua wishlist user, sudah di-load detail entity aslinya
     * (nama, gambar, slug) supaya frontend tidak perlu fetch berkali-kali.
     */
    public function index(Request $request)
    {
        $items = Wishlist::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return $items->map(function (Wishlist $w) {
            $entity = $this->resolveEntity($w->wishlistable_type, $w->wishlistable_id);
            return [
                'id'   => $w->id,
                'type' => $w->wishlistable_type,
                'entity_id' => $w->wishlistable_id,
                'entity' => $entity,
                'created_at' => $w->created_at,
            ];
        })->filter(fn ($row) => $row['entity'] !== null)->values();
    }

    /**
     * Tambah ke wishlist. Kalau sudah ada (unique constraint), abaikan
     * silently supaya tombol "add to wishlist" idempotent.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|string|in:' . implode(',', Wishlist::TYPES),
            'id'   => 'required|integer',
        ]);

        $wishlist = Wishlist::firstOrCreate([
            'user_id'           => $request->user()->id,
            'wishlistable_type' => $data['type'],
            'wishlistable_id'   => $data['id'],
        ]);

        return response()->json($wishlist, 201);
    }

    /**
     * Hapus dari wishlist berdasarkan type + entity id (bukan wishlist row id),
     * supaya tombol "remove" di halaman produk bisa langsung tau tanpa
     * perlu tau id row wishlist-nya.
     */
    public function destroy(Request $request, string $type, int $id)
    {
        Wishlist::where('user_id', $request->user()->id)
            ->where('wishlistable_type', $type)
            ->where('wishlistable_id', $id)
            ->delete();

        return response()->json(['message' => 'Removed from wishlist']);
    }

    private function resolveEntity(string $type, int $id): ?array
    {
        $model = match ($type) {
            'item'       => Item::find($id),
            'collection' => Collection::find($id),
            'project'    => Project::find($id),
            'catalog'    => Catalog::find($id),
            default      => null,
        };

        if (!$model) return null;

        // Sesuaikan field ini kalau nama kolom di masing-masing tabel beda
        // (mis. thumbnail vs cover_image). Cek dulu sebelum pakai di production.
        return [
            'id'    => $model->id,
            'name'  => $model->name ?? $model->title ?? null,
            'slug'  => $model->slug ?? null,
            'image' => $model->thumbnail ?? $model->cover_image ?? null,
        ];
    }
}