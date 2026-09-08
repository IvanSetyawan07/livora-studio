<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Penyimpanan terjemahan konten (polymorphic).
 *
 * Satu baris = satu field, satu bahasa, satu record konten.
 * Kolom asli di tabel sumber TIDAK diubah — dia tetap jadi nilai dasar
 * (base). Kalau ada baris di sini untuk locale yang sedang aktif, nilainya
 * menimpa nilai dasar saat model dibaca. Jadi konten lama tetap tampil apa
 * adanya sampai terjemahannya diisi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_translations', function (Blueprint $table) {
            $table->id();
            $table->string('translatable_type');
            $table->unsignedBigInteger('translatable_id');
            $table->string('locale', 5);
            $table->string('field');
            $table->text('value')->nullable();
            $table->string('source', 20)->default('manual'); // manual | ai
            $table->timestamps();

            $table->unique(
                ['translatable_type', 'translatable_id', 'locale', 'field'],
                'content_translations_unique'
            );
            $table->index(['translatable_type', 'locale'], 'content_translations_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_translations');
    }
};
