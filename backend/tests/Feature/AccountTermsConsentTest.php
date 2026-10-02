<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AccountTermsConsentTest extends TestCase
{
    use RefreshDatabase;

    /** Pengaman: tolak migrate:fresh ke database selain database tes. */
    protected function beforeRefreshingDatabase(): void
    {
        $conn = config('database.default');
        $db = (string) config("database.connections.{$conn}.database");

        if ($db !== ':memory:' && !str_ends_with($db, '_test')) {
            throw new \RuntimeException("Tes dihentikan: database '{$db}' bukan database tes.");
        }
    }

    private function registerPayload(array $override = []): array
    {
        return array_merge([
            'name' => 'Budi Test',
            'email' => 'budi@example.com',
            'phone' => '+628123456789',
            'password' => 'password123',
            'terms_accepted' => true,
            'terms_version' => '1.0',
            'privacy_version' => '1.0',
        ], $override);
    }

    private function fakeGoogle(string $email = 'baru@example.com'): void
    {
        $mock = Mockery::mock(\Google_Client::class);
        $mock->shouldReceive('verifyIdToken')->andReturn([
            'email' => $email,
            'name' => 'Google User',
            'sub' => 'g-123',
            'picture' => 'https://example.com/a.jpg',
        ]);
        $this->app->bind(\Google_Client::class, fn () => $mock);
    }

    private function consent(): array
    {
        return ['terms_accepted' => true, 'terms_version' => '1.0', 'privacy_version' => '1.0'];
    }

    public function test_register_tanpa_terms_ditolak(): void
    {
        $payload = $this->registerPayload();
        unset($payload['terms_accepted']);

        $this->postJson('/api/register', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('terms_accepted');

        $this->assertDatabaseMissing('users', ['email' => 'budi@example.com']);
    }

    public function test_register_lengkap_menyimpan_consent(): void
    {
        $this->postJson('/api/register', $this->registerPayload())
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'email']]);

        $user = User::where('email', 'budi@example.com')->firstOrFail();
        $this->assertNotNull($user->terms_accepted_at);
        $this->assertSame('1.0', $user->terms_version);
        $this->assertSame('1.0', $user->privacy_version);
    }

    public function test_google_akun_baru_tanpa_consent_terms_required(): void
    {
        $this->fakeGoogle();

        $this->postJson('/api/auth/google/callback', ['id_token' => 'dummy'])
            ->assertStatus(422)
            ->assertJson(['code' => 'terms_required', 'email' => 'baru@example.com']);

        $this->assertDatabaseMissing('users', ['email' => 'baru@example.com']);
    }

    public function test_google_consent_tanpa_versi_tetap_ditolak(): void
    {
        $this->fakeGoogle();

        $this->postJson('/api/auth/google/callback', ['id_token' => 'dummy', 'terms_accepted' => true])
            ->assertStatus(422)
            ->assertJson(['code' => 'terms_required']);

        $this->assertDatabaseMissing('users', ['email' => 'baru@example.com']);
    }

    public function test_google_akun_baru_dengan_consent_dibuat(): void
    {
        $this->fakeGoogle();

        $this->postJson('/api/auth/google/callback', ['id_token' => 'dummy'] + $this->consent())
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'email']]);

        $user = User::where('email', 'baru@example.com')->firstOrFail();
        $this->assertNotNull($user->terms_accepted_at);
        $this->assertSame('1.0', $user->terms_version);
        $this->assertSame('1.0', $user->privacy_version);
        $this->assertSame('google', $user->provider);
    }

    public function test_google_email_lama_login_tanpa_consent(): void
    {
        User::create([
            'name' => 'Lama',
            'email' => 'lama@example.com',
            'password' => 'password123',
            'role' => 'user',
        ]);
        $this->fakeGoogle('lama@example.com');

        $this->postJson('/api/auth/google/callback', ['id_token' => 'dummy'])
            ->assertOk()
            ->assertJsonStructure(['token']);

        $this->assertSame(1, User::where('email', 'lama@example.com')->count());
        $this->assertNull(User::where('email', 'lama@example.com')->first()->terms_accepted_at);
    }
}