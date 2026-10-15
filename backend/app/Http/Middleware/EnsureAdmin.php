<?php
namespace App\Http\Middleware;
use App\Services\AdminPermissions;
use Closure;
use Illuminate\Http\Request;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Forbidden: admin only'], 403);
        }
        if ($msg = AdminPermissions::check($request)) {
            return response()->json(['message' => $msg], 403);
        }
        return $next($request);
    }
}
