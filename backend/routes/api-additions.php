<?php
/**
 * ROUTE ADDITIONS UNTUK routes/api.php — Konsultasi / Appointment
 * =================================================================
 * File ini BUKAN untuk di-require, hanya referensi baris yang harus
 * ditempel ke routes/api.php Anda yang sudah ada, di posisi yang ditandai.
 */

// 1) Tambahkan use statement di bagian atas routes/api.php, bersama use lainnya:
use App\Http\Controllers\Api\ConsultationController;
use App\Http\Controllers\Api\Admin\ConsultationController as AdminConsultationController;

// 2) Tambahkan route PUBLIK ini di area "Public read APIs"
//    (sejajar dengan Route::get('/projects', ...) dkk), SEBELUM
//    Route::middleware('auth:sanctum')->group(...):
Route::post('/consultations', [ConsultationController::class, 'store']);

// 3) Di dalam Route::middleware('auth:sanctum')->group(function () { ... })
//    yang SUDAH ADA (tempat /me, /logout, /heartbeat berada), tambahkan:
Route::get('/my/consultations', [ConsultationController::class, 'mine']);
Route::get('/consultations/{consultation}', [ConsultationController::class, 'show']);

// 4) Di dalam Route::middleware('admin')->prefix('admin')->group(function () { ... })
//    yang SUDAH ADA (tempat /admin/projects, /admin/items, /admin/users berada),
//    tambahkan blok berikut (letakkan misalnya setelah blok "Users management"):
Route::get('/consultations', [AdminConsultationController::class, 'index']);
Route::get('/consultations/{consultation}', [AdminConsultationController::class, 'show']);
Route::put('/consultations/{consultation}', [AdminConsultationController::class, 'update']);
Route::post('/consultations/{consultation}', [AdminConsultationController::class, 'update']); // fallback utk multipart/method-spoof, sama pola dgn CatalogController
Route::delete('/consultations/{consultation}', [AdminConsultationController::class, 'destroy']);

/**
 * CATATAN:
 * - Route publik POST /consultations SENGAJA di luar auth:sanctum supaya
 *   guest bisa submit form appointment. Login-status tetap terdeteksi di
 *   dalam controller lewat Auth::guard('sanctum')->user() secara manual.
 * - Route GET /consultations/{consultation} muncul DUA KALI dengan controller
 *   berbeda — satu di grup auth:sanctum biasa (punya user, cek ownership),
 *   satu lagi di grup admin (prefix jadi /api/admin/consultations/{id}).
 *   Ini aman karena prefix admin membuat path-nya berbeda:
 *     GET /api/consultations/{id}        -> milik user sendiri
 *     GET /api/admin/consultations/{id}  -> admin lihat semua
 */
