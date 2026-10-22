<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wa_conversations', function (Blueprint $t) {
            if (!Schema::hasColumn('wa_conversations', 'wa_name')) $t->string('wa_name', 120)->nullable();
            if (!Schema::hasColumn('wa_conversations', 'user_id')) $t->unsignedBigInteger('user_id')->nullable()->index();
            if (!Schema::hasColumn('wa_conversations', 'handoff_reason')) $t->string('handoff_reason', 60)->nullable();
            if (!Schema::hasColumn('wa_conversations', 'handoff_at')) $t->timestamp('handoff_at')->nullable();
        });

        Schema::table('shop_payment_proofs', function (Blueprint $t) {
            if (!Schema::hasColumn('shop_payment_proofs', 'phone')) $t->string('phone', 30)->nullable()->index();
        });
        try {
            DB::statement('ALTER TABLE shop_payment_proofs MODIFY payment_id BIGINT UNSIGNED NULL');
        } catch (\Throwable $e) {
            // sudah nullable / driver lain
        }

        if (Schema::hasTable('wa_sessions')) {
            $map = ['menunggu_cs' => 'menunggu_admin', 'aktif' => 'dipegang_admin'];
            foreach (DB::table('wa_sessions')->get() as $s) {
                if (DB::table('wa_conversations')->where('phone', $s->phone)->exists()) continue;
                DB::table('wa_conversations')->insert([
                    'phone' => $s->phone, 'state' => 'sapaan', 'mode' => $map[$s->status] ?? 'bot',
                    'order_id' => $s->order_id, 'user_id' => $s->user_id, 'handled_by' => $s->assigned_to,
                    'handled_at' => $s->status === 'aktif' ? ($s->updated_at ?? now()) : null,
                    'handoff_reason' => $s->trigger, 'handoff_at' => $s->handoff_at,
                    'fail_count' => $s->fail_count, 'last_inbound_at' => $s->last_inbound_at,
                    'created_at' => $s->created_at ?? now(), 'updated_at' => now(),
                ]);
            }
        }

        $orphans = DB::table('wa_messages')->whereNotExists(function ($q) {
            $q->select(DB::raw(1))->from('wa_conversations')->whereColumn('wa_conversations.phone', 'wa_messages.phone');
        })->select('phone')->distinct()->pluck('phone');
        foreach ($orphans as $phone) {
            DB::table('wa_conversations')->insert([
                'phone' => $phone, 'state' => 'sapaan', 'mode' => 'bot',
                'last_inbound_at' => DB::table('wa_messages')->where('phone', $phone)->where('direction', 'in')->max('created_at'),
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        DB::statement('UPDATE wa_messages m JOIN wa_conversations c ON c.phone = m.phone SET m.conversation_id = c.id WHERE m.conversation_id IS NULL');
    }

    public function down(): void
    {
        Schema::table('wa_conversations', function (Blueprint $t) {
            foreach (['wa_name', 'user_id', 'handoff_reason', 'handoff_at'] as $c) {
                if (Schema::hasColumn('wa_conversations', $c)) $t->dropColumn($c);
            }
        });
        Schema::table('shop_payment_proofs', function (Blueprint $t) {
            if (Schema::hasColumn('shop_payment_proofs', 'phone')) $t->dropColumn('phone');
        });
    }
};