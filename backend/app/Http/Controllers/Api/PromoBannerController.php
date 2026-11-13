<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PromoBanner;
use Illuminate\Http\JsonResponse;

class PromoBannerController extends Controller
{
    /**
     * Mengambil daftar banner promo aktif yang sedang dalam periode tayang
     * untuk ditampilkan di homepage (pop-up modal) dan halaman promo.
     */
    public function publicBanners(): JsonResponse
    {
        $banners = PromoBanner::active()->get();
        return response()->json($banners);
    }
}
