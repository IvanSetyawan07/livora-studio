@component('emails._layout', ['title' => 'New consultation request'])
<h1 style="font-family:Georgia,serif;font-size:22px;font-weight:400;margin:0 0 20px;">New consultation request</h1>

<table cellpadding="6" cellspacing="0" style="font-size:14px;">
  <tr><td style="color:#8a8072;">Name</td><td>{{ $c->first_name }} {{ $c->last_name }}</td></tr>
  <tr><td style="color:#8a8072;">Email</td><td>{{ $c->email }}</td></tr>
  <tr><td style="color:#8a8072;">Phone</td><td>{{ $c->phone ?? '-' }}</td></tr>
  <tr><td style="color:#8a8072;">Service</td><td>{{ $c->service_type ?? '-' }}</td></tr>
  <tr><td style="color:#8a8072;">Project</td><td>{{ $c->project_type ?? '-' }}</td></tr>
  <tr><td style="color:#8a8072;">Meeting</td><td>{{ $c->consultation_type ?? '-' }}</td></tr>
  <tr><td style="color:#8a8072;">Location</td><td>{{ $c->location ?? '-' }}</td></tr>
</table>

<div style="margin:24px 0;padding:16px 20px;background:#faf7f1;">
  <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a8072;margin-bottom:8px;">Message</div>
  <div>{!! nl2br(e($c->message)) !!}</div>
</div>

<p style="margin-top:24px;font-size:13px;color:#8a8072;">Open admin panel to review and confirm.</p>
@endcomponent
