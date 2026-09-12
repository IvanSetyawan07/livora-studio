<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationProgressComment extends Model
{
    protected $fillable = [
        'progress_update_id', 'consultation_id', 'user_id', 'author_type', 'body',
    ];

    public function progressUpdate()
    {
        return $this->belongsTo(ConsultationProgressUpdate::class);
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}