<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Training extends Model
{
    protected $fillable = [
        'title',
        'description',
        'start_date',
        'end_date',
        'is_active',
        'certificate_template_path',
        'certificate_template_settings',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'certificate_template_settings' => 'array',
    ];

    public function materials(): HasMany
    {
        return $this->hasMany(Material::class);
    }

    public function tests(): HasMany
    {
        return $this->hasMany(Test::class);
    }
}
