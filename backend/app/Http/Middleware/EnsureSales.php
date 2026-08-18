<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureSales
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        // Admin adalah superset dari sales — boleh mengakses tool sales.
        if (!$user || !in_array($user->role, ['sales', 'admin'], true)) {
            return response()->json(['message' => 'Forbidden: sales only'], 403);
        }
        return $next($request);
    }

}