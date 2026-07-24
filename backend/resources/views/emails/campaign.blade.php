{{--
    LIVORA JOURNAL — campaign email.
    This is the ONLY template for the email design. The admin preview renders
    this exact Blade view (via the /admin/marketing/preview endpoint) so preview
    and sent email can never drift apart.

    Expected variables:
    - $sectionLabel, $headline, $body (string, paragraphs separated by blank lines)
    - $heroImage (url|null), $heroImageAlt (string|null)
    - $ctaLabel (string|null), $ctaUrl (string|null)
    - $signature (string, may contain "\n")
    - $greetingName (string|null) — first name only, already resolved server-side
    - $brand (object/array): logoText, studioLabel, websiteUrl, instagramUrl,
      bookingUrl, contactUrl, copyrightYear, unsubscribeUrl
--}}
@php
    $hasHero = filled($heroImage ?? null);
    $hasCta = filled($ctaLabel ?? null) && filled($ctaUrl ?? null);
    $greeting = filled($greetingName ?? null) ? "Dear {$greetingName}," : 'Dear Friend,';
    $paragraphs = collect(preg_split('/\n\s*\n/', trim($body)))->filter();
    $signatureLines = collect(explode("\n", $signature))->map(fn ($l) => trim($l))->filter();

    $colorOuterBg = '#F3EFE8';
    $colorCanvas = '#FBF9F4';
    $colorCharcoal = '#1C1A17';
    $colorMuted = '#786F60';
    $colorBorder = '#E6DFD2';
    $serif = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
    $sans = "Helvetica, Arial, sans-serif";
@endphp
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $sectionLabel }}</title>
</head>
<body style="margin:0; padding:0; background-color: {{ $colorOuterBg }};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: {{ $colorOuterBg }};">
    <tr>
        <td align="center" style="padding:32px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; background-color: {{ $colorCanvas }};">

                {{-- Brand header (global — never editable per-campaign) --}}
                <tr>
                    <td style="padding:40px 40px 28px 40px; text-align:center;">
                        <div style="font-family: {{ $serif }}; font-size:22px; letter-spacing:6px; color: {{ $colorCharcoal }};">
                            {{ $brand['logoText'] }}
                        </div>
                        <div style="margin-top:8px; font-family: {{ $sans }}; font-size:10px; letter-spacing:3px; color: {{ $colorMuted }}; text-transform:uppercase;">
                            {{ $brand['studioLabel'] }}
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:0 40px;">
                        <div style="border-top:1px solid {{ $colorBorder }}; font-size:0; line-height:0;">&nbsp;</div>
                    </td>
                </tr>

                {{-- Hero image (hidden entirely if none) --}}
                @if ($hasHero)
                    <tr>
                        <td style="padding:32px 0 0 0;">
                            <img src="{{ $heroImage }}" alt="{{ $heroImageAlt ?? '' }}" width="100%"
                                 style="width:100%; max-width:100%; height:auto; display:block; border:0; outline:none; text-decoration:none;">
                        </td>
                    </tr>
                @endif

                {{-- Editorial label + headline --}}
                <tr>
                    <td style="padding: {{ $hasHero ? '40px' : '44px' }} 40px 0 40px; text-align:center;">
                        <div style="font-family: {{ $sans }}; font-size:11px; letter-spacing:3px; color: {{ $colorMuted }}; text-transform:uppercase;">
                            {{ $sectionLabel }}
                        </div>
                        <div style="margin-top:14px; font-family: {{ $serif }}; font-size:34px; line-height:42px; color: {{ $colorCharcoal }};">
                            {{ $headline }}
                        </div>
                        @unless ($hasHero)
                            <div style="margin:24px auto 0 auto; width:48px; border-top:1px solid {{ $colorBorder }}; font-size:0; line-height:0;">&nbsp;</div>
                        @endunless
                    </td>
                </tr>

                {{-- Greeting + body --}}
                <tr>
                    <td style="padding: {{ $hasHero ? '24px' : '20px' }} 40px 0 40px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="padding:0 0 20px 0; font-family: {{ $sans }}; font-size:15px; line-height:26px; color: {{ $colorCharcoal }};">
                                    {{ $greeting }}
                                </td>
                            </tr>
                            @foreach ($paragraphs as $paragraph)
                                <tr>
                                    <td style="padding:0 0 20px 0; font-family: {{ $sans }}; font-size:15px; line-height:26px; color: {{ $colorCharcoal }};">
                                        {!! nl2br(e(trim($paragraph))) !!}
                                    </td>
                                </tr>
                            @endforeach
                        </table>
                    </td>
                </tr>

                {{-- CTA (hidden entirely if label/url missing) + signature --}}
                <tr>
                    <td style="padding:0 40px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            @if ($hasCta)
                                <tr>
                                    <td style="padding:8px 0 28px 0;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="background-color: {{ $colorCharcoal }}; padding:14px 32px;">
                                                    <a href="{{ $ctaUrl }}"
                                                       style="font-family: {{ $sans }}; font-size:12px; letter-spacing:2.5px; color: {{ $colorCanvas }}; text-decoration:none; text-transform:uppercase;">
                                                        {{ $ctaLabel }} &nbsp;→
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            @endif
                            <tr>
                                <td style="padding:4px 0 40px 0; font-family: {{ $sans }}; font-size:15px; line-height:24px; color: {{ $colorCharcoal }};">
                                    {!! $signatureLines->map(fn ($l) => e($l))->implode('<br>') !!}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                {{-- Footer (global — never editable per-campaign) --}}
                <tr>
                    <td style="padding:36px 40px 40px 40px; text-align:center; border-top:1px solid {{ $colorBorder }};">
                        <div style="font-family: {{ $serif }}; font-size:16px; letter-spacing:4px; color: {{ $colorCharcoal }};">{{ $brand['logoText'] }}</div>
                        <div style="margin-top:6px; font-family: {{ $sans }}; font-size:9px; letter-spacing:2.5px; color: {{ $colorMuted }}; text-transform:uppercase;">{{ $brand['studioLabel'] }}</div>
                        <div style="margin-top:20px; font-family: {{ $sans }}; font-size:11px;">
                            @php $links = collect([
                                ['label' => 'Website', 'url' => $brand['websiteUrl'] ?? null],
                                ['label' => 'Instagram', 'url' => $brand['instagramUrl'] ?? null],
                                ['label' => 'Book Consultation', 'url' => $brand['bookingUrl'] ?? null],
                                ['label' => 'Contact', 'url' => $brand['contactUrl'] ?? null],
                            ])->filter(fn ($l) => filled($l['url'])); @endphp
                            @foreach ($links as $i => $link)
                                <a href="{{ $link['url'] }}" style="color: {{ $colorCharcoal }}; text-decoration:underline;">{{ $link['label'] }}</a>
                                @if (!$loop->last)<span style="color: {{ $colorBorder }}; padding:0 10px;">|</span>@endif
                            @endforeach
                        </div>
                        <div style="margin-top:24px; font-family: {{ $sans }}; font-size:11px; line-height:20px; color: {{ $colorMuted }};">
                            &copy; {{ $brand['copyrightYear'] }} {{ $brand['logoText'] }}. All rights reserved.<br>
                            You are receiving this email because you subscribed to our updates.<br>
                            <a href="{{ $brand['unsubscribeUrl'] ?? '#' }}" style="color: {{ $colorMuted }}; text-decoration:underline;">Unsubscribe</a>
                        </div>
                    </td>
                </tr>

            </table>
        </td>
    </tr>
</table>
</body>
</html>