<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\MaterialController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\CertificateController;
use App\Http\Controllers\Api\StatisticsController;
use App\Http\Controllers\Api\TestController;
use App\Http\Controllers\Api\TrainingController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Auth\LoginController;

Route::post('/login', [LoginController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [LoginController::class, 'logout']);

    Route::get('/me', [LoginController::class, 'me']);

    Route::get('/trainings', [TrainingController::class, 'index']);
    Route::get('/trainings/{training}', [TrainingController::class, 'show']);
    Route::get('/trainings/{training}/materials', [TrainingController::class, 'materials']);
    Route::get('/trainings/{training}/materials/progress', [TrainingController::class, 'materialProgress']);

    Route::get('/materials/{material}', [MaterialController::class, 'show']);
    Route::get('/materials/{material}/files', [MaterialController::class, 'files']);
    Route::get('/materials/{material}/files/{file}/download', [MaterialController::class, 'downloadFile']);

    Route::middleware('role:Karyawan')->group(function () {
        Route::get('/trainings/{training}/tests/{type}', [TestController::class, 'showByType']);
        Route::get('/tests/{test}', [TestController::class, 'show']);
        Route::get('/tests/{test}/questions', [TestController::class, 'questions']);
        Route::post('/tests/{test}/submit', [TestController::class, 'submit']);

        Route::post('/materials/{material}/access', [MaterialController::class, 'markAccessed']);
        Route::get('/certificates/{training}/download', [CertificateController::class, 'download']);
    });

    Route::middleware('role:Super Admin,Admin')->group(function () {
        Route::get('/statistics', [StatisticsController::class, 'index']);
        Route::get('/statistics/export', [StatisticsController::class, 'export']);
        Route::post('/statistics/reset', [StatisticsController::class, 'reset']);
        Route::get('/certificates', [CertificateController::class, 'index']);
        Route::get('/certificates/{certificate}/file', [CertificateController::class, 'downloadFile']);

        Route::post('/materials', [MaterialController::class, 'store']);
        Route::post('/materials/chunked', [MaterialController::class, 'storeChunked']);
        Route::post('/materials/bulk', [MaterialController::class, 'bulkStore']);
        Route::put('/materials/{material}', [MaterialController::class, 'update']);
        Route::delete('/materials/{material}', [MaterialController::class, 'destroy']);

        Route::get('/questions', [QuestionController::class, 'index']);
        Route::post('/questions', [QuestionController::class, 'store']);
        Route::put('/questions/{question}', [QuestionController::class, 'update']);
        Route::delete('/questions/{question}', [QuestionController::class, 'destroy']);
    });

    Route::middleware('role:Super Admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::post('/users/import', [UserController::class, 'import']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
    });

});
