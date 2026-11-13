<?php
namespace App\Models;
use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Model;

class Item extends Model {
    use HasTranslations;
    public array $translatable = ['title','description','texture','finish','material_detail'];
    protected $fillable = [
        'type_id','collection_id','title','slug','code','texture','finish','availability','image','description',
        'stock','price','original_price','discount_type','discount_value','final_price','is_on_promo','promo_badge_text',
        'promo_start_date','promo_end_date',
        'weight_kg','volume_m3','width_cm','depth_cm','height_cm','material_detail','warehouse_note','meta_title','meta_description','price_confirmed_at'
    ];

    protected $casts = [
        'stock'          => 'integer',
        'price'          => 'float',
        'original_price' => 'float',
        'discount_value' => 'float',
        'final_price'    => 'float',
        'is_on_promo'    => 'boolean',
        'promo_start_date' => 'datetime',
        'promo_end_date'   => 'datetime',
        'weight_kg'      => 'float',
        'volume_m3'      => 'float',
        'width_cm'       => 'float',
        'depth_cm'       => 'float',
        'height_cm'      => 'float',
        'price_confirmed_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::saving(function (Item $item) {
            // Sinkronisasi harga awal jika salah satu kosong
            if ($item->original_price === null && $item->price !== null) {
                $item->original_price = $item->price;
            } elseif ($item->price === null && $item->original_price !== null) {
                $item->price = $item->original_price;
            }

            $orig = (float) ($item->original_price ?? 0);
            $val = (float) ($item->discount_value ?? 0);
            $type = strtoupper(trim((string) ($item->discount_type ?? '')));

            if ($orig > 0 && $val > 0 && in_array($type, ['PERCENTAGE', 'FIXED_AMOUNT'], true)) {
                if ($type === 'PERCENTAGE') {
                    $val = min(100, max(0, $val));
                    $item->discount_value = $val;
                    $calc = $orig * (1 - ($val / 100));
                    $item->final_price = max(0, round($calc, 2));
                    if (empty($item->promo_badge_text)) {
                        $item->promo_badge_text = round($val) . '% OFF';
                    }
                } else {
                    $calc = max(0, $orig - $val);
                    $item->final_price = round($calc, 2);
                    if (empty($item->promo_badge_text)) {
                        $item->promo_badge_text = 'HEMAT Rp ' . number_format($val, 0, ',', '.');
                    }
                }
                $item->is_on_promo = true;
                $item->price = $item->final_price; // pastikan kolom legacy price sinkron
            } else {
                $item->final_price = $orig > 0 ? $orig : null;
                $item->is_on_promo = false;
                $item->promo_badge_text = null;
                $item->discount_value = 0;
                $item->discount_type = null;
                if ($orig > 0) {
                    $item->price = $orig;
                }
            }
        });
    }

    public function type(){ return $this->belongsTo(FurnitureType::class, 'type_id'); }
    public function collection(){ return $this->belongsTo(Collection::class); }
    public function themes(){ return $this->belongsToMany(Theme::class, 'item_theme'); }
    public function categories(){ return $this->belongsToMany(Category::class, 'category_item'); }
    public function variants(){ return $this->hasMany(FurnitureVariant::class)->orderBy('sort_order'); }
    public function gallery(){ return $this->hasMany(FurnitureGallery::class)->orderBy('sort_order'); }
    public function lifestyle(){ return $this->hasMany(FurnitureLifestyle::class)->orderBy('sort_order'); }
    public function story(){ return $this->hasOne(FurnitureStory::class); }
}
