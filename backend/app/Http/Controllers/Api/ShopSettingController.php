<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShopSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ShopSettingController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = ShopSetting::firstOrCreate(
            ['id' => 1],
            ['shop_name' => 'POS System', 'header_text' => 'Fast checkout and friendly service.']
        );

        return response()->json($settings);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shop_name' => ['required', 'string', 'max:255'],
            'header_text' => ['nullable', 'string', 'max:500'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ]);

        $settings = ShopSetting::firstOrCreate(['id' => 1], ['shop_name' => 'POS System']);

        if ($request->hasFile('logo')) {
            if ($settings->logo_path) {
                Storage::disk('public')->delete($settings->logo_path);
            }

            $validated['logo_path'] = $request->file('logo')->store('shop', 'public');
        }

        unset($validated['logo']);

        $settings->update($validated);

        return response()->json($settings->fresh());
    }
}
