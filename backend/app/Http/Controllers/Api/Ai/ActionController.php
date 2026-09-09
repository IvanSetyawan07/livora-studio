<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiApprovalResource;
use App\Models\AiActivityLog;
use App\Models\AiApproval;
use App\Services\AI\Actions\ActionExecutorRegistry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class ActionController extends Controller
{
    public function __construct(protected ActionExecutorRegistry $executors)
    {
    }

    public function index()
    {
        return AiApprovalResource::collection(
            AiApproval::orderByDesc('requested_at')->get()
        );
    }

    /**
     * State machine: pending|approved -> executed.
     *
     * Eksekusi hanya ditandai 'executed' kalau ada eksekutor nyata untuk
     * action_type rekomendasinya DAN eksekusinya sukses. Kalau belum ada
     * implementasi, statusnya tidak diubah dan API mengembalikan 422 —
     * tombol "execute" tidak boleh berbohong.
     */
    public function approveAndExecute(AiApproval $action)
    {
        if (!in_array($action->status, ['pending', 'approved'], true)) {
            return response()->json([
                'message' => "Action berstatus \"{$action->status}\" tidak bisa dieksekusi.",
                'status' => $action->status,
            ], 409);
        }

        $recommendation = $action->recommendation;

        if (!$recommendation) {
            return response()->json([
                'message' => 'Recommendation terkait tidak ditemukan, action tidak bisa dieksekusi.',
            ], 422);
        }

        if (!$this->executors->supports($recommendation->action_type)) {
            $type = $recommendation->action_type ?? 'unknown';
            Log::warning("AI action execution not implemented for type {$type}", [
                'approval_id' => $action->id,
                'recommendation_id' => $recommendation->id,
            ]);

            // Keputusan manusia tetap dicatat (approved), tapi eksekusinya jujur gagal.
            DB::transaction(function () use ($action, $recommendation) {
                $action->update([
                    'status' => 'approved',
                    'decided_by' => auth()->user()->name ?? 'You',
                    'decided_at' => now(),
                ]);
                $recommendation->update(['status' => 'approved']);
            });

            return response()->json([
                'message' => "Execution not implemented for type \"{$type}\". Approval tercatat, tapi belum ada aksi nyata yang bisa dijalankan.",
                'status' => 'approved',
                'executed' => false,
            ], 422);
        }

        try {
            $summary = $this->executors->execute($recommendation);
        } catch (Throwable $e) {
            Log::error('AI action execution failed', [
                'approval_id' => $action->id,
                'error' => $e->getMessage(),
            ]);

            $action->update([
                'status' => 'failed',
                'decided_by' => auth()->user()->name ?? 'You',
                'decided_at' => now(),
            ]);

            return response()->json([
                'message' => 'Eksekusi gagal: '.$e->getMessage(),
                'status' => 'failed',
                'executed' => false,
            ], 422);
        }

        DB::transaction(function () use ($action, $recommendation, $summary) {
            $action->update([
                'status' => 'executed',
                'decided_by' => auth()->user()->name ?? 'You',
                'decided_at' => now(),
            ]);

            $recommendation->update(['status' => 'executed']);

            AiActivityLog::create([
                'actor' => auth()->user()->name ?? 'Admin',
                'agent_key' => $action->agent_key,
                'message' => $summary,
                'kind' => 'execution',
                'recommendation_id' => $recommendation->id,
            ]);
        });

        return new AiApprovalResource($action->fresh());
    }

    /** pending|approved -> rejected. */
    public function reject(AiApproval $action)
    {
        if (!in_array($action->status, ['pending', 'approved'], true)) {
            return response()->json([
                'message' => "Action berstatus \"{$action->status}\" tidak bisa ditolak.",
                'status' => $action->status,
            ], 409);
        }

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
