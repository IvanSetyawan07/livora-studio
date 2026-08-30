<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\AI\DashboardMetricsService;

class DashboardController extends Controller
{
    public function __construct(protected DashboardMetricsService $metrics)
    {
    }

    public function health()
    {
        return response()->json($this->metrics->businessHealth());
    }

    public function priorities()
    {
        return response()->json($this->metrics->priorities());
    }

    public function kpis()
    {
        return response()->json($this->metrics->overviewKpis());
    }
}