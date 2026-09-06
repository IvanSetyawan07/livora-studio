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
use App\Http\Controllers\Api\CatalogItemLayoutController;

// ── AI Marketing Dashboard (Fase 3) ─────────────────────────────
use App\Http\Controllers\Api\Ai\DashboardController as AiDashboardController;
use App\Http\Controllers\Api\Ai\AgentController as AiAgentController;
use App\Http\Controllers\Api\Ai\RecommendationController as AiRecommendationController;
use App\Http\Controllers\Api\Ai\ActionController as AiActionController;
use App\Http\Controllers\Api\Ai\ChatController as AiChatController;
use App\Http\Controllers\Api\Ai\UsageController as AiUsageController;
use App\Http\Controllers\Api\Ai\ProviderController as AiProviderController;
use App\Http\Controllers\Api\Ai\CampaignController as AiCampaignController;
use App\Http\Controllers\Api\Ai\ImpactController as AiImpactController;
use App\Http\Controllers\Api\Ai\InsightController as AiInsightController;
use App\Http\Controllers\Api\Ai\ActivityController as AiActivityController;
use App\Http\Controllers\Api\Ai\GoogleIntegrationController;
use App\Http\Controllers\Api\Ai\MetaIntegrationController;
use App\Http\Controllers\Api\Ai\AnalyticsController as AiAnalyticsController;
use App\Http\Controllers\Api\Ai\AdsController as AiAdsController;
use App\Http\Controllers\Api\Ai\ContentController as AiContentController;
/**
 * Media proxy — melayani file dari storage lewat route API supaya selalu
 * membawa header CORS. Dipakai generator PDF (canvas/fetch) yang butuh
 * gambar bebas taint saat file statis /storage tidak mengirim header CORS.
 */
Route::get('/media', function (\Illuminate\Http\Request $request) {
    $path = ltrim((string) $request->query('path', ''), '/');
    $path = preg_replace('#^storage/#', '', $path);

    abort_if($path === '' || str_contains($path, '..'), 404);
    abort_unless(\Illuminate\Support\Facades\Storage::disk('public')->exists($path), 404);

    $disk = \Illuminate\Support\Facades\Storage::disk('public');

    return response($disk->get($path), 200, [
        'Content-Type'                => $disk->mimeType($path) ?: 'application/octet-stream',
        'Cache-Control'               => 'public, max-age=86400',
        'Access-Control-Allow-Origin' => '*',
    ]);
})->name('media.proxy');

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
Route::get('/projects/{project}/layouts', [\App\Http\Controllers\Api\ProjectSpaceController::class, 'index']);
Route::get('/landing/highlights', [ProjectController::class, 'highlights']);
Route::get('/items', [ItemController::class, 'index']);
Route::get('/items/{slug}', [ItemController::class, 'show']);
Route::get('/taxonomies/{type}', [TaxonomyController::class, 'index']);
Route::get('/collections', [CollectionController::class, 'index']);
Route::get('/collections/{slug}', [CollectionController::class, 'show']);

// Catalog - Public Read
Route::get('/catalogs', [CatalogController::class, 'index']);
Route::get('/catalogs/{slug}', [CatalogController::class, 'show']);
Route::get('/catalogs/{catalog}/hotspots', [HotspotController::class, 'index']);
Route::get('/catalogs/{catalog}/hotspots/{scene}', [HotspotController::class, 'getByScene']);
Route::get('/catalogs/{catalog}/scenes', [CatalogSceneController::class, 'index']);
Route::get('/catalogs/{catalog}/item-layouts', [CatalogItemLayoutController::class, 'index']);
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
        // Variants (sebelumnya publik — kini wajib admin)
            Route::prefix('items/{itemId}/variants')->group(function () {
            Route::get('/', [VariantController::class, 'index']);
            Route::post('/', [VariantController::class, 'store']);
            Route::put('/{variantId}', [VariantController::class, 'update']);
            Route::delete('/{variantId}', [VariantController::class, 'destroy']);
        });
             // Support chat
        Route::get('/support/sessions', [\App\Http\Controllers\Api\Admin\SupportChatController::class, 'index']);
        Route::get('/support/sessions/{session}/messages', [\App\Http\Controllers\Api\Admin\SupportChatController::class, 'messages']);
        Route::post('/support/sessions/{session}/accept', [\App\Http\Controllers\Api\Admin\SupportChatController::class, 'accept']);
        Route::post('/support/sessions/{session}/messages', [\App\Http\Controllers\Api\Admin\SupportChatController::class, 'store']);
        Route::post('/support/sessions/{session}/close', [\App\Http\Controllers\Api\Admin\SupportChatController::class, 'close']);
                Route::post('/support/sessions/{session}/reject', [\App\Http\Controllers\Api\Admin\SupportChatController::class, 'reject']);
        Route::delete('/support/sessions/{session}', [\App\Http\Controllers\Api\Admin\SupportChatController::class, 'destroy']);

        

        // Projects
        Route::post('/projects', [ProjectController::class, 'store']);
        Route::post('/projects/{project}', [ProjectController::class, 'update']);
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
        Route::put('/landing/highlights', [ProjectController::class, 'updateHighlights']);

        // Project Photos
        Route::get('/projects/{project}/photos', [ProjectPhotoController::class, 'index']);
        Route::post('/projects/{project}/photos', [ProjectPhotoController::class, 'store']);
        Route::post('/photos/{photo}', [ProjectPhotoController::class, 'update']);

        // Project Spaces (layouts → rooms → hotspots)
        Route::get('/projects/{project}/layouts', [\App\Http\Controllers\Api\ProjectSpaceController::class, 'index']);
        Route::post('/projects/{project}/layouts', [\App\Http\Controllers\Api\ProjectSpaceController::class, 'storeLayout']);
        Route::post('/layouts/{layout}', [\App\Http\Controllers\Api\ProjectSpaceController::class, 'updateLayout']);
        Route::delete('/layouts/{layout}', [\App\Http\Controllers\Api\ProjectSpaceController::class, 'destroyLayout']);
        Route::post('/layouts/{layout}/rooms', [\App\Http\Controllers\Api\ProjectSpaceController::class, 'storeRoom']);
        Route::post('/rooms/{room}', [\App\Http\Controllers\Api\ProjectSpaceController::class, 'updateRoom']);
        Route::delete('/rooms/{room}', [\App\Http\Controllers\Api\ProjectSpaceController::class, 'destroyRoom']);
        Route::post('/rooms/{room}/hotspots', [\App\Http\Controllers\Api\ProjectSpaceController::class, 'saveHotspots']);
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
        Route::get('/catalogs/{catalog}/item-layouts', [CatalogItemLayoutController::class, 'index']);
