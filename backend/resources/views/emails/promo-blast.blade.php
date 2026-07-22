@component('emails._layout', ['title' => $headline])
  @if($heroImage)
    <div style="margin:-32px -40px 24px;">
      <img src="{{ $heroImage }}" alt="" style="width:100%;display:block;">
    </div>
  @endif

  <p style="margin:0 0 8px;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#8a8072;">Livora Journal</p>
  <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#1c1c1c;">
    {{ $headline }}
  </h1>

  <p style="margin:0 0 16px;">Dear {{ $name }},</p>

  <div style="margin:0 0 24px;white-space:pre-line;">{{ $bodyMessage }}</div>

  @if($ctaLabel && $ctaUrl)
    <p style="margin:24px 0;">
      <a href="{{ $ctaUrl }}"
         style="display:inline-block;padding:14px 28px;background:#1c1c1c;color:#f5f1ea;
                text-decoration:none;font-family:Arial,sans-serif;font-size:11px;
                letter-spacing:.35em;text-transform:uppercase;">
        {{ $ctaLabel }}
      </a>
    </p>
  @endif

  <p style="margin:32px 0 0;font-size:12px;color:#8a8072;">
    With warmth,<br>
    The Livora Team
  </p>
@endcomponent
