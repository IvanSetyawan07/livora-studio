<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Menentukan bahasa aktif untuk seluruh respons API.
 *
 * Urutan: ?lang= → header X-Locale → preferensi bahasa user login →
 * Accept-Language → default 'en'.
 */
class SetLocale
{
    private const SUPPORTED = ['en', 'id'];

    public function handle(Request $request, Closure $next)
    {
        $locale = $this->normalize($request->query('lang'))
            ?? $this->normalize($request->header('X-Locale'))
            ?? $this->normalize(optional($request->user())->language)
            ?? $this->normalize(substr((string) $request->header('Accept-Language'), 0, 2))
            ?? 'en';

        app()->setLocale($locale);

        return $next($request);
    }

    private function normalize(?string $value): ?string
    {
        $value = strtolower(trim((string) $value));

        return in_array($value, self::SUPPORTED, true) ? $value : null;
    }
}
