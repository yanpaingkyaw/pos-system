<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShopSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ShopSettingController extends Controller
{
    private function defaultPaymentMethods(): array
    {
        return ['cash', 'wallet'];
    }

    private function defaultWalletProviders(): array
    {
        return ['KBZPay', 'WavePay', 'AYA Pay', 'CB Pay'];
    }

    public function show(): JsonResponse
    {
        $settings = ShopSetting::firstOrCreate(
            ['id' => 1],
            [
                'shop_name' => 'POS System',
                'header_text' => 'Fast checkout and friendly service.',
                'payment_methods' => $this->defaultPaymentMethods(),
                'wallet_providers' => $this->defaultWalletProviders(),
            ]
        );

        if (empty($settings->payment_methods)) {
            $settings->payment_methods = $this->defaultPaymentMethods();
        }

        if (empty($settings->wallet_providers)) {
            $settings->wallet_providers = $this->defaultWalletProviders();
        }

        $settings->save();

        return response()->json($settings);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shop_name' => ['required', 'string', 'max:255'],
            'header_text' => ['nullable', 'string', 'max:500'],
            'logo' => ['nullable', 'image', 'max:2048'],
            'payment_methods' => ['nullable'],
            'wallet_providers' => ['nullable'],
        ]);

        $settings = ShopSetting::firstOrCreate(
            ['id' => 1],
            [
                'shop_name' => 'POS System',
                'payment_methods' => $this->defaultPaymentMethods(),
                'wallet_providers' => $this->defaultWalletProviders(),
            ]
        );

        $paymentMethods = $request->input('payment_methods');
        if (is_string($paymentMethods)) {
            $paymentMethods = json_decode($paymentMethods, true);
        }

        if (is_array($paymentMethods)) {
            $filtered = array_values(array_unique(array_filter(array_map('trim', $paymentMethods))));
            $allowed = ['cash', 'wallet', 'bank_transfer', 'card'];
            $validated['payment_methods'] = array_values(array_intersect($allowed, $filtered));
        }

        $walletProviders = $request->input('wallet_providers');
        if (is_string($walletProviders)) {
            $walletProviders = json_decode($walletProviders, true);
        }

        if (is_array($walletProviders)) {
            $validated['wallet_providers'] = array_values(array_filter(array_map(
                static fn ($provider) => trim((string) $provider),
                $walletProviders
            )));
        }

        if (empty($validated['payment_methods'] ?? null)) {
            $validated['payment_methods'] = $this->defaultPaymentMethods();
        }

        if (in_array('wallet', $validated['payment_methods'], true) && empty($validated['wallet_providers'] ?? null)) {
            $validated['wallet_providers'] = $this->defaultWalletProviders();
        }

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
