<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Item, Project, User, Collection, Catalog};
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AnalyticsController extends Controller
{
    /** Resolve the reporting period (masa pembukaan → masa penutupan). */
    private function period(Request $request): array
    {
        $to = $request->query('to')
            ? Carbon::parse($request->query('to'))->endOfDay()
            : now()->endOfDay();
        $from = $request->query('from')
            ? Carbon::parse($request->query('from'))->startOfDay()
            : (clone $to)->copy()->subDays(29)->startOfDay();

        if ($from->gt($to)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }
        return [$from, $to];
    }

    private function titleFor(string $type, $id): string
    {
        return match ($type) {
            'item'       => Item::find($id)?->title ?? '—',
            'project'    => Project::find($id)?->title ?? '—',
            'collection' => Collection::find($id)?->name ?? '—',
            'catalog'    => Catalog::find($id)?->title ?? Catalog::find($id)?->name ?? '—',
            default      => '—',
        };
    }

    private function topBy(string $type, Carbon $from, Carbon $to, int $limit = 10)
    {
        return DB::table('item_clicks')
            ->select('target_id', DB::raw('COUNT(*) as clicks'))
            ->where('target_type', $type)
            ->whereBetween('clicked_at', [$from, $to])
            ->groupBy('target_id')
            ->orderByDesc('clicks')->limit($limit)->get()
            ->map(fn($r) => [
                'id'     => $r->target_id,
                'title'  => $this->titleFor($type, $r->target_id),
                'clicks' => (int) $r->clicks,
            ])->values();
    }

    public function overview(Request $request)
    {
        [$from, $to] = $this->period($request);
        $scope = $request->query('scope', 'all'); // all | catalog | marketing

        // ---- Audience -------------------------------------------------
        $usersTotal  = User::count();
        $usersActive = User::where('last_seen_at', '>=', now()->subMinutes(5))->count();
        $usersToday  = User::where('last_seen_at', '>=', now()->startOfDay())->count();
        $usersNew    = User::whereBetween('created_at', [$from, $to])->count();

        // ---- Catalog performance --------------------------------------
        $topItems       = $this->topBy('item', $from, $to);
        $topProjects    = $this->topBy('project', $from, $to);
        $topCollections = $this->topBy('collection', $from, $to);
        $topCatalogs    = $this->topBy('catalog', $from, $to);

        $clicksByType = DB::table('item_clicks')
            ->select('target_type', DB::raw('COUNT(*) as clicks'))
            ->whereBetween('clicked_at', [$from, $to])
            ->groupBy('target_type')->get()
            ->map(fn($r) => ['type' => $r->target_type, 'clicks' => (int) $r->clicks])->values();

        // Daily traffic timeline
        $rawTimeline = DB::table('item_clicks')
            ->select(DB::raw('DATE(clicked_at) as d'), 'target_type', DB::raw('COUNT(*) as clicks'))
            ->whereBetween('clicked_at', [$from, $to])
            ->groupBy('d', 'target_type')->get();

        $viewsPerDay = DB::table('item_views')
            ->select(DB::raw('DATE(viewed_at) as d'), DB::raw('COUNT(*) as views'))
            ->whereBetween('viewed_at', [$from, $to])
            ->groupBy('d')->pluck('views', 'd');

        $timeline = [];
        for ($c = $from->copy(); $c->lte($to); $c->addDay()) {
            $key = $c->toDateString();
            $timeline[$key] = [
                'date' => $key,
                'item' => 0, 'project' => 0, 'collection' => 0, 'catalog' => 0,
                'clicks' => 0, 'views' => (int) ($viewsPerDay[$key] ?? 0),
            ];
        }
        foreach ($rawTimeline as $r) {
            $key = (string) $r->d;
            if (!isset($timeline[$key])) continue;
            if (array_key_exists($r->target_type, $timeline[$key])) {
                $timeline[$key][$r->target_type] += (int) $r->clicks;
            }
            $timeline[$key]['clicks'] += (int) $r->clicks;
        }
        $timeline = array_values($timeline);

        $viewStats = DB::table('item_views')
            ->select('target_type','target_id',
                DB::raw('COUNT(*) as views'),
                DB::raw('AVG(duration_seconds) as avg_seconds'),
                DB::raw('SUM(duration_seconds) as total_seconds')
            )
            ->whereBetween('viewed_at', [$from, $to])
            ->groupBy('target_type','target_id')
            ->orderByDesc('views')->limit(15)->get()
            ->map(function ($v) {
                $v->title = $this->titleFor($v->target_type, $v->target_id);
                return $v;
            });

        $totalClicks = (int) DB::table('item_clicks')->whereBetween('clicked_at', [$from, $to])->count();
        $totalViews  = (int) DB::table('item_views')->whereBetween('viewed_at', [$from, $to])->count();
        $avgDuration = (float) (DB::table('item_views')->whereBetween('viewed_at', [$from, $to])->avg('duration_seconds') ?? 0);

        // ---- Marketing / campaigns ------------------------------------
        $marketing = [
            'campaignsTotal' => 0,
            'emailsSent'     => 0,
            'campaigns'      => [],
            'byStatus'       => [],
            'timeline'       => [],
        ];
        if (Schema::hasTable('marketing_campaigns')) {
            $camps = DB::table('marketing_campaigns')
                ->whereBetween('created_at', [$from, $to])
                ->orderByDesc('created_at')->limit(25)->get();
            $marketing['campaignsTotal'] = (int) DB::table('marketing_campaigns')
                ->whereBetween('created_at', [$from, $to])->count();
            $marketing['emailsSent'] = (int) DB::table('marketing_campaigns')
                ->whereBetween('created_at', [$from, $to])->sum('sent_count');
            $marketing['campaigns'] = $camps->map(fn($c) => [
                'id'         => $c->id,
                'name'       => $c->campaign_name,
                'subject'    => $c->subject,
                'status'     => $c->status,
                'sent_count' => (int) ($c->sent_count ?? 0),
                'sent_at'    => $c->sent_at,
                'created_at' => $c->created_at,
            ])->values();
            $marketing['byStatus'] = DB::table('marketing_campaigns')
                ->select('status', DB::raw('COUNT(*) as total'), DB::raw('SUM(sent_count) as sent'))
                ->whereBetween('created_at', [$from, $to])
                ->groupBy('status')->get()
                ->map(fn($r) => ['status' => $r->status, 'total' => (int) $r->total, 'sent' => (int) $r->sent])->values();
            $marketing['timeline'] = DB::table('marketing_campaigns')
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(sent_count) as sent'), DB::raw('COUNT(*) as campaigns'))
                ->whereBetween('created_at', [$from, $to])
                ->groupBy('date')->orderBy('date')->get()
                ->map(fn($r) => ['date' => (string) $r->date, 'sent' => (int) $r->sent, 'campaigns' => (int) $r->campaigns])->values();
        }

        // ---- Leads (consultations) & wishlist --------------------------
        $leads = ['total' => 0, 'byStatus' => []];
        if (Schema::hasTable('consultations')) {
            $leads['total'] = (int) DB::table('consultations')->whereBetween('created_at', [$from, $to])->count();
            $leads['byStatus'] = DB::table('consultations')
                ->select('status', DB::raw('COUNT(*) as total'))
                ->whereBetween('created_at', [$from, $to])
                ->groupBy('status')->get()
                ->map(fn($r) => ['status' => $r->status, 'total' => (int) $r->total])->values();
        }
        $wishlistTotal = Schema::hasTable('wishlists')
            ? (int) DB::table('wishlists')->whereBetween('created_at', [$from, $to])->count() : 0;
        $chatSessions = Schema::hasTable('support_sessions')
            ? (int) DB::table('support_sessions')->whereBetween('created_at', [$from, $to])->count() : 0;

        // ---- Content inventory (for overview summary) ------------------
        $inventory = [
            'items'       => Item::count(),
            'projects'    => Project::count(),
            'collections' => Schema::hasTable('collections') ? DB::table('collections')->count() : 0,
            'catalogs'    => Schema::hasTable('catalogs') ? DB::table('catalogs')->count() : 0,
        ];

        return [
            'period' => [
                'from'  => $from->toDateString(),
                'to'    => $to->toDateString(),
                'days'  => $from->diffInDays($to) + 1,
                'scope' => $scope,
            ],
            'usersTotal' => $usersTotal,
            'usersActive' => $usersActive,
            'usersToday' => $usersToday,
            'usersNew' => $usersNew,
            'totals' => [
                'clicks' => $totalClicks,
                'views' => $totalViews,
                'avgDuration' => round($avgDuration, 1),
                'leads' => $leads['total'],
                'wishlist' => $wishlistTotal,
                'chatSessions' => $chatSessions,
            ],
            'topItems' => $topItems,
            'topProjects' => $topProjects,
            'topCollections' => $topCollections,
            'topCatalogs' => $topCatalogs,
            'clicksByType' => $clicksByType,
            'timeline' => $timeline,
            'viewStats' => $viewStats,
            'marketing' => $marketing,
            'leads' => $leads,
            'inventory' => $inventory,
        ];
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
