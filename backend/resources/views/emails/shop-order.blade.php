@component('emails._layout', ['title' => $heading])
<h1 style="font-family:Georgia,serif;font-size:24px;font-weight:400;margin:0 0 16px;">Hai {{ $o->customer_name }},</h1>
<p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#b89b6a;margin:0 0 16px;">{{ $heading }}</p>
@foreach($paragraphs as $p)
<p style="margin:0 0 12px;">{{ $p }}</p>
@endforeach
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #e6dfd2;font-family:Arial,sans-serif;font-size:13px;">
  <tr><td style="padding:10px 0;color:#8a8072;">Kode pesanan</td><td align="right" style="padding:10px 0;font-weight:bold;">{{ $o->code }}</td></tr>
  @foreach($o->items as $i => $line)
  <tr><td style="padding:6px 0;border-top:1px solid #f0ebe2;">{{ $i + 1 }}. {{ $line->title }}@if($line->variant_name) ({{ $line->variant_name }})@endif</td>
      <td align="right" style="padding:6px 0;border-top:1px solid #f0ebe2;">x{{ $line->quantity }}@if($o->quote_sent_at) · Rp {{ number_format(($line->unit_price) * $line->quantity, 0, ',', '.') }}@endif</td></tr>
  @endforeach
  @if($o->quote_sent_at)
  <tr><td style="padding:10px 0;border-top:1px solid #e6dfd2;font-weight:bold;">Total</td><td align="right" style="padding:10px 0;border-top:1px solid #e6dfd2;font-weight:bold;">Rp {{ number_format($o->grand_total, 0, ',', '.') }}</td></tr>
  @endif
  @if($o->tracking_number)
  <tr><td style="padding:6px 0;color:#8a8072;">Kurir / resi</td><td align="right" style="padding:6px 0;">{{ $o->courier }} · {{ $o->tracking_number }}</td></tr>
  @endif
</table>
@if($ctaUrl)
<p style="margin:24px 0;"><a href="{{ $ctaUrl }}" style="display:inline-block;background:#1c1c1c;color:#ffffff;text-decoration:none;padding:12px 24px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:.08em;">{{ $ctaLabel }}</a></p>
@endif
<p style="margin:0;color:#8a8072;font-size:12px;">Butuh bantuan? Balas pesan WhatsApp kami dengan menyebut kode pesanan.</p>
@endcomponent
