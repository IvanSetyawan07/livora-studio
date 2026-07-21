@component('emails._layout', ['title' => 'A note from Livora'])
<h1 style="font-family:Georgia,serif;font-size:24px;font-weight:400;margin:0 0 20px;">Hello {{ $name }},</h1>

<div style="font-size:15px;line-height:1.8;">{!! nl2br(e($message)) !!}</div>

@if(count($items))
<div style="margin:28px 0;padding:20px 24px;background:#faf7f1;">
  <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a8072;margin-bottom:10px;">Your saved items</div>
  <ul style="padding-left:18px;margin:0;">
    @foreach($items as $it)
      <li style="margin:4px 0;">{{ $it['name'] ?? 'Item' }} <span style="color:#8a8072;">({{ $it['type'] ?? '' }})</span></li>
    @endforeach
  </ul>
</div>
@endif

<p style="margin-top:32px;">Warm regards,<br><em>The Livora Team</em></p>
@endcomponent
