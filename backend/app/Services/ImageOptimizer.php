<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Mengonversi gambar unggahan ke format WebP berkualitas tinggi (tanpa menurunkan
 * ketajaman visual di layar) dengan batas dimensi maksimal (default 1920px).
 * Jika ekstensi GD/WebP tidak tersedia atau bukan gambar statis, fallback menyimpan file asli.
 */
class ImageOptimizer
{
    public static function storeWebp(UploadedFile $file, string $folder, int $maxDim = 1920, int $quality = 88): string
    {
        $folder = trim($folder, '/');
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: '');

        // Hanya proses raster umum; SVG/GIF animasi dll. simpan apa adanya
        if (
            !extension_loaded('gd')
            || !function_exists('imagewebp')
            || !in_array($ext, ['png', 'jpg', 'jpeg', 'webp'], true)
        ) {
            return $file->store($folder, 'public');
        }

        $real = $file->getRealPath();
        if (!$real || !is_file($real)) {
            return $file->store($folder, 'public');
        }

        // Jika sudah .webp dan ukurannya sudah di bawah maxDim serta cukup ringkas (<220KB), tidak perlu re-encode
        if ($ext === 'webp' && filesize($real) <= 220 * 1024) {
            $info = @getimagesize($real);
            if ($info && max($info[0], $info[1]) <= $maxDim) {
                return $file->store($folder, 'public');
            }
        }

        $webpBytes = self::encodeToWebp($real, $ext, $maxDim, $quality);
        if ($webpBytes === null) {
            return $file->store($folder, 'public');
        }

        $relPath = ($folder !== '' ? $folder.'/' : '').Str::random(40).'.webp';
        Storage::disk('public')->put($relPath, $webpBytes);

        return $relPath;
    }

    public static function storePublicWebp(UploadedFile $file, string $folder, int $maxDim = 1920, int $quality = 88): string
    {
        return '/storage/'.self::storeWebp($file, $folder, $maxDim, $quality);
    }

    /**
     * Konversi berkas yang sudah ada di disk 'public' menjadi .webp.
     * Mengembalikan path relatif baru di disk 'public', atau null bila gagal/dilewati.
     */
    public static function convertExisting(string $relPath, int $maxDim = 1920, int $quality = 88, bool $deleteOriginal = true): ?string
    {
        $disk = Storage::disk('public');
        $relPath = ltrim(preg_replace('#^/?storage/#', '', $relPath) ?? $relPath, '/');
        if ($relPath === '' || !$disk->exists($relPath)) return null;

        $ext = strtolower(pathinfo($relPath, PATHINFO_EXTENSION));
        if (!in_array($ext, ['png', 'jpg', 'jpeg'], true)) return null;

        $full = $disk->path($relPath);
        $webpBytes = self::encodeToWebp($full, $ext, $maxDim, $quality);
        if ($webpBytes === null) return null;

        $newRel = preg_replace('/\.[^.]+$/', '.webp', $relPath);
        if (!$newRel || $newRel === $relPath) return null;

        // Jangan ganti bila ukuran hasil tidak lebih kecil
        $origSize = @filesize($full) ?: 0;
        if ($origSize > 0 && strlen($webpBytes) >= $origSize) return null;

        $disk->put($newRel, $webpBytes);
        if ($deleteOriginal) {
            $disk->delete($relPath);
        }

        return $newRel;
    }

    protected static function encodeToWebp(string $path, string $ext, int $maxDim, int $quality): ?string
    {
        $raw = @file_get_contents($path);
        if ($raw === false) return null;

        $src = @imagecreatefromstring($raw);
        if (!$src) return null;

        // Hormati orientasi EXIF pada foto JPEG dari kamera/HP
        if (in_array($ext, ['jpg', 'jpeg'], true) && function_exists('exif_read_data')) {
            $exif = @exif_read_data($path);
            $ori = (int) ($exif['Orientation'] ?? 1);
            $rotated = match ($ori) {
                3 => @imagerotate($src, 180, 0),
                6 => @imagerotate($src, -90, 0),
                8 => @imagerotate($src, 90, 0),
                default => null,
            };
            if ($rotated) {
                imagedestroy($src);
                $src = $rotated;
            }
        }

        $w = imagesx($src);
        $h = imagesy($src);
        if ($w <= 0 || $h <= 0) {
            imagedestroy($src);
            return null;
        }

        // Konversi gambar paletted (PNG-8) ke truecolor agar alpha channel & imagewebp aman
        if (function_exists('imagepalettetotruecolor') && !imageistruecolor($src)) {
            imagepalettetotruecolor($src);
        }

        $target = $src;
        if (max($w, $h) > $maxDim) {
            if ($w >= $h) {
                $nw = $maxDim;
                $nh = max(1, (int) round($h * ($maxDim / $w)));
            } else {
                $nh = $maxDim;
                $nw = max(1, (int) round($w * ($maxDim / $h)));
            }
            $dst = imagecreatetruecolor($nw, $nh);
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $trans = imagecolorallocatealpha($dst, 0, 0, 0, 127);
            imagefill($dst, 0, 0, $trans);
            imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($src);
            $target = $dst;
        } else {
            imagealphablending($target, false);
            imagesavealpha($target, true);
        }

        ob_start();
        $ok = @imagewebp($target, null, $quality);
        $bytes = ob_get_clean();
        imagedestroy($target);

        return ($ok && is_string($bytes) && $bytes !== '') ? $bytes : null;
    }
}
