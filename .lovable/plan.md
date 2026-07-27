
# My Consultation — 10-Stage Flow

Rework the current 8-status timeline into the exact 10-stage journey requested. Each stage stays clickable so users and admin can revisit past detail (notes, files, meeting info, payments, signatures, progress snapshots).

## 10 Stages

1. **Inquiry Submitted** — auto on form submit
2. **Under Review** — admin decides: **Approve** → stage 3, **Reject** → terminal with reason
3. **Contacted** — chat room opens between user & admin
4. **Meeting Scheduled** — date/time/link/location captured
5. **Consultation in Progress** — meeting happening; no user review needed
6. **Follow-up: DP Payment** — admin uploads invoice/QRIS; user marks paid + uploads proof
7. **Sold / Project Paid** — admin uploads project agreement PDF; user signs (typed signature + timestamp) and re-uploads
8. **Project Running** — admin posts progress updates 0–100 % (percentage + note + photos)
9. **Completed** — compact summary card showing every prior stage collapsed but expandable
10. **Cancelled** (parallel terminal) — user or admin, with reason

## Clickable History
Every stage node in the timeline is a button. Clicking opens a side sheet showing that stage's stored payload: admin note, files, meeting info, payment proof, signature, progress snapshot. Powered by `consultation_status_histories` (already exists) plus a new `consultation_stage_data` JSON blob per stage.

## Backend Changes

### Migration `extend_consultations_for_10_stage_flow`
- `consultations`: add `rejection_reason`, `dp_amount`, `dp_paid_at`, `agreement_signed_at`, `agreement_signature_name`, `project_progress` (tinyint 0–100).
- New table **`consultation_stage_files`**: `id, consultation_id, stage (string), kind (invoice|payment_proof|agreement|signed_agreement|progress_photo|other), file_path, note, uploaded_by, created_at`. Files stored in Supabase-equivalent local disk `storage/app/public/consultations/{id}/`.
- New table **`consultation_progress_updates`**: `id, consultation_id, percentage, note, created_by, created_at` + `hasMany` files via `consultation_stage_files`.
- Update `Consultation::STATUSES` constants:
  ```
  new_inquiry, under_review, contacted, meeting_scheduled,
  in_progress, dp_pending, project_paid, project_running,
  completed, cancelled, rejected
  ```

### Controllers
- `Api/ConsultationController` (user):
  - `POST /consultations/{id}/dp-proof` upload
  - `POST /consultations/{id}/sign-agreement` (name + accept)
  - `GET  /consultations/{id}/stage/{stage}` returns files + snapshot
- `Api/Admin/AdminConsultationController`:
  - `POST /admin/consultations/{id}/approve` → under_review→contacted
  - `POST /admin/consultations/{id}/reject` (reason)
  - `POST /admin/consultations/{id}/schedule-meeting`
  - `POST /admin/consultations/{id}/start-meeting` (→in_progress)
  - `POST /admin/consultations/{id}/request-dp` (amount + invoice file)
  - `POST /admin/consultations/{id}/mark-paid`
  - `POST /admin/consultations/{id}/upload-agreement`
  - `POST /admin/consultations/{id}/progress` (percentage + note + photos)
  - `POST /admin/consultations/{id}/complete`

## Frontend Changes

### `src/lib/consultations.ts`
Add types for stages, stage files, progress updates, and API helpers for every endpoint above.

### `src/components/livora/ConsultationTimeline.tsx` (new)
- Vertical timeline on desktop, horizontal scroll pill on mobile.
- Each node = button → opens `ConsultationStageSheet` (Radix Sheet).
- Node states: `done`, `current`, `upcoming`, `blocked` (for rejected/cancelled branches).
- Compact mode when status = `completed`: collapses all done stages into an accordion "View full journey".

### `src/components/livora/ConsultationStageSheet.tsx` (new)
Renders per-stage content:
- Stage 2: rejection reason (if rejected).
- Stage 3: link to chat.
- Stage 4: meeting card (date/time/link, Add-to-calendar).
- Stage 6: invoice download + upload payment proof (if user & pending).
- Stage 7: agreement download + signature form (typed full name + checkbox).
- Stage 8: list of progress updates with % bar and photo gallery.
- Stage 9: compact recap of every stage.

### `src/pages/Profile.tsx`
Replace inline `TIMELINE_STEPS` block with `<ConsultationTimeline consultation={c} onStageClick={…} />`. Remove the current linear checklist.

### `src/pages/admin/AdminConsultationDetail.tsx`
Add an "Actions" rail with contextual buttons matching current status (Approve / Reject / Schedule / Start Meeting / Request DP / Mark Paid / Upload Agreement / Post Progress / Complete). Show status history + files uploaded per stage.

## Out of Scope (kept as-is)
- Chat itself (already exists, unchanged).
- Real payment gateway integration — DP flow is manual proof-of-transfer.
- Legally-binding e-signature — typed name + timestamp only. Note in UI: "Digital acknowledgement, not a qualified e-signature".

## Deliverables Order
1. Migration + model updates.
2. Admin controller endpoints.
3. User controller endpoints + storage.
4. `consultations.ts` API wrapper.
5. `ConsultationTimeline` + `ConsultationStageSheet` components.
6. Wire into `Profile.tsx` and `AdminConsultationDetail.tsx`.
7. Typecheck & smoke test.

Confirm and I'll build it end-to-end in this order.
