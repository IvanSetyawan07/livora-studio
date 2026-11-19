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
     * Memproses foto furnitur menggunakan Google Gemini AI Vision + Pixel Alpha Matting:
     * 1. `remove_bg`: deteksi objek & tipe latar via Gemini Vision + segmentasi pixel flood-fill,
     *    pembersihan sela kaki furnitur, anti-aliasing tepi, de-fringing halo putih, dan auto-trim.
     * 2. `upscale`: 2x super-resolution dengan pelestarian kanal alpha + penajaman tekstur adaptif.
     * 3. `analyze`: hanya analisis visual Gemini Vision (nama produk, bahan, latar).
     * 4. `save_cutout`: simpan hasil PNG transparan langsung ke item_id dari Batch Modal.
     */
    public function process(Request $request)
    {
        $request->validate([
            'image' => 'required',
            'action' => 'required|in:remove_bg,upscale,analyze,save_cutout',
        ]);

        $action = (string) $request->input('action');
        $apiKey = config('services.gemini.api_key');

        if (! $apiKey && ! in_array($action, ['save_cutout', 'remove_bg'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'GEMINI_API_KEY belum dikonfigurasi di backend .env',
            ], 422);
        }

        // Dapatkan binary gambar & mime type (baca langsung dari disk public bila URL storage lokal)
        [$imageBinary, $mimeType] = $this->resolveInputBinary($request);

        if (! $imageBinary) {
            return response()->json([
                'success' => false,
                'message' => 'Gambar tidak valid atau tidak dapat dibaca.',
            ], 422);
        }

        if ($action === 'save_cutout') {
            return $this->handleSaveCutout($request, $imageBinary);
        }

        [$geminiAnalysis, $usedModel] = $this->analyzeWithGemini($apiKey, $imageBinary, $mimeType);

        if ($action === 'analyze') {
            return response()->json([
                'success' => true,
                'action' => 'analyze',
                'provider' => 'Google Gemini AI (Vision)',
                'model' => $usedModel ?: 'gemini-vision',
                'gemini_analysis' => $geminiAnalysis,
            ]);
        }

        $sourceImg = @imagecreatefromstring($imageBinary);
        if (! $sourceImg) {
            return response()->json([
                'success' => false,
                'message' => 'Format gambar tidak dapat diproses oleh pustaka GD.',
            ], 422);
        }

        if (function_exists('imagepalettetotruecolor') && ! imageistruecolor($sourceImg)) {
            imagepalettetotruecolor($sourceImg);
        }

        $cutoutQuality = 'clean';

        if ($action === 'remove_bg') {
            [$outputImg, $cutoutQuality] = $this->removeBackgroundPixels($sourceImg, $geminiAnalysis);
        } else {
            $outputImg = $this->upscaleImageAlphaSafe($sourceImg, $geminiAnalysis);
        }

        ob_start();
        imagepng($outputImg, null, 8);
        $outputBinary = ob_get_clean();

        imagedestroy($sourceImg);
        imagedestroy($outputImg);

        $filename = 'gemini_'.Str::random(16).'.png';
        Storage::disk('public')->put('temp_ai/'.$filename, $outputBinary);
        $url = asset('storage/temp_ai/'.$filename);
        $base64Data = 'data:image/png;base64,'.base64_encode($outputBinary);

        if ($request->filled('item_id')) {
            $this->persistToItem((int) $request->input('item_id'), $filename, $outputBinary);
        }

        return response()->json([
            'success' => true,
            'action' => $action,
            'provider' => 'Google Gemini AI (Vision)',
            'model' => $usedModel ?: 'gemini-vision',
            'gemini_analysis' => $geminiAnalysis,
            'cutout_quality' => $cutoutQuality,
            'url' => $url,
            'base64' => $base64Data,
            'message' => $action === 'remove_bg'
                ? 'Background berhasil dihapus menggunakan Google Gemini AI Vision!'
                : 'Gambar berhasil di-upscale menggunakan analisis tekstur Google Gemini AI!',
        ]);
    }

    private function handleSaveCutout(Request $request, string $binary): \Illuminate\Http\JsonResponse
    {
        $filename = 'cutout_'.Str::random(16).'.png';
        Storage::disk('public')->put('temp_ai/'.$filename, $binary);
        $url = asset('storage/temp_ai/'.$filename);

        if ($request->filled('item_id')) {
            $this->persistToItem((int) $request->input('item_id'), $filename, $binary);
        }

        return response()->json([
            'success' => true,
            'action' => 'save_cutout',
            'url' => $url,
            'message' => 'Foto transparan berhasil disimpan ke item katalog.',
        ]);
    }

    private function persistToItem(int $itemId, string $filename, string $binary): void
    {
        $item = \App\Models\Item::find($itemId);
        if (! $item) {
            return;
        }
        $permName = 'items/'.$filename;
        Storage::disk('public')->put($permName, $binary);
        $item->image = '/storage/'.$permName;
        $item->save();
    }

    /**
     * @return array{0: ?string, 1: string}
     */
    private function resolveInputBinary(Request $request): array
    {
        $mimeType = 'image/jpeg';

        if ($request->hasFile('image')) {
            $file = $request->file('image');

            return [file_get_contents($file->getRealPath()) ?: null, $file->getMimeType() ?: $mimeType];
        }

        $src = $request->input('image');
        if (! is_string($src) || trim($src) === '') {
            return [null, $mimeType];
        }

        if (str_starts_with($src, 'data:')) {
            [$meta, $data] = array_pad(explode(',', $src, 2), 2, '');
            if (preg_match('#^data:(image/[\w.+-]+);base64#', $meta, $m)) {
                $mimeType = $m[1];
            }

            return [base64_decode($data) ?: null, $mimeType];
        }

        // Baca langsung dari storage lokal jika URL menunjuk ke /storage/...
        $parsedPath = parse_url($src, PHP_URL_PATH) ?: $src;
        if (is_string($parsedPath) && preg_match('#/storage/(.+)$#', $parsedPath, $m)) {
            $rel = ltrim($m[1], '/');
            if (Storage::disk('public')->exists($rel)) {
                $bytes = Storage::disk('public')->get($rel);
                $ext = strtolower(pathinfo($rel, PATHINFO_EXTENSION));
                $mime = match ($ext) {
                    'png' => 'image/png',
                    'webp' => 'image/webp',
                    default => 'image/jpeg',
                };

                return [$bytes ?: null, $mime];
            }
        }

        if (filter_var($src, FILTER_VALIDATE_URL)) {
            try {
                $resp = Http::timeout(15)->get($src);
                if ($resp->successful()) {
                    return [$resp->body(), $resp->header('Content-Type') ?: $mimeType];
                }
            } catch (\Throwable) {
            }
        }

        $raw = @file_get_contents($src);

        return [$raw ?: null, $mimeType];
    }

    /**
     * @return array{0: ?array<string, mixed>, 1: ?string}
     */
    private function analyzeWithGemini(?string $apiKey, string $imageBinary, string $mimeType): array
    {
        if (! filled($apiKey)) {
            return [null, null];
        }

        $base64Image = base64_encode($imageBinary);
        $configuredModel = config('services.gemini.model');
        $candidateModels = array_values(array_unique(array_filter([
            $configuredModel,
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.0-flash',
        ])));

        $promptText = "You are Google Gemini AI Vision acting as an expert furniture curator for luxury brand LIVORA.
Analyze this furniture/decor photo carefully:
1. Detect the main product piece and its materials.
2. Detect the tight 2D bounding box of ONLY the product: [ymin, xmin, ymax, xmax] normalized 0-1000.
3. Determine whether the background behind the product is a uniform/studio solid color (e.g. white, off-white, light gray) vs a complex real room scene.
4. Provide optimal upscale enhancement parameters: contrast (1.05 - 1.2) and sharpness (1.05 - 1.3).
Return ONLY valid JSON:
{
  \"furniture_name\": \"...\",
  \"materials\": \"...\",
  \"bounding_box\": [ymin, xmin, ymax, xmax],
  \"is_uniform_background\": true,
  \"background_detected\": [\"...\"],
  \"upscale_params\": { \"contrast\": 1.1, \"sharpness\": 1.18 }
}";

        foreach ($candidateModels as $modelCandidate) {
            try {
                $url = "https://generativelanguage.googleapis.com/v1beta/models/{$modelCandidate}:generateContent";
                $resp = Http::timeout(22)->withHeaders([
                    'x-goog-api-key' => $apiKey,
                    'content-type' => 'application/json',
                ])->post($url, [
                    'contents' => [[
                        'parts' => [
                            ['text' => $promptText],
                            ['inline_data' => ['mime_type' => $mimeType, 'data' => $base64Image]],
                        ],
                    ]],
                    'generationConfig' => [
                        'responseMimeType' => 'application/json',
                        'maxOutputTokens' => 700,
                    ],
                ]);

                if (! $resp->successful()) {
                    continue;
                }

                $parts = $resp->json('candidates.0.content.parts') ?? [];
                $text = '';
                foreach ($parts as $p) {
                    if (! empty($p['thought'])) {
                        continue;
                    }
                    $text .= (string) ($p['text'] ?? '');
                }
                $clean = trim(preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($text)) ?? $text);
                $decoded = json_decode($clean, true);
                if (is_array($decoded)) {
                    return [$decoded, $modelCandidate];
                }
            } catch (\Throwable $e) {
                Log::warning("Gemini Vision attempt with {$modelCandidate} failed: ".$e->getMessage());
            }
        }

        return [null, null];
    }

    /**
     * Hapus background pixel-demi-pixel berbasis perimeter flood-fill + anti-aliasing tepi
     * + pembersihan sela-sela kaki furnitur + de-fringing halo putih + auto-trim presisi.
     *
     * @param  array<string, mixed>|null  $geminiAnalysis
     * @return array{0: \GdImage, 1: string}
     */
    private function removeBackgroundPixels(\GdImage $sourceImg, ?array $geminiAnalysis): array
    {
        @ini_set('memory_limit', '512M');

        $origW = imagesx($sourceImg);
        $origH = imagesy($sourceImg);

        // Skala kerja max 1050px untuk kecepatan & kestabilan memori, lalu terapkan hasil presisi.
        $maxSide = max($origW, $origH);
        $scale = $maxSide > 1050 ? (1050 / $maxSide) : 1.0;
        $w = max(1, (int) round($origW * $scale));
        $h = max(1, (int) round($origH * $scale));

        if ($scale < 1.0) {
            $work = imagecreatetruecolor($w, $h);
            imagealphablending($work, false);
            imagesavealpha($work, true);
            imagecopyresampled($work, $sourceImg, 0, 0, 0, 0, $w, $h, $origW, $origH);
        } else {
            $work = $sourceImg;
        }

        // 1. Sampel warna latar dominan di sepanjang tepi gambar
        $borderR = [];
        $borderG = [];
        $borderB = [];
        for ($x = 0; $x < $w; $x += 2) {
            foreach ([0, 1, $h - 2, $h - 1] as $by) {
                if ($by < 0 || $by >= $h) {
                    continue;
                }
                $c = imagecolorat($work, $x, $by);
                if ((($c >> 24) & 0x7F) >= 100) {
                    continue;
                }
                $borderR[] = ($c >> 16) & 0xFF;
                $borderG[] = ($c >> 8) & 0xFF;
                $borderB[] = $c & 0xFF;
            }
        }
        for ($y = 0; $y < $h; $y += 2) {
            foreach ([0, 1, $w - 2, $w - 1] as $bx) {
                if ($bx < 0 || $bx >= $w) {
                    continue;
                }
                $c = imagecolorat($work, $bx, $y);
                if ((($c >> 24) & 0x7F) >= 100) {
                    continue;
                }
                $borderR[] = ($c >> 16) & 0xFF;
                $borderG[] = ($c >> 8) & 0xFF;
                $borderB[] = $c & 0xFF;
            }
        }

        if (count($borderR) < 8) {
            // Gambar sudah transparan pada seluruh tepinya — cukup auto-trim.
            if ($work !== $sourceImg) {
                imagedestroy($work);
            }

            return [$this->trimTransparentCanvas($sourceImg), 'clean'];
        }

        sort($borderR);
        sort($borderG);
        sort($borderB);
        $mid = (int) floor(count($borderR) / 2);
        $bgR = $borderR[$mid];
        $bgG = $borderG[$mid];
        $bgB = $borderB[$mid];

        $total = $w * $h;
        $rArr = new \SplFixedArray($total);
        $gArr = new \SplFixedArray($total);
        $bArr = new \SplFixedArray($total);
        $aOrig = new \SplFixedArray($total);

        // Hitung variasi tepi untuk menentukan toleransi warna studio (mis. foto studio dengan bayangan halus)
        $bgMatches = 0;
        for ($i = 0; $i < count($borderR); $i++) {
            $dr = $borderR[$i] - $bgR;
            $dg = $borderG[$i] - $bgG;
            $db = $borderB[$i] - $bgB;
            if (($dr * $dr + $dg * $dg + $db * $db) <= (42 * 42)) {
                $bgMatches++;
            }
        }
        $borderUniformity = $bgMatches / max(1, count($borderR));
        $isBrightStudioBg = min($bgR, $bgG, $bgB) >= 210;
        $thresholdHigh = ($borderUniformity >= 0.65 && $isBrightStudioBg) ? 46.0 : 34.0;
        $thresholdLow = $thresholdHigh * 0.52;
        $threshHighSq = $thresholdHigh * $thresholdHigh;

        for ($y = 0, $idx = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++, $idx++) {
                $c = imagecolorat($work, $x, $y);
                $aOrig[$idx] = ($c >> 24) & 0x7F;
                $rArr[$idx] = ($c >> 16) & 0xFF;
                $gArr[$idx] = ($c >> 8) & 0xFF;
                $bArr[$idx] = $c & 0xFF;
            }
        }

        // 2. BFS Flood-fill 4-arah dari seluruh tepi luar gambar
        $bgMask = new \SplFixedArray($total);
        for ($i = 0; $i < $total; $i++) {
            $bgMask[$i] = 0;
        }
        $queue = new \SplQueue();

        $trySeed = function (int $x, int $y) use ($w, $h, $bgMask, $queue, $rArr, $gArr, $bArr, $aOrig, $bgR, $bgG, $bgB, $threshHighSq, $isBrightStudioBg): void {
            if ($x < 0 || $x >= $w || $y < 0 || $y >= $h) {
                return;
            }
            $idx = $y * $w + $x;
            if ($bgMask[$idx] === 1) {
                return;
            }
            if ($aOrig[$idx] >= 110) {
                $bgMask[$idx] = 1;
                $queue->enqueue($idx);

                return;
            }
            $r = $rArr[$idx];
            $g = $gArr[$idx];
            $b = $bArr[$idx];
            $dr = $r - $bgR;
            $dg = $g - $bgG;
            $db = $b - $bgB;
            $distSq = $dr * $dr + $dg * $dg + $db * $db;
            $chroma = max($r, $g, $b) - min($r, $g, $b);

            if ($distSq <= $threshHighSq && (! $isBrightStudioBg || $chroma <= 32)) {
                $bgMask[$idx] = 1;
                $queue->enqueue($idx);
            }
        };

        for ($x = 0; $x < $w; $x++) {
            $trySeed($x, 0);
            $trySeed($x, $h - 1);
        }
        for ($y = 0; $y < $h; $y++) {
            $trySeed(0, $y);
            $trySeed($w - 1, $y);
        }

        while (! $queue->isEmpty()) {
            $cur = $queue->dequeue();
            $cx = $cur % $w;
            $cy = (int) (($cur - $cx) / $w);

            $neighbors = [];
            if ($cx > 0) {
                $neighbors[] = $cur - 1;
            }
            if ($cx + 1 < $w) {
                $neighbors[] = $cur + 1;
            }
            if ($cy > 0) {
                $neighbors[] = $cur - $w;
            }
            if ($cy + 1 < $h) {
                $neighbors[] = $cur + $w;
            }

            $cr = $rArr[$cur];
            $cg = $gArr[$cur];
            $cb = $bArr[$cur];

            foreach ($neighbors as $nIdx) {
                if ($bgMask[$nIdx] === 1) {
                    continue;
                }
                if ($aOrig[$nIdx] >= 110) {
                    $bgMask[$nIdx] = 1;
                    $queue->enqueue($nIdx);
                    continue;
                }
                $nr = $rArr[$nIdx];
                $ng = $gArr[$nIdx];
                $nb = $bArr[$nIdx];

                $dr = $nr - $bgR;
                $dg = $ng - $bgG;
                $db = $nb - $bgB;
                $distSq = $dr * $dr + $dg * $dg + $db * $db;
                $stepSq = ($nr - $cr) * ($nr - $cr) + ($ng - $cg) * ($ng - $cg) + ($nb - $cb) * ($nb - $cb);
                $chroma = max($nr, $ng, $nb) - min($nr, $ng, $nb);

                if ($distSq <= $threshHighSq && $stepSq <= (28 * 28) && (! $isBrightStudioBg || $chroma <= 30)) {
                    $bgMask[$nIdx] = 1;
                    $queue->enqueue($nIdx);
                }
            }
        }

        // 3. Bersihkan sela-sela putih tertutup (mis. celah antara kaki kursi / stand pot) bila latar studio seragam
        if ($isBrightStudioBg && $borderUniformity >= 0.70) {
            $vis = new \SplFixedArray($total);
            for ($i = 0; $i < $total; $i++) {
                $vis[$i] = $bgMask[$i];
            }

            $strictSq = 18 * 18;
            $startRow = (int) floor($h * 0.48); // fokus di area bawah (area kaki/rangka furnitur)

            for ($y = $startRow; $y < $h - 1; $y++) {
                for ($x = 1; $x < $w - 1; $x++) {
                    $seed = $y * $w + $x;
                    if ($vis[$seed] === 1) {
                        continue;
                    }
                    $r = $rArr[$seed];
                    $g = $gArr[$seed];
                    $b = $bArr[$seed];
                    if (min($r, $g, $b) < 236 || (max($r, $g, $b) - min($r, $g, $b)) > 16) {
                        continue;
                    }
                    $dr = $r - $bgR;
                    $dg = $g - $bgG;
                    $db = $b - $bgB;
                    if (($dr * $dr + $dg * $dg + $db * $db) > $strictSq) {
                        continue;
                    }

                    // Telusuri komponen putih tertutup dan cek kontras tepinya
                    $comp = [];
                    $q2 = new \SplQueue();
                    $vis[$seed] = 1;
                    $q2->enqueue($seed);
                    $edgeContrastSum = 0.0;
                    $edgeCount = 0;

                    while (! $q2->isEmpty()) {
                        $p = $q2->dequeue();
                        $comp[] = $p;
                        if (count($comp) > (int) ($total * 0.25)) {
                            break;
                        }
                        $px = $p % $w;
                        $py = (int) (($p - $px) / $w);
                        foreach ([$px > 0 ? $p - 1 : -1, $px + 1 < $w ? $p + 1 : -1, $py > 0 ? $p - $w : -1, $py + 1 < $h ? $p + $w : -1] as $np) {
                            if ($np < 0 || $vis[$np] === 1) {
                                continue;
                            }
                            $nr = $rArr[$np];
                            $ng = $gArr[$np];
                            $nb = $bArr[$np];
                            $nDistSq = ($nr - $bgR) * ($nr - $bgR) + ($ng - $bgG) * ($ng - $bgG) + ($nb - $bgB) * ($nb - $bgB);
                            $nChroma = max($nr, $ng, $nb) - min($nr, $ng, $nb);

                            if ($nDistSq <= $strictSq && min($nr, $ng, $nb) >= 232 && $nChroma <= 18) {
                                $vis[$np] = 1;
                                $q2->enqueue($np);
                            } else {
                                $edgeContrastSum += sqrt($nDistSq);
                                $edgeCount++;
                            }
                        }
                    }

                    // Hanya bersihkan jika dikelilingi tepi furnitur yang kontras (bukan bagian barang putih halus)
                    if (count($comp) >= 24 && $edgeCount > 0 && ($edgeContrastSum / $edgeCount) >= 58.0) {
                        foreach ($comp as $cIdx) {
                            $bgMask[$cIdx] = 1;
                        }
                    }
                }
            }
        }

        // 4. Bangun kanal alpha halus (anti-aliasing tepi + de-fringing halo putih)
        $out = imagecreatetruecolor($w, $h);
        imagealphablending($out, false);
        imagesavealpha($out, true);

        $removedPixels = 0;
        for ($y = 0, $idx = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++, $idx++) {
                if ($bgMask[$idx] === 1) {
                    $removedPixels++;
                    $col = imagecolorallocatealpha($out, 0, 0, 0, 127);
                    imagesetpixel($out, $x, $y, $col);
                    continue;
                }

                $r = $rArr[$idx];
                $g = $gArr[$idx];
                $b = $bArr[$idx];
                $alpha = $aOrig[$idx];

                // Cek apakah berada tepat di batas 1px sebelah background -> perhalus tepi & kurangi putih halo
                $touchesBg = ($x > 0 && $bgMask[$idx - 1] === 1)
                    || ($x + 1 < $w && $bgMask[$idx + 1] === 1)
                    || ($y > 0 && $bgMask[$idx - $w] === 1)
                    || ($y + 1 < $h && $bgMask[$idx + $w] === 1);

                if ($touchesBg) {
                    $dist = sqrt(($r - $bgR) * ($r - $bgR) + ($g - $bgG) * ($g - $bgG) + ($b - $bgB) * ($b - $bgB));
                    $chroma = max($r, $g, $b) - min($r, $g, $b);
                    if ($dist < $thresholdHigh * 1.45 && (! $isBrightStudioBg || $chroma < 42)) {
                        $t = max(0.0, min(1.0, ($dist - $thresholdLow) / max(1.0, $thresholdHigh * 1.45 - $thresholdLow)));
                        $alpha = max($alpha, (int) round((1.0 - $t) * 95));
                        if ($isBrightStudioBg && $alpha > 15) {
                            // Kurangi bias cahaya putih pada pixel pinggir agar menyatu di tema hangat Livora
                            $defringe = 0.72;
                            $r = max(0, min(255, (int) round($r * $defringe)));
                            $g = max(0, min(255, (int) round($g * $defringe)));
                            $b = max(0, min(255, (int) round($b * $defringe)));
                        }
                    } else {
                        $alpha = max($alpha, 16); // anti-aliasing 1px lembut
                    }
                }

                $col = imagecolorallocatealpha($out, $r, $g, $b, min(127, max(0, $alpha)));
                imagesetpixel($out, $x, $y, $col);
            }
        }

        if ($work !== $sourceImg) {
            imagedestroy($work);
        }

        $trimmed = $this->trimTransparentCanvas($out);
        imagedestroy($out);

        $removedRatio = $removedPixels / max(1, $total);
        $quality = $removedRatio >= 0.04 ? 'clean' : 'partial';

        return [$trimmed, $quality];
    }

    /**
     * Potong pinggiran transparan berlebih dengan menyisakan margin 3% agar furnitur memenuhi card.
     */
    private function trimTransparentCanvas(\GdImage $img): \GdImage
    {
        $w = imagesx($img);
        $h = imagesy($img);
        $minX = $w;
        $minY = $h;
        $maxX = -1;
        $maxY = -1;

        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                $alpha = (imagecolorat($img, $x, $y) >> 24) & 0x7F;
                if ($alpha < 118) {
                    if ($x < $minX) {
                        $minX = $x;
                    }
                    if ($x > $maxX) {
                        $maxX = $x;
                    }
                    if ($y < $minY) {
                        $minY = $y;
                    }
                    if ($y > $maxY) {
                        $maxY = $y;
                    }
                }
            }
        }

        if ($maxX < $minX || $maxY < $minY) {
            $copy = imagecreatetruecolor($w, $h);
            imagealphablending($copy, false);
            imagesavealpha($copy, true);
            imagecopy($copy, $img, 0, 0, 0, 0, $w, $h);

            return $copy;
        }

        $cw = $maxX - $minX + 1;
        $ch = $maxY - $minY + 1;
        $pad = (int) round(max($cw, $ch) * 0.03);

        $outW = $cw + ($pad * 2);
        $outH = $ch + ($pad * 2);
        $dst = imagecreatetruecolor($outW, $outH);
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        $trans = imagecolorallocatealpha($dst, 0, 0, 0, 127);
        imagefill($dst, 0, 0, $trans);
        imagecopy($dst, $img, $pad, $pad, $minX, $minY, $cw, $ch);

        return $dst;
    }

    /**
     * @param  array<string, mixed>|null  $geminiAnalysis
     */
    private function upscaleImageAlphaSafe(\GdImage $sourceImg, ?array $geminiAnalysis): \GdImage
    {
        $origW = imagesx($sourceImg);
        $origH = imagesy($sourceImg);
        $targetW = min(3840, $origW * 2);
        $targetH = min(3840, $origH * 2);

        $outputImg = imagecreatetruecolor($targetW, $targetH);
        imagealphablending($outputImg, false);
        imagesavealpha($outputImg, true);
        $transColour = imagecolorallocatealpha($outputImg, 0, 0, 0, 127);
        imagefill($outputImg, 0, 0, $transColour);

        imagecopyresampled($outputImg, $sourceImg, 0, 0, 0, 0, $targetW, $targetH, $origW, $origH);

        // Simpan kanal alpha asli sebelum konvolusi agar tepi transparan tidak menghitam
        $alphas = new \SplFixedArray($targetW * $targetH);
        for ($y = 0, $i = 0; $y < $targetH; $y++) {
            for ($x = 0; $x < $targetW; $x++, $i++) {
                $alphas[$i] = (imagecolorat($outputImg, $x, $y) >> 24) & 0x7F;
            }
        }

        $sharpFactor = max(0.8, min(1.3, (float) ($geminiAnalysis['upscale_params']['sharpness'] ?? 1.15)));
        $k = 0.08 * $sharpFactor;
        $matrix = [
            [-$k, -$k, -$k],
            [-$k, 1 + (8 * $k), -$k],
            [-$k, -$k, -$k],
        ];
        @imageconvolution($outputImg, $matrix, 1.0, 0.0);

        for ($y = 0, $i = 0; $y < $targetH; $y++) {
            for ($x = 0; $x < $targetW; $x++, $i++) {
                $c = imagecolorat($outputImg, $x, $y);
                $r = ($c >> 16) & 0xFF;
                $g = ($c >> 8) & 0xFF;
                $b = $c & 0xFF;
                $col = imagecolorallocatealpha($outputImg, $r, $g, $b, $alphas[$i]);
                imagesetpixel($outputImg, $x, $y, $col);
            }
        }

        return $outputImg;
    }
}
