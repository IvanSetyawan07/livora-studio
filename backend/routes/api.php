<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectPhotoController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\TaxonomyController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\HotspotController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\UserLanguageController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public read APIs
Route::get('/projects', [ProjectController::class, 'index']);
Route::get('/projects/{slug}', [ProjectController::class, 'show']);
Route::get('/landing/highlights', [ProjectController::class, 'highlights']);
Route::get('/items', [ItemController::class, 'index']);
Route::get('/items/{slug}', [ItemController::class, 'show']);
Route::get('/taxonomies/{type}', [TaxonomyController::class, 'index']);

// Catalog - Public Read
Route::get('/catalogs', [CatalogController::class, 'index']);
Route::get('/catalogs/{slug}', [CatalogController::class, 'show']);
Route::get('/catalogs/{catalogId}/hotspots', [HotspotController::class, 'index']);
Route::get('/catalogs/{catalogId}/hotspots/{scene}', [HotspotController::class, 'getByScene']);

// Public tracking
Route::post('/track/click', [TrackingController::class, 'click']);
Route::post('/track/view',  [TrackingController::class, 'view']);

Route::middleware('auth:sanctum')->group(function () {
    Route::patch('/user/language', [UserLanguageController::class, 'update']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/heartbeat', function (Request $r) {
        $u = $r->user(); $u->last_seen_at = now(); $u->save();
        return ['ok' => true];
    });

    Route::middleware('admin')->prefix('admin')->group(function () {
        // Projects
        Route::post('/projects', [ProjectController::class, 'store']);
        Route::post('/projects/{project}', [ProjectController::class, 'update']);
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
        Route::put('/landing/highlights', [ProjectController::class, 'updateHighlights']);

        // Project Photos
        Route::get('/projects/{project}/photos', [ProjectPhotoController::class, 'index']);
        Route::post('/projects/{project}/photos', [ProjectPhotoController::class, 'store']);
        Route::post('/photos/{photo}', [ProjectPhotoController::class, 'update']);
        Route::delete('/photos/{photo}', [ProjectPhotoController::class, 'destroy']);

        // Items
        Route::post('/items', [ItemController::class, 'store']);
        Route::post('/items/{item}', [ItemController::class, 'update']);
        Route::delete('/items/{item}', [ItemController::class, 'destroy']);

        // Taxonomies
        Route::post('/taxonomies/{type}', [TaxonomyController::class, 'store']);
        Route::put('/taxonomies/{type}/{id}', [TaxonomyController::class, 'update']);
        Route::delete('/taxonomies/{type}/{id}', [TaxonomyController::class, 'destroy']);

        // ─── Catalogs Admin CRUD ───────────────────────────────────────
        // FIX #3 & #4: Tambah GET index + GET show untuk admin
        Route::get('/catalogs', [CatalogController::class, 'index']);         // list (fix #4)
        Route::get('/catalogs/{catalog}', [CatalogController::class, 'show']); // single (fix #3)
        Route::post('/catalogs', [CatalogController::class, 'store']);
        // FIX #2: Terima POST dengan _method=PUT (method spoofing untuk multipart)
        Route::post('/catalogs/{catalog}', [CatalogController::class, 'update']);
        Route::put('/catalogs/{catalog}', [CatalogController::class, 'update']);
        Route::delete('/catalogs/{catalog}', [CatalogController::class, 'destroy']);

        // Hotspots Admin CRUD (nested under catalogs)
        Route::prefix('catalogs/{catalog}/hotspots')->group(function () {
            Route::get('/', [HotspotController::class, 'index']);
            Route::post('/', [HotspotController::class, 'store']);
            Route::get('{hotspot}', [HotspotController::class, 'show']);
            Route::put('{hotspot}', [HotspotController::class, 'update']);
            Route::delete('{hotspot}', [HotspotController::class, 'destroy']);
            Route::post('batch', [HotspotController::class, 'batch']);
            // FIX #3: Route hotspot by scene juga perlu ada di admin
            Route::get('scene/{scene}', [HotspotController::class, 'getByScene']);
        });

        // Analytics
        Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);
        Route::get('/analytics/users', [AnalyticsController::class, 'activeUsers']);
    });
});