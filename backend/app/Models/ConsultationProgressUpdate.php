<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationProgressUpdate extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'consultation_id',
        'percentage',
        'note',
        'photos',
        'created_by',
    ];

    protected $casts = [
        'photos'     => 'array',
        'created_at' => 'datetime',
    ];

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
