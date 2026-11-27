<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_two_factor_challenges', function (Blueprint $table) {
            $table->id();
            $table->string('challenge_hash', 64)->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('code_hash', 64);
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->unsignedBigInteger('sent_at');
            $table->timestamp('expires_at')->index();
            $table->json('context')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_two_factor_challenges');
    }
};
