<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_agents', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique(); // seo | content | ads | leads | cro
            $table->string('name');
            $table->text('purpose')->nullable();
            $table->string('status')->default('coming_soon'); // active|running|paused|coming_soon|error
            $table->string('connection_state')->default('not_connected'); // connected|not_connected|coming_soon
            $table->timestamp('last_run_at')->nullable();
            $table->json('capabilities')->nullable();
            $table->json('dependencies')->nullable(); // [{name, state}]
            $table->string('href')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_agents');
    }
};