<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Peran admin: owner | cs | finance | production.
 * Akses per fitur (lihat/edit) diatur Owner lewat AdminPermissions (dicek di EnsureAdmin).
 * Middleware ini hanya mengunci tindakan khusus Owner: ->middleware('admin_role:owner').
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
        if ($roles === ['owner'] && $role !== 'owner') {
            return response()->json(['message' => 'Hanya Owner yang bisa melakukan tindakan ini.'], 403);
        }

        return $next($request);
    }
}
