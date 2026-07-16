<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\MaterialController;
use App\Http\Controllers\Api\QuestionController;
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

    Route::get('/materials/{material}', [MaterialController::class, 'show']);
    Route::post('/materials', [MaterialController::class, 'store']);
    Route::post('/materials/bulk', [MaterialController::class, 'bulkStore']);
    Route::put('/materials/{material}', [MaterialController::class, 'update']);
    Route::delete('/materials/{material}', [MaterialController::class, 'destroy']);
    Route::get('/materials/{material}/files', [MaterialController::class, 'files']);

    Route::get('/tests/{test}', [TestController::class, 'show']);
    Route::get('/tests/{test}/questions', [TestController::class, 'questions']);
    Route::post('/tests/{test}/submit', [TestController::class, 'submit']);

    Route::get('/questions', [QuestionController::class, 'index']);
    Route::post('/questions', [QuestionController::class, 'store']);
    Route::put('/questions/{question}', [QuestionController::class, 'update']);
    Route::delete('/questions/{question}', [QuestionController::class, 'destroy']);

    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);

});
