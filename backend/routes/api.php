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
use App\Http\Controllers\Api\MarketingController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CatalogSceneController;

Route::get('/taxonomy-banners', [TaxonomyBannerController::class, 'index']);
Route::get('/taxonomy-banners/{key}', [TaxonomyBannerController::class, 'byKey']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/check-email', [AuthController::class, 'checkEmail']);
Route::post('/auth/{provider}/callback', [AuthController::class, 'oauthCallback'])
    ->whereIn('provider', ['google', 'apple']);

// Public read APIs
Route::post('/consultations', [ConsultationController::class, 'store']);
Route::post('/chat', [ChatController::class, 'store']);

// Support chat (AI concierge + eskalasi ke customer service)
Route::post('/support/session', [\App\Http\Controllers\Api\SupportChatController::class, 'session']);
Route::get('/support/sessions/{session}/messages', [\App\Http\Controllers\Api\SupportChatController::class, 'messages']);
Route::post('/support/sessions/{session}/messages', [\App\Http\Controllers\Api\SupportChatController::class, 'store']);
Route::post('/support/sessions/{session}/request-cs', [\App\Http\Controllers\Api\SupportChatController::class, 'requestCs']);
Route::post('/support/sessions/{session}/resume-bot', [\App\Http\Controllers\Api\SupportChatController::class, 'resumeBot']);

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
Route::get('/catalogs/{catalog}/scenes', [CatalogSceneController::class, 'index']);
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
    Route::post('/consultations/{consultation}/dp-proof', [ConsultationController::class, 'uploadDpProof']);
    Route::post('/consultations/{consultation}/sign-agreement', [ConsultationController::class, 'signAgreement']);

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
    Route::middleware('sales')->prefix('sales')->group(function () {
    // Reuse method yang sama persis dengan admin — datanya identik
    // (stock, harga, dimensi, dll) + daftar item serupa.
    Route::get('/items/lookup/{slug}', [ItemController::class, 'adminShow']);
});
    Route::middleware('admin')->prefix('admin')->group(function () {
        // Support chat
        Route::get('/support/sessions', [\App\Http\Controllers\Api\Admin\SupportChatController::class, 'index']);
        Route::get('/support/sessions/{session}/messages', [\App\Http\Controllers\Api\Admin\SupportChatController::class, 'messages']);
        Route::post('/support/sessions/{session}/accept', [\App\Http\Controllers\Api\Admin\SupportChatController::class, 'accept']);
        Route::post('/support/sessions/{session}/messages', [\App\Http\Controllers\Api\Admin\SupportChatController::class, 'store']);
        Route::post('/support/sessions/{session}/close', [\App\Http\Controllers\Api\Admin\SupportChatController::class, 'close']);

        

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
        Route::get('/items/lookup/{slug}', [ItemController::class, 'adminShow']);
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
        Route::prefix('catalogs/{catalog}/scenes')->group(function () {
    Route::get('/', [CatalogSceneController::class, 'index']);
    Route::post('/', [CatalogSceneController::class, 'store']);
    Route::post('reorder', [CatalogSceneController::class, 'reorder']); // ← pindah ke sini, SEBELUM {scene}
    Route::post('{scene}', [CatalogSceneController::class, 'update']);
    Route::put('{scene}', [CatalogSceneController::class, 'update']);
    Route::delete('{scene}', [CatalogSceneController::class, 'destroy']);
});
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

        // Marketing / Email blast
        Route::get('/marketing/audience', [\App\Http\Controllers\Api\MarketingController::class, 'audience']);
        Route::post('/marketing/send', [\App\Http\Controllers\Api\MarketingController::class, 'send']);
        Route::post('/marketing/send-test', [MarketingController::class, 'sendTest']);
        Route::post('/marketing/preview', [MarketingController::class, 'preview']);
        Route::post('/marketing/campaigns/draft', [MarketingController::class, 'saveDraft']);
        Route::get('/brand-settings', [MarketingController::class, 'brandSettings']);
        Route::get('/catalog/images', [MarketingController::class, 'catalogImages']);
        Route::post('/marketing/upload-image', [MarketingController::class, 'uploadImage']);

        // Consultations management
        Route::get('/consultations', [AdminConsultationController::class, 'index']);
        Route::get('/consultations/{consultation}', [AdminConsultationController::class, 'show']);
        Route::put('/consultations/{consultation}', [AdminConsultationController::class, 'update']);
        Route::post('/consultations/{consultation}', [AdminConsultationController::class, 'update']);
        Route::delete('/consultations/{consultation}', [AdminConsultationController::class, 'destroy']);
        Route::post('/consultations/{consultation}/confirm-email', [AdminConsultationController::class, 'confirmEmail']);
        Route::get('/consultations/{consultation}/messages', [AdminConsultationController::class, 'messagesIndex']);
        Route::post('/consultations/{consultation}/messages', [AdminConsultationController::class, 'messagesStore']);
        Route::post('/consultations/{consultation}/approve', [AdminConsultationController::class, 'approve']);
        Route::post('/consultations/{consultation}/reject', [AdminConsultationController::class, 'reject']);
        Route::post('/consultations/{consultation}/schedule-meeting', [AdminConsultationController::class, 'scheduleMeeting']);
        Route::post('/consultations/{consultation}/start-meeting', [AdminConsultationController::class, 'startMeeting']);
        Route::post('/consultations/{consultation}/request-dp', [AdminConsultationController::class, 'requestDp']);
        Route::post('/consultations/{consultation}/mark-paid', [AdminConsultationController::class, 'markPaid']);
        Route::post('/consultations/{consultation}/upload-agreement', [AdminConsultationController::class, 'uploadAgreement']);
        Route::post('/consultations/{consultation}/progress', [AdminConsultationController::class, 'postProgress']);
        Route::post('/consultations/{consultation}/complete', [AdminConsultationController::class, 'complete']);

        // Wishlist admin view
        Route::get('/wishlists', [WishlistController::class, 'adminIndex']);
        Route::post('/wishlists/user/{user}/message', [WishlistController::class, 'adminMessage']);

        // Users management
        Route::get('/users', [\App\Http\Controllers\Api\AdminUserController::class, 'index']);
        Route::get('/users/{user}', [\App\Http\Controllers\Api\AdminUserController::class, 'show']);
        Route::get('/users/{user}/activities', [\App\Http\Controllers\Api\AdminUserController::class, 'activities']);
    });
});