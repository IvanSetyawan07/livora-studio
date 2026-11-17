<?php

namespace Tests\Unit;

use App\Services\AI\AiPricing;
use App\Services\AI\BrandVideoRecommendationService;
use PHPUnit\Framework\TestCase;

class AiMarketingCoreTest extends TestCase
{
    public function test_gemini_36_flash_pricing_is_tracked(): void
    {
        $cost = AiPricing::costFor('gemini', 'gemini-3.6-flash', 1_000_000, 1_000_000);
        $this->assertSame(4.5, $cost);
    }

    public function test_unknown_model_returns_null_cost(): void
    {
        $this->assertNull(AiPricing::costFor('gemini', 'non-existent-model-xyz', 1000, 1000));
    }

    public function test_extracts_youtube_video_ids_across_url_variants(): void
    {
        $this->assertSame('dQw4w9WgXcQ', BrandVideoRecommendationService::extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
        $this->assertSame('abcDEF12345', BrandVideoRecommendationService::extractYouTubeVideoId('https://youtube.com/shorts/abcDEF12345?feature=share'));
        $this->assertSame('xyz98765432', BrandVideoRecommendationService::extractYouTubeVideoId('https://youtu.be/xyz98765432'));
        $this->assertNull(BrandVideoRecommendationService::extractYouTubeVideoId('https://www.instagram.com/reel/C9xyz1234/'));
    }

    public function test_rejects_unsafe_or_generic_root_social_urls(): void
    {
        $this->assertTrue(BrandVideoRecommendationService::isSafeExternalVideoUri('https://www.instagram.com/reel/C9AbCdEf123/'));
        $this->assertTrue(BrandVideoRecommendationService::isSafeExternalVideoUri('https://www.tiktok.com/@livorastudio/video/7390000000001'));
        $this->assertFalse(BrandVideoRecommendationService::isSafeExternalVideoUri('https://www.instagram.com/'));
        $this->assertFalse(BrandVideoRecommendationService::isSafeExternalVideoUri('https://help.instagram.com/12345'));
        $this->assertFalse(BrandVideoRecommendationService::isSafeExternalVideoUri('https://example.com/reel/fake'));
        $this->assertFalse(BrandVideoRecommendationService::isSafeExternalVideoUri('javascript:alert(1)'));
    }

    public function test_infers_platform_and_summarizes_traffic_honestly(): void
    {
        $this->assertSame('instagram', BrandVideoRecommendationService::inferPlatformFromChunk([
            'uri' => 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/test',
            'title' => 'Luxury Travertine Living Room | Instagram',
            'domain' => 'instagram.com',
            'snippets' => ['Modern European interior Reels'],
        ]));
        $this->assertSame('tiktok', BrandVideoRecommendationService::inferPlatformFromChunk([
            'uri' => 'https://www.tiktok.com/@archdesign/video/7123456',
            'title' => 'Custom Wardrobe Tour',
        ]));

        $disconnected = BrandVideoRecommendationService::summarizePlatformTraffic('instagram', [
            'status' => 'not_configured',
            'message' => 'Token missing',
        ]);
        $this->assertFalse($disconnected['connected']);
        $this->assertNull($disconnected['totalViews']);

        $connected = BrandVideoRecommendationService::summarizePlatformTraffic('youtube', [
            'status' => 'ok',
            'videos' => [
                ['title' => 'Video A', 'url' => 'https://youtube.com/watch?v=1', 'views' => 1000, 'engagementRate' => 5.5],
                ['title' => 'Video B', 'url' => 'https://youtube.com/watch?v=2', 'views' => 500, 'engagementRate' => 2.5],
            ],
        ]);
        $this->assertTrue($connected['connected']);
        $this->assertSame(1500, $connected['totalViews']);
        $this->assertSame(750, $connected['avgViews']);
        $this->assertSame(4.0, $connected['avgEngagementRate']);
    }

    public function test_parse_recommendation_locks_urls_metrics_and_validates_targets(): void
    {
        $candidateMap = [
            'cand_1' => [
                'platform' => 'instagram',
                'sourceKind' => 'web_discovered',
                'title' => 'Quiet Luxury Residence Reel',
                'channel' => '@studio_arch',
                'url' => 'https://www.instagram.com/reel/RealReel001/',
                'thumbnail' => '',
                'publishedAt' => null,
                'durationSeconds' => null,
                'views' => 42000,
                'likes' => 2100,
                'comments' => 84,
                'engagementRate' => 5.2,
                'metricsSource' => 'Instagram Graph API',
            ],
        ];
        $allowedTargets = [
            'item' => [
                7 => ['targetType' => 'item', 'targetId' => 7, 'name' => 'Valen Curved Bouclé Sofa'],
            ],
        ];

        $rawAiJson = <<<'JSON'
```json
{
  "trafficSummary": "IG Reels menunjukkan ER tertinggi pada 5.2%.",
  "platformNotes": {
    "instagram": "Gunakan format vertical 9:16 30 detik."
  },
  "recommendations": [
    {
      "candidateId": "cand_1",
      "brandFitScore": 140,
      "description": "Menampilkan transisi cahaya alami dan detail tekstur bouclé.",
      "reason": "Sangat selaras dengan identitas Quiet Luxury Livora dan mencatat ER 5.2%.",
      "trafficInsight": "42.000 views dengan 5.2% engagement rate.",
      "url": "https://evil-hallucinated.example/fake",
      "livoraAdaptation": {
        "conceptTitle": "Showroom Tour Valen Sofa",
        "hook": "3 detik close-up jahitan bouclé hangat.",
        "shotList": ["Close up kain", "Pan ruang keluarga", "CTA showroom"],
        "captionDraft": "Kenyamanan arsitektural di setiap sudut.",
        "recommendedChannel": "instagram",
        "targetFormat": "IG Reels 35s",
        "targetType": "item",
        "targetId": 7
      }
    },
    {
      "candidateId": "cand_999",
      "brandFitScore": 90,
      "description": "Hallucinated entry",
      "reason": "Must be dropped"
    }
  ]
}
```
JSON;

        $parsed = BrandVideoRecommendationService::parseRecommendationPayload($rawAiJson, $candidateMap, $allowedTargets);
        $this->assertNotNull($parsed);
        $this->assertCount(1, $parsed['recommendations']);
        $rec = $parsed['recommendations'][0];
        $this->assertSame('https://www.instagram.com/reel/RealReel001/', $rec['url']);
        $this->assertSame(100, $rec['brandFitScore']);
        $this->assertSame(42000, $rec['views']);
        $this->assertSame('Valen Curved Bouclé Sofa', $rec['livoraAdaptation']['targetName']);
    }
}
