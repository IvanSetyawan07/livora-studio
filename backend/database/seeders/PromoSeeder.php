<?php

namespace Database\Seeders;

use App\Models\FurnitureType;
use App\Models\Item;
use App\Models\PromoBanner;
use Illuminate\Database\Seeder;

class PromoSeeder extends Seeder
{
    public function run(): void
    {
        PromoBanner::updateOrCreate(
            ['title' => 'UP TO 40% OFF'],
            [
                'subtitle' => 'Desain Interior & Furniture Custom',
                'label' => 'PROMO SPESIAL',
                'description' => 'Wujudkan rumah impian Anda dengan penawaran terbatas!',
                'image_url' => '/storage/promo_banners/sample-living-room.webp',
                'cta_text' => 'Klaim Promo',
                'cta_link' => '/promo',
                'order_index' => 0,
                'is_active' => true,
            ]
        );

        $types = FurnitureType::pluck('id', 'slug')->toArray();

        $items = [
            [
                'slug' => 'luna-lounge-sofa',
                'title' => 'Luna Lounge Modular Sofa',
                'code' => 'LV-SOFA-001',
                'type_id' => $types['sofa'] ?? 2,
                'texture' => 'Bouclé, Solid Oak',
                'finish' => 'Natural Oak',
                'availability' => 'available',
                'image' => '/storage/items/sample-sofa.webp',
                'original_price' => 18500000,
                'discount_type' => 'PERCENTAGE',
                'discount_value' => 40,
                'promo_badge_text' => '40% OFF',
                'description' => 'Sofa modular premium berbalut kain bouclé halus dengan rangka kayu oak solid.',
            ],
            [
                'slug' => 'aura-sculpted-armchair',
                'title' => 'Aura Sculpted Armchair',
                'code' => 'LV-CHR-002',
                'type_id' => $types['chair'] ?? 1,
                'texture' => 'Premium Velvet, Walnut',
                'finish' => 'Smoked Walnut',
                'availability' => 'available',
                'image' => '/storage/items/sample-chair.webp',
                'original_price' => 9200000,
                'discount_type' => 'PERCENTAGE',
                'discount_value' => 30,
                'promo_badge_text' => '30% OFF',
                'description' => 'Kursi aksen berdesain kurva elegan dengan bahan velvet lembut dan kaki walnut.',
            ],
            [
                'slug' => 'kyoto-marble-dining-table',
                'title' => 'Kyoto Marble Dining Table',
                'code' => 'LV-TBL-003',
                'type_id' => $types['table'] ?? 3,
                'texture' => 'Carrara Marble, Brass',
                'finish' => 'Brushed Brass',
                'availability' => 'available',
                'image' => '/storage/items/sample-table.webp',
                'original_price' => 24000000,
                'discount_type' => 'PERCENTAGE',
                'discount_value' => 25,
                'promo_badge_text' => '25% OFF',
                'description' => 'Meja makan marmer Carrara asli dengan aksen rangka kuningan sikat mewah.',
            ],
            [
                'slug' => 'serenity-floating-bed',
                'title' => 'Serenity Floating Platform Bed',
                'code' => 'LV-BED-004',
                'type_id' => $types['bed'] ?? 4,
                'texture' => 'Linen, Japanese Ash',
                'finish' => 'Muted Ash',
                'availability' => 'available',
                'image' => '/storage/items/sample-bed.webp',
                'original_price' => 22000000,
                'discount_type' => 'PERCENTAGE',
                'discount_value' => 35,
                'promo_badge_text' => '35% OFF',
                'description' => 'Tempat tidur berkonsep platform melayang bernuansa Japandi minimalis tenang.',
            ],
        ];

        foreach ($items as $data) {
            $item = Item::firstOrNew(['slug' => $data['slug']]);
            $item->fill($data);
            $item->save();
        }
    }
}
