<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Consultation extends Model
{
    use HasFactory;

    // Status yang lebih bermakna dari sekadar "pending"/"completed" — sesuai brief.
    public const STATUS_NEW_INQUIRY        = 'new_inquiry';
    public const STATUS_UNDER_REVIEW       = 'under_review';
    public const STATUS_CONTACTED          = 'contacted';
    public const STATUS_MEETING_SCHEDULED  = 'meeting_scheduled';
    public const STATUS_IN_PROGRESS        = 'in_progress';
    public const STATUS_FOLLOW_UP_REQUIRED = 'follow_up_required';
    public const STATUS_PROPOSAL_SENT      = 'proposal_sent';
    public const STATUS_COMPLETED          = 'completed';
    public const STATUS_CANCELLED          = 'cancelled';

    public const STATUSES = [
        self::STATUS_NEW_INQUIRY,
        self::STATUS_UNDER_REVIEW,
        self::STATUS_CONTACTED,
        self::STATUS_MEETING_SCHEDULED,
        self::STATUS_IN_PROGRESS,
        self::STATUS_FOLLOW_UP_REQUIRED,
        self::STATUS_PROPOSAL_SENT,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
    ];

    // Label yang ditampilkan ke user di profile timeline (natural, bukan status teknis).
    public const STATUS_LABELS = [
        self::STATUS_NEW_INQUIRY        => 'Inquiry Submitted',
        self::STATUS_UNDER_REVIEW       => 'Under Review',
        self::STATUS_CONTACTED          => 'Contacted',
        self::STATUS_MEETING_SCHEDULED  => 'Meeting Scheduled',
        self::STATUS_IN_PROGRESS        => 'Consultation in Progress',
        self::STATUS_FOLLOW_UP_REQUIRED => 'Follow-up Meeting Required',
        self::STATUS_PROPOSAL_SENT      => 'Proposal / Recommendation Sent',
        self::STATUS_COMPLETED          => 'Consultation Completed',
        self::STATUS_CANCELLED          => 'Cancelled',
    ];

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'contact_method',
        'consultation_type',
        'location',
        'service_type',
        'project_type',
        'estimated_area',
        'preferred_style',
        'message',
        'attachments',
        'status',
        'admin_notes',
        'assigned_admin_id',
        'meeting_date',
        'meeting_time',
        'meeting_location',
        'meeting_link',
        'follow_up_date',
    ];

    protected $casts = [
        'attachments'    => 'array',
        'meeting_date'   => 'date',
        'follow_up_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function assignedAdmin()
    {
        return $this->belongsTo(User::class, 'assigned_admin_id');
    }

    public function statusHistory()
    {
        return $this->hasMany(ConsultationStatusHistory::class)->orderByDesc('created_at');
    }

    // Relasi `messages()` untuk admin <-> user messaging akan ditambahkan
    // di Batch 3 begitu model ConsultationMessage dibuat.

    public function statusLabel(): string
    {
        return self::STATUS_LABELS[$this->status] ?? $this->status;
    }

    /**
     * Ganti status + catat history dalam satu tempat, supaya semua jalur
     * (admin panel, otomatisasi nanti) selalu konsisten mencatat riwayat.
     */
    public function changeStatus(string $newStatus, ?int $changedBy = null, ?string $note = null): void
    {
        $previous = $this->status;
        if ($previous === $newStatus) {
            return;
        }

        $this->status = $newStatus;
        $this->save();

        $this->statusHistory()->create([
            'previous_status' => $previous,
            'new_status'      => $newStatus,
            'changed_by'      => $changedBy,
            'note'            => $note,
        ]);
    }
}
