<?php

use Illuminate\Support\Facades\Route;

Route::get('/hello', function () {
    return response()->json([
        'message' => 'Backend Advent Training API is running.'
    ]);
});