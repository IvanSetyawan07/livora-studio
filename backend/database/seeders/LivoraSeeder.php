<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\Scope;
use App\Models\FurnitureType;
use App\Models\Theme;
use App\Models\Category;
use App\Models\Project;
use App\Models\ProjectPhoto;
use App\Models\Item;

class LivoraSeeder extends Seeder
{
    public function run(): void
    {
        // ---------------- Scopes ----------------
        $scopes = [
            'Interior Design',
            'Furniture',
            'Construction',
            'Architecture',
        ];
        foreach ($scopes as $name) {
            Scope::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name]);
        }

        // ---------------- Furniture Types ----------------
        $types = ['Chair', 'Sofa', 'Table', 'Bed', 'Lighting', 'Accessories', 'Storage', 'Custom'];
        foreach ($types as $name) {
            FurnitureType::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name]);
        }

        // ---------------- Themes ----------------
        $themes = ['Japandi', 'Warm Modern', 'Editorial', 'Minimalist', 'Classic', 'Luxury'];
        foreach ($themes as $name) {
            Theme::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name]);
        }

        // ---------------- Categories ----------------
        $cats = ['Seating', 'Living Room', 'Dining Room', 'Bedroom', 'Office', 'Outdoor', 'Hospitality'];
        foreach ($cats as $name) {
            Category::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name]);
        }

        // ---------------- Projects ----------------
        $interior = Scope::where('slug', 'interior-design')->first();
        $furniture = Scope::where('slug', 'furniture')->first();
        $construction = Scope::where('slug', 'construction')->first();

        $projectsData = [
            [
                'title' => 'Harmony One',
                'subtitle' => 'Batam',
                'description' => "Hotel\n\nA serene hospitality retreat where warm timber, soft stone, and considered light meet. Every corridor and lounge has been composed to slow the pace of arrival, inviting guests into a sense of quiet luxury that lingers long after departure.",
                'location' => 'Batam, Indonesia',
                'year' => '2026',
                'scope_id' => $interior->id,
                'is_highlighted' => true,
                'sort_order' => 1,
                'photos' => [
                    ['title' => 'Harmony One — Lobby', 'caption' => 'Modular Sofa, Tubular Curved Sofa, Coffee Table'],
                    ['title' => 'Harmony One — Lounge', 'caption' => 'Boucle Lounge Sofa, Leather Lounge Chair'],
                    ['title' => 'Harmony One — President Suite', 'caption' => 'Swivel Accent Chair, Brass Drum Coffee Table'],
                ],
            ],
            [
                'title' => 'Project House PIK II',
                'subtitle' => 'PIK 2, Jakarta',
                'description' => "Residential\n\nA private family residence designed around natural light and intimate gathering. Layered neutrals, sculpted millwork, and curated furniture pieces give the home a timeless calm — equal parts editorial and lived-in.",
                'location' => 'PIK 2, Jakarta',
                'year' => '2026',
                'scope_id' => $interior->id,
                'is_highlighted' => true,
                'sort_order' => 2,
                'photos' => [
                    ['title' => 'PIK II — Living Room', 'caption' => 'Modular Sectional Sofa, Accent Chair'],
                    ['title' => 'PIK II — Dining Room', 'caption' => 'Pleated Dining Chair, Nesting Tables'],
                    ['title' => 'PIK II — Working Room', 'caption' => 'Work Chair, White Table'],
                    ['title' => 'PIK II — Foyer', 'caption' => 'Coco Table, Coco Chair'],
                ],
            ],
            [
                'title' => 'Flytek Sinarmas',
                'subtitle' => 'Jakarta',
                'description' => "Office\n\nA modern corporate workspace blending functionality and aesthetics. Open layouts and warm material palettes encourage collaboration while maintaining a sense of refinement.",
                'location' => 'Jakarta, Indonesia',
                'year' => '2025',
                'scope_id' => $construction->id,
                'is_highlighted' => true,
                'sort_order' => 3,
                'photos' => [
                    ['title' => 'Flytek — Lobby', 'caption' => 'Reception Desk, Lounge Sofa'],
                    ['title' => 'Flytek — Open Office', 'caption' => 'Work Chair, Modular Desk'],
                ],
            ],
            [
                'title' => 'House Cihampelas',
                'subtitle' => 'Bandung',
                'description' => "Residential\n\nA refined home in the hills of Bandung, designed with a calm and grounded palette. Each space transitions naturally with layered textures and curated lighting.",
                'location' => 'Bandung, Indonesia',
                'year' => '2025',
                'scope_id' => $furniture->id,
                'is_highlighted' => false,
                'sort_order' => 4,
                'photos' => [
                    ['title' => 'Cihampelas — Living Room', 'caption' => 'Sectional Sofa, Coffee Table'],
                    ['title' => 'Cihampelas — Kitchen', 'caption' => 'Custom Cabinetry'],
                    ['title' => 'Cihampelas — Foyer', 'caption' => 'Console Table, Accent Lighting'],
                ],
            ],
        ];

        foreach ($projectsData as $p) {
            $photos = $p['photos']; unset($p['photos']);
            $p['slug'] = Str::slug($p['title']);
            $project = Project::updateOrCreate(['slug' => $p['slug']], $p);

            foreach ($photos as $i => $ph) {
                ProjectPhoto::updateOrCreate(
                    ['project_id' => $project->id, 'title' => $ph['title']],
                    ['image' => '', 'caption' => $ph['caption'], 'sort_order' => $i + 1]
                );
            }
        }

        // ---------------- Items ----------------
        $chair = FurnitureType::where('slug', 'chair')->first();
        $sofa = FurnitureType::where('slug', 'sofa')->first();
        $table = FurnitureType::where('slug', 'table')->first();
        $bed = FurnitureType::where('slug', 'bed')->first();

        $themeIds = Theme::pluck('id', 'slug');
        $catIds = Category::pluck('id', 'slug');

        $items = [
            // Chairs
            ['Swivel Accent Chair', 'UP25130', $chair->id, 'Full-Grain Leather', 'Tan Cognac / Brushed Steel', ['japandi','warm-modern','editorial'], ['seating','living-room']],
            ['Barrel Chair', 'UP25128', $chair->id, 'Full-Grain Leather', 'Tan Cognac / Brushed Steel', ['japandi','warm-modern'], ['seating','living-room']],
            ['Leather Lounge Chair', 'UP25115', $chair->id, 'Full-Grain Leather', 'Cognac Brown', ['editorial','luxury'], ['seating','hospitality']],
            ['Boucle Lounge Chair', 'UP25116', $chair->id, 'Boucle Fabric', 'Cream White', ['warm-modern','minimalist'], ['seating','living-room']],
            ['Executive Lounge Chair', 'UP25117', $chair->id, 'Leather + Steel', 'Black / Chrome', ['editorial','luxury'], ['seating','office']],
            ['Pleated Dining Chair', 'UP25118', $chair->id, 'Velvet', 'Sage Green', ['classic','luxury'], ['seating','dining-room']],
            ['Work Chair', 'UP25119', $chair->id, 'Mesh + Aluminum', 'Black', ['minimalist'], ['seating','office']],
            ['Coco Chair', 'UP25120', $chair->id, 'Rattan + Hardwood', 'Natural', ['japandi','warm-modern'], ['seating','outdoor']],

            // Sofas
            ['Tubular Curved Sofa', 'UP25127', $sofa->id, 'Soft Linen', 'Warm Beige / Natural Walnut', ['warm-modern','editorial','minimalist'], ['seating','living-room']],
            ['Milano Sofa', 'UP25121', $sofa->id, 'Premium Linen', 'Ivory', ['editorial','minimalist'], ['seating','living-room']],
            ['Modular Sectional Sofa', 'UP25122', $sofa->id, 'Boucle Fabric', 'Off White', ['warm-modern','editorial'], ['seating','living-room']],
            ['Boucle Lounge Sofa', 'UP25123', $sofa->id, 'Boucle Fabric', 'Cream', ['warm-modern','minimalist'], ['seating','hospitality']],
            ['Sage Modular Sectional Sofa', 'UP25124', $sofa->id, 'Performance Velvet', 'Sage Green', ['editorial','luxury'], ['seating','living-room']],

            // Tables
            ['Pedestal Side Table', 'UP25125', $table->id, 'Travertine', 'Cream Travertine', ['minimalist','japandi'], ['living-room']],
            ['Marble Coffee Table', 'UP25126', $table->id, 'Carrara Marble', 'White / Brass', ['luxury','editorial'], ['living-room']],
            ['Brass Drum Coffee Table', 'UP25131', $table->id, 'Brushed Brass', 'Antique Brass', ['luxury','classic'], ['living-room','hospitality']],
            ['Nesting Coffee Tables', 'UP25132', $table->id, 'Solid Walnut', 'Natural Walnut', ['warm-modern','japandi'], ['living-room']],
            ['Coco Table', 'UP25133', $table->id, 'Rattan + Glass', 'Natural', ['japandi'], ['dining-room','outdoor']],

            // Beds
            ['Linen Platform Bed', 'UP25140', $bed->id, 'Linen Upholstery', 'Oatmeal', ['minimalist','warm-modern'], ['bedroom']],
            ['Boucle Canopy Bed', 'UP25141', $bed->id, 'Boucle + Oak', 'Cream / Natural Oak', ['editorial','luxury'], ['bedroom']],
        ];

        foreach ($items as [$title, $code, $typeId, $texture, $finish, $themeSlugs, $catSlugs]) {
            $item = Item::updateOrCreate(
                ['slug' => Str::slug($title)],
                [
                    'type_id' => $typeId,
                    'title' => $title,
                    'code' => $code,
                    'texture' => $texture,
                    'finish' => $finish,
                    'availability' => 'Made to Order — 6–8 weeks',
                    'description' => "Crafted with premium materials and considered detailing — a Livora signature piece.",
                ]
            );
            $item->themes()->sync(collect($themeSlugs)->map(fn($s) => $themeIds[$s] ?? null)->filter()->values());
            $item->categories()->sync(collect($catSlugs)->map(fn($s) => $catIds[$s] ?? null)->filter()->values());
        }
    }
}
