<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ShopOrder extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['form_token', 'idempotency_key'];

    protected $casts = [
        'shipping' => 'array',
        'custom_spec' => 'array',
        'wa_consent' => 'boolean',
        'form_token_expires_at' => 'datetime',
        'quote_sent_at' => 'datetime',
        'quote_expires_at' => 'datetime',
        'quote_approved_at' => 'datetime',
        'paid_at' => 'datetime',
        'shipped_at' => 'datetime',
        'received_at' => 'datetime',
        'expires_at' => 'datetime',
        'delivery_date' => 'date',
        'extra_discount_value' => 'float',
    ];

    /** Urutan status utama (untuk timeline). */
    public const FLOW = [
        'menunggu_wa', 'wa_terhubung', 'menunggu_data', 'data_lengkap', 'menunggu_review_admin',
        'penawaran', 'menunggu_bayar', 'dibayar', 'diproses', 'siap_kirim', 'dikirim', 'diterima', 'selesai',
    ];

    public const SIDE = ['dibatalkan', 'kedaluwarsa', 'perlu_tindakan'];

    /** Kolom harga — tidak boleh terlihat pelanggan sebelum penawaran dikirim. */
    public const PRICE_FIELDS = [
        'subtotal', 'product_discount', 'extra_discount_type', 'extra_discount_value', 'extra_discount_reason',
        'extra_discount', 'dpp', 'ppn', 'shipping_fee', 'installation_fee', 'other_fee', 'grand_total',
    ];

    public static function generateCode(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        do {
            $code = 'LVR-';
            for ($i = 0; $i < 6; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
        } while (static::where('code', $code)->exists());

        return $code;
    }

    public function issueFormToken(int $days = 7): string
    {
        $this->form_token = Str::random(48);
        $this->form_token_expires_at = now()->addDays($days);
        $this->save();

        return $this->form_token;
    }

    public function items() { return $this->hasMany(ShopOrderItem::class, 'order_id'); }
    public function payments() { return $this->hasMany(ShopPayment::class, 'order_id'); }
    public function documents() { return $this->hasMany(ShopDocument::class, 'order_id'); }
    public function holds() { return $this->hasMany(StockHold::class, 'order_id'); }
    public function user() { return $this->belongsTo(User::class); }

    public function quoteVisible(): bool
    {
        return $this->quote_sent_at !== null;
    }

    public function hasMto(): bool
    {
        return $this->items->contains(fn ($i) => $i->fulfillment_type === 'made_to_order');
    }
}
