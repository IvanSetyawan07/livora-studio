<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use Illuminate\Http\Request;

class ConsultationController extends Controller
{
    /**
     * List semua consultation — dipakai di halaman Admin Consultations (list/table).
     */
    public function index(Request $request)
    {
        $query = Consultation::with(['assignedAdmin:id,name'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        return $query->get()->map(function (Consultation $c) {
            $arr = $c->toArray();
            $arr['status_label'] = $c->statusLabel();
            return $arr;
        });
    }

    /**
     * Detail 1 consultation untuk admin — termasuk history status lengkap.
     */
    public function show(Consultation $consultation)
    {
        $consultation->load(['assignedAdmin:id,name', 'statusHistory.changedByUser:id,name']);
        $arr = $consultation->toArray();
        $arr['status_label'] = $consultation->statusLabel();
        return $arr;
    }

    /**
     * Admin mengubah status, assigned admin, contact method, jadwal meeting,
     * follow-up date, atau admin notes. Setiap perubahan status otomatis
     * tercatat di consultation_status_histories lewat Consultation::changeStatus().
     */
    public function update(Request $request, Consultation $consultation)
    {
        $data = $request->validate([
            'status'             => 'nullable|string|in:' . implode(',', Consultation::STATUSES),
            'admin_notes'        => 'nullable|string',
            'assigned_admin_id'  => 'nullable|integer|exists:users,id',
            'contact_method'     => 'nullable|string|max:50',
            'meeting_date'       => 'nullable|date',
            'meeting_time'       => 'nullable',
            'meeting_location'   => 'nullable|string|max:150',
            'meeting_link'       => 'nullable|string|max:255',
            'follow_up_date'     => 'nullable|date',
        ]);

        $adminId = $request->user()?->id;

        // Kalau status berubah, catat lewat helper supaya history konsisten.
        if (array_key_exists('status', $data) && $data['status'] !== null && $data['status'] !== $consultation->status) {
            $consultation->changeStatus($data['status'], $adminId, 'Status updated by admin.');
            unset($data['status']);
        }

        $consultation->fill($data);
        $consultation->save();

        $consultation->load(['assignedAdmin:id,name', 'statusHistory.changedByUser:id,name']);
        $arr = $consultation->toArray();
        $arr['status_label'] = $consultation->statusLabel();
        return $arr;
    }

    /**
     * Hapus consultation — dipakai tombol Delete di admin (dengan confirmation di frontend).
     */
    public function destroy(Consultation $consultation)
    {
        $consultation->delete();
        return response()->json(['message' => 'Consultation deleted.']);
    }
}