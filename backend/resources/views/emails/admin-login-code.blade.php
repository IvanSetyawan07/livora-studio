@component('emails._layout', ['title' => 'Kode masuk admin'])
<h1 style="font-family:Georgia,serif;font-size:24px;font-weight:400;margin:0 0 16px;">Halo {{ $name }},</h1>
<p style="margin:0 0 20px;">Seseorang (semoga Anda) sedang masuk ke panel admin Livora. Masukkan kode berikut untuk melanjutkan:</p>
<div style="font-family:Arial,sans-serif;font-size:34px;letter-spacing:.45em;font-weight:700;text-align:center;padding:20px 0;margin:0 0 20px;background:#f5f1ea;border:1px solid #e6dfd2;">{{ $code }}</div>
<p style="margin:0 0 12px;">Kode berlaku {{ $minutes }} menit dan hanya bisa dipakai sekali.</p>
<p style="margin:0;color:#8a8072;font-size:13px;">Jika Anda tidak sedang masuk, abaikan email ini dan segera ganti password admin Anda.</p>
@endcomponent
