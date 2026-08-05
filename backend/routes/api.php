<?php

use App\Http\Controllers\Api\CertificateController;
use App\Http\Controllers\Api\MaterialController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\StatisticsController;
use App\Http\Controllers\Api\TestController;
use App\Http\Controllers\Api\TrainingController;
use App\Http\Controllers\Api\TrainingHistoryController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Auth\LoginController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [LoginController::class, 'login']);
Route::get('/trainings/{training}/certificate-template/background', [TrainingController::class, 'certificateTemplateBackground']);

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

    Route::middleware('role:Karyawan,Mahasiswa/Pelajar')->group(function () {
        Route::get('/training-history', [TrainingHistoryController::class, 'employeeIndex']);
        Route::get('/trainings/{training}/tests/{type}', [TestController::class, 'showByType']);
        Route::post('/trainings/{training}/post-test-access-code/verify', [TrainingController::class, 'verifyPostTestAccessCode']);
        Route::get('/tests/{test}', [TestController::class, 'show']);
        Route::get('/tests/{test}/questions', [TestController::class, 'questions']);
        Route::post('/tests/{test}/start', [TestController::class, 'start']);
        Route::post('/tests/{test}/submit', [TestController::class, 'submit']);

        Route::post('/materials/{material}/access', [MaterialController::class, 'markAccessed']);
        Route::get('/certificates/{training}', [CertificateController::class, 'show']);
        Route::get('/certificates/{training}/download', [CertificateController::class, 'download']);
    });

    Route::middleware('role:Super Admin,Admin')->group(function () {
        Route::get('/training-histories', [TrainingHistoryController::class, 'adminIndex']);
        Route::delete('/training-histories/{training}/users/{user}', [TrainingHistoryController::class, 'destroy']);
        Route::get('/statistics', [StatisticsController::class, 'index']);
        Route::get('/statistics/export', [StatisticsController::class, 'export']);
        Route::get('/statistics/attendance/export', [StatisticsController::class, 'attendanceExport']);
        Route::post('/statistics/reset', [StatisticsController::class, 'reset']);
        Route::get('/certificates', [CertificateController::class, 'index']);
        Route::get('/certificates/{certificate}/preview', [CertificateController::class, 'preview']);
        Route::get('/certificates/{certificate}/file', [CertificateController::class, 'downloadFile']);

        Route::post('/trainings', [TrainingController::class, 'store']);
        Route::put('/trainings/{training}', [TrainingController::class, 'update']);
        Route::delete('/trainings/{training}', [TrainingController::class, 'destroy']);
        Route::post('/trainings/{training}/certificate-template', [TrainingController::class, 'uploadCertificateTemplate']);
        Route::put('/trainings/{training}/certificate-template/settings', [TrainingController::class, 'updateCertificateTemplateSettings']);
        Route::delete('/trainings/{training}/certificate-template', [TrainingController::class, 'deleteCertificateTemplate']);

        Route::post('/materials', [MaterialController::class, 'store']);
        Route::post('/materials/chunked', [MaterialController::class, 'storeChunked']);
        Route::post('/materials/bulk', [MaterialController::class, 'bulkStore']);
        Route::put('/materials/{material}', [MaterialController::class, 'update']);
        Route::delete('/materials/{material}', [MaterialController::class, 'destroy']);

        Route::get('/questions', [QuestionController::class, 'index']);
        Route::post('/questions', [QuestionController::class, 'store']);
        Route::post('/questions/import/preview', [QuestionController::class, 'previewImport']);
        Route::post('/questions/import', [QuestionController::class, 'import']);
        Route::put('/questions/{question}', [QuestionController::class, 'update']);
        Route::delete('/questions/{question}', [QuestionController::class, 'destroy']);
    });

    Route::middleware('role:Super Admin')->group(function () {
        Route::get('/users/options', [UserController::class, 'options']);
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::post('/users/import', [UserController::class, 'import']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
    });

});
