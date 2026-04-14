<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function overview(): JsonResponse
    {
        return response()->json([
            'total_products' => Product::count(),
            'low_stock_products' => Product::whereColumn('quantity', '<=', 'min_quantity')->count(),
            'total_sales_amount' => Sale::sum('total'),
            'total_orders_amount' => Order::sum('total'),
        ]);
    }

    public function sales(Request $request): JsonResponse
    {
        $from = $request->query('from');
        $to = $request->query('to');

        $query = Sale::query();

        if ($from) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to) {
            $query->whereDate('created_at', '<=', $to);
        }

        return response()->json([
            'total_amount' => $query->sum('total'),
            'total_count' => $query->count(),
            'by_payment_method' => $query
                ->select('payment_method', DB::raw('COUNT(*) as count'), DB::raw('SUM(total) as amount'))
                ->groupBy('payment_method')
                ->get(),
        ]);
    }

    public function products(): JsonResponse
    {
        return response()->json([
            'total_products' => Product::count(),
            'active_products' => Product::where('is_active', true)->count(),
            'low_stock' => Product::whereColumn('quantity', '<=', 'min_quantity')->get(),
        ]);
    }

    public function orders(): JsonResponse
    {
        return response()->json([
            'total_orders' => Order::count(),
            'total_amount' => Order::sum('total'),
            'by_status' => Order::select('status', DB::raw('COUNT(*) as count'))
                ->groupBy('status')
                ->get(),
        ]);
    }
}
