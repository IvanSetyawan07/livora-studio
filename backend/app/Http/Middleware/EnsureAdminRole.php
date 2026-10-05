<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Peran admin pesanan: owner | cs | finance | production.
 * Admin lama tanpa admin_role dianggap owner. Pakai: ->middleware('admin_role:owner,finance')
 */
class EnsureAdminRole
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Forbidden: admin only'], 403);
        }
        $role = $user->admin_role ?: 'owner';
        if ($role !== 'owner' && !in_array($role, $roles, true)) {
            return response()->json(['message' => 'Peran Anda tidak memiliki akses ke tindakan ini.'], 403);
        }

        return $next($request);
    }
}
