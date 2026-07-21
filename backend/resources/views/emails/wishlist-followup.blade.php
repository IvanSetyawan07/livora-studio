@component('emails._layout', ['title' => 'A note from Livora'])
<h1 style="font-family:Georgia,serif;font-size:24px;font-weight:400;margin:0 0 20px;">Hello {{ $name }},</h1>

<div style="font-size:15px;line-height:1.8;">{!! nl2br(e($bodyMessage)) !!}</div>

@if(count($items))
<div style="margin:28px 0;padding:20px 24px;background:#faf7f1;">
  <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a8072;margin-bottom:14px;">Your saved items</div>
  {{-- FIX: pakai <table> (bukan <ul>/flex) supaya kompatibel di email client,
       dan tambahkan gambar tiap item --}}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    @foreach($items as $it)
      <tr>
        <td style="padding:8px 12px 8px 0;width:52px;vertical-align:top;">
          @if(!empty($it['image']))
            <img src="{{ $it['image'] }}" alt="{{ $it['name'] ?? 'Item' }}" width="48" height="48" style="width:48px;height:48px;object-fit:cover;border-radius:6px;display:block;background:#eee;">
          @else
            <div style="width:48px;height:48px;border-radius:6px;background:#eee;"></div>
          @endif
        </td>
        <td style="padding:8px 0;font-size:14px;vertical-align:middle;border-bottom:1px solid #eee;">
          {{ $it['name'] ?? 'Item' }} <span style="color:#8a8072;">({{ $it['type'] ?? '' }})</span>
        </td>
      </tr>
    @endforeach
  </table>
</div>
@endif

<p style="margin-top:32px;">Warm regards,<br><em>The Livora Team</em></p>
@endcomponent