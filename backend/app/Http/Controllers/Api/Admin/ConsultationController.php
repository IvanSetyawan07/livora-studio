<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\ConsultationConfirmed;
use App\Models\Consultation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ConsultationController extends Controller
{
    public function index(Request $request)
    {
        return Consultation::with(['user:id,name,email', 'assignedAdmin:id,name'])
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
            'note'               => 'nullable|string', // catatan untuk status history
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

        $consultation->load(['user:id,name,email', 'assignedAdmin:id,name', 'statusHistory.changedByUser:id,name']);
        $arr = $consultation->toArray();
        $arr['status_label'] = $consultation->statusLabel();
        return $arr;
    }

    public function destroy(Consultation $consultation)
    {
        $consultation->delete();
        return response()->json(['message' => 'Deleted']);
    }

    /**
     * Tombol khusus "Confirm & Email User" di admin panel.
     * Kirim email konfirmasi manual berisi status terkini + pesan tambahan admin,
     * DAN otomatis pindahkan status ke "contacted" kalau masih di "new_inquiry"
     * / "under_review" agar timeline user ikut update.
     */
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
                'message' => 'Email gagal terkirim. Cek konfigurasi SMTP di backend.',
                'error'   => $e->getMessage(),
            ], 500);
        }

        // Naikkan status ke "contacted" kalau masih tahap awal, catat di history.
        $earlyStatuses = [Consultation::STATUS_NEW_INQUIRY, Consultation::STATUS_UNDER_REVIEW];
        if (in_array($consultation->status, $earlyStatuses, true)) {
            $consultation->changeStatus(
                Consultation::STATUS_CONTACTED,
                $request->user()->id,
                'Confirmation email sent to user.'
            );
        } else {
            // Tetap catat di history bahwa admin kirim email konfirmasi manual.
            $consultation->statusHistory()->create([
                'previous_status' => $consultation->status,
                'new_status'      => $consultation->status,
                'changed_by'      => $request->user()->id,
                'note'            => 'Confirmation email sent to user.',
            ]);
        }

        return response()->json(['message' => 'Email terkirim ke ' . $consultation->email]);
    }

    /**
     * List pesan chat 1 consultation (admin view).
     * Tandai pesan dari user sebagai sudah dibaca oleh admin.
     */
    public function messagesIndex(Request $request, Consultation $consultation)
    {
        \App\Models\ConsultationMessage::where('consultation_id', $consultation->id)
            ->where('sender_type', 'user')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $consultation->messages()->with('sender:id,name')->get();
    }

    /**
     * Admin kirim pesan ke customer. Bisa sekaligus include meeting link
     * (Zoom / Google Meet) yang tampil sebagai tombol Join di sisi user.
     */
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

        // Kalau admin sekaligus mengirim link meeting, sinkronkan juga
        // ke kolom meeting_link consultation supaya muncul di card timeline.
        if (!empty($data['meeting_link']) && empty($consultation->meeting_link)) {
            $consultation->meeting_link = $data['meeting_link'];
            $consultation->save();
        }

        return response()->json($msg->load('sender:id,name'), 201);
    }
}

