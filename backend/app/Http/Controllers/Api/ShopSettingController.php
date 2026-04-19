<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShopSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ShopSettingController extends Controller
{
    private function defaultPaymentOptions(): array
    {
        return [
            ['code' => 'cash', 'label' => 'Cash (MMK)', 'type' => 'cash', 'enabled' => true, 'is_cash' => true, 'sort_order' => 1],
            ['code' => 'kpay', 'label' => 'KBZPay (MMK)', 'type' => 'wallet', 'enabled' => true, 'is_cash' => false, 'sort_order' => 2],
            ['code' => 'wavepay', 'label' => 'WavePay (MMK)', 'type' => 'wallet', 'enabled' => true, 'is_cash' => false, 'sort_order' => 3],
            ['code' => 'ayapay', 'label' => 'AYA Pay (MMK)', 'type' => 'wallet', 'enabled' => true, 'is_cash' => false, 'sort_order' => 4],
            ['code' => 'cbpay', 'label' => 'CB Pay (MMK)', 'type' => 'wallet', 'enabled' => true, 'is_cash' => false, 'sort_order' => 5],
            ['code' => 'cb_mobile', 'label' => 'CB Mobile Banking (MMK)', 'type' => 'bank', 'enabled' => true, 'is_cash' => false, 'sort_order' => 6],
            ['code' => 'aya_mobile', 'label' => 'AYA Mobile Banking (MMK)', 'type' => 'bank', 'enabled' => true, 'is_cash' => false, 'sort_order' => 7],
            ['code' => 'mmqr_aya', 'label' => 'MMQR AYA (MMK)', 'type' => 'bank', 'enabled' => true, 'is_cash' => false, 'sort_order' => 8],
        ];
    }

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
                'payment_options' => $this->defaultPaymentOptions(),
            ]
        );

        if (empty($settings->payment_methods)) {
            $settings->payment_methods = $this->defaultPaymentMethods();
        }

        if (empty($settings->wallet_providers)) {
            $settings->wallet_providers = $this->defaultWalletProviders();
        }

        if (empty($settings->payment_options)) {
            $settings->payment_options = $this->defaultPaymentOptions();
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
            'payment_options' => ['nullable'],
        ]);

        $settings = ShopSetting::firstOrCreate(
            ['id' => 1],
            [
                'shop_name' => 'POS System',
                'payment_methods' => $this->defaultPaymentMethods(),
                'wallet_providers' => $this->defaultWalletProviders(),
                'payment_options' => $this->defaultPaymentOptions(),
            ]
        );

        $paymentOptions = $request->input('payment_options');
        if (is_string($paymentOptions)) {
            $paymentOptions = json_decode($paymentOptions, true);
        }

        if (is_array($paymentOptions)) {
            $normalized = [];
            foreach ($paymentOptions as $index => $option) {
                if (!is_array($option)) {
                    continue;
                }

                $code = trim((string) ($option['code'] ?? ''));
                $label = trim((string) ($option['label'] ?? ''));
                if ($code === '' || $label === '') {
                    continue;
                }

                $type = trim((string) ($option['type'] ?? 'other'));
                if ($type === '') {
                    $type = 'other';
                }

                $normalized[] = [
                    'code' => $code,
                    'label' => $label,
                    'type' => $type,
                    'enabled' => (bool) ($option['enabled'] ?? false),
                    'is_cash' => (bool) ($option['is_cash'] ?? false),
                    'sort_order' => (int) ($option['sort_order'] ?? ($index + 1)),
                ];
            }

            if (count($normalized) > 0) {
                usort($normalized, static fn ($a, $b) => ($a['sort_order'] <=> $b['sort_order']));
                $validated['payment_options'] = $normalized;
                $enabled = array_values(array_filter($normalized, static fn ($entry) => $entry['enabled'] === true));
                $validated['payment_methods'] = array_values(array_unique(array_map(
                    static fn ($entry) => $entry['is_cash'] ? 'cash' : ($entry['type'] === 'wallet' ? 'wallet' : $entry['type']),
                    $enabled
                )));
                $validated['wallet_providers'] = array_values(array_map(
                    static fn ($entry) => $entry['label'],
                    array_filter($enabled, static fn ($entry) => $entry['type'] === 'wallet')
                ));
            }
        }

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

        if (empty($validated['payment_options'] ?? null)) {
            $validated['payment_options'] = $settings->payment_options ?: $this->defaultPaymentOptions();
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
