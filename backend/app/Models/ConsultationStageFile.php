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
        'note',
        'uploaded_by',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
