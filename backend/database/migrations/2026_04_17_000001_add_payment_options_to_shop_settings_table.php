<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shop_settings', function (Blueprint $table) {
            $table->json('payment_methods')->nullable()->after('logo_path');
            $table->json('wallet_providers')->nullable()->after('payment_methods');
        });
    }

    public function down(): void
    {
        Schema::table('shop_settings', function (Blueprint $table) {
            $table->dropColumn(['payment_methods', 'wallet_providers']);
        });
    }
};
