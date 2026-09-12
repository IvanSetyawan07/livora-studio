<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationStageFile extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'consultation_id',
        'stage',
        'kind',
        'file_path',
        'review_status',
        'note',
        'uploaded_by',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
