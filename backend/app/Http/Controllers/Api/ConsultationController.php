<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ConsultationController extends Controller
{
    /**
     * Customer submits a new design consultation request from the
     * public Appointment page. Works for guests and logged-in users.
     *
     * - Logged-in (Sanctum token present) -> consultation langsung
     *   terhubung ke user_id yang sedang login (termasuk Google login).
     * - Guest -> jika email sudah punya account, consultation tetap
     *   dihubungkan ke account tersebut agar muncul di profile mereka.
     */
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
            'message'            => 'required|string',
            'attachments'        => 'nullable|array',
            'attachments.*'      => 'file|max:10240', // 10MB per file
        ]);

        // Route ini publik (guest boleh submit), jadi guard 'sanctum' harus
        // di-resolve manual — tidak ada middleware auth:sanctum yang mengisi
        // $request->user() otomatis di sini.
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
            'message'            => $data['message'],
            'attachments'        => $attachmentPaths,
            'status'             => Consultation::STATUS_NEW_INQUIRY,
        ]);

        $consultation->statusHistory()->create([
            'previous_status' => null,
            'new_status'      => Consultation::STATUS_NEW_INQUIRY,
            'changed_by'      => $userId,
            'note'            => 'Inquiry submitted by customer.',
        ]);

        // TODO (Batch 3): trigger notifikasi "New consultation request from {name}" ke admin.

        return response()->json($consultation, 201);
    }

    /**
     * Consultation milik user yang sedang login — dipakai di "My Consultations" (profile).
     */
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

    /**
     * Detail 1 consultation — hanya pemiliknya yang boleh melihat.
     */
    public function show(Request $request, Consultation $consultation)
    {
        if ($consultation->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $consultation->load(['assignedAdmin:id,name', 'statusHistory.changedByUser:id,name']);
        $arr = $consultation->toArray();
        $arr['status_label'] = $consultation->statusLabel();
        return $arr;
    }
}
