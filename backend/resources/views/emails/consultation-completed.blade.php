{{-- resources/views/emails/consultation-completed.blade.php --}}
@component('emails._layout', ['title' => 'Your project is complete'])
<h1 style="font-family:Georgia,serif;font-size:26px;font-weight:400;margin:0 0 20px;">Hello {{ $c->first_name }},</h1>

<p>Congratulations — your project with Livora is now complete! It's been a pleasure bringing your space to life.</p>

<div style="margin:28px 0;padding:20px 24px;background:#faf7f1;border-left:3px solid #b89b6a;">
  <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a8072;margin-bottom:10px;">Project</div>
  @if($c->project_type)<div><strong>Project:</strong> {{ $c->project_type }}</div>@endif
  @if($c->service_type)<div><strong>Service:</strong> {{ $c->service_type }}</div>@endif
</div>

<p>You can revisit the full journey, files and final agreement any time from your consultation page.</p>
<p style="margin-top:32px;">Thank you for trusting Livora with your home.</p>
<p>Warm regards,<br><em>The Livora Team</em></p>
@endcomponent