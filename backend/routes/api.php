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
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\FurnitureExperienceController;
use App\Http\Controllers\UserLanguageController;
use App\Http\Controllers\Api\VariantController;
use App\Http\Controllers\Api\TaxonomyBannerController;
use App\Http\Controllers\Api\ConsultationController;
use App\Http\Controllers\Api\Admin\ConsultationController as AdminConsultationController;
use App\Http\Controllers\Api\WishlistController;

Route::get('/taxonomy-banners', [TaxonomyBannerController::class, 'index']);
Route::get('/taxonomy-banners/{key}', [TaxonomyBannerController::class, 'byKey']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/check-email', [AuthController::class, 'checkEmail']);
Route::post('/auth/{provider}/callback', [AuthController::class, 'oauthCallback'])
    ->whereIn('provider', ['google', 'apple']);

// Public read APIs
Route::post('/consultations', [ConsultationController::class, 'store']);
Route::get('/projects', [ProjectController::class, 'index']);
Route::get('/projects/{slug}', [ProjectController::class, 'show']);
Route::get('/landing/highlights', [ProjectController::class, 'highlights']);
Route::get('/items', [ItemController::class, 'index']);
Route::get('/items/{slug}', [ItemController::class, 'show']);
Route::get('/taxonomies/{type}', [TaxonomyController::class, 'index']);
Route::get('/collections', [CollectionController::class, 'index']);
Route::get('/collections/{slug}', [CollectionController::class, 'show']);

Route::prefix('admin/items/{itemId}/variants')->group(function () {
    Route::get('/', [VariantController::class, 'index']);
    Route::post('/', [VariantController::class, 'store']);
    Route::put('/{variantId}', [VariantController::class, 'update']);
    Route::delete('/{variantId}', [VariantController::class, 'destroy']);
});
// Catalog - Public Read
Route::get('/catalogs', [CatalogController::class, 'index']);
Route::get('/catalogs/{slug}', [CatalogController::class, 'show']);
Route::get('/catalogs/{catalog}/hotspots', [HotspotController::class, 'index']);
Route::get('/catalogs/{catalog}/hotspots/{scene}', [HotspotController::class, 'getByScene']);

// Public tracking
Route::post('/track/click', [TrackingController::class, 'click']);
Route::post('/track/view',  [TrackingController::class, 'view']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/my/consultations', [ConsultationController::class, 'mine']);
    Route::get('/my/consultations/unread', [ConsultationController::class, 'unreadCount']);
    Route::get('/consultations/{consultation}', [ConsultationController::class, 'show']);
    Route::post('/consultations/{consultation}/cancel', [ConsultationController::class, 'cancel']);
    Route::get('/consultations/{consultation}/messages', [ConsultationController::class, 'messagesIndex']);
    Route::post('/consultations/{consultation}/messages', [ConsultationController::class, 'messagesStore']);

    Route::patch('/user/language', [UserLanguageController::class, 'update']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::post('/me/password', [AuthController::class, 'changePassword']);
    Route::get('/wishlist', [WishlistController::class, 'index']);
Route::post('/wishlist', [WishlistController::class, 'store']);
Route::delete('/wishlist/{type}/{id}', [WishlistController::class, 'destroy']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/heartbeat', function (Request $r) {
        $u = $r->user(); $u->last_seen_at = now(); $u->save();
        return ['ok' => true];
    });
    Route::post('/activities', [AuthController::class, 'trackActivity']);

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

        // Collections
        Route::post('/collections', [CollectionController::class, 'store']);
        Route::post('/collections/{collection}', [CollectionController::class, 'update']);
        Route::put('/collections/{collection}', [CollectionController::class, 'update']);
        Route::delete('/collections/{collection}', [CollectionController::class, 'destroy']);
        // Story
        Route::post('/collections/{collection}/story', [CollectionController::class, 'storyUpsert']);
        // Packages
        Route::post('/collections/{collection}/packages', [CollectionController::class, 'packageStore']);
        Route::post('/collection-packages/{package}', [CollectionController::class, 'packageUpdate']);
        Route::put('/collection-packages/{package}', [CollectionController::class, 'packageUpdate']);
        Route::delete('/collection-packages/{package}', [CollectionController::class, 'packageDestroy']);

        // Furniture Experience
        Route::get('/items/{item}/variants', [FurnitureExperienceController::class, 'variantsIndex']);
        Route::post('/items/{item}/variants', [FurnitureExperienceController::class, 'variantStore']);
        Route::post('/variants/{variant}', [FurnitureExperienceController::class, 'variantUpdate']);
        Route::delete('/variants/{variant}', [FurnitureExperienceController::class, 'variantDestroy']);

        Route::get('/items/{item}/gallery', [FurnitureExperienceController::class, 'galleryIndex']);
        Route::post('/items/{item}/gallery', [FurnitureExperienceController::class, 'galleryStore']);
        Route::post('/gallery/{gallery}', [FurnitureExperienceController::class, 'galleryUpdate']);
        Route::delete('/gallery/{gallery}', [FurnitureExperienceController::class, 'galleryDestroy']);
        Route::post('/items/{item}/gallery/reorder', [FurnitureExperienceController::class, 'galleryReorder']);

        Route::get('/items/{item}/lifestyle', [FurnitureExperienceController::class, 'lifestyleIndex']);
        Route::post('/items/{item}/lifestyle', [FurnitureExperienceController::class, 'lifestyleStore']);
        Route::post('/lifestyle/{lifestyle}', [FurnitureExperienceController::class, 'lifestyleUpdate']);
        Route::delete('/lifestyle/{lifestyle}', [FurnitureExperienceController::class, 'lifestyleDestroy']);

        Route::get('/items/{item}/story', [FurnitureExperienceController::class, 'storyShow']);
        Route::post('/items/{item}/story', [FurnitureExperienceController::class, 'storyUpsert']);
        Route::post('/stories/{story}/cards', [FurnitureExperienceController::class, 'cardStore']);
        Route::put('/story-cards/{card}', [FurnitureExperienceController::class, 'cardUpdate']);
        Route::delete('/story-cards/{card}', [FurnitureExperienceController::class, 'cardDestroy']);


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
        Route::post('/taxonomy-banners', [TaxonomyBannerController::class, 'store']);
        Route::put('/taxonomy-banners/{banner}', [TaxonomyBannerController::class, 'update']);
        Route::delete('/taxonomy-banners/{banner}', [TaxonomyBannerController::class, 'destroy']);
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

        // Consultations management
        Route::get('/consultations', [AdminConsultationController::class, 'index']);
        Route::get('/consultations/{consultation}', [AdminConsultationController::class, 'show']);
        Route::put('/consultations/{consultation}', [AdminConsultationController::class, 'update']);
        Route::post('/consultations/{consultation}', [AdminConsultationController::class, 'update']);
        Route::delete('/consultations/{consultation}', [AdminConsultationController::class, 'destroy']);
        Route::post('/consultations/{consultation}/confirm-email', [AdminConsultationController::class, 'confirmEmail']);
        Route::get('/consultations/{consultation}/messages', [AdminConsultationController::class, 'messagesIndex']);
        Route::post('/consultations/{consultation}/messages', [AdminConsultationController::class, 'messagesStore']);

        // Wishlist admin view
        Route::get('/wishlists', [WishlistController::class, 'adminIndex']);
        Route::post('/wishlists/user/{user}/message', [WishlistController::class, 'adminMessage']);

        // Users management
        Route::get('/users', [\App\Http\Controllers\Api\AdminUserController::class, 'index']);
        Route::get('/users/{user}', [\App\Http\Controllers\Api\AdminUserController::class, 'show']);
        Route::get('/users/{user}/activities', [\App\Http\Controllers\Api\AdminUserController::class, 'activities']);
    });
});