<?php

namespace Tests\Feature;

use App\Models\C4Element;
use App\Models\C4Relation;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Menjalankan modul C4 pada database yang SUDAH dimigrasi (termasuk migrasi c4_*).
 * Semua perubahan di-rollback (DatabaseTransactions).
 *
 *   php artisan migrate        # di database uji
 *   php artisan test --filter=C4ModuleTest
 *
 * Catatan: phpunit.xml bawaan memakai sqlite :memory: yang kosong → test ini akan di-skip.
 * Arahkan ke DB uji yang sudah termigrasi, mis.  DB_CONNECTION=mysql DB_DATABASE=livora_test php artisan test --filter=C4ModuleTest
 */
class C4ModuleTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (!Schema::hasTable('c4_elements') || !Schema::hasTable('users')) {
            $this->markTestSkipped('Database uji belum dimigrasi (c4_* / users tidak ada).');
        }
    }

    private function actingOwner(): User
    {
        $u = User::factory()->create(['role' => 'admin', 'admin_role' => 'owner']);
        Sanctum::actingAs($u);

        return $u;
    }

    private function sync(): array
    {
        return $this->postJson('/api/admin/c4/sync')->assertOk()->json();
    }

    /** Hitungan baris + checksum kecil semua tabel NON-c4 — dipakai membuktikan isolasi. */
    private function websiteSnapshot(): array
    {
        $snap = [];
        foreach (Schema::getTables() as $t) {
            $name = is_array($t) ? $t['name'] : $t->name;
            if (str_starts_with($name, 'c4_') || $name === 'migrations') {
                continue;
            }
            $count = DB::table($name)->count();
            $snap[$name] = $count.':'.($count > 0 && $count <= 2000 ? md5(json_encode(DB::table($name)->get())) : '-');
        }
        ksort($snap);

        return $snap;
    }

    public function test_hanya_owner_yang_boleh_mengakses(): void
    {
        $this->getJson('/api/admin/c4/graph')->assertStatus(401);

        $cs = User::factory()->create(['role' => 'admin', 'admin_role' => 'cs']);
        Sanctum::actingAs($cs);
        $this->getJson('/api/admin/c4/graph')->assertStatus(403);
        $this->postJson('/api/admin/c4/sync')->assertStatus(403);

        $customer = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($customer);
        $this->getJson('/api/admin/c4/graph')->assertStatus(403);
    }

    public function test_sync_membangun_graf_dari_website(): void
    {
        $this->actingOwner();
        $run = $this->sync();
        $this->assertContains($run['status'], ['ok', 'partial']);

        $g = $this->getJson('/api/admin/c4/graph')->assertOk()->json();
        $keys = collect($g['elements'])->pluck('key');
        $this->assertTrue($keys->contains('sys:livora'));
        $this->assertTrue($keys->contains('ctr:api'));
        $this->assertTrue($keys->contains('tbl:users'), 'tabel users harus terdeteksi dari skema');
        $this->assertTrue($keys->contains(fn ($k) => str_starts_with($k, 'cls:App\\Http\\Controllers\\')), 'controller harus terdeteksi');
        $this->assertNotEmpty($g['relations']);
        $this->assertNotEmpty($g['domains']);
        // tidak ada rahasia yang bocor ke graf
        $this->assertStringNotContainsString((string) config('app.key'), json_encode($g));
    }

    public function test_elemen_manual_dan_override_bertahan_setelah_sync(): void
    {
        $this->actingOwner();
        $this->sync();

        $manual = $this->postJson('/api/admin/c4/elements', [
            'name' => 'Sistem Akuntansi (rencana)', 'level' => 1, 'kind' => 'external', 'domain_key' => 'shop',
        ])->assertCreated()->json();
        $this->assertStringStartsWith('m:', $manual['key']);

        $rel = $this->postJson('/api/admin/c4/relations', [
            'from_key' => 'ctr:api', 'to_key' => $manual['key'], 'kind' => 'external', 'label' => 'Ekspor invoice',
        ])->assertCreated()->json();

        $users = C4Element::where('key', 'tbl:users')->firstOrFail();
        $this->putJson("/api/admin/c4/elements/{$users->id}", ['name' => 'Akun Pengguna', 'note' => 'PII'])
            ->assertOk()->assertJsonPath('name', 'Akun Pengguna')->assertJsonPath('overridden.0', 'name');

        // website "berubah": base row berbeda dari hasil scan
        $users->update(['description' => 'usang']);
        $this->sync();

        $users->refresh();
        $this->assertSame('Akun Pengguna', $users->effective('name'), 'override pengguna tidak boleh tertimpa sync');
        $this->assertSame('users', $users->name, 'base tetap mengikuti website');
        $this->assertNotSame('usang', $users->description, 'base diperbarui oleh scan');
        $this->assertNotNull(C4Element::where('key', $manual['key'])->first(), 'elemen manual tidak disentuh sync');
        $this->assertNotNull(C4Relation::where('key', $rel['key'])->first());
    }

    public function test_elemen_yang_hilang_dari_website_jadi_stale_lalu_bisa_dipurge(): void
    {
        $this->actingOwner();
        $this->sync();

        C4Element::create([
            'key' => 'tbl:tabel_hantu', 'level' => 4, 'kind' => 'table', 'name' => 'tabel_hantu', 'domain_key' => 'system',
            'parent_key' => 'ctr:db', 'source' => 'auto', 'scan_group' => 'db', 'auto_state' => 'present',
        ]);
        $run = $this->sync();
        $this->assertGreaterThanOrEqual(1, $run['stats']['elements']['stale']);
        $this->assertSame('stale', C4Element::where('key', 'tbl:tabel_hantu')->value('auto_state'));

        $this->postJson('/api/admin/c4/purge-stale')->assertOk();
        $this->assertNull(C4Element::where('key', 'tbl:tabel_hantu')->first());
    }

    public function test_hapus_elemen_auto_hanya_menyembunyikan_dan_bisa_direset(): void
    {
        $this->actingOwner();
        $this->sync();
        $el = C4Element::where('key', 'tbl:users')->firstOrFail();

        $this->deleteJson("/api/admin/c4/elements/{$el->id}")->assertOk()->assertJsonPath('hidden', true);
        $this->assertTrue((bool) $el->fresh()->is_hidden);
        $this->sync();
        $this->assertTrue((bool) $el->fresh()->is_hidden, 'sync tidak memunculkan lagi elemen yang disembunyikan');

        $this->postJson("/api/admin/c4/elements/{$el->id}/reset")->assertOk()->assertJsonPath('hidden', false);
    }

    public function test_hapus_elemen_manual_menghapus_relasinya(): void
    {
        $this->actingOwner();
        $this->sync();
        $m = $this->postJson('/api/admin/c4/elements', ['name' => 'X', 'level' => 3, 'kind' => 'component'])->json();
        $r = $this->postJson('/api/admin/c4/relations', ['from_key' => 'ctr:api', 'to_key' => $m['key'], 'kind' => 'uses'])->json();

        $this->deleteJson('/api/admin/c4/elements/'.$m['id'])->assertOk()->assertJsonPath('deleted', true);
        $this->assertNull(C4Relation::find($r['id']));
    }

    public function test_validasi_relasi_dan_domain(): void
    {
        $this->actingOwner();
        $this->sync();
        $this->postJson('/api/admin/c4/relations', ['from_key' => 'ctr:api', 'to_key' => 'tidak:ada', 'kind' => 'uses'])->assertStatus(422);
        $this->postJson('/api/admin/c4/relations', ['from_key' => 'ctr:api', 'to_key' => 'ctr:api', 'kind' => 'uses'])->assertStatus(422);
        $this->postJson('/api/admin/c4/elements', ['name' => 'Z', 'level' => 9, 'kind' => 'component'])->assertStatus(422);

        $this->postJson('/api/admin/c4/domains', ['key' => 'ops', 'name' => 'Ops', 'color' => '#ff00aa'])->assertCreated();
        $this->postJson('/api/admin/c4/domains', ['key' => 'ops', 'name' => 'Ops', 'color' => '#ff00aa'])->assertStatus(422);
        $this->postJson('/api/admin/c4/domains', ['key' => 'bad', 'name' => 'Bad', 'color' => 'red'])->assertStatus(422);

        $id = \App\Models\C4Domain::where('key', 'core')->value('id');
        $this->deleteJson("/api/admin/c4/domains/{$id}")->assertStatus(422);
        $this->deleteJson('/api/admin/c4/domains/'.\App\Models\C4Domain::where('key', 'ops')->value('id'))->assertOk();
    }

    public function test_layout_per_tampilan_bisa_disimpan_dan_direset(): void
    {
        $this->actingOwner();
        $this->putJson('/api/admin/c4/layouts', ['view_key' => 'L2', 'positions' => [['key' => 'ctr:api', 'x' => 10.5, 'y' => -20]]])->assertOk();
        $this->getJson('/api/admin/c4/layouts?view_key=L2')->assertOk()->assertJsonPath('0.key', 'ctr:api')->assertJsonPath('0.x', 10.5);
        $this->getJson('/api/admin/c4/layouts?view_key=L3:x')->assertOk()->assertJsonCount(0);
        $this->deleteJson('/api/admin/c4/layouts?view_key=L2')->assertOk();
        $this->getJson('/api/admin/c4/layouts?view_key=L2')->assertJsonCount(0);
    }

    public function test_ingest_frontend_menghubungkan_halaman_ke_controller(): void
    {
        $this->actingOwner();
        $this->sync();
        $payload = ['pages' => [[
            'route' => '/admin/ai-marketing', 'file' => 'pages/admin/ai-marketing/AiMarketingShell.tsx', 'name' => 'AiMarketingShell', 'guard' => 'admin',
            'api' => [['method' => 'POST', 'path' => '/ai/chat'], ['method' => 'GET', 'path' => '/endpoint/tidak/ada']],
        ]]];
        $run = $this->postJson('/api/admin/c4/ingest/frontend', ['payload' => $payload])->assertOk()->json();
        $this->assertSame('ok', $run['status']);
        $this->assertNotNull(C4Element::where('key', 'fe:/admin/ai-marketing')->first());
        $this->assertTrue(C4Relation::where('from_key', 'fe:/admin/ai-marketing')->where('kind', 'calls')->exists());

        // sync backend tidak boleh menganggap halaman frontend "hilang"
        $this->sync();
        $this->assertSame('present', C4Element::where('key', 'fe:/admin/ai-marketing')->value('auto_state'));
    }

    public function test_ingest_publik_butuh_token(): void
    {
        config(['c4.ingest_token' => 'rahasia-test']);
        $this->postJson('/api/c4/ingest/frontend', ['pages' => []])->assertStatus(401);
        $this->postJson('/api/c4/ingest/frontend', ['pages' => []], ['X-C4-Token' => 'salah'])->assertStatus(401);
        config(['c4.ingest_token' => null]);
        $this->postJson('/api/c4/ingest/frontend', ['pages' => []], ['X-C4-Token' => ''])->assertStatus(401);
    }

    public function test_isolasi_c4_tidak_mengubah_data_website(): void
    {
        $this->actingOwner();
        $before = $this->websiteSnapshot();

        $this->sync();
        $m = $this->postJson('/api/admin/c4/elements', ['name' => 'Uji isolasi', 'level' => 3, 'kind' => 'component'])->json();
        $this->postJson('/api/admin/c4/relations', ['from_key' => 'ctr:api', 'to_key' => $m['key'], 'kind' => 'uses']);
        $this->putJson('/api/admin/c4/elements/'.C4Element::where('key', 'tbl:users')->value('id'), ['name' => 'Rename']);
        $this->deleteJson('/api/admin/c4/elements/'.C4Element::where('key', 'tbl:items')->value('id'));
        $this->postJson('/api/admin/c4/purge-stale');
        $this->sync();

        $after = $this->websiteSnapshot();
        // satu-satunya perbedaan yang diizinkan: user admin uji yang dibuat test ini sendiri (users + personal_access_tokens)
        unset($before['users'], $after['users'], $before['personal_access_tokens'], $after['personal_access_tokens']);
        $this->assertSame($before, $after, 'C4 tidak boleh mengubah tabel website mana pun');
    }
}
