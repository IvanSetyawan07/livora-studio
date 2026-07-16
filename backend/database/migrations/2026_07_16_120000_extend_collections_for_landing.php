<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('collections', function (Blueprint $t) {
            if (!Schema::hasColumn('collections', 'short_description'))  $t->text('short_description')->nullable()->after('description');
            if (!Schema::hasColumn('collections', 'hero_banner'))        $t->string('hero_banner')->nullable();
            if (!Schema::hasColumn('collections', 'card_banner'))        $t->string('card_banner')->nullable();
            if (!Schema::hasColumn('collections', 'featured_image'))     $t->string('featured_image')->nullable();
            if (!Schema::hasColumn('collections', 'display_order'))      $t->integer('display_order')->default(0);
            if (!Schema::hasColumn('collections', 'status'))             $t->string('status')->default('published');
            if (!Schema::hasColumn('collections', 'seo_title'))          $t->string('seo_title')->nullable();
            if (!Schema::hasColumn('collections', 'seo_description'))    $t->text('seo_description')->nullable();
            if (!Schema::hasColumn('collections', 'cta_text'))           $t->string('cta_text')->nullable();
            if (!Schema::hasColumn('collections', 'cta_link'))           $t->string('cta_link')->nullable();
        });

        Schema::create('collection_stories', function (Blueprint $t) {
            $t->id();
            $t->foreignId('collection_id')->constrained('collections')->cascadeOnDelete();
            $t->string('story_banner')->nullable();
            $t->text('story_description')->nullable();
            $t->string('cta_text')->nullable();
            $t->string('cta_link')->nullable();
            $t->timestamps();
            $t->unique('collection_id');
        });

        Schema::create('collection_packages', function (Blueprint $t) {
            $t->id();
            $t->foreignId('collection_id')->constrained('collections')->cascadeOnDelete();
            $t->string('name');
            $t->string('slug');
            $t->text('description')->nullable();
            $t->string('banner')->nullable();
            $t->integer('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('collection_package_item', function (Blueprint $t) {
            $t->id();
            $t->foreignId('package_id')->constrained('collection_packages')->cascadeOnDelete();
            $t->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $t->integer('sort_order')->default(0);
            $t->unique(['package_id', 'item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collection_package_item');
        Schema::dropIfExists('collection_packages');
        Schema::dropIfExists('collection_stories');
        Schema::table('collections', function (Blueprint $t) {
            foreach (['short_description','hero_banner','card_banner','featured_image','display_order','status','seo_title','seo_description','cta_text','cta_link'] as $c) {
                if (Schema::hasColumn('collections', $c)) $t->dropColumn($c);
            }
        });
    }
};
