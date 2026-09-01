<?php

namespace Database\Seeders;

use App\Models\AiAgent;
use Illuminate\Database\Seeder;

class AiAgentSeeder extends Seeder
{
    public function run(): void
    {
        $agents = [
            [
                'key' => 'seo',
                'name' => 'SEO Agent',
                'purpose' => 'Analyse organic visibility and identify search opportunities.',
                'capabilities' => [
                    'Keyword opportunities', 'Search Console analysis', 'Technical SEO',
                    'On-page SEO', 'Content gaps', 'Internal linking', 'Schema recommendations',
                ],
                'dependencies' => [
                    ['name' => 'Web Analytics', 'state' => 'connected'],
                    ['name' => 'Google Search Console', 'state' => 'not_connected'],
                    ['name' => 'Claude via Laravel API', 'state' => 'not_connected'],
                ],
            ],
            [
                'key' => 'content',
                'name' => 'Content Agent',
                'purpose' => 'Turn marketing opportunities into concrete content recommendations.',
                'capabilities' => ['Articles', 'Landing pages', 'Social content', 'FAQ', 'Product copy', 'Campaign content'],
                'dependencies' => [
                    ['name' => 'Collection & Product Data', 'state' => 'connected'],
                    ['name' => 'Social publishing APIs', 'state' => 'not_connected'],
                    ['name' => 'Claude via Laravel API', 'state' => 'not_connected'],
                ],
            ],
            [
                'key' => 'ads',
                'name' => 'Ads Agent',
                'purpose' => 'Analyse paid performance and recommend budget reallocation.',
                'capabilities' => ['Meta Ads', 'Google Ads', 'CPL', 'CPA', 'ROAS', 'Creative performance', 'Budget pacing'],
                'dependencies' => [
                    ['name' => 'Meta Ads API', 'state' => 'not_connected'],
                    ['name' => 'Google Ads API', 'state' => 'not_connected'],
                    ['name' => 'Claude via Laravel API', 'state' => 'not_connected'],
                ],
            ],
            [
                'key' => 'leads',
                'name' => 'Lead Intelligence Agent',
                'purpose' => 'Score lead behaviour and surface high-intent enquiries.',
                'capabilities' => [
                    'Lead scoring', 'Behaviour analysis', 'Product interest',
                    'Collection interest', 'Follow-up priority', 'Conversion probability',
                ],
                'dependencies' => [
                    ['name' => 'Lead & CRM Data', 'state' => 'connected'],
                    ['name' => 'Email sequencing', 'state' => 'not_connected'],
                    ['name' => 'Claude via Laravel API', 'state' => 'not_connected'],
                ],
            ],
            [
                'key' => 'cro',
                'name' => 'CRO Agent',
                'purpose' => 'Identify conversion friction across the Livora website.',
                'capabilities' => [
                    'Page performance', 'Funnel drop-off', 'CTA performance',
                    'Product page performance', 'Lead conversion', 'UX opportunities',
                ],
                'dependencies' => [
                    ['name' => 'Web Analytics', 'state' => 'connected'],
                    ['name' => 'Session behaviour capture', 'state' => 'not_connected'],
                    ['name' => 'Claude via Laravel API', 'state' => 'not_connected'],
                ],
            ],
        ];

        foreach ($agents as $agent) {
            $existing = AiAgent::where('key', $agent['key'])->first();

            // Hanya metadata statis (nama, tujuan, capabilities, href) yang di-refresh.
            // `status`, `connection_state`, `last_run_at` dan `dependencies` TIDAK
            // ditimpa untuk agent yang sudah ada — kalau ditimpa, agent yang sudah
            // benar-benar pernah run (mis. seo/cro) akan balik jadi "coming_soon"
            // padahal datanya live. Itu bikin dashboard berbohong.
            $payload = [
                'name' => $agent['name'],
                'purpose' => $agent['purpose'],
                'capabilities' => $agent['capabilities'],
                'href' => '/admin/ai-marketing/'.$agent['key'],
            ];

            if (!$existing) {
                $payload['status'] = 'coming_soon';
                $payload['connection_state'] = 'not_connected';
                $payload['dependencies'] = $agent['dependencies'];
            }

            AiAgent::updateOrCreate(['key' => $agent['key']], $payload);
        }
    }
}