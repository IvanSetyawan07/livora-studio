{{-- resources/views/emails/consultation-dp-requested.blade.php --}}
@component('emails._layout', ['title' => 'Down payment requested'])
<h1 style="font-family:Georgia,serif;font-size:26px;font-weight:400;margin:0 0 20px;">Hello {{ $c->first_name }},</h1>

<p>Your project is moving forward. To secure your slot and begin the next stage, please settle the down payment (DP) below.</p>

<div style="margin:28px 0;padding:20px 24px;background:#faf7f1;border-left:3px solid #b89b6a;">
  <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a8072;margin-bottom:10px;">Down payment</div>
  <div style="font-family:Georgia,serif;font-size:22px;">Rp {{ number_format((float) $c->dp_amount, 0, ',', '.') }}</div>
</div>

<p>Once paid, please upload your payment proof from your consultation page so our team can verify it.</p>
<p style="margin-top:32px;">Questions? Just reply to this email or message us in your consultation chat.</p>
<p>Warm regards,<br><em>The Livora Team</em></p>
@endcomponent