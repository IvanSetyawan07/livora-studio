<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Consultation extends Model
{
    use HasFactory;

    // ── 10-stage flow + terminal branches ─────────────────────────────
    public const STATUS_NEW_INQUIRY       = 'new_inquiry';        // 1
    public const STATUS_UNDER_REVIEW      = 'under_review';       // 2
    public const STATUS_CONTACTED         = 'contacted';          // 3
    public const STATUS_MEETING_SCHEDULED = 'meeting_scheduled';  // 4
    public const STATUS_IN_PROGRESS       = 'in_progress';        // 5
    public const STATUS_DP_PENDING        = 'dp_pending';         // 6 Follow-up: DP Payment
    public const STATUS_PROJECT_PAID      = 'project_paid';       // 7 Sold / signed agreement
    public const STATUS_PROJECT_RUNNING   = 'project_running';    // 8 Project on-going 0–100 %
    public const STATUS_COMPLETED         = 'completed';          // 9

    // Terminal branches (out of linear flow)
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_REJECTED  = 'rejected';

    // Kept for backward compatibility with older code paths that still
    // reference these constants; treated as legacy aliases of in_progress
    // in the timeline mapping.
    public const STATUS_FOLLOW_UP_REQUIRED = 'follow_up_required';
    public const STATUS_PROPOSAL_SENT      = 'proposal_sent';

    public const STATUSES = [
        self::STATUS_NEW_INQUIRY,
        self::STATUS_UNDER_REVIEW,
        self::STATUS_CONTACTED,
        self::STATUS_MEETING_SCHEDULED,
        self::STATUS_IN_PROGRESS,
        self::STATUS_DP_PENDING,
        self::STATUS_PROJECT_PAID,
        self::STATUS_PROJECT_RUNNING,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
        self::STATUS_REJECTED,
        self::STATUS_FOLLOW_UP_REQUIRED,
        self::STATUS_PROPOSAL_SENT,
    ];

    public const STATUS_LABELS = [
        self::STATUS_NEW_INQUIRY        => 'Inquiry Submitted',
        self::STATUS_UNDER_REVIEW       => 'Under Review',
        self::STATUS_CONTACTED          => 'Contacted',
        self::STATUS_MEETING_SCHEDULED  => 'Meeting Scheduled',
        self::STATUS_IN_PROGRESS        => 'Consultation in Progress',
        self::STATUS_DP_PENDING         => 'DP Payment',
        self::STATUS_PROJECT_PAID       => 'Project Paid',
        self::STATUS_PROJECT_RUNNING    => 'Project Running',
        self::STATUS_COMPLETED          => 'Completed',
        self::STATUS_CANCELLED          => 'Cancelled',
        self::STATUS_REJECTED           => 'Rejected',
        self::STATUS_FOLLOW_UP_REQUIRED => 'Follow-up Required',
        self::STATUS_PROPOSAL_SENT      => 'Proposal Sent',
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
        'rejection_reason',
        'dp_amount',
        'dp_paid_at',
        'agreement_signed_at',
        'agreement_signature_name',
        'project_progress',
    ];

    protected $casts = [
        'attachments'         => 'array',
        'meeting_date'        => 'date',
        'follow_up_date'      => 'date',
        'dp_paid_at'          => 'datetime',
        'agreement_signed_at' => 'datetime',
        'dp_amount'           => 'decimal:2',
        'project_progress'    => 'integer',
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

    public function messages()
    {
        return $this->hasMany(ConsultationMessage::class)->orderBy('created_at');
    }

    public function stageFiles()
    {
        return $this->hasMany(ConsultationStageFile::class)->orderByDesc('created_at');
    }

    public function progressUpdates()
    {
        return $this->hasMany(ConsultationProgressUpdate::class)->orderByDesc('created_at');
    }

    public function statusLabel(): string
    {
        return self::STATUS_LABELS[$this->status] ?? $this->status;
    }

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
