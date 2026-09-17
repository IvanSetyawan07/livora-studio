@component('emails._layout', ['title' => $heading])
<h1 style="font-family:Georgia,serif;font-size:26px;font-weight:400;margin:0 0 20px;">Halo {{ $c->first_name }},</h1>

<p style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#b89b6a;margin:0 0 18px;">{{ $heading }}</p>

@foreach($paragraphs as $p)
  <p style="margin:0 0 14px;">{!! $p !!}</p>
@endforeach

@if(!empty($rows))
<div style="margin:28px 0;padding:20px 24px;background:#faf7f1;border-left:3px solid #b89b6a;">
  @foreach($rows as $label => $value)
    <div style="margin-bottom:6px;"><strong>{{ $label }}:</strong> {!! $value !!}</div>
  @endforeach
</div>
@endif

@if($ctaUrl)
<p style="margin:30px 0;">
  <a href="{{ $ctaUrl }}" style="display:inline-block;background:#1c1c1c;color:#ffffff;text-decoration:none;padding:14px 28px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;">{{ $ctaLabel }}</a>
</p>
<p style="font-family:Arial,sans-serif;font-size:11px;color:#8a8072;margin:0 0 20px;">
  Anda perlu masuk ke akun Livora terlebih dahulu untuk membuka halaman ini.
</p>
@endif

@if($footnote)
<p style="font-family:Arial,sans-serif;font-size:12px;color:#6f675c;">{!! $footnote !!}</p>
@endif

<p style="margin-top:28px;">Salam hangat,<br><em>Tim Livora</em></p>
@endcomponent
