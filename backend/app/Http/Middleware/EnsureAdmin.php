<?php
namespace App\Http\Middleware;
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
        return $next($request);
    }
}
