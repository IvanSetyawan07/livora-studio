<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\AI\AiLearningMemoryService;
use Illuminate\Http\Request;

class LearningController extends Controller
{
    public function __construct(private AiLearningMemoryService $learning)
    {
    }

    /** GET /api/ai/learning/summary?days=30 */
    public function summary(Request $request)
    {
        $days = max(7, min(90, (int) $request->query('days', 30)));

        return response()->json($this->learning->summary($days));
    }

    /** POST /api/ai/learning/rules { rule, category? } */
    public function storeRule(Request $request)
    {
        $data = $request->validate([
            'rule' => ['required', 'string', 'max:500'],
            'category' => ['nullable', 'string', 'max:40'],
        ]);

        $entry = $this->learning->addRule(
            $data['rule'],
            (string) ($data['category'] ?? 'profit_focus'),
            'admin'
        );

        return response()->json($entry, 201);
    }

    /** DELETE /api/ai/learning/rules/{ruleId} */
    public function deleteRule(string $ruleId)
    {
        $removed = $this->learning->removeRule($ruleId);

        return response()->json(['ok' => $removed, 'id' => $ruleId]);
    }

    /** POST /api/ai/learning/ig-boost { title, spendRp, date?, reach?, clicks?, leads?, notes? } */
    public function storeIgBoost(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'spendRp' => ['required', 'numeric', 'min:1'],
            'date' => ['nullable', 'date'],
            'reach' => ['nullable', 'integer', 'min:0'],
            'clicks' => ['nullable', 'integer', 'min:0'],
            'leads' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string', 'max:300'],
        ]);

        $entry = $this->learning->addIgBoostEntry($data);

        return response()->json($entry, 201);
    }

    /** DELETE /api/ai/learning/ig-boost/{boostId} */
    public function deleteIgBoost(string $boostId)
    {
        $removed = $this->learning->removeIgBoostEntry($boostId);

        return response()->json(['ok' => $removed, 'id' => $boostId]);
    }
}
