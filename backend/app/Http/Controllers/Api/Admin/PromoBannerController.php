<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PromoBanner;
use App\Services\ImageOptimizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PromoBannerController extends Controller
{
    public function index(): JsonResponse
    {
        $banners = PromoBanner::orderBy('order_index', 'asc')
            ->orderByDesc('id')
            ->get();

        return response()->json($banners);
    }

    public function show(PromoBanner $promoBanner): JsonResponse
    {
        return response()->json($promoBanner);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request, isUpdate: false);

        if ($request->hasFile('image')) {
            $data['image_url'] = ImageOptimizer::storePublicWebp($request->file('image'), 'promo_banners');
        } elseif ($request->filled('image_url')) {
            $data['image_url'] = $request->input('image_url');
        } else {
            return response()->json(['message' => 'Gambar banner promo wajib diunggah.'], 422);
        }

        $banner = PromoBanner::create($data);

        return response()->json($banner, 201);
    }

    public function update(Request $request, PromoBanner $promoBanner): JsonResponse
    {
        $data = $this->validatePayload($request, isUpdate: true);

        if ($request->hasFile('image')) {
            $data['image_url'] = ImageOptimizer::storePublicWebp($request->file('image'), 'promo_banners');
        } elseif ($request->filled('image_url')) {
            $data['image_url'] = $request->input('image_url');
        }

        $promoBanner->update($data);

        return response()->json($promoBanner);
    }

    public function toggleActive(PromoBanner $promoBanner): JsonResponse
    {
        $promoBanner->is_active = !$promoBanner->is_active;
        $promoBanner->save();

        return response()->json([
            'ok' => true,
            'is_active' => $promoBanner->is_active,
            'banner' => $promoBanner,
        ]);
    }

    public function destroy(PromoBanner $promoBanner): JsonResponse
    {
        $promoBanner->delete();

        return response()->json(['ok' => true]);
    }

    private function validatePayload(Request $request, bool $isUpdate = false): array
    {
        return $request->validate([
            'title'       => ($isUpdate ? 'sometimes|' : 'required|') . 'string|max:255',
            'subtitle'    => 'nullable|string|max:255',
            'label'       => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'image'       => 'nullable|file|image|max:12288', // maks 12MB
            'image_url'   => 'nullable|string|max:500',
            'cta_text'    => 'nullable|string|max:100',
            'cta_link'    => 'nullable|string|max:255',
            'order_index' => 'nullable|integer|min:0',
            'is_active'   => 'nullable|boolean',
            'start_date'  => 'nullable|date',
            'end_date'    => 'nullable|date',
        ]);
    }
}
