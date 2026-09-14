{{-- resources/views/emails/consultation-progress-updated.blade.php --}}
@component('emails._layout', ['title' => 'Project progress update'])
<h1 style="font-family:Georgia,serif;font-size:26px;font-weight:400;margin:0 0 20px;">Hello {{ $c->first_name }},</h1>

<p>Here's the latest update on your project.</p>

<div style="margin:28px 0;padding:20px 24px;background:#faf7f1;border-left:3px solid #b89b6a;">
  <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a8072;margin-bottom:10px;">Progress</div>
  <div style="font-family:Georgia,serif;font-size:28px;">{{ $update->percentage }}%</div>
  @if($update->note)
    <div style="margin-top:10px;">{!! nl2br(e($update->note)) !!}</div>
  @endif
</div>

<p style="margin-top:32px;">Log in to your consultation page any time to see full photos and history.</p>
<p>Warm regards,<br><em>The Livora Team</em></p>
@endcomponent