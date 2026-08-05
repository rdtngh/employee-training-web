<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingParticipant extends Model
{
    protected $fillable = [
        'training_id',
        'user_id',
        'department',
    ];

    public static function capture(User $user, int $trainingId): self
    {
        return self::firstOrCreate(
            ['training_id' => $trainingId, 'user_id' => $user->id],
            ['department' => $user->department]
        );
    }

    public function training(): BelongsTo
    {
        return $this->belongsTo(Training::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
