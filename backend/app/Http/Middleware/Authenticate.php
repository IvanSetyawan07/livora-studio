<?php
namespace App\Http\Middleware;
use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;
class Authenticate extends Middleware
{
    /**
     * Backend ini API-only, tidak ada halaman login web sama sekali,
     * jadi jangan pernah coba redirect ke route bernama "login" —
     * selalu biarkan Laravel balas 401 JSON standar.
     */
    protected function redirectTo(Request $request): ?string
    {
        return null;
    }
}
