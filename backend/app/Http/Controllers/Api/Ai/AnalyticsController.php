<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\Marketing\Ga4Client;
use App\Services\Marketing\MarketingPeriod;
use App\Services\Marketing\MarketingSection;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(private Ga4Client $ga4)
    {
    }

    /** GET /api/ai/analytics/overview?from&to|days */
    public function overview(Request $request)
    {
        $period = MarketingPeriod::fromRequest($request, 30);

        $section = MarketingSection::attempt($period->cacheKey('ga4:overview'), function () use ($period) {
            $now = $this->ga4->totals($period);
            $prev = $this->ga4->totals($period->previous());

            return [
                'propertyId' => $this->ga4->propertyId(),
                'series' => $this->ga4->dailySeries($period),
                'channels' => $this->ga4->channelMix($period),
                'totals' => $now,
                'previous' => $prev,
                'deltas' => [
                    'sessions' => MarketingSection::delta($now['sessions'], $prev['sessions']),
                    'users' => MarketingSection::delta($now['users'], $prev['users']),
                    'pageviews' => MarketingSection::delta($now['pageviews'], $prev['pageviews']),
                    'engagementRate' => MarketingSection::delta($now['engagementRate'], $prev['engagementRate']),
                    'conversions' => MarketingSection::delta($now['conversions'], $prev['conversions']),
                ],
            ];
        });

        return response()->json(['period' => $period->toArray(), 'generatedAt' => now()->toIso8601String()] + $section);
    }
}
