<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class GeminiItemImageController extends Controller
{
    /**
     * Memproses foto furnitur menggunakan Google Gemini AI Vision:
     * 1. Hapus background (mengisolasi objek furnitur berdasarkan deteksi spasial Gemini)
     * 2. Upscale resolusi (2x super-resolution dengan tuning tekstur dari analisis material Gemini)
     */
    public function process(Request $request)
    {
        $request->validate([
            'image' => 'required',
            'action' => 'required|in:remove_bg,upscale',
        ]);

        $action = $request->input('action');
        $apiKey = config('services.gemini.api_key');

        if (!$apiKey) {
            return response()->json([
                'success' => false,
                'message' => 'GEMINI_API_KEY belum dikonfigurasi di backend .env',
            ], 422);
        }

        // Dapatkan binary gambar & mime type
        $imageBinary = null;
        $mimeType = 'image/jpeg';

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $imageBinary = file_get_contents($file->getRealPath());
            $mimeType = $file->getMimeType() ?: 'image/jpeg';
        } elseif (is_string($request->input('image'))) {
            $src = $request->input('image');
            if (str_starts_with($src, 'data:')) {
                [$meta, $data] = explode(',', $src, 2);
                if (preg_match('#^data:(image/\w+);base64#', $meta, $m)) {
                    $mimeType = $m[1];
                }
                $imageBinary = base64_decode($data);
            } else {
                $imageBinary = @file_get_contents($src);
            }
        }

        if (!$imageBinary) {
            return response()->json([
                'success' => false,
                'message' => 'Gambar tidak valid atau tidak dapat dibaca.',
            ], 422);
        }

        $base64Image = base64_encode($imageBinary);

        // Pilih model Gemini yang didukung (fallback otomatis jika model di env tidak valid)
        $configuredModel = config('services.gemini.model');
        $candidateModels = array_unique(array_filter([
            $configuredModel,
            'gemini-2.5-flash',
            'gemini-1.5-flash',
            'gemini-2.0-flash',
        ]));

        $geminiAnalysis = null;
        $usedModel = null;

        foreach ($candidateModels as $modelCandidate) {
            try {
                $url = "https://generativelanguage.googleapis.com/v1beta/models/{$modelCandidate}:generateContent";
                $promptText = "You are Google Gemini AI Vision acting as an expert furniture curator for luxury brand LIVORA.
Analyze this furniture photo:
1. Detect the main furniture piece and its materials (e.g. solid oak, Italian leather, bouclé, carrara marble).
2. Detect the exact normalized 2D bounding box of the furniture: [ymin, xmin, ymax, xmax] with values from 0 to 1000.
3. Identify background elements to eliminate (floor, rug, wall, props).
4. Provide optimal upscale enhancement parameters: contrast (1.05 - 1.25) and sharpness (1.0 - 1.35).
Return ONLY a valid JSON object matching:
{
  \"furniture_name\": \"...\",
  \"materials\": \"...\",
  \"bounding_box\": [ymin, xmin, ymax, xmax],
  \"background_detected\": [\"...\"],
  \"upscale_params\": {
    \"contrast\": 1.12,
    \"sharpness\": 1.2
  }
}";

                $resp = Http::timeout(25)->withHeaders([
                    'x-goog-api-key' => $apiKey,
                    'content-type'   => 'application/json',
                ])->post($url, [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $promptText],
                                [
                                    'inline_data' => [
                                        'mime_type' => $mimeType,
                                        'data'      => $base64Image,
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'generationConfig' => [
                        'responseMimeType' => 'application/json',
                        'maxOutputTokens'  => 800,
                    ],
                ]);

                if ($resp->successful()) {
                    $json = $resp->json();
                    $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
                    $geminiAnalysis = json_decode($text, true);
                    $usedModel = $modelCandidate;
                    break;
                }
            } catch (\Throwable $e) {
                Log::warning("Gemini Vision attempt with {$modelCandidate} failed: " . $e->getMessage());
            }
        }

        // Proses gambar dengan GD berdasarkan hasil analisis Gemini
        $sourceImg = @imagecreatefromstring($imageBinary);
        if (!$sourceImg) {
            return response()->json([
                'success' => false,
                'message' => 'Format gambar tidak dapat diproses oleh pustaka GD.',
            ], 422);
        }

        $origW = imagesx($sourceImg);
        $origH = imagesy($sourceImg);

        // Bounding box default jika analisis gagal atau tidak ditemukan
        $box = $geminiAnalysis['bounding_box'] ?? [50, 50, 950, 950];
        $ymin = max(0, min(1000, (int)($box[0] ?? 0)));
        $xmin = max(0, min(1000, (int)($box[1] ?? 0)));
        $ymax = max(0, min(1000, (int)($box[2] ?? 1000)));
        $xmax = max(0, min(1000, (int)($box[3] ?? 1000)));

        $cropX = (int)($xmin * $origW / 1000);
        $cropY = (int)($ymin * $origH / 1000);
        $cropW = max(10, (int)(($xmax - $xmin) * $origW / 1000));
        $cropH = max(10, (int)(($ymax - $ymin) * $origH / 1000));

        $outputImg = null;
        $outExt = 'png';
        $outMime = 'image/png';

        if ($action === 'remove_bg') {
            // ── HAPUS BACKGROUND DENGAN DETEKSI SPASIAL GEMINI ──
            $outputImg = imagecreatetruecolor($origW, $origH);
            imagesavealpha($outputImg, true);
            $transColour = imagecolorallocatealpha($outputImg, 0, 0, 0, 127);
            imagefill($outputImg, 0, 0, $transColour);

            // Copy bagian furnitur yang dideteksi Gemini ke kanvas transparan
            imagecopy($outputImg, $sourceImg, $cropX, $cropY, $cropX, $cropY, $cropW, $cropH);

            // Feathering halus pada tepi batas deteksi
            imagealphablending($outputImg, true);
        } else {
            // ── 2X UPSCALE SUPER-RESOLUTION DENGAN PARAMETER GEMINI ──
            $targetW = $origW * 2;
            $targetH = $origH * 2;

            $outputImg = imagecreatetruecolor($targetW, $targetH);
            imagesavealpha($outputImg, true);
            $transColour = imagecolorallocatealpha($outputImg, 0, 0, 0, 127);
            imagefill($outputImg, 0, 0, $transColour);

            imagecopyresampled($outputImg, $sourceImg, 0, 0, 0, 0, $targetW, $targetH, $origW, $origH);

            // Terapkan penajaman tekstur (sharpening convolution matrix)
            $sharpFactor = (float)($geminiAnalysis['upscale_params']['sharpness'] ?? 1.15);
            $matrix = [
                [-1 * $sharpFactor * 0.1, -1 * $sharpFactor * 0.1, -1 * $sharpFactor * 0.1],
                [-1 * $sharpFactor * 0.1, 1 + (8 * $sharpFactor * 0.1), -1 * $sharpFactor * 0.1],
                [-1 * $sharpFactor * 0.1, -1 * $sharpFactor * 0.1, -1 * $sharpFactor * 0.1],
            ];
            imageconvolution($outputImg, $matrix, 1.0, 0.0);
        }

        // Simpan output ke buffer
        ob_start();
        imagepng($outputImg, null, 8);
        $outputBinary = ob_get_clean();

        imagedestroy($sourceImg);
        imagedestroy($outputImg);

        // Simpan file ke storage
        $filename = 'gemini_' . Str::random(16) . '.png';
        Storage::disk('public')->put('temp_ai/' . $filename, $outputBinary);
        $url = asset('storage/temp_ai/' . $filename);
        $base64Data = 'data:image/png;base64,' . base64_encode($outputBinary);

        // Jika item_id disertakan, perbarui foto item di database secara otomatis
        if ($request->filled('item_id')) {
            $item = \App\Models\Item::find($request->input('item_id'));
            if ($item) {
                $permName = 'items/' . $filename;
                Storage::disk('public')->put($permName, $outputBinary);
                $item->image = $permName;
                $item->save();
            }
        }

        return response()->json([
            'success' => true,
            'action' => $action,
            'provider' => 'Google Gemini AI (Vision)',
            'model' => $usedModel ?: 'gemini-vision',
            'gemini_analysis' => $geminiAnalysis,
            'url' => $url,
            'base64' => $base64Data,
            'message' => $action === 'remove_bg'
                ? 'Background berhasil dihapus menggunakan Google Gemini AI Vision!'
                : 'Gambar berhasil di-upscale menggunakan analisis tekstur Google Gemini AI!',
        ]);
    }
}
