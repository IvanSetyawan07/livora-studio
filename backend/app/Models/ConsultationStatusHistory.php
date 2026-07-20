<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationStatusHistory extends Model
{
    // Tabel hanya punya created_at (default DB), tidak ada updated_at.
    public $timestamps = false;

    protected $fillable = [
        'consultation_id',
        'previous_status',
        'new_status',
        'changed_by',
        'note',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function changedByUser()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
