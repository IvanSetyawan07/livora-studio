<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\AI\BrandVideoRecommendationService;
use Illuminate\Http\Request;

/**
 * Content Inspiration & Brand Video Recommender — analisis traffic video Livora
 * di Instagram, YouTube, dan TikTok, lalu hasilkan saran video referensi
 * lintas platform yang sesuai brand identity Livora beserta alasan,
 * deskripsi, tautan nyata, dan konsep produksi siap simpan ke Content Queue.
 */
class ContentInspirationController extends Controller
{
    public function __construct(private BrandVideoRecommendationService $recommender)
    {
    }

    /** GET /api/ai/content/inspiration/library — video & ringkasan traffic akun Livora (IG + YT + TikTok). */
    public function library()
    {
        return response()->json($this->recommender->library());
    }

    /** POST /api/ai/content/inspiration/analyze — generate saran video lintas platform berbasis brand identity Livora & traffic. */
    public function analyze(Request $request)
    {
        $data = $request->validate([
            'query' => ['nullable', 'string', 'min:3', 'max:160'],
            'mode' => ['nullable', 'string', 'in:auto_brand,topic'],
            'platforms' => ['nullable', 'array', 'max:3'],
            'platforms.*' => ['string', 'in:instagram,youtube,tiktok'],
            'sourceTitle' => ['nullable', 'string', 'max:200'],
            'sourcePlatform' => ['nullable', 'string', 'in:instagram,youtube,tiktok'],
            'sourceViews' => ['nullable', 'integer', 'min:0'],
            'sourceEngagementRate' => ['nullable', 'numeric', 'min:0'],
            'sourceUrl' => ['nullable', 'string', 'max:500'],
        ]);

        return response()->json($this->recommender->recommend($data));
    }
}
