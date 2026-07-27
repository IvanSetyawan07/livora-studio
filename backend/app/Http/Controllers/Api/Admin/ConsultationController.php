<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\ConsultationConfirmed;
use App\Models\Consultation;
use App\Models\ConsultationProgressUpdate;
use App\Models\ConsultationStageFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ConsultationController extends Controller
{
    public function index(Request $request)
    {
        return Consultation::with(['user:id,name,email', 'assignedAdmin:id,name'])
            ->withCount(['messages as unread_messages_count' => function ($q) {
                $q->where('sender_type', 'user')->whereNull('read_at');
            }])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Consultation $c) {
                $arr = $c->toArray();
                $arr['status_label'] = $c->statusLabel();
                return $arr;
            });
    }

    public function show(Request $request, Consultation $consultation)
    {
        $consultation->load([
            'user:id,name,email,phone',
            'assignedAdmin:id,name',
            'statusHistory.changedByUser:id,name',
            'messages.sender:id,name',
            'stageFiles.uploader:id,name',
            'progressUpdates.creator:id,name',
        ]);
        $arr = $consultation->toArray();
        $arr['status_label'] = $consultation->statusLabel();
        return $arr;
    }

    public function update(Request $request, Consultation $consultation)
    {
        $data = $request->validate([
            'status'             => 'nullable|string|in:' . implode(',', Consultation::STATUSES),
            'admin_notes'        => 'nullable|string',
            'assigned_admin_id'  => 'nullable|integer|exists:users,id',
            'contact_method'     => 'nullable|string|max:50',
            'meeting_date'       => 'nullable|date',
            'meeting_time'       => 'nullable',
            'meeting_location'   => 'nullable|string|max:255',
            'meeting_link'       => 'nullable|string|max:500',
            'follow_up_date'     => 'nullable|date',
            'note'               => 'nullable|string',
        ]);

        $statusNote = $data['note'] ?? null;
        unset($data['note']);

        if (isset($data['status']) && $data['status'] !== $consultation->status) {
            $newStatus = $data['status'];
            unset($data['status']);
            $consultation->fill($data)->save();
            $consultation->changeStatus($newStatus, $request->user()->id, $statusNote);
        } else {
            unset($data['status']);
            $consultation->fill($data)->save();
        }

        return $this->show($request, $consultation->fresh());
    }

    public function destroy(Consultation $consultation)
    {
        $consultation->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function confirmEmail(Request $request, Consultation $consultation)
    {
        $data = $request->validate([
            'subject' => 'nullable|string|max:200',
            'message' => 'nullable|string',
        ]);

        try {
            Mail::to($consultation->email)->send(new ConsultationConfirmed(
                $consultation,
                $data['subject'] ?? null,
                $data['message'] ?? null,
            ));
        } catch (\Throwable $e) {
            Log::error('Failed to send ConsultationConfirmed email: ' . $e->getMessage());
            return response()->json([
                'message' => 'Email gagal terkirim.',
                'error'   => $e->getMessage(),
            ], 500);
        }

        $earlyStatuses = [Consultation::STATUS_NEW_INQUIRY, Consultation::STATUS_UNDER_REVIEW];
        if (in_array($consultation->status, $earlyStatuses, true)) {
            $consultation->changeStatus(
                Consultation::STATUS_CONTACTED,
                $request->user()->id,
                'Confirmation email sent to user.'
            );
        } else {
            $consultation->statusHistory()->create([
                'previous_status' => $consultation->status,
                'new_status'      => $consultation->status,
                'changed_by'      => $request->user()->id,
                'note'            => 'Confirmation email sent to user.',
            ]);
        }

        return response()->json(['message' => 'Email terkirim ke ' . $consultation->email]);
    }

    public function messagesIndex(Request $request, Consultation $consultation)
    {
        \App\Models\ConsultationMessage::where('consultation_id', $consultation->id)
            ->where('sender_type', 'user')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $consultation->messages()->with('sender:id,name')->get();
    }

    public function messagesStore(Request $request, Consultation $consultation)
    {
        $data = $request->validate([
            'body'         => 'required|string|max:4000',
            'meeting_link' => 'nullable|url|max:500',
        ]);

        $msg = \App\Models\ConsultationMessage::create([
            'consultation_id' => $consultation->id,
            'sender_type'     => 'admin',
            'sender_id'       => $request->user()->id,
            'body'            => $data['body'],
            'meeting_link'    => $data['meeting_link'] ?? null,
        ]);

        if (!empty($data['meeting_link']) && empty($consultation->meeting_link)) {
            $consultation->meeting_link = $data['meeting_link'];
            $consultation->save();
        }

        return response()->json($msg->load('sender:id,name'), 201);
    }

    // ─── 10-stage workflow actions ────────────────────────────────────

    /** Move under_review → contacted (approve inquiry). */
    public function approve(Request $request, Consultation $consultation)
    {
        $note = $request->input('note');
        // Ensure it passes through under_review at least once for audit trail.
        if ($consultation->status === Consultation::STATUS_NEW_INQUIRY) {
            $consultation->changeStatus(Consultation::STATUS_UNDER_REVIEW, $request->user()->id, 'Marked under review.');
        }
        $consultation->changeStatus(Consultation::STATUS_CONTACTED, $request->user()->id, $note ?: 'Inquiry approved. Chat opened.');
        return $this->show($request, $consultation->fresh());
    }

    public function reject(Request $request, Consultation $consultation)
    {
        $data = $request->validate(['reason' => 'required|string|max:2000']);
        $consultation->rejection_reason = $data['reason'];
        $consultation->save();
        $consultation->changeStatus(Consultation::STATUS_REJECTED, $request->user()->id, $data['reason']);
        return $this->show($request, $consultation->fresh());
    }

    public function scheduleMeeting(Request $request, Consultation $consultation)
    {
        $data = $request->validate([
            'meeting_date'     => 'required|date',
            'meeting_time'     => 'nullable',
            'meeting_location' => 'nullable|string|max:255',
            'meeting_link'     => 'nullable|string|max:500',
            'note'             => 'nullable|string',
        ]);
        $consultation->fill($data)->save();
        $consultation->changeStatus(Consultation::STATUS_MEETING_SCHEDULED, $request->user()->id, $data['note'] ?? 'Meeting scheduled.');
        return $this->show($request, $consultation->fresh());
    }

    public function startMeeting(Request $request, Consultation $consultation)
    {
        $consultation->changeStatus(Consultation::STATUS_IN_PROGRESS, $request->user()->id, $request->input('note') ?: 'Consultation started.');
        return $this->show($request, $consultation->fresh());
    }

    /** Request DP payment — attach invoice file + amount. */
    public function requestDp(Request $request, Consultation $consultation)
    {
        $data = $request->validate([
            'dp_amount' => 'required|numeric|min:0',
            'note'      => 'nullable|string',
            'invoice'   => 'nullable|file',
        ]);

        $consultation->dp_amount = $data['dp_amount'];
        $consultation->save();

        if ($request->hasFile('invoice')) {
            $path = '/storage/' . $request->file('invoice')->store('consultations', 'public');
            ConsultationStageFile::create([
                'consultation_id' => $consultation->id,
                'stage'           => Consultation::STATUS_DP_PENDING,
                'kind'            => 'invoice',
                'file_path'       => $path,
                'note'            => $data['note'] ?? null,
                'uploaded_by'     => $request->user()->id,
            ]);
        }

        $consultation->changeStatus(
            Consultation::STATUS_DP_PENDING,
            $request->user()->id,
            $data['note'] ?? ('DP requested: Rp ' . number_format((float) $data['dp_amount'], 0, ',', '.')),
        );
        return $this->show($request, $consultation->fresh());
    }

    public function markPaid(Request $request, Consultation $consultation)
    {
        $consultation->dp_paid_at = now();
        $consultation->save();
        $consultation->statusHistory()->create([
            'previous_status' => $consultation->status,
            'new_status'      => $consultation->status,
            'changed_by'      => $request->user()->id,
            'note'            => 'DP payment confirmed by admin.',
        ]);
        return $this->show($request, $consultation->fresh());
    }

    /** Upload project agreement PDF then move to project_paid. */
    public function uploadAgreement(Request $request, Consultation $consultation)
    {
        $data = $request->validate([
            'agreement' => 'required|file',
            'note'      => 'nullable|string',
        ]);
        $path = '/storage/' . $request->file('agreement')->store('consultations', 'public');
        ConsultationStageFile::create([
            'consultation_id' => $consultation->id,
            'stage'           => Consultation::STATUS_PROJECT_PAID,
            'kind'            => 'agreement',
            'file_path'       => $path,
            'note'            => $data['note'] ?? null,
            'uploaded_by'     => $request->user()->id,
        ]);
        $consultation->changeStatus(
            Consultation::STATUS_PROJECT_PAID,
            $request->user()->id,
            'Agreement uploaded. Awaiting customer signature.',
        );
        return $this->show($request, $consultation->fresh());
    }

    /** Post a progress update (moves to project_running if not there yet). */
    public function postProgress(Request $request, Consultation $consultation)
    {
        $data = $request->validate([
            'percentage' => 'required|integer|min:0|max:100',
            'note'       => 'nullable|string',
            'photos'     => 'nullable|array',
            'photos.*'   => 'file',
        ]);
        $paths = [];
        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $file) {
                $paths[] = '/storage/' . $file->store('consultations', 'public');
            }
        }
        $update = ConsultationProgressUpdate::create([
            'consultation_id' => $consultation->id,
            'percentage'      => $data['percentage'],
            'note'            => $data['note'] ?? null,
            'photos'          => $paths,
            'created_by'      => $request->user()->id,
        ]);
        foreach ($paths as $p) {
            ConsultationStageFile::create([
                'consultation_id' => $consultation->id,
                'stage'           => Consultation::STATUS_PROJECT_RUNNING,
                'kind'            => 'progress_photo',
                'file_path'       => $p,
                'note'            => (string) $data['percentage'] . '% update',
                'uploaded_by'     => $request->user()->id,
            ]);
        }
        $consultation->project_progress = $data['percentage'];
        $consultation->save();

        if ($consultation->status !== Consultation::STATUS_PROJECT_RUNNING) {
            $consultation->changeStatus(
                Consultation::STATUS_PROJECT_RUNNING,
                $request->user()->id,
                'Project started.',
            );
        } else {
            $consultation->statusHistory()->create([
                'previous_status' => $consultation->status,
                'new_status'      => $consultation->status,
                'changed_by'      => $request->user()->id,
                'note'            => 'Progress update: ' . $data['percentage'] . '%',
            ]);
        }

        return $this->show($request, $consultation->fresh());
    }

    public function complete(Request $request, Consultation $consultation)
    {
        $consultation->project_progress = 100;
        $consultation->save();
        $consultation->changeStatus(
            Consultation::STATUS_COMPLETED,
            $request->user()->id,
            $request->input('note') ?: 'Project completed.',
        );
        return $this->show($request, $consultation->fresh());
    }
}
