<?php

namespace Tests\Unit;

use App\Services\Invite\InviteService;
use PHPUnit\Framework\TestCase;

class InvitePhoneTest extends TestCase
{
    public function test_local_zero_prefix_becomes_62(): void
    {
        $this->assertSame('6285196839261', InviteService::cleanPhone('0851-9683-9261'));
    }

    public function test_plus62_with_spaces_is_kept(): void
    {
        $this->assertSame('6285196839261', InviteService::cleanPhone('+62 851-9683-9261'));
    }

    public function test_too_short_is_rejected(): void
    {
        $this->assertNull(InviteService::cleanPhone('0812'));
    }
}
