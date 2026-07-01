<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {

    return [
        "nama" => "Radit",
        "umur" => 20,
        "kampus" => "ITERA"
    ];

});