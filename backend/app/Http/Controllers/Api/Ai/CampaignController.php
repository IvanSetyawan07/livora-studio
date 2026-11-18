<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiCampaignResource;
use App\Models\AiCampaign;
use App\Services\AI\CampaignSyncService;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    public function index(Request $request, CampaignSyncService $sync)
    {
        $sync->syncIfStale(10);

        $query = AiCampaign::query()->orderByDesc('updated_at');

        if ($channel = $request->query('channel')) {
            $query->where('channel', $channel);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($health = $request->query('health')) {
            $query->where('health', $health);
        }

        return AiCampaignResource::collection($query->get());
    }

    public function show(AiCampaign $campaign)
    {
        return new AiCampaignResource($campaign);
    }

    /** POST /api/ai/campaigns */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'channel' => ['required', 'string', 'max:80'],
            'summary' => ['nullable', 'string', 'max:1000'],
            'budget_daily' => ['nullable', 'string', 'max:80'],
            'health' => ['nullable', 'in:Good,Fair,Needs Attention'],
            'status' => ['nullable', 'in:Active,Paused,Draft,Ended'],
            'plan' => ['nullable', 'array'],
            'goals' => ['nullable', 'array'],
        ]);

        $campaign = AiCampaign::create([
            'name' => $data['name'],
            'channel' => $data['channel'],
            'summary' => $data['summary'] ?? 'Kampanye marketing Livora yang dikelola dari AI Workspace.',
            'budget_daily' => $data['budget_daily'] ?? null,
            'health' => $data['health'] ?? 'Good',
            'status' => $data['status'] ?? 'Active',
            'goals' => $data['goals'] ?? [],
            'plan' => $data['plan'] ?? [
                ['id' => 'step_1', 'title' => 'Siapkan materi visual & copy sesuai brand identity Livora', 'state' => 'upcoming'],
                ['id' => 'step_2', 'title' => 'Jalankan dan pantau konversi / leads 7 hari pertama', 'state' => 'upcoming'],
            ],
            'active_experiments' => [],
            'related_recommendation_ids' => [],
            'spark' => [],
            'metric' => [
                'label' => 'Status',
                'value' => $data['status'] ?? 'Active',
                'deltaLabel' => 'Baru dibuat',
                'deltaDirection' => 'flat',
            ],
        ]);

        return (new AiCampaignResource($campaign))->response()->setStatusCode(201);
    }

    /** PATCH /api/ai/campaigns/{campaign} */
    public function update(Request $request, AiCampaign $campaign)
    {
        $data = $request->validate([
            'status' => ['nullable', 'in:Active,Paused,Draft,Ended'],
            'health' => ['nullable', 'in:Good,Fair,Needs Attention'],
            'summary' => ['nullable', 'string', 'max:1000'],
            'budget_daily' => ['nullable', 'string', 'max:80'],
            'plan' => ['nullable', 'array'],
            'goals' => ['nullable', 'array'],
        ]);

        $campaign->update(array_filter($data, fn ($v) => $v !== null));

        return new AiCampaignResource($campaign->fresh());
    }

    public function sync(CampaignSyncService $sync)
    {
        $count = $sync->sync();

        return response()->json([
            'synced' => $count,
            'campaigns' => AiCampaignResource::collection(AiCampaign::orderByDesc('updated_at')->get()),
        ]);
    }
}
