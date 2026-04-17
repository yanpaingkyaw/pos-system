<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopSetting extends Model
{
    protected $fillable = [
        'shop_name',
        'header_text',
        'logo_path',
        'payment_methods',
        'wallet_providers',
    ];

    protected function casts(): array
    {
        return [
            'payment_methods' => 'array',
            'wallet_providers' => 'array',
        ];
    }
}
