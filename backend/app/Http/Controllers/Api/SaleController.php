<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\ShopSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    public function index(): JsonResponse
    {
        $sales = Sale::with(['user', 'items.product'])->latest()->paginate(20);

        return response()->json($sales);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => ['required', 'string', 'max:50'],
            'customer_name' => ['nullable', 'string', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:50'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $shopSettings = ShopSetting::first();
        $allowedPaymentMethods = $shopSettings?->payment_methods ?? ['cash', 'wallet'];
        $walletProviders = $shopSettings?->wallet_providers ?? ['KBZPay', 'WavePay', 'AYA Pay', 'CB Pay'];

        $incomingMethod = $validated['payment_method'];
        if (str_starts_with($incomingMethod, 'wallet:')) {
            if (!in_array('wallet', $allowedPaymentMethods, true)) {
                return response()->json(['message' => 'Wallet payment is not enabled.'], 422);
            }

            $provider = substr($incomingMethod, 7);
            if (!in_array($provider, $walletProviders, true)) {
                return response()->json(['message' => 'Selected wallet provider is not allowed.'], 422);
            }
        } elseif (!in_array($incomingMethod, $allowedPaymentMethods, true)) {
            return response()->json(['message' => 'Selected payment method is not allowed.'], 422);
        }

        $sale = DB::transaction(function () use ($validated, $request) {
            $subtotal = 0;
            $saleItems = [];

            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                if ($product->quantity < $item['quantity']) {
                    abort(422, "Insufficient stock for {$product->name}");
                }

                $lineTotal = $product->price * $item['quantity'];
                $subtotal += $lineTotal;

                $saleItems[] = [
                    'product' => $product,
                    'quantity' => $item['quantity'],
                    'price' => $product->price,
                    'total' => $lineTotal,
                ];
            }

            $discount = $validated['discount'] ?? 0;
            $tax = $validated['tax'] ?? 0;
            $total = $subtotal + $tax - $discount;

            $sale = Sale::create([
                'user_id' => $request->user()->id,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'discount' => $discount,
                'total' => $total,
                'payment_method' => $validated['payment_method'],
                'customer_name' => $validated['customer_name'] ?? null,
                'customer_phone' => $validated['customer_phone'] ?? null,
                'status' => 'completed',
            ]);

            foreach ($saleItems as $item) {
                $sale->items()->create([
                    'product_id' => $item['product']->id,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'total' => $item['total'],
                ]);

                $item['product']->decrement('quantity', $item['quantity']);
            }

            return $sale;
        });

        return response()->json($sale->load(['user', 'items.product']), 201);
    }

    public function show(Sale $sale): JsonResponse
    {
        return response()->json($sale->load(['user', 'items.product']));
    }
}
