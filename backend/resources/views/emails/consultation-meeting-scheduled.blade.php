{{-- resources/views/emails/consultation-meeting-scheduled.blade.php --}}
@component('emails._layout', ['title' => 'Your consultation appointment is confirmed'])
<h1 style="font-family:Georgia,serif;font-size:26px;font-weight:400;margin:0 0 20px;">Hello {{ $c->first_name }},</h1>

<p>Great news — your consultation appointment with Livora has been scheduled. Here are the details:</p>

<div style="margin:28px 0;padding:20px 24px;background:#faf7f1;border-left:3px solid #b89b6a;">
  <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a8072;margin-bottom:10px;">Appointment details</div>
  @if($c->meeting_date)<div><strong>Date:</strong> {{ \Carbon\Carbon::parse($c->meeting_date)->format('l, d F Y') }}</div>@endif
  @if($c->meeting_time)<div><strong>Time:</strong> {{ $c->meeting_time }}</div>@endif
  @if($c->meeting_type)<div><strong>Type:</strong> {{ ucfirst($c->meeting_type) }}</div>@endif
  @if($c->meeting_location)<div><strong>Location:</strong> {{ $c->meeting_location }}</div>@endif
  @if($c->meeting_link)<div><strong>Link:</strong> <a href="{{ $c->meeting_link }}">{{ $c->meeting_link }}</a></div>@endif
</div>

<p style="margin-top:32px;">If you need to reschedule or have any question, just reply to this email or message us in your consultation chat.</p>
<p>Warm regards,<br><em>The Livora Team</em></p>
@endcomponent