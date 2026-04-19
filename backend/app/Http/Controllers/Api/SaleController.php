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
        $sales = Sale::with(['user', 'items.product', 'payments'])->latest()->paginate(20);

        return response()->json($sales);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => ['nullable', 'string', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:50'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'payments' => ['required', 'array', 'min:1'],
            'payments.*.payment_code' => ['required', 'string', 'max:80'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $shopSettings = ShopSetting::first();
        $options = $shopSettings?->payment_options;
        if (!is_array($options) || count($options) === 0) {
            $options = [
                ['code' => 'cash', 'label' => 'Cash (MMK)', 'type' => 'cash', 'enabled' => true, 'is_cash' => true],
                ['code' => 'kpay', 'label' => 'KBZPay (MMK)', 'type' => 'wallet', 'enabled' => true, 'is_cash' => false],
            ];
        }

        $enabledOptions = [];
        foreach ($options as $option) {
            if (!is_array($option) || empty($option['enabled'])) {
                continue;
            }
            $code = (string) ($option['code'] ?? '');
            if ($code !== '') {
                $enabledOptions[$code] = $option;
            }
        }

        if (count($enabledOptions) === 0) {
            return response()->json(['message' => 'No payment option is enabled in shop settings.'], 422);
        }

        $sale = DB::transaction(function () use ($validated, $request, $enabledOptions) {
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

            $paymentsPayload = $validated['payments'];
            $paymentRows = [];
            $tendered = 0;
            $hasCash = false;

            foreach ($paymentsPayload as $index => $payment) {
                $code = $payment['payment_code'];
                $amount = (float) $payment['amount'];

                if (!array_key_exists($code, $enabledOptions)) {
                    abort(422, 'Selected payment option is not allowed.');
                }

                $option = $enabledOptions[$code];
                $isCash = (bool) ($option['is_cash'] ?? false);
                if ($isCash) {
                    $hasCash = true;
                }

                $tendered += $amount;
                $paymentRows[] = [
                    'payment_code' => $code,
                    'payment_label' => (string) ($option['label'] ?? $code),
                    'payment_type' => (string) ($option['type'] ?? 'other'),
                    'is_cash' => $isCash,
                    'amount' => $amount,
                    'sort_order' => $index + 1,
                ];
            }

            if ($tendered + 0.00001 < (float) $total) {
                abort(422, 'Total tendered amount is less than due amount.');
            }

            if (!$hasCash && abs($tendered - (float) $total) > 0.00001) {
                abort(422, 'Without cash payment, amount must be exact.');
            }

            $changeAmount = max(0, $tendered - (float) $total);

            $paymentMethod = 'mixed';
            if (count($paymentRows) === 1) {
                $paymentMethod = $paymentRows[0]['payment_code'];
            }

            $sale = Sale::create([
                'user_id' => $request->user()->id,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'discount' => $discount,
                'total' => $total,
                'change_amount' => $changeAmount,
                'payment_method' => $paymentMethod,
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

            foreach ($paymentRows as $row) {
                $sale->payments()->create($row);
            }

            return $sale;
        });

        return response()->json($sale->load(['user', 'items.product', 'payments']), 201);
    }

    public function show(Sale $sale): JsonResponse
    {
        return response()->json($sale->load(['user', 'items.product', 'payments']));
    }
}
