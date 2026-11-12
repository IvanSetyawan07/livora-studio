<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\WishlistFollowUp;
use App\Models\Wishlist;
use App\Models\Item;
use App\Models\Collection;
use App\Models\Project;
use App\Models\Catalog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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

        $entityMap = $this->resolveEntitiesBatch($items);

        return $items->map(function (Wishlist $w) use ($entityMap) {
            $entity = $entityMap[$w->wishlistable_type . ':' . $w->wishlistable_id] ?? null;
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

    private function formatEntityModel($model): array
    {
        return [
            'id'    => $model->id,
            'name'  => $model->name ?? $model->title ?? null,
            'slug'  => $model->slug ?? null,
            'image' => $model->thumbnail ?? $model->image ?? $model->cover_image ?? $model->card_banner ?? $model->hero_image ?? null,
        ];
    }

    /**
     * Batch-resolve wishlist entities by type to eliminate N+1 queries.
     *
     * @param \Illuminate\Support\Collection<int, Wishlist> $rows
     * @return array<string, array>
     */
    private function resolveEntitiesBatch($rows): array
    {
        $byType = $rows->groupBy('wishlistable_type');
        $map = [];

        foreach ($byType as $type => $group) {
            $ids = $group->pluck('wishlistable_id')->unique()->values()->all();
            if (!$ids) continue;

            $models = match ($type) {
                'item'       => Item::whereIn('id', $ids)->get(),
                'collection' => Collection::whereIn('id', $ids)->get(),
                'project'    => Project::whereIn('id', $ids)->get(),
                'catalog'    => Catalog::whereIn('id', $ids)->get(),
                default      => collect(),
            };

            foreach ($models as $m) {
                $map[$type . ':' . $m->id] = $this->formatEntityModel($m);
            }
        }

        return $map;
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

        return $this->formatEntityModel($model);
    }

    /**
     * Admin: list semua user yang punya wishlist, di-group per user.
     */
    public function adminIndex()
    {
        $rows = Wishlist::with('user:id,name,email,phone')
            ->orderByDesc('created_at')
            ->get();

        $entityMap = $this->resolveEntitiesBatch($rows);

        $grouped = $rows->groupBy('user_id')->map(function ($items, $userId) use ($entityMap) {
            $user = $items->first()->user;
            if (!$user) return null;
            $resolved = $items->map(function (Wishlist $w) use ($entityMap) {
                return [
                    'id'         => $w->id,
                    'type'       => $w->wishlistable_type,
                    'entity_id'  => $w->wishlistable_id,
                    'entity'     => $entityMap[$w->wishlistable_type . ':' . $w->wishlistable_id] ?? null,
                    'created_at' => $w->created_at,
                ];
            })->filter(fn ($r) => $r['entity'] !== null)->values();
            return [
                'user'  => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                ],
                'count' => $resolved->count(),
                'items' => $resolved,
                'last_added' => $items->max('created_at'),
            ];
        })->filter()->values();

        return $grouped;
    }

    /**
     * Admin: kirim email follow-up ke user tentang wishlist mereka.
     */
    public function adminMessage(Request $request, User $user)
    {
        $data = $request->validate([
            'subject' => 'nullable|string|max:200',
            'message' => 'required|string',
        ]);

        // FIX: sertakan 'image' (di-absolutkan) supaya email follow-up
        // bisa menampilkan gambar item yang disimpan user.
        $wishlistRows = Wishlist::where('user_id', $user->id)->get();
        $entityMap = $this->resolveEntitiesBatch($wishlistRows);
        $items = $wishlistRows->map(function (Wishlist $w) use ($entityMap) {
            $e = $entityMap[$w->wishlistable_type . ':' . $w->wishlistable_id] ?? null;
            return [
                'name'  => $e['name'] ?? 'Item',
                'type'  => $w->wishlistable_type,
                'image' => $this->absoluteImageUrl($e['image'] ?? null),
            ];
        })->toArray();

        try {
            Mail::to($user->email)->send(new WishlistFollowUp(
                $user->name ?? 'there',
                $data['message'],
                $items,
                $data['subject'] ?? null,
            ));
        } catch (\Throwable $e) {
            Log::error('WishlistFollowUp failed: ' . $e->getMessage());
            return response()->json(['message' => 'Email gagal dikirim', 'error' => $e->getMessage()], 500);
        }

        return response()->json(['message' => 'Email terkirim ke ' . $user->email]);
    }

    /**
     * Replikasi logic imgUrl() di frontend (src/lib/adminApi.ts) supaya
     * gambar di email (dibuka lewat mail client, bukan lewat React app)
     * tetap resolve ke URL absolut yang benar.
     *
     * PENTING: pastikan config('app.url') / APP_URL di .env Laravel
     * memang di-set ke domain API yang benar (mis. https://api.livoralcr.com),
     * kalau tidak, gambar di email akan broken.
     */
    private function absoluteImageUrl(?string $path): ?string
    {
        if (!$path) return null;
        if (str_starts_with($path, 'http')) return $path;

        $origin = rtrim(config('app.url'), '/');

        if (str_starts_with($path, '/seed/')) {
            return $origin . $path;
        }

        $clean = str_starts_with($path, '/') ? $path : '/' . $path;
        if (str_starts_with($clean, '/storage/')) {
            return $origin . $clean;
        }
        return $origin . '/storage' . $clean;
    }
}