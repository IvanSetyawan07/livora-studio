<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\AI\DashboardMetricsService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function __construct(protected DashboardMetricsService $metrics)
    {
    }

    public function health(Request $request)
    {
        [$from, $to] = $this->resolveRange($request);

        return response()->json($this->metrics->businessHealth($from, $to));
    }

    public function priorities()
    {
        return response()->json($this->metrics->priorities());
    }

    public function kpis(Request $request)
    {
        [$from, $to] = $this->resolveRange($request);

        return response()->json($this->metrics->overviewKpis($from, $to));
    }

    /**
     * Terima `from`/`to` (tanggal eksplisit) atau `days` (shorthand 7/28/90).
     * Default: 30 hari terakhir. Validasi ditolak dengan 422 lewat validate().
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    protected function resolveRange(Request $request): array
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'days' => ['nullable', 'integer', 'min:1', 'max:730'],
        ]);

        if (! empty($data['from']) || ! empty($data['to'])) {
            $to = ! empty($data['to']) ? Carbon::parse($data['to'])->endOfDay() : now()->endOfDay();
            $from = ! empty($data['from'])
                ? Carbon::parse($data['from'])->startOfDay()
                : $to->copy()->subDays(29)->startOfDay();

            return [$from, $to];
        }

        $days = (int) ($data['days'] ?? 30);
        $to = now()->endOfDay();
        $from = $to->copy()->subDays($days - 1)->startOfDay();

        return [$from, $to];
    }
}