Route::post('/catalogs/{catalog}/item-layouts', [CatalogItemLayoutController::class, 'save']);

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

    // ================= AI MARKETING DASHBOARD (Fase 3) =================
    // Prefix /ai, admin-only. Base URL frontend: VITE_API_URL + /ai/...
    Route::middleware('admin')->prefix('ai')->group(function () {
        Route::get('/cro/funnel-summary', [\App\Http\Controllers\Api\Ai\CroController::class, 'funnelSummary']);
        Route::get('/seo/search-console-summary', [\App\Http\Controllers\Api\Ai\SeoController::class, 'searchConsoleSummary']);
        Route::get('/dashboard/health', [AiDashboardController::class, 'health']);
        Route::get('/dashboard/priorities', [AiDashboardController::class, 'priorities']);
        Route::get('/dashboard/kpis', [AiDashboardController::class, 'kpis']);
        Route::get('/agents', [AiAgentController::class, 'index']);

        Route::get('/insights', [AiInsightController::class, 'index']);
        Route::get('/insights/{insight}', [AiInsightController::class, 'show']);

        Route::get('/activity', [AiActivityController::class, 'index']);

        Route::get('/recommendations', [AiRecommendationController::class, 'index']);
        Route::get('/recommendations/{recommendation}', [AiRecommendationController::class, 'show']);
        Route::post('/recommendations/{recommendation}/approve', [AiRecommendationController::class, 'approve']);
        Route::post('/recommendations/{recommendation}/reject', [AiRecommendationController::class, 'reject']);

        Route::get('/actions', [AiActionController::class, 'index']);
        Route::post('/actions/{action}/approve-execute', [AiActionController::class, 'approveAndExecute']);
        Route::post('/actions/{action}/reject', [AiActionController::class, 'reject']);

        Route::post('/chat', [AiChatController::class, 'ask']);

        Route::get('/usage/totals', [AiUsageController::class, 'totals']);
        Route::get('/usage/by-agent', [AiUsageController::class, 'byAgent']);
        Route::get('/usage/by-provider', [AiUsageController::class, 'byProvider']);

        Route::get('/providers', [AiProviderController::class, 'index']);
        Route::get('/providers/quota', [AiProviderController::class, 'quota']);
        Route::get('/providers/preference', [AiProviderController::class, 'getPreference']);
        Route::post('/providers/preference', [AiProviderController::class, 'updatePreference']);
        Route::get('/routing-strategy', [AiProviderController::class, 'routingStrategy']);
        
        Route::get('/campaigns', [AiCampaignController::class, 'index']);
        Route::get('/campaigns/{campaign}', [AiCampaignController::class, 'show']);

        Route::get('/impact', [AiImpactController::class, 'index']);
        Route::get('/integrations/google/authorize-url', [GoogleIntegrationController::class, 'authorizeUrl']);
        Route::get('/integrations/google/status', [GoogleIntegrationController::class, 'status']);
        Route::post('/integrations/google/disconnect', [GoogleIntegrationController::class, 'disconnect']);

        // Meta Graph API (Facebook Page + Instagram Business) — read-only,
        // dipakai kartu "Instagram & Facebook" di Content Agent.
        Route::get('/content/meta/status', [MetaIntegrationController::class, 'status']);
        Route::get('/content/meta/facebook', [MetaIntegrationController::class, 'facebook']);
        Route::get('/content/meta/instagram', [MetaIntegrationController::class, 'instagram']);
        Route::get('/analytics/overview', [AiAnalyticsController::class, 'overview']);
        Route::get('/ads/summary', [AiAdsController::class, 'summary']);
        Route::get('/content/summary', [AiContentController::class, 'summary']);
    });
});