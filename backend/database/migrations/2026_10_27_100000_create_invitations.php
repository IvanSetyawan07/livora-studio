<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Sebar Undangan: acara, daftar tamu (per nomor WA), dan riwayat chat AI admin. MariaDB-safe. */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('invite_events')) {
            Schema::create('invite_events', function (Blueprint $t) {
                $t->id();
                $t->string('name');
                $t->dateTime('event_date')->nullable();
                $t->string('location')->nullable();
                $t->text('description_format')->nullable();   // format pesan, placeholder {nama} {acara} {tanggal} {lokasi}
                $t->text('ai_instructions')->nullable();      // arahan gaya untuk AI saat menulis deskripsi
                $t->text('knowledge')->nullable();            // info acara untuk Livi menjawab tamu
                $t->string('default_image_path')->nullable(); // gambar umum (mis. pendaftar Google Form)
                $t->string('wa_template_name')->nullable();   // template Meta yang sudah disetujui
                $t->string('wa_template_lang', 10)->default('id');
                $t->boolean('template_has_buttons')->default(true);
                $t->string('sheet_csv_url', 1000)->nullable();
                $t->string('sheet_name_column')->nullable();
                $t->string('sheet_phone_column')->nullable();
                $t->boolean('is_active')->default(true);
                $t->timestamps();
            });
        }

        if (!Schema::hasTable('invite_guests')) {
            Schema::create('invite_guests', function (Blueprint $t) {
                $t->id();
                $t->foreignId('event_id')->constrained('invite_events')->cascadeOnDelete();
                $t->string('name');
                $t->string('phone', 30);
                $t->string('category', 20)->default('pelanggan'); // rekanan | pelanggan | pendaftar
                $t->string('source', 20)->default('manual');      // manual | import | sheet
                $t->text('description')->nullable();
                $t->string('image_path')->nullable();
                $t->string('status', 20)->default('draft');       // draft | siap | terkirim | gagal | dibalas
                $t->string('send_channel', 20)->nullable();       // otomatis | manual
                $t->timestamp('sent_at')->nullable();
                $t->string('rsvp', 10)->nullable();               // hadir | tidak
                $t->timestamp('rsvp_at')->nullable();
                $t->string('error_note', 500)->nullable();
                $t->text('notes')->nullable();
                $t->timestamps();
                $t->unique(['event_id', 'phone']);
                $t->index('phone');
            });
        }

        if (!Schema::hasTable('invite_ai_messages')) {
            Schema::create('invite_ai_messages', function (Blueprint $t) {
                $t->id();
                $t->foreignId('event_id')->constrained('invite_events')->cascadeOnDelete();
                $t->unsignedBigInteger('user_id')->nullable();
                $t->string('role', 10); // user | assistant
                $t->text('content');
                $t->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('invite_ai_messages');
        Schema::dropIfExists('invite_guests');
        Schema::dropIfExists('invite_events');
    }
};
