# Sinkron Register Dokumen ke Google Sheets

1. Buat Google Sheet baru, baris 1 berisi judul kolom:
   nomor | judul | status | versi | tanggal | kode_order | customer | perusahaan | item | dpp | ppn | grand_total | dibayar | metode
2. Extensions → Apps Script, tempel:

```js
const SECRET = "ISI_SAMA_DENGAN_SHOP_SHEETS_WEBHOOK_SECRET";
function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.secret !== SECRET) return ContentService.createTextOutput("forbidden");
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const cols = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(cols.map((c) => d[c] ?? ""));
  return ContentService.createTextOutput("ok");
}
```
3. Deploy → New deployment → Web app → Execute as: Me, Access: Anyone. Salin URL.
4. Isi `SHOP_SHEETS_WEBHOOK_URL` dan `SHOP_SHEETS_WEBHOOK_SECRET` di `backend/.env`, lalu `php artisan config:clear`.
