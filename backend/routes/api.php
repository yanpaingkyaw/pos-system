<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\ShopSettingController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::middleware('api.auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('api.auth')->group(function () {
    Route::apiResource('categories', CategoryController::class);

    Route::get('products', [ProductController::class, 'index']);
    Route::post('products', [ProductController::class, 'store'])->middleware('role:owner,supervisor');
    Route::get('products/{product}', [ProductController::class, 'show']);
    Route::put('products/{product}', [ProductController::class, 'update'])->middleware('role:owner,supervisor');
    Route::delete('products/{product}', [ProductController::class, 'destroy'])->middleware('role:owner');
    Route::patch('products/{product}/quantity', [ProductController::class, 'updateQuantity'])
        ->middleware('role:owner,supervisor');

    Route::get('sales', [SaleController::class, 'index']);
    Route::post('sales', [SaleController::class, 'store']);
    Route::get('sales/{sale}', [SaleController::class, 'show']);

    Route::apiResource('orders', OrderController::class);

    Route::apiResource('users', UserController::class)->middleware('role:owner');

    Route::get('shop-settings', [ShopSettingController::class, 'show']);
    Route::post('shop-settings', [ShopSettingController::class, 'update'])->middleware('role:owner');

    Route::prefix('reports')->group(function () {
        Route::get('/overview', [ReportController::class, 'overview']);
        Route::get('/sales', [ReportController::class, 'sales']);
        Route::get('/products', [ReportController::class, 'products']);
        Route::get('/orders', [ReportController::class, 'orders']);
    });
});
