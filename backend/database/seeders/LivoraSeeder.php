<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\{Scope, FurnitureType, Theme, Category, Item, Project, ProjectPhoto};

class LivoraSeeder extends Seeder
{
    private function slugify(string $s): string
    {
        return Str::slug(strtolower(preg_replace('/&/', 'and', $s)));
    }

    public function run(): void
    {
        // --- Scopes (project category) ---
        $scopeMap = [];
        foreach (['Hotel', 'Residential', 'Office'] as $name) {
            $scopeMap[$name] = Scope::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name]
            );
        }

        // --- Furniture Types ---
        $typeNames = ['Seating', 'Table', 'Lighting', 'Storage', 'Textile', 'Decor'];
        $typeMap = [];
        foreach ($typeNames as $n) {
            $typeMap[strtoupper($n)] = FurnitureType::firstOrCreate(
                ['slug' => Str::slug($n)],
                ['name' => $n]
            );
        }

        // --- Themes & Categories: created on the fly while seeding items ---
        $themeMap = [];
        $catMap = [];
        $ensureTheme = function ($name) use (&$themeMap) {
            $slug = Str::slug($name);
            if (!isset($themeMap[$slug])) {
                $themeMap[$slug] = Theme::firstOrCreate(['slug' => $slug], ['name' => $name]);
            }
            return $themeMap[$slug];
        };
        $ensureCat = function ($name) use (&$catMap) {
            $slug = Str::slug($name);
            if (!isset($catMap[$slug])) {
                $catMap[$slug] = Category::firstOrCreate(['slug' => $slug], ['name' => $name]);
            }
            return $catMap[$slug];
        };

        // --- Items (mirrors src/data/items.ts) ---
        // [slug, title, code, type, image (relative to /seed), themes, categories]
        $items = [
            ['swivel-accent-chair','Swivel Accent Chair','UP25130','SEATING','/seed/harmony/Swivel Accent Chair.png',['Japandi','Warm Modern','Editorial'],['Seating','Living Room']],
            ['barrel-chair','Barrel Chair','UP25128','SEATING','/seed/harmony/Barrel Chair.png',['Japandi','Warm Modern','Editorial'],['Seating','Living Room']],
            ['tubular-curved-sofa','Tubular Curved Sofa','UP25127','SEATING','/seed/harmony/Tubular Curved Sofa.png',['Warm Modern','Editorial','Minimalist'],['Seating','Living Room']],
            ['pedestal-side-table','Pedestal Side Table','UP25125','TABLE','/seed/cihampelas/Pedestal Side Table.png',['Japandi','Warm Modern','Editorial'],['Table','Living Room']],
            ['milano-sofa','Milano Sofa','UP25120','SEATING','/seed/cihampelas/Milano Sofa.png',['Warm Modern','Editorial','Minimalist'],['Seating','Living Room']],
            ['valora-wing-chair','Valora Wing Chair','UP25121','SEATING','/seed/cihampelas/Valora Wing Chair.png',['Japandi','Warm Modern','Editorial'],['Seating','Living Room']],
            ['living-room-table','Living Room Table','UP25126','TABLE','/seed/cihampelas/livingArea/Living-room-table.png',['Japandi','Warm Modern','Editorial'],['Table','Living Room']],
            ['three-seat-sofa','Three-Seat Sofa','UP26102','SEATING','/seed/cihampelas/livingArea/three-seater-sofa.png',['Japandi','Minimalist','Wabi-Sabi'],['Seating','Lobby','Living Room']],
            ['l-arm-chair','L-Arm Chair','UP26103','SEATING','/seed/cihampelas/livingArea/LArm-chair.png',['Japandi','Warm Modern','Editorial'],['Seating','Living Room','Accent Piece']],
            ['white-table','White Table','UP25126','TABLE','/seed/am-house/working-room/table2.png',['Japandi','Warm Modern','Editorial'],['Table','Working Room']],
            ['coco-table','Coco Table','TB25124','TABLE',null,['Editorial','Warm Modern','Japandi'],['Table','Foyer']],
            ['accent-chair','Accent Chair','UP25122','SEATING',null,['Japandi','Minimalist','Warm Modern','Wabi-Sabi'],['Seating','Living Room','Accent Piece']],
            ['work-chair','Work Chair','UP25123','SEATING','/seed/am-house/working-room/kursikerja.png',['Minimalist','Wabi-Sabi'],['Seating','Working Room']],
            ['white-chair','White Chair','UP25125','SEATING','/seed/am-house/working-room/white-chair.png',['Japandi','Minimalist','Warm Modern','Wabi-Sabi'],['Seating','Working Room']],
            ['coco-chair','Coco Chair','UP25124','SEATING',null,['Japandi','Minimalist','Warm Modern','Wabi-Sabi'],['Seating','Foyer']],
            ['cozy-chair','Cozy Chair','UP25305','SEATING',null,['Minimalist','Wabi-Sabi'],['Seating','Accent Piece']],
            ['modular-sectional-sofa','Modular Sectional Sofa','UP26501','SEATING','/seed/am-house/living-room/modular-sectional-sofa.png',['Warm Modern','Editorial','Minimalist'],['Seating','Living Room']],
            ['wooden-lounge-chair','Wooden Lounge Chair','UP26502','SEATING','/seed/am-house/living-room/wooden-lounge-chair.png',['Japandi','Warm Modern','Editorial'],['Seating','Living Room','Accent Piece']],
            ['nesting-coffee-tables','Nesting Coffee Tables','TB26501','TABLE','/seed/am-house/living-room/nesting-coffee-tables.png',['Warm Modern','Minimalist','Japandi'],['Table','Living Room']],
            ['tan-leather-swivel-wingback-chair','Tan Leather Swivel Wingback Chair','UP26503','SEATING','/seed/am-house/living-room/tan-leather-swivel-chair.png',['Editorial','Warm Modern'],['Seating','Living Room','Accent Piece']],
            ['pleated-dining-chair','Pleated Dining Chair','UP26504','SEATING','/seed/am-house/living-room/pleated-dining-chair.png',['Warm Modern','Editorial','Minimalist'],['Seating','Dining Room']],
            ['sage-modular-sectional-sofa','Sage Modular Sectional Sofa','UP26505','SEATING','/seed/am-house/living-room/sage-modular-sectional-sofa.png',['Editorial','Warm Modern'],['Seating','Living Room']],
            ['side-table','Side Table','TB25110','TABLE',null,['Japandi','Minimalist','Warm Modern'],['Table','Living Room']],
            ['floor-lamp','Floor Lamp','LT25088','LIGHTING',null,['Warm Modern','Editorial'],['Lighting','Living Room']],
            ['sectional-sofa','Sectional Sofa','UP25410','SEATING',null,['Warm Modern','Editorial','Minimalist'],['Seating','Living Room']],
            ['sofa-three-bench','Sofa Three Bench','UP25140','SEATING',null,['Warm Modern','Editorial'],['Seating','Accent Piece']],
            ['console-table','Console Table','TB25220','TABLE',null,['Japandi','Minimalist','Editorial'],['Table','Entryway']],
            ['dining-table','Dining Table','TB25330','TABLE',null,['Warm Modern','Minimalist'],['Table','Dining Room']],
            ['pendant-light','Pendant Light','LT25155','LIGHTING',null,['Editorial','Warm Modern'],['Lighting','Dining Room']],
            ['modular-sofa','Modular Sofa','UP26101','SEATING','/seed/harmony/lobby-long-sofa.png',['Warm Modern','Editorial','Minimalist'],['Seating','Lobby']],
            ['boucle-sofa','Boucle Sofa','UP26102','SEATING','/seed/harmony/lobby-white-sofa.png',['Japandi','Minimalist','Wabi-Sabi'],['Seating','Lobby']],
            ['coffee-table','Coffee Table','TB26101','TABLE','/seed/harmony/lobby-coffee-table.png',['Editorial','Warm Modern','Japandi'],['Table','Lobby']],
            ['boucle-lounge-sofa','Boucle Lounge Sofa','UP26201','SEATING','/seed/harmony/lounge-boucle-sofa.png',['Editorial','Warm Modern','Wabi-Sabi'],['Seating','Lounge']],
            ['leather-lounge-chair','Leather Lounge Chair','UP26202','SEATING','/seed/harmony/lounge-leather-chair.png',['Editorial','Warm Modern'],['Seating','Lounge','Accent Piece']],
            ['marble-coffee-table','Marble Coffee Table','TB26201','TABLE','/seed/harmony/lounge-marble-table.png',['Editorial','Warm Modern','Minimalist'],['Table','Lounge']],
            ['executive-lounge-chair','Executive Lounge Chair','UP26203','SEATING','/seed/harmony/Executive Lounge Chair.png',['Editorial','Warm Modern'],['Seating','Lounge']],
            ['swivel-accent-chair-suite','Olive Swivel Chair','UP26301','SEATING','/seed/harmony/suite-green-chair.png',['Editorial','Warm Modern','Minimalist'],['Seating','President Suite','Accent Piece']],
            ['brass-drum-coffee-table','Brass Drum Coffee Table','TB26301','TABLE','/seed/harmony/suite-brass-table.png',['Editorial','Warm Modern'],['Table','President Suite']],
            ['freyja-sofa','Freyja Sofa','UP26401','SEATING','/seed/cihampelas/freyja-sofa.png',['Japandi','Warm Modern','Minimalist'],['Seating','Living Room']],
            ['dwarf-sofa','Dwarf Sofa','UP26402','SEATING','/seed/cihampelas/dwarf-sofa.png',['Warm Modern','Editorial','Minimalist'],['Seating','Living Room']],
            ['curved-ottoman','Curved Ottoman','UP26103','SEATING','/seed/harmony/lobby-ottoman.png',['Wabi-Sabi','Minimalist','Warm Modern'],['Seating','Lobby','Accent Piece']],
            ['lunara-swivel-chair','Lunara Swivel Chair','UP26404','SEATING','/seed/cihampelas/Lunara Swivel Chair.png',['Japandi','Warm Modern'],['Seating','Foyer','Accent Piece']],
        ];

        $itemBySlug = [];
        foreach ($items as [$slug, $title, $code, $typeKey, $image, $themes, $cats]) {
            $item = Item::updateOrCreate(
                ['slug' => $slug],
                [
                    'title' => $title,
                    'code' => $code,
                    'type_id' => $typeMap[$typeKey]->id ?? null,
                    'image' => $image,
                    'availability' => 'Made to Order',
                ]
            );
            $themeIds = array_map(fn($n) => $ensureTheme($n)->id, $themes);
            $catIds = array_map(fn($n) => $ensureCat($n)->id, $cats);
            $item->themes()->sync($themeIds);
            $item->categories()->sync($catIds);
            $itemBySlug[$slug] = $item;
        }

        // --- Projects + Photos ---
        // structure: [slug, title, subtitle, scope, location, year, description, hero, highlighted, slides[]]
        // slides: [title, image, [item display names]]
        $projects = [
            [
                'harmony-one','Harmony One','Hotel','Hotel','Batam, Indonesia','2026',
                "A serene hospitality retreat where warm timber, soft stone, and considered light meet. Every corridor and lounge has been composed to slow the pace of arrival, inviting guests into a sense of quiet luxury that lingers long after departure.",
                '/seed/harmony/harmony-1-depan.png', true,
                [
                    ['Harmony One — Lobby','/seed/harmonylobby.png',['Modular Sofa','Tubular Curved Sofa','Coffee Table','Curved Ottoman','Barrel Chair']],
                    ['Harmony One — Lounge','/seed/harmony/lounge-harmony.png',['Boucle Lounge Sofa','Leather Lounge Chair','Marble Coffee Table','Executive Lounge Chair']],
                    ['Harmony One — President Suite','/seed/harmony/president-suite-harmony.png',['Swivel Accent Chair','Brass Drum Coffee Table','Boucle Sofa']],
                ],
            ],
            [
                'am-house','Project House PIK II','Residential','Residential','PIK 2, Jakarta','2026',
                "A private family residence designed around natural light and intimate gathering. Layered neutrals, sculpted millwork, and curated furniture pieces give the home a timeless calm — equal parts editorial and lived-in.",
                '/seed/am-house/am-house.png', true,
                [
                    ['Project House PIK II — Living Room','/seed/am-house/am-house.png',['Modular Sectional Sofa','Accent Chair','Side Table','Wooden Lounge Chair','Nesting Coffee Tables']],
                    ['Project House PIK II — Living & Dining Room','/seed/am-house/am-house-living.png',['Sage Modular Sectional Sofa','Tan Leather Swivel Wingback Chair','Pleated Dining Chair','Nesting Coffee Tables']],
                    ['Project House PIK II — Working Room','/seed/am-house/am-house-office.png',['Work Chair','White Table','White Chair','Coco Chair']],
                    ['Project House PIK II — Foyer','/seed/am-house/am-house-foyer.png',['Coco Table','Coco Chair']],
                ],
            ],
            [
                'house-cihampelas','House Cihampelas','Residential','Residential','Cihampelas, Bandung','2026',
                "A contemporary two-storey residence framed by lush tropical greenery. Expansive glazing, warm timber accents, and considered outdoor living spaces blur the line between architecture and garden — quiet, modern, and unmistakably Bandung.",
                '/seed/cihampelas/house-cihampelas.png', true,
                [
                    ['House Cihampelas — Living Area','/seed/cihampelas/living-area.png',['Dwarf Sofa','Living Room Table','Three-Seat Sofa']],
                    ['House Cihampelas — Living Room','/seed/cihampelas/living-room.png',['Freyja Sofa','Dwarf Sofa','Coffee Table']],
                    ['House Cihampelas — Living Room 2','/seed/cihampelas/living-room1.png',['Valora Wing Chair','Nesting Coffee Tables','Milano Sofa']],
                    ['House Cihampelas — Foyer','/seed/cihampelas/foyer.png',['Pedestal Side Table','Lunara Swivel Chair']],
                    ['House Cihampelas — Kitchen','/seed/cihampelas/kitchen.png',[]],
                ],
            ],
            [
                'flytek-sinarmas-tower','Flytek Sinarmas Tower','Office','Office','Jakarta, Indonesia','2026',
                "A corporate workplace reimagined as a sequence of refined environments. Tactile materials, soft acoustics, and architectural lighting transform the everyday office into a confident expression of the brand it houses.",
                '/seed/sinarmas/flytek-sinarmas.png', false,
                [
                    ['Flytek Sinarmas Tower — Executive Floor','/seed/sinarmas/flytek-sinarmas.png',[]],
                ],
            ],
        ];

        foreach ($projects as $i => $pdata) {
            [$slug,$title,$subtitle,$scopeKey,$location,$year,$desc,$hero,$hl,$slides] = $pdata;
            $project = Project::updateOrCreate(
                ['slug' => $slug],
                [
                    'title' => $title,
                    'subtitle' => $subtitle,
                    'scope_id' => $scopeMap[$scopeKey]->id ?? null,
                    'location' => $location,
                    'year' => $year,
                    'description' => $desc,
                    'hero_image' => $hero,
                    'is_highlighted' => $hl,
                    'sort_order' => $i,
                ]
            );

            // Reset photos for clean re-seed
            $project->photos()->delete();

            foreach ($slides as $idx => [$ptitle, $pimg, $itemNames]) {
                $photo = $project->photos()->create([
                    'title' => $ptitle,
                    'image' => $pimg,
                    'sort_order' => $idx,
                ]);
                $ids = [];
                foreach ($itemNames as $n) {
                    $s = $this->slugify($n);
                    if (isset($itemBySlug[$s])) $ids[] = $itemBySlug[$s]->id;
                }
                if ($ids) $photo->items()->sync($ids);
            }
        }
    }
}
