<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Item, Project, User};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function overview()
    {
        $usersTotal = User::count();
        $usersActive = User::where('last_seen_at', '>=', now()->subMinutes(5))->count();
        $usersToday = User::where('last_seen_at', '>=', now()->startOfDay())->count();

        $topItems = DB::table('item_clicks')
            ->select('target_id', DB::raw('COUNT(*) as clicks'))
            ->where('target_type', 'item')
            ->groupBy('target_id')
            ->orderByDesc('clicks')->limit(10)->get()
            ->map(function ($r) {
                $i = Item::find($r->target_id);
                return ['id' => $r->target_id, 'title' => $i?->title ?? '—', 'clicks' => (int)$r->clicks];
            });

        $topProjects = DB::table('item_clicks')
            ->select('target_id', DB::raw('COUNT(*) as clicks'))
            ->where('target_type', 'project')
            ->groupBy('target_id')
            ->orderByDesc('clicks')->limit(10)->get()
            ->map(function ($r) {
                $p = Project::find($r->target_id);
                return ['id' => $r->target_id, 'title' => $p?->title ?? '—', 'clicks' => (int)$r->clicks];
            });

        $viewStats = DB::table('item_views')
            ->select('target_type','target_id',
                DB::raw('COUNT(*) as views'),
                DB::raw('AVG(duration_seconds) as avg_seconds'),
                DB::raw('SUM(duration_seconds) as total_seconds')
            )
            ->groupBy('target_type','target_id')
            ->orderByDesc('views')->limit(10)->get();

        return compact('usersTotal','usersActive','usersToday','topItems','topProjects','viewStats');
    }

    public function activeUsers()
    {
        return User::select('id','name','email','role','last_seen_at')
            ->whereNotNull('last_seen_at')
            ->orderByDesc('last_seen_at')->limit(50)->get()
            ->map(fn($u) => array_merge($u->toArray(), [
                'is_online' => $u->last_seen_at && $u->last_seen_at->gt(now()->subMinutes(5)),
            ]));
    }
}
