<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiApprovalResource;
use App\Models\AiApproval;
use Illuminate\Support\Facades\DB;

class ActionController extends Controller
{
    public function index()
    {
        return AiApprovalResource::collection(
            AiApproval::orderByDesc('requested_at')->get()
        );
    }

    public function approveAndExecute(AiApproval $action)
    {
        DB::transaction(function () use ($action) {
            $action->update([
                'status' => 'executed',
                'decided_by' => auth()->user()->name ?? 'You',
                'decided_at' => now(),
            ]);

            $action->recommendation?->update(['status' => 'executed']);
        });

        return new AiApprovalResource($action->fresh());
    }

    public function reject(AiApproval $action)
    {
        DB::transaction(function () use ($action) {
            $action->update([
                'status' => 'rejected',
                'decided_by' => auth()->user()->name ?? 'You',
                'decided_at' => now(),
            ]);

            $action->recommendation?->update(['status' => 'rejected']);
        });

        return new AiApprovalResource($action->fresh());
    }
}