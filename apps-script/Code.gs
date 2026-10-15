/**
 * Livora — penerima data tab "Pesanan" dari Laravel (satu baris per barang).
 *
 * SCRIPT PROPERTIES (Project Settings → Script properties):
 *   WEBHOOK_SECRET  = sama persis dengan SHOP_SHEETS_ORDERS_SECRET (atau SHOP_SHEETS_WEBHOOK_SECRET) di .env server
 *   SPREADSHEET_ID  = ID spreadsheet tujuan (potongan URL antara /d/ dan /edit).
 *                     Boleh dikosongkan kalau script ini dibuat dari menu Extensions → Apps Script di dalam spreadsheet-nya.
 *
 * DEPLOY: Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone.
 */
const TAB_NAME = 'Pesanan';

function doGet() {
  return ContentService.createTextOutput('Livora webhook Pesanan aktif');
}

function doPost(e) {
  let lock = null;
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    if (!secret || body.secret !== secret) return json_({ ok: false, error: 'unauthorized' });
    if (body.tab === 'ping') return json_({ ok: true, pong: true });
    if (body.tab !== 'pesanan') return json_({ ok: false, error: 'tab tidak dikenal: ' + body.tab });

    lock = LockService.getScriptLock();
    lock.waitLock(25000); // beberapa order bisa masuk bersamaan; tulis satu per satu
    return json_(Object.assign({ ok: true }, upsertOrder_(body)));
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (x) { /* abaikan */ } }
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Upsert semua baris milik satu order. Kunci baris = kolom A ("KODE#id-baris").
 * - baris yang sudah ada → di-update di tempat
 * - baris baru → ditambahkan di bawah
 * - baris order ini yang sudah tidak ada di data terbaru (barang dihapus) → dihapus
 */
function upsertOrder_(body) {
  const ss = spreadsheet_();
  const sh = ss.getSheetByName(TAB_NAME) || ss.insertSheet(TAB_NAME);
  const headers = body.headers;
  const rows = body.rows || [];
  const code = String(body.order_code);
  const nCols = headers.length;

  // Header (baris 1): tulis ulang hanya kalau berbeda
  const curWidth = Math.max(sh.getLastColumn(), nCols);
  const cur = sh.getLastRow() >= 1 ? sh.getRange(1, 1, 1, curWidth).getValues()[0] : [];
  const sameHeader = headers.every(function (h, i) { return cur[i] === h; });
  if (!sameHeader) {
    sh.getRange(1, 1, 1, nCols).setValues([headers]).setFontWeight('bold').setBackground('#efe9df');
    sh.setFrozenRows(1);
  }

  const lastRow = sh.getLastRow();
  const keys = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];

  // Hapus baris order ini yang sudah tidak ada (dari bawah ke atas supaya nomor baris tidak bergeser)
  const wanted = {};
  rows.forEach(function (r) { wanted[String(r[0])] = true; });
  const prefix = code + '#';
  let removed = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i].indexOf(prefix) === 0 && !wanted[keys[i]]) {
      sh.deleteRow(i + 2);
      keys.splice(i, 1);
      removed++;
    }
  }

  const pos = {};
  keys.forEach(function (k, i) { if (k) pos[k] = i + 2; });

  const toAppend = [];
  let updated = 0;
  rows.forEach(function (r) {
    const k = String(r[0]);
    if (pos[k]) {
      sh.getRange(pos[k], 1, 1, nCols).setValues([r]);
      updated++;
    } else {
      toAppend.push(r);
    }
  });

  if (toAppend.length) {
    const start = Math.max(sh.getLastRow(), 1) + 1;
    const need = start + toAppend.length - 1;
    if (sh.getMaxRows() < need) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows());
    applyFormats_(sh, start, toAppend.length, headers, body); // format dulu (teks '@'), baru isi nilai
    sh.getRange(start, 1, toAppend.length, nCols).setValues(toAppend);
  }

  return { updated: updated, added: toAppend.length, removed: removed };
}

function applyFormats_(sh, startRow, n, headers, body) {
  const text = body.text_columns || [];
  const money = body.money_columns || [];
  headers.forEach(function (h, i) {
    if (text.indexOf(h) >= 0) sh.getRange(startRow, i + 1, n, 1).setNumberFormat('@');
    else if (money.indexOf(h) >= 0) sh.getRange(startRow, i + 1, n, 1).setNumberFormat('#,##0');
  });
}
