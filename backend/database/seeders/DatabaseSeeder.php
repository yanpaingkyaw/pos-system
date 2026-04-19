<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Role;
use App\Models\ShopSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        ShopSetting::updateOrCreate(['id' => 1], [
            'shop_name' => 'My POS Shop',
            'header_text' => 'Thank you for shopping with us.',
            'payment_methods' => ['cash', 'wallet'],
            'wallet_providers' => ['KBZPay', 'WavePay', 'AYA Pay', 'CB Pay'],
            'payment_options' => [
                ['code' => 'cash', 'label' => 'Cash (MMK)', 'type' => 'cash', 'enabled' => true, 'is_cash' => true, 'sort_order' => 1],
                ['code' => 'kpay', 'label' => 'KBZPay (MMK)', 'type' => 'wallet', 'enabled' => true, 'is_cash' => false, 'sort_order' => 2],
                ['code' => 'wavepay', 'label' => 'WavePay (MMK)', 'type' => 'wallet', 'enabled' => true, 'is_cash' => false, 'sort_order' => 3],
                ['code' => 'ayapay', 'label' => 'AYA Pay (MMK)', 'type' => 'wallet', 'enabled' => true, 'is_cash' => false, 'sort_order' => 4],
                ['code' => 'cbpay', 'label' => 'CB Pay (MMK)', 'type' => 'wallet', 'enabled' => true, 'is_cash' => false, 'sort_order' => 5],
                ['code' => 'cb_mobile', 'label' => 'CB Mobile Banking (MMK)', 'type' => 'bank', 'enabled' => true, 'is_cash' => false, 'sort_order' => 6],
                ['code' => 'aya_mobile', 'label' => 'AYA Mobile Banking (MMK)', 'type' => 'bank', 'enabled' => true, 'is_cash' => false, 'sort_order' => 7],
                ['code' => 'mmqr_aya', 'label' => 'MMQR AYA (MMK)', 'type' => 'bank', 'enabled' => true, 'is_cash' => false, 'sort_order' => 8],
            ],
        ]);

        $ownerRole = Role::firstOrCreate(['slug' => 'owner'], ['name' => 'Owner']);
        $supervisorRole = Role::firstOrCreate(['slug' => 'supervisor'], ['name' => 'Supervisor']);
        $cashierRole = Role::firstOrCreate(['slug' => 'cashier'], ['name' => 'Cashier']);

        User::updateOrCreate(['email' => 'admin@pos.com'], [
            'name' => 'Admin Owner',
            'password' => Hash::make('password123'),
            'role_id' => $ownerRole->id,
        ]);

        User::updateOrCreate(['email' => 'supervisor@pos.com'], [
            'name' => 'Supervisor User',
            'password' => Hash::make('password123'),
            'role_id' => $supervisorRole->id,
        ]);

        User::updateOrCreate(['email' => 'cashier@pos.com'], [
            'name' => 'Cashier User',
            'password' => Hash::make('password123'),
            'role_id' => $cashierRole->id,
        ]);

        $categories = [
            ['name_en' => 'Beverages', 'name_my' => 'အဖျော်ယမကာ'],
            ['name_en' => 'Snacks', 'name_my' => 'အစားအစာအသေးစား'],
            ['name_en' => 'Household', 'name_my' => 'အိမ်သုံးပစ္စည်း'],
        ];

        foreach ($categories as $item) {
            Category::firstOrCreate(
                ['name_en' => $item['name_en']],
                [
                    'name_my' => $item['name_my'],
                    'slug' => Str::slug($item['name_en']) . '-' . Str::random(6),
                    'is_active' => true,
                ]
            );
        }

        $beverages = Category::where('name_en', 'Beverages')->first();
        $snacks = Category::where('name_en', 'Snacks')->first();

        if ($beverages) {
            Product::firstOrCreate(['sku' => 'SKU-COLA330'], [
                'category_id' => $beverages->id,
                'name' => 'Cola 330ml',
                'description' => 'Cold drink can',
                'price' => 1200,
                'quantity' => 50,
                'min_quantity' => 10,
                'is_active' => true,
            ]);

            Product::firstOrCreate(['sku' => 'SKU-WATER500'], [
                'category_id' => $beverages->id,
                'name' => 'Mineral Water 500ml',
                'description' => 'Drinking water bottle',
                'price' => 500,
                'quantity' => 80,
                'min_quantity' => 15,
                'is_active' => true,
            ]);
        }

        if ($snacks) {
            Product::firstOrCreate(['sku' => 'SKU-CHIPS50'], [
                'category_id' => $snacks->id,
                'name' => 'Potato Chips 50g',
                'description' => 'Salted potato chips',
                'price' => 1500,
                'quantity' => 40,
                'min_quantity' => 8,
                'is_active' => true,
            ]);
        }
    }
}
