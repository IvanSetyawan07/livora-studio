<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_login_membutuhkan_email_dan_password(): void
    {
        $this->postJson('/api/login', [])->assertStatus(422);
    }
}
