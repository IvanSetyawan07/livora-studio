<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wishlists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('wishlistable_type');
            $table->unsignedBigInteger('wishlistable_id');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['user_id', 'wishlistable_type', 'wishlistable_id'], 'wishlist_unique');
            $table->index(['wishlistable_type', 'wishlistable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wishlists');
    }
};