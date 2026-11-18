<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiActivityResource;
use App\Models\AiActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class ActivityController extends Controller
{
    /**
     * GET /api/ai/activity?agent=seo&kind=approval&limit=50
     */
    public function index(Request $request)
    {
        $query = AiActivityLog::query()->orderByDesc('created_at');

        if ($agent = $request->query('agent')) {
            $query->where('agent_key', $agent);
        }

        if ($kind = $request->query('kind')) {
            $query->where('kind', $kind);
        }

        $limit = (int) $request->query('limit', 50);
        $limit = max(1, min($limit, 200));

        $items = $query->limit($limit)->get();
        $hasReadCol = Schema::hasColumn('ai_activity_log', 'read_at');
        $unreadCount = $hasReadCol ? AiActivityLog::whereNull('read_at')->count() : 0;

        return AiActivityResource::collection($items)->additional([
            'meta' => [
                'unreadCount' => $unreadCount,
            ],
        ]);
    }

    /** POST /api/ai/activity/{activity}/read */
    public function markRead(AiActivityLog $activity)
    {
        if (Schema::hasColumn('ai_activity_log', 'read_at') && $activity->read_at === null) {
            $activity->update(['read_at' => now()]);
        }

        return (new AiActivityResource($activity->fresh()))->additional([
            'unreadCount' => Schema::hasColumn('ai_activity_log', 'read_at')
                ? AiActivityLog::whereNull('read_at')->count()
                : 0,
        ]);
    }

    /** POST /api/ai/activity/read-all */
    public function markAllRead()
    {
        if (Schema::hasColumn('ai_activity_log', 'read_at')) {
            AiActivityLog::whereNull('read_at')->update(['read_at' => now()]);
        }

        return response()->json([
            'ok' => true,
            'unreadCount' => 0,
        ]);
    }
}
