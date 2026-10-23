<?php

namespace Tests\Unit;

use App\Services\Shop\Guardrail;
use App\Services\Shop\LiviPrice;
use PHPUnit\Framework\TestCase;

/** Aturan harga/diskon Livi: angka hanya dari admin, diskon dihitung di PHP, janji liar tetap diblokir. */
class LiviPriceGuardrailTest extends TestCase
{
    public function test_final_price_percent_nominal_and_none(): void
    {
        $this->assertSame(4950000, LiviPrice::finalPrice(5500000, 'percent', 10));
        $this->assertSame(5000000, LiviPrice::finalPrice(5500000, 'nominal', 500000));
        $this->assertSame(5500000, LiviPrice::finalPrice(5500000, null, 0));
        $this->assertSame(0, LiviPrice::finalPrice(100, 'nominal', 500));
    }

    public function test_amount_not_from_admin_is_blocked(): void
    {
        $this->assertFalse(Guardrail::check('Harganya Rp 5.500.000 ya', [], true)['ok']);
        $this->assertTrue(Guardrail::check('Harganya Rp 5.500.000 ya', [5500000], true)['ok']);
        $this->assertFalse(Guardrail::check('Jadi Rp 1.000.000 aja', [5500000], true)['ok']);
    }

    public function test_discount_talk_only_allowed_when_verified_by_admin(): void
    {
        $this->assertFalse(Guardrail::check('Ada diskon 10% dari tim', [])['ok']);
        $this->assertTrue(Guardrail::check('Ada diskon 10% dari tim', [], true)['ok']);
    }

    public function test_payment_claims_always_blocked(): void
    {
        $this->assertFalse(Guardrail::check('pembayaran sudah kami terima', [], true)['ok']);
    }
}
