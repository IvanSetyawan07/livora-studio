@component('emails._layout', ['title' => 'Your consultation is confirmed'])
<h1 style="font-family:Georgia,serif;font-size:26px;font-weight:400;margin:0 0 20px;">Hello {{ $c->first_name }},</h1>

@if($message)
  <div style="font-size:15px;line-height:1.8;">{!! nl2br(e($message)) !!}</div>
@else
  <p>We're happy to confirm your consultation with Livora. Our team has reviewed your request and is ready to move forward.</p>
@endif

@if($c->meeting_date || $c->meeting_time || $c->meeting_location || $c->meeting_link)
<div style="margin:28px 0;padding:20px 24px;background:#faf7f1;border-left:3px solid #b89b6a;">
  <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a8072;margin-bottom:10px;">Meeting details</div>
  @if($c->meeting_date)<div><strong>Date:</strong> {{ \Carbon\Carbon::parse($c->meeting_date)->format('l, d F Y') }}</div>@endif
  @if($c->meeting_time)<div><strong>Time:</strong> {{ $c->meeting_time }}</div>@endif
  @if($c->meeting_location)<div><strong>Location:</strong> {{ $c->meeting_location }}</div>@endif
  @if($c->meeting_link)<div><strong>Link:</strong> <a href="{{ $c->meeting_link }}">{{ $c->meeting_link }}</a></div>@endif
</div>
@endif

@if($claimUrl ?? null)
<div style="margin:32px 0;text-align:center;">
  <a href="{{ $claimUrl }}" style="display:inline-block;padding:14px 32px;background:#1c1c1c;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:12px;letter-spacing:.15em;text-transform:uppercase;">
    View My Consultation
  </a>
</div>
<p style="font-size:13px;color:#8a8072;">This link is valid for 14 days. Use it to access your profile and follow your consultation's progress on the Livora website.</p>
@endif

<p style="margin-top:32px;">If you need to reschedule or have any question, just reply to this email.</p>
<p>Warm regards,<br><em>The Livora Team</em></p>
@endcomponent
