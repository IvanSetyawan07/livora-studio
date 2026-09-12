<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ConsultationReceived;
use App\Mail\NewConsultationAdminAlert;
use App\Models\Consultation;
use App\Models\ConsultationStageFile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ConsultationController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'first_name'         => 'required|string|max:100',
            'last_name'          => 'nullable|string|max:100',
            'email'              => 'required|email|max:150',
            'phone'              => 'nullable|string|max:32',
            'contact_method'     => 'nullable|string|max:50',
            'consultation_type'  => 'nullable|string|max:50',
            'location'           => 'nullable|string|max:150',
            'service_type'       => 'nullable|string|max:100',
            'project_type'       => 'nullable|string|max:100',
            'estimated_area'     => 'nullable|string|max:50',
            'preferred_style'    => 'nullable|string|max:100',
            'message'            => 'nullable|string',
            'attachments'        => 'nullable|array',
            'attachments.*'      => 'file',
        ]);

        $loggedInUser = Auth::guard('sanctum')->user();
        $userId = null;
        if ($loggedInUser) {
            $userId = $loggedInUser->id;
        } else {
            $existing = User::where('email', $data['email'])->first();
            if ($existing) {
                $userId = $existing->id;
            }
        }

        $attachmentPaths = [];
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $attachmentPaths[] = '/storage/' . $file->store('consultations', 'public');
            }
        }

        $consultation = Consultation::create([
            'user_id'            => $userId,
            'first_name'         => $data['first_name'],
            'last_name'          => $data['last_name'] ?? null,
            'email'              => $data['email'],
            'phone'              => $data['phone'] ?? null,
            'contact_method'     => $data['contact_method'] ?? null,
            'consultation_type'  => $data['consultation_type'] ?? null,
            'location'           => $data['location'] ?? null,
            'service_type'       => $data['service_type'] ?? null,
            'project_type'       => $data['project_type'] ?? null,
            'estimated_area'     => $data['estimated_area'] ?? null,
            'preferred_style'    => $data['preferred_style'] ?? null,
            'message'            => $data['message'] ?? null,
            'attachments'        => $attachmentPaths,
            'status'             => Consultation::STATUS_NEW_INQUIRY,
        ]);

        $consultation->statusHistory()->create([
            'previous_status' => null,
            'new_status'      => Consultation::STATUS_NEW_INQUIRY,
            'changed_by'      => $userId,
            'note'            => 'Inquiry submitted by customer.',
        ]);
        $consultation->recordActivity(
            'inquiry_created',
            'Consultation submitted',
            'Your consultation request has been received.',
            'both',
            $userId,
        );

        // Auto-move to Under Review so it visibly enters the admin queue.
        $consultation->changeStatus(
            Consultation::STATUS_UNDER_REVIEW,
            null,
            'Automatically queued for admin review.',
        );

        try {
            Mail::to($consultation->email)->send(new ConsultationReceived($consultation));
        } catch (\Throwable $e) {
            Log::warning('ConsultationReceived email failed: ' . $e->getMessage());
        }

        $adminAddress = config('mail.admin_address') ?: env('MAIL_ADMIN_ADDRESS');
        if ($adminAddress) {
            try {
                Mail::to($adminAddress)->send(new NewConsultationAdminAlert($consultation));
            } catch (\Throwable $e) {
                Log::warning('NewConsultationAdminAlert email failed: ' . $e->getMessage());
            }
        }

        return response()->json($consultation, 201);
    }

    public function mine(Request $request)
    {
        return Consultation::where('user_id', $request->user()->id)
            ->with(['assignedAdmin:id,name'])
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
        if ($consultation->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $consultation->load([
            'assignedAdmin:id,name',
            'statusHistory.changedByUser:id,name',
            'stageFiles.uploader:id,name',
            'progressUpdates.creator:id,name',
            'progressUpdates.comments.author:id,name',
            'activities.actor:id,name',
        ]);
        $arr = $consultation->toArray();
        $arr['status_label'] = $consultation->statusLabel();
        return $arr;
    }

    public function cancel(Request $request, Consultation $consultation)
    {
        if ($consultation->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if (in_array($consultation->status, [
            Consultation::STATUS_COMPLETED,
            Consultation::STATUS_CANCELLED,
            Consultation::STATUS_REJECTED,
        ])) {
            return response()->json(['message' => 'Consultation ini tidak bisa dibatalkan lagi.'], 422);
        }

        $note = trim((string) $request->input('reason', ''));
        $consultation->changeStatus(
            Consultation::STATUS_CANCELLED,
            $request->user()->id,
            $note !== '' ? "User cancel: {$note}" : 'User cancelled the consultation.',
        );

        \App\Models\ConsultationMessage::create([
            'consultation_id' => $consultation->id,
            'sender_type'     => 'system',
            'sender_id'       => $request->user()->id,
            'body'            => $note !== ''
                ? "Consultation dibatalkan oleh customer. Alasan: {$note}"
                : 'Consultation dibatalkan oleh customer.',
        ]);

        return response()->json(['ok' => true, 'status' => $consultation->status]);
    }

    public function messagesIndex(Request $request, Consultation $consultation)
    {
        if ($consultation->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        \App\Models\ConsultationMessage::where('consultation_id', $consultation->id)
            ->where('sender_type', 'admin')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $query = $consultation->messages()->with('sender:id,name');
        if ($since = $request->query('since')) {
            $query->where('id', '>', (int) $since);
        }
        return $query->get();
    }

    public function messagesStore(Request $request, Consultation $consultation)
    {
        if ($consultation->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $data = $request->validate([
            'body' => 'nullable|string|max:4000',
            'attachment' => 'nullable|file|max:20480',
        ]);
        $attachmentUrl = null;
        $attachmentType = null;
        $attachmentName = null;
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentUrl = '/storage/' . $file->store('consultation-chat', 'public');
            $attachmentType = $file->getMimeType();
            $attachmentName = $file->getClientOriginalName();
        }
        if (empty($data['body']) && !$attachmentUrl) {
            return response()->json(['message' => 'Empty message'], 422);
        }
        $msg = \App\Models\ConsultationMessage::create([
            'consultation_id' => $consultation->id,
            'sender_type'     => 'user',
            'sender_id'       => $request->user()->id,
            'body'            => $data['body'] ?? '',
            'attachment_url'  => $attachmentUrl,
            'attachment_type' => $attachmentType,
            'attachment_name' => $attachmentName,
        ]);
        return response()->json($msg->load('sender:id,name'), 201);
    }

    public function unreadCount(Request $request)
    {
        $count = \App\Models\ConsultationMessage::whereHas('consultation', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            })
            ->where('sender_type', 'admin')
            ->whereNull('read_at')
            ->count();
        $activityCount = \App\Models\ConsultationActivity::whereHas('consultation', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            })
            ->whereIn('audience', ['user', 'both'])
            ->whereNull('user_read_at')
            ->count();
        return response()->json(['unread' => $count + $activityCount, 'messages' => $count, 'activities' => $activityCount]);
    }

    public function activities(Request $request)
    {
        return \App\Models\ConsultationActivity::whereHas('consultation', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            })
            ->whereIn('audience', ['user', 'both'])
            ->with(['consultation:id,first_name,last_name,status', 'actor:id,name'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();
    }

    public function markActivitiesRead(Request $request)
    {
        \App\Models\ConsultationActivity::whereHas('consultation', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            })
            ->whereIn('audience', ['user', 'both'])
            ->whereNull('user_read_at')
            ->update(['user_read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    // ─── User workflow actions (stages 6 & 7) ────────────────────────

    /** User uploads bukti transfer DP. */
    public function uploadDpProof(Request $request, Consultation $consultation)
    {
        if ($consultation->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $data = $request->validate([
            'proof' => 'required|file',
            'note'  => 'nullable|string',
        ]);
        $path = '/storage/' . $request->file('proof')->store('consultations', 'public');
        ConsultationStageFile::create([
            'consultation_id' => $consultation->id,
            'stage'           => Consultation::STATUS_DP_PENDING,
            'kind'            => 'payment_proof',
            'file_path'       => $path,
            'note'            => $data['note'] ?? null,
            'uploaded_by'     => $request->user()->id,
            'review_status'   => 'pending',
        ]);
        $consultation->statusHistory()->create([
            'previous_status' => $consultation->status,
            'new_status'      => $consultation->status,
            'changed_by'      => $request->user()->id,
            'note'            => 'Customer uploaded DP payment proof.',
        ]);
        $consultation->recordActivity('payment_proof_uploaded', 'DP proof uploaded', 'Waiting for Livora verification.', 'both', $request->user()->id);
        return $this->show($request, $consultation->fresh());
    }

    public function uploadFinalPaymentProof(Request $request, Consultation $consultation)
    {
        if ($consultation->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $data = $request->validate(['proof' => 'required|file', 'note' => 'nullable|string|max:2000']);
        if ($consultation->final_payment_requested_at === null) {
            return response()->json(['message' => 'Final payment has not been requested.'], 422);
        }
        $path = '/storage/' . $request->file('proof')->store('consultations', 'public');
        ConsultationStageFile::create([
            'consultation_id' => $consultation->id,
            'stage' => Consultation::STATUS_PROJECT_RUNNING,
            'kind' => 'final_payment_proof',
            'file_path' => $path,
            'note' => $data['note'] ?? null,
            'uploaded_by' => $request->user()->id,
            'review_status' => 'pending',
        ]);
        $consultation->recordActivity('final_payment_proof_uploaded', 'Final payment proof uploaded', 'Waiting for Livora verification.', 'both', $request->user()->id);
        return $this->show($request, $consultation->fresh());
    }

    /** User signs agreement (typed name acknowledgement). */
    public function signAgreement(Request $request, Consultation $consultation)
    {
        if ($consultation->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $data = $request->validate([
            'signature_name' => 'required|string|max:150',
            'accept'         => 'required|boolean|accepted',
            'signature_data' => 'nullable|string|max:2000000',
        ]);
        $agreement = $consultation->stageFiles()->where('kind', 'agreement')->latest('created_at')->first();
        if (!$agreement) {
            return response()->json(['message' => 'Agreement is not available yet.'], 422);
        }
        $signaturePath = null;
        if (!empty($data['signature_data'])) {
            if (!preg_match('/^data:image\/png;base64,(.+)$/', $data['signature_data'], $matches)) {
                return response()->json(['message' => 'Invalid signature image.'], 422);
            }
            $binary = base64_decode($matches[1], true);
            if ($binary === false || strlen($binary) > 1500000) {
                return response()->json(['message' => 'Invalid signature image.'], 422);
            }
            $relative = 'consultations/signatures/customer-' . $consultation->id . '-' . now()->timestamp . '.png';
            Storage::disk('public')->put($relative, $binary);
            $signaturePath = '/storage/' . $relative;
        }

        DB::transaction(function () use ($request, $consultation, $data, $agreement, $signaturePath) {
            $consultation->agreement_signature_name = $data['signature_name'];
            $consultation->agreement_signature_path = $signaturePath;
            $consultation->agreement_document_path = $agreement->file_path;
            $consultation->agreement_document_hash = hash_file('sha256', Storage::disk('public')->path(str_replace('/storage/', '', $agreement->file_path)));
            $consultation->agreement_signer_ip = $request->ip();
            $consultation->agreement_signer_device = substr((string) $request->userAgent(), 0, 1000);
            $consultation->agreement_signed_at = now();
            $consultation->save();
            $consultation->recordActivity('agreement_signed', 'Agreement signed by customer', null, 'both', $request->user()->id);
        });

        $consultation->statusHistory()->create([
            'previous_status' => $consultation->status,
            'new_status'      => $consultation->status,
            'changed_by'      => $request->user()->id,
            'note'            => 'Customer signed the agreement as "' . $data['signature_name'] . '".',
        ]);
        return $this->show($request, $consultation->fresh());
    }

    public function commentOnProgress(Request $request, Consultation $consultation, \App\Models\ConsultationProgressUpdate $progress)
    {
        if ($consultation->user_id !== $request->user()->id || $progress->consultation_id !== $consultation->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $data = $request->validate(['body' => 'required|string|max:3000']);
        $comment = $progress->comments()->create([
            'consultation_id' => $consultation->id,
            'user_id' => $request->user()->id,
            'author_type' => 'user',
            'body' => $data['body'],
        ]);
        $consultation->recordActivity('progress_comment', 'New progress comment', $data['body'], 'admin', $request->user()->id, ['progress_update_id' => $progress->id]);
        return response()->json($comment->load('author:id,name'), 201);
    }
}
