<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_routing_strategies', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Balanced|Quality First|Cost Saver|Speed First
            $table->boolean('automatic')->default(true);
            $table->unsignedTinyInteger('quality')->default(0);
            $table->unsignedTinyInteger('speed')->default(0);
            $table->unsignedTinyInteger('cost_efficiency')->default(0);
            $table->json('task_routing')->nullable(); // [{taskType, routedTo, reason}]
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_routing_strategies');
    }
};