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
        'is_general_orientation',
        'is_testing_certificate',
        'post_test_access_code_hash',
        'post_test_access_code_encrypted',
        'post_test_access_code_updated_at',
        'certificate_template_path',
        'certificate_template_settings',
    ];

    protected $hidden = [
        'post_test_access_code_hash',
        'post_test_access_code_encrypted',
        'post_test_access_code_updated_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'is_general_orientation' => 'boolean',
        'is_testing_certificate' => 'boolean',
        'post_test_access_code_updated_at' => 'datetime',
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

    public function participants(): HasMany
    {
        return $this->hasMany(TrainingParticipant::class);
    }
}
