<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Modul C4 — semua tabel berawalan c4_ dan berdiri sendiri.
 * Tidak ada foreign key ke tabel website: diagram tidak boleh bisa
 * menahan / mengubah data operasional (dan sebaliknya).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('c4_domains', function (Blueprint $t) {
            $t->id();
            $t->string('key', 40)->unique();
            $t->string('name', 120);
            $t->string('color', 9)->default('#94a3b8');
            $t->text('description')->nullable();
            $t->unsignedInteger('sort_order')->default(0);
            $t->string('source', 10)->default('auto'); // auto | manual
            $t->timestamps();
        });

        Schema::create('c4_elements', function (Blueprint $t) {
            $t->id();
            $t->string('key', 191)->unique();            // tbl:users, cls:App\..., ext:gemini, m:<uuid>
            $t->unsignedTinyInteger('level')->default(3); // 1 context, 2 container, 3 component, 4 code/data
            $t->string('kind', 24);                       // person|system|external|container|datastore|component|table
            $t->string('name', 160);
            $t->string('technology', 160)->nullable();
            $t->text('description')->nullable();
            $t->string('domain_key', 40)->nullable()->index();
            $t->string('parent_key', 191)->nullable()->index();
            $t->json('meta')->nullable();
            $t->string('source', 10)->default('auto');    // auto | manual
            $t->string('scan_group', 24)->nullable()->index(); // db|code|external|skeleton|frontend
            $t->boolean('is_hidden')->default(false);
            $t->json('overrides')->nullable();            // suntingan manual pada elemen auto
            $t->string('auto_state', 12)->default('present'); // present | stale
            $t->timestamp('first_seen_at')->nullable();
            $t->timestamp('last_seen_at')->nullable();
            $t->timestamp('stale_since')->nullable();
            $t->unsignedBigInteger('created_by')->nullable(); // id user (tanpa FK, sengaja)
            $t->timestamps();
            $t->index(['level', 'auto_state']);
        });

        Schema::create('c4_relations', function (Blueprint $t) {
            $t->id();
            $t->string('key', 191)->unique();
            $t->string('from_key', 191)->index();
            $t->string('to_key', 191)->index();
            $t->string('kind', 24)->default('uses');      // uses|calls|data|fk|external|inbound|schedules
            $t->string('label', 200)->nullable();
            $t->string('technology', 120)->nullable();
            $t->unsignedInteger('weight')->default(1);
            $t->string('domain_key', 40)->nullable();
            $t->json('meta')->nullable();
            $t->string('source', 10)->default('auto');
            $t->string('scan_group', 24)->nullable()->index();
            $t->boolean('is_hidden')->default(false);
            $t->json('overrides')->nullable();
            $t->string('auto_state', 12)->default('present');
            $t->timestamp('first_seen_at')->nullable();
            $t->timestamp('last_seen_at')->nullable();
            $t->timestamp('stale_since')->nullable();
            $t->unsignedBigInteger('created_by')->nullable();
            $t->timestamps();
        });

        // Posisi node per tampilan (L2, L3:<container>, ...) — menyeret node di satu
        // tampilan tidak merusak tampilan lain.
        Schema::create('c4_layouts', function (Blueprint $t) {
            $t->id();
            $t->string('view_key', 160);
            $t->string('element_key', 191);
            $t->float('x');
            $t->float('y');
            $t->timestamps();
            $t->unique(['view_key', 'element_key']);
        });

        Schema::create('c4_sync_runs', function (Blueprint $t) {
            $t->id();
            $t->string('trigger', 20)->default('manual'); // manual|schedule|migration|cli|ingest
            $t->string('status', 12)->default('running'); // running|ok|partial|failed
            $t->json('stats')->nullable();
            $t->json('changes')->nullable();
            $t->json('warnings')->nullable();
            $t->text('error')->nullable();
            $t->timestamp('started_at')->nullable();
            $t->timestamp('finished_at')->nullable();
            $t->unsignedInteger('duration_ms')->nullable();
            $t->unsignedBigInteger('triggered_by')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('c4_sync_runs');
        Schema::dropIfExists('c4_layouts');
        Schema::dropIfExists('c4_relations');
        Schema::dropIfExists('c4_elements');
        Schema::dropIfExists('c4_domains');
    }
};
