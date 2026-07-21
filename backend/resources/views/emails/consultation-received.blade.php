@component('emails._layout', ['title' => 'We received your request'])
<h1 style="font-family:Georgia,serif;font-size:26px;font-weight:400;margin:0 0 20px;">Thank you, {{ $c->first_name }}.</h1>

<p>We've received your consultation request and our design team is reviewing it now. You'll hear back from us within <strong>1×24 hours</strong> with next steps.</p>

<div style="margin:28px 0;padding:20px 24px;background:#faf7f1;border-left:3px solid #b89b6a;">
  <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a8072;margin-bottom:10px;">Your request</div>
  @if($c->service_type)<div><strong>Service:</strong> {{ $c->service_type }}</div>@endif
  @if($c->project_type)<div><strong>Project:</strong> {{ $c->project_type }}</div>@endif
  @if($c->consultation_type)<div><strong>Preferred meeting:</strong> {{ $c->consultation_type }}</div>@endif
  @if($c->location)<div><strong>Location:</strong> {{ $c->location }}</div>@endif
</div>

<p style="color:#5a5348;">A member of our design team will reach out via {{ $c->contact_method ?? 'email' }} shortly.</p>
<p style="margin-top:32px;">Warm regards,<br><em>The Livora Team</em></p>
@endcomponent
