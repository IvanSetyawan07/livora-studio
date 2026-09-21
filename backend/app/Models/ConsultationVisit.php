<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationVisit extends Model
{
    protected $fillable = [
        'consultation_id',
        'title',
        'visit_date',
        'summary',
        'photos',
        'created_by',
    ];

    protected $casts = [
        'photos'     => 'array',
        'visit_date' => 'date',
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
