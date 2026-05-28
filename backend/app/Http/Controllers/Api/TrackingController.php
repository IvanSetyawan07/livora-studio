<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrackingController extends Controller
{
    public function click(Request $r)
    {
        $data = $r->validate([
            'target_type' => 'required|in:item,project',
            'target_id' => 'required|integer',
        ]);
        DB::table('item_clicks')->insert([
            'target_type' => $data['target_type'],
            'target_id' => $data['target_id'],
            'user_id' => optional($r->user())->id,
            'clicked_at' => now(),
        ]);
        return response()->json(['ok' => true]);
    }

    public function view(Request $r)
    {
        $data = $r->validate([
            'target_type' => 'required|in:item,project',
            'target_id' => 'required|integer',
            'duration_seconds' => 'nullable|integer|min:0|max:86400',
        ]);
        DB::table('item_views')->insert([
            'target_type' => $data['target_type'],
            'target_id' => $data['target_id'],
            'user_id' => optional($r->user())->id,
            'duration_seconds' => $data['duration_seconds'] ?? 0,
            'viewed_at' => now(),
        ]);
        return response()->json(['ok' => true]);
    }
}
