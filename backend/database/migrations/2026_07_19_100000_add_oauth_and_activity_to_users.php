<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'phone')) {
                $table->string('phone')->nullable()->after('email');
            }
            if (!Schema::hasColumn('users', 'address')) {
                $table->text('address')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('users', 'avatar_url')) {
                $table->string('avatar_url')->nullable()->after('address');
            }
            if (!Schema::hasColumn('users', 'provider')) {
                $table->string('provider')->nullable()->after('avatar_url'); // 'google' | 'apple' | null
            }
            if (!Schema::hasColumn('users', 'provider_id')) {
                $table->string('provider_id')->nullable()->after('provider');
            }
            if (!Schema::hasColumn('users', 'login_count')) {
                $table->unsignedInteger('login_count')->default(0)->after('provider_id');
            }
            if (!Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('login_count');
            }
            if (!Schema::hasColumn('users', 'last_ip')) {
                $table->string('last_ip', 64)->nullable()->after('last_login_at');
            }
        });

        Schema::create('user_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 40); // login, logout, page_view, item_view, register
            $table->string('path')->nullable();
            $table->string('ip', 64)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'created_at']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_activities');
        Schema::table('users', function (Blueprint $table) {
            foreach (['phone','address','avatar_url','provider','provider_id','login_count','last_login_at','last_ip'] as $c) {
                if (Schema::hasColumn('users', $c)) $table->dropColumn($c);
            }
        });
    }
};
