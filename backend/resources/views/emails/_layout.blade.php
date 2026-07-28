<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>{{ $title ?? 'Livora' }}</title>
</head>
<body style="margin:0;padding:0;background:#f5f1ea;font-family:'Georgia',serif;color:#1c1c1c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e6dfd2;">
        <tr><td style="padding:32px 40px;border-bottom:1px solid #e6dfd2;">
          <div style="font-family:Georgia,serif;font-size:20px;letter-spacing:.35em;color:#1c1c1c;">L I V O R A</div>
        </td></tr>
        <tr><td style="padding:32px 40px;font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#1c1c1c;">
          {!! $slot !!}
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e6dfd2;font-family:Arial,sans-serif;font-size:11px;color:#8a8072;letter-spacing:.15em;text-transform:uppercase;">
          Livora — PT. Langgeng Cipta Ruang
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
