<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Menambahkan kolom JSON `customer_profile` pada sesi web chat (support_sessions)
 * dan percakapan WhatsApp (wa_conversations) agar Livi dapat mempelajari,
 * menyimpan, dan mengingat kebutuhan/preferensi customer antar-giliran.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('support_sessions')) {
            Schema::table('support_sessions', function (Blueprint $table) {
                if (!Schema::hasColumn('support_sessions', 'customer_profile')) {
                    $table->json('customer_profile')->nullable()->after('request_reason');
                }
            });
        }

        if (Schema::hasTable('wa_conversations')) {
            Schema::table('wa_conversations', function (Blueprint $table) {
                if (!Schema::hasColumn('wa_conversations', 'customer_profile')) {
                    $table->json('customer_profile')->nullable()->after('collected');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('support_sessions') && Schema::hasColumn('support_sessions', 'customer_profile')) {
            Schema::table('support_sessions', function (Blueprint $table) {
                $table->dropColumn('customer_profile');
            });
        }

        if (Schema::hasTable('wa_conversations') && Schema::hasColumn('wa_conversations', 'customer_profile')) {
            Schema::table('wa_conversations', function (Blueprint $table) {
                $table->dropColumn('customer_profile');
            });
        }
    }
};
