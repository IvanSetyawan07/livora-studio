<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GoogleOAuthCallbackController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/storage/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);
    if (!file_exists($fullPath)) {
        abort(404);
    }
    return response()->file($fullPath, [
        'Access-Control-Allow-Origin' => '*',
    ]);
})->where('path', '.*');

// Target redirect Google OAuth (AI Marketing — Search Console dkk). Sengaja
// di web.php, BUKAN routes/api.php, supaya URL-nya persis
// https://api.livoralcr.com/auth/google/callback tanpa prefix /api, sesuai
// yang didaftarkan sebagai Authorized redirect URI di Google Cloud Console.
Route::get('/auth/google/callback', [GoogleOAuthCallbackController::class, 'handle']);