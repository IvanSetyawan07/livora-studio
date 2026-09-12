# Livora “My Consultation” Full Revamp

## Goal
Extend the current consultation journey without replacing its working 9-stage state machine, chat, or uploads. The refreshed experience will use Livora’s existing cream, gold, serif, and quiet-luxury visual system.

## Implementation plan

### 1. Fix broken flows first
- Resolve every consultation file and progress photo through the existing API-origin URL helper.
- Add persistent profile URLs: `/profile`, `/profile/consultations`, and `/profile/saved`, while redirecting old `?tab=` links safely.
- Keep unsigned agreements view-only inside the page; expose download only for the final signed and stamped document.
- Synchronize admin filters and selectors with the real nine stages plus cancelled/rejected.

### 2. Shared activity and notification system
- Add consultation activity records with audience, event type, structured metadata, timestamps, and per-user/per-admin read state.
- Emit activity for approvals, meetings, both payment flows, agreement/signature/meterai, progress, comments, the 85% gate, and completion.
- Add authenticated APIs for totals, per-consultation feeds, and mark-as-read actions.
- Drive the navbar bell, Profile consultation badge, consultation-card badge, and admin bell from this single source.
- “View All Updates” opens the merged chronological project history and marks that consultation’s user notifications read.

### 3. Communication delivery
- Add non-blocking, logged email delivery for appointment approval, DP request, every progress update, and completion.
- Keep failed delivery visible for retry without rolling back the consultation action.
- Add a provider-ready Twilio WhatsApp service for automated progress notifications.
- Store no credentials in source. Twilio and ezmeterai credentials will be requested securely after their integrations and callback requirements are ready.

### 4. Profile and consultation experience
- Rebuild Edit Profile, My Consultations, and Saved with one responsive card language.
- Build the reference-style collapsed consultation card: thumbnail, metadata, status, nine-step tracker, latest update, unread indicator, View Details, and Contact Us.
- Build the large detail sheet: project image, progress summary, dated vertical timeline, latest update, Contact Us, and activity history.
- Refresh the existing chat presentation without replacing its message behavior.
- Rebuild Saved as a stable grid for item, collection, project, and catalog entries.

### 5. DP and final payment
- Generate the DP invoice PDF on the server with amount, payment state, and BCA instructions; remove manual invoice upload from the normal admin flow.
- Add proof states: pending verification, verified, and rejected with reason and re-upload support.
- Add equivalent final-payment amount, invoice, proof, review, and notification handling.
- Enforce the 85% rule in the backend: progress may reach 85%, but cannot exceed it until final payment is verified.

### 6. Agreement, signature, countersign, and e-meterai
- Add an embedded read-only PDF viewer and canvas signature pad.
- Store signer name, timestamp, IP, device, signature image, document hash, and signed output reference.
- Stamp the customer signature server-side, then require a Livora representative countersign.
- Integrate ezmeterai behind a provider service and track purchase/stamping states and references.
- Show “Download Final Agreement” only after customer signature, Livora countersign, and e-meterai all succeed.
- Preserve an auditable sequence of every document transition.

### 7. Meeting-specific behavior
- Add explicit meeting types: Zoom, Google Meet, WhatsApp video, phone, and physical location.
- Zoom/Meet links remain visible but disabled with a countdown until shortly before the meeting.
- WhatsApp uses “Call on WhatsApp” with the scheduled slot in a prefilled message.
- Phone meetings use tap-to-call; physical meetings show the location without join wording.
- Apply the same meeting details and controls to user and admin views.

### 8. Project progress and comments
- Add a comment thread to each progress update with user/admin authorship and admin-attention notifications.
- Keep admin control of percentage, notes, and photos.
- Send configured email and WhatsApp notifications after each progress post and a completion email when finished.

### 9. Admin operations
- Add attention badges and an activity panel for new payment proofs, signed agreements, and progress comments.
- Add approve/reject controls with mandatory rejection reasons for DP and final-payment proofs.
- Update the consultation detail controls to show payment, agreement, meterai, meeting, and progress-gate states clearly.

### 10. Verification
- Add focused backend tests for ownership, notification read state, proof rejection/re-upload, signature gates, countersign gates, and the 85% payment block.
- Verify frontend types and production compilation.
- Exercise customer and admin paths in the browser at desktop and mobile widths, including file links, refresh persistence, badges, meetings, payments, agreement access, comments, and final completion.

## Technical details
- Continue using Laravel/Sanctum and the existing React/Vite API client.
- Add focused migrations and relations rather than replacing consultation tables.
- Keep status transitions centralized and transactional where actions create files, activity, or payment state.
- Keep email/WhatsApp failures isolated from business actions and record retryable delivery state.
- Generate PDFs and stamp signatures server-side using a maintained PHP PDF library compatible with the existing Laravel application.
- Preserve backward compatibility for existing consultation records and legacy links.

## External setup needed
- **Twilio WhatsApp:** account SID, auth token, approved sender, and approved message templates.
- **ezmeterai:** production API credentials, product/account identifiers, callback contract, and commercial account activation.
- **BCA payment details:** real account number and account-holder name will replace clearly labelled placeholders.
