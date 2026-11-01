/**
 * Penulis .xlsx minimal tanpa dependensi (zip berisi part OOXML).
 * Didukung: teks, angka, tanggal, gaya sel (tebal, italic, warna huruf, isi, border, rata, wrap,
 * format tanggal / teks), lebar kolom, tinggi baris, freeze baris header, filter otomatis,
 * dan ulang baris header saat dicetak.
 */

export type CellStyle = {
  bold?: boolean;
  italic?: boolean;
  size?: number;
  color?: string; // RGB hex tanpa "#", mis. "1F2937"
  fill?: string; // RGB hex tanpa "#"
  border?: boolean;
  wrap?: boolean;
  h?: "left" | "center" | "right";
  v?: "top" | "center";
  date?: boolean; // format dd/mm/yyyy hh:mm (otomatis untuk Date)
  text?: boolean; // format teks agar nomor tidak berubah bentuk
};

export type CellValue = string | number | Date | null | undefined;
export type Cell = CellValue | { v: CellValue; s?: CellStyle };

export type SheetSpec = {
  name: string;
  rows: Cell[][];
  widths?: number[]; // lebar kolom dalam satuan karakter, indeks = kolom (0-based)
  heights?: Record<number, number>; // tinggi baris (pt), kunci = nomor baris (1-based)
  freezeRows?: number; // jumlah baris teratas yang dibekukan
  autoFilterRef?: string; // mis. "A4:O20"
  repeatRows?: number; // baris yang diulang di setiap halaman cetak
};

const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DATE_FMT = "dd/mm/yyyy hh:mm";
const BORDER_XML =
  '<border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right>' +
  '<top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border>';
const enc = new TextEncoder();

/* ───────────── util ───────────── */

export function colName(i: number): string {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const esc = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const absRef = (ref: string) =>
  ref
    .split(":")
    .map((p) => {
      const m = /^([A-Z]+)(\d+)$/.exec(p);
      return m ? `$${m[1]}$${m[2]}` : p;
    })
    .join(":");

/** Tanggal → nomor seri Excel memakai jam dinding lokal (sesuai yang terlihat admin). */
const excelSerial = (d: Date) =>
  (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()) - Date.UTC(1899, 11, 30)) / 86400000;

function norm(c: Cell): { v: CellValue; s: CellStyle } {
  const wrapped = typeof c === "object" && c !== null && !(c instanceof Date);
  const v = wrapped ? (c as { v: CellValue }).v : (c as CellValue);
  const s: CellStyle = { ...(wrapped ? (c as { s?: CellStyle }).s ?? {} : {}) };
  if (v instanceof Date) s.date = true;
  return { v, s };
}

/* ───────────── gaya ───────────── */

function fontXml(s: CellStyle): string {
  return `<font>${s.bold ? "<b/>" : ""}${s.italic ? "<i/>" : ""}<sz val="${s.size ?? 11}"/><color rgb="FF${s.color ?? "000000"}"/><name val="Calibri"/><family val="2"/></font>`;
}

const fillXml = (c: string) =>
  `<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill>`;

class StyleBook {
  private fonts: string[] = [fontXml({})];
  private fills: string[] = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  private borders: string[] = ["<border><left/><right/><top/><bottom/><diagonal/></border>", BORDER_XML];
  private numFmts: string[] = [];
  private xfs: string[] = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  private seen = new Map<string, number>();

  private idx(list: string[], xml: string): number {
    let i = list.indexOf(xml);
    if (i < 0) {
      list.push(xml);
      i = list.length - 1;
    }
    return i;
  }

  private fmt(code: string): number {
    let i = this.numFmts.indexOf(code);
    if (i < 0) {
      this.numFmts.push(code);
      i = this.numFmts.length - 1;
    }
    return 164 + i;
  }

  /** Mengembalikan indeks xf (kolom s="…") untuk gaya tertentu; gaya yang sama dipakai ulang. */
  add(s: CellStyle): number {
    const key = JSON.stringify(s);
    if (key === "{}") return 0;
    const hit = this.seen.get(key);
    if (hit !== undefined) return hit;

    const fontId = this.idx(this.fonts, fontXml(s));
    const fillId = s.fill ? this.idx(this.fills, fillXml(s.fill)) : 0;
    const borderId = s.border ? 1 : 0;
    const numFmtId = s.date ? this.fmt(DATE_FMT) : s.text ? 49 : 0;
    // Selalu eksplisit: tanpa ini sel tanpa perataan jatuh ke bawah di baris yang tinggi.
    const align = `<alignment${s.h ? ` horizontal="${s.h}"` : ""} vertical="${s.v ?? "top"}"${s.wrap ? ' wrapText="1"' : ""}/>`;
    const attrs =
      `numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"` +
      (numFmtId ? ' applyNumberFormat="1"' : "") +
      (fontId ? ' applyFont="1"' : "") +
      (fillId ? ' applyFill="1"' : "") +
      (borderId ? ' applyBorder="1"' : "") +
      (align ? ' applyAlignment="1"' : "");
    this.xfs.push(align ? `<xf ${attrs}>${align}</xf>` : `<xf ${attrs}/>`);
    const id = this.xfs.length - 1;
    this.seen.set(key, id);
    return id;
  }

  toXml(): string {
    const nf = this.numFmts.length
      ? `<numFmts count="${this.numFmts.length}">${this.numFmts.map((c, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(c)}"/>`).join("")}</numFmts>`
      : "";
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${nf}` +
      `<fonts count="${this.fonts.length}">${this.fonts.join("")}</fonts>` +
      `<fills count="${this.fills.length}">${this.fills.join("")}</fills>` +
      `<borders count="${this.borders.length}">${this.borders.join("")}</borders>` +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      "</styleSheet>"
    );
  }
}

/* ───────────── sheet ───────────── */

function cellXml(ref: string, v: CellValue, sid: number): string {
  const s = sid ? ` s="${sid}"` : "";
  if (v === null || v === undefined || v === "" || (v instanceof Date && isNaN(v.getTime()))) return `<c r="${ref}"${s}/>`;
  if (v instanceof Date) return `<c r="${ref}"${s}><v>${excelSerial(v)}</v></c>`;
  if (typeof v === "number") return Number.isFinite(v) ? `<c r="${ref}"${s}><v>${v}</v></c>` : `<c r="${ref}"${s}/>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
}

function sheetXml(sp: SheetSpec, sb: StyleBook): string {
  const widths = sp.widths ?? [];
  const maxCol = sp.rows.reduce((m, r) => Math.max(m, r.length), 0);
  const body: string[] = [];

  sp.rows.forEach((row, ri) => {
    const rn = ri + 1;
    let lines = 1;
    const cells: string[] = [];
    row.forEach((raw, ci) => {
      const { v, s } = norm(raw);
      cells.push(cellXml(`${colName(ci)}${rn}`, v, sb.add(s)));
      // Excel tidak menyesuaikan tinggi baris untuk teks wrap saat dibuka, jadi perkirakan sendiri.
      if (s.wrap && typeof v === "string" && widths[ci]) {
        const per = Math.max(1, Math.floor(widths[ci] * 1.1));
        lines = Math.max(lines, v.split("\n").reduce((n, p) => n + Math.max(1, Math.ceil(p.length / per)), 0));
      }
    });
    const ht = sp.heights?.[rn] ?? (lines > 1 ? Math.min(409, lines * 15 + 3) : undefined);
    body.push(`<row r="${rn}"${ht ? ` ht="${ht}" customHeight="1"` : ""}>${cells.join("")}</row>`);
  });

  const lastRef = `${colName(Math.max(0, maxCol - 1))}${Math.max(1, sp.rows.length)}`;
  const view = sp.freezeRows
    ? `<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${sp.freezeRows}" topLeftCell="A${sp.freezeRows + 1}" activePane="bottomLeft" state="frozen"/>` +
      `<selection pane="bottomLeft" activeCell="A${sp.freezeRows + 1}" sqref="A${sp.freezeRows + 1}"/></sheetView></sheetViews>`
    : '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>';
  const cols = widths.length
    ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
    : "";
  const filter = sp.autoFilterRef ? `<autoFilter ref="${sp.autoFilterRef}"/>` : "";

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    `<dimension ref="A1:${lastRef}"/>${view}<sheetFormatPr defaultRowHeight="15"/>${cols}` +
    `<sheetData>${body.join("")}</sheetData>${filter}` +
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
    '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
    "</worksheet>"
  );
}

/* ───────────── paket xlsx ───────────── */

function workbookXml(sheets: SheetSpec[]): string {
  const els = sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("");
  const names: string[] = [];
  sheets.forEach((s, i) => {
    const q = `'${s.name.replace(/'/g, "''")}'`;
    if (s.autoFilterRef) names.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${q}!${absRef(s.autoFilterRef)}</definedName>`);
    if (s.repeatRows) names.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${q}!$${s.repeatRows}:$${s.repeatRows}</definedName>`);
  });
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="16000" windowHeight="9000"/></bookViews>' +
    `<sheets>${els}</sheets>${names.length ? `<definedNames>${names.join("")}</definedNames>` : ""}</workbook>`
  );
}

function contentTypesXml(n: number): string {
  const sheetOverrides = Array.from({ length: n }, (_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join("");
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheetOverrides +
    "</Types>"
  );
}

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  "</Relationships>";

function workbookRelsXml(n: number): string {
  const rels = Array.from({ length: n }, (_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join("");
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    rels +
    `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    "</Relationships>"
  );
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Zip tanpa kompresi (STORE). Excel membacanya tanpa masalah dan ukuran tabel ini kecil. */
function zip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;

    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true); // versi minimum
    lh.setUint16(6, 0x0800, true); // nama UTF-8
    lh.setUint16(8, 0, true); // metode STORE
    lh.setUint16(12, 0x21, true); // tanggal 1980-01-01
    lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true);
    lh.setUint32(22, size, true);
    lh.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(lh.buffer), name, f.data);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(14, 0x21, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true);
    ch.setUint32(24, size, true);
    ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);

    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return concat([...chunks, ...central, new Uint8Array(end.buffer)]);
}

/** Membangun file .xlsx (byte-nya) dari satu atau beberapa lembar. */
export function buildXlsx(sheets: SheetSpec[]): Uint8Array {
  const sb = new StyleBook();
  const sheetParts = sheets.map((s) => sheetXml(s, sb)); // dulu: mengisi gaya
  return zip([
    { name: "[Content_Types].xml", data: enc.encode(contentTypesXml(sheets.length)) },
    { name: "_rels/.rels", data: enc.encode(ROOT_RELS) },
    { name: "xl/workbook.xml", data: enc.encode(workbookXml(sheets)) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(workbookRelsXml(sheets.length)) },
    { name: "xl/styles.xml", data: enc.encode(sb.toXml()) },
    ...sheetParts.map((x, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(x) })),
  ]);
}

/** Memicu unduhan file .xlsx di browser. */
export function downloadXlsx(sheets: SheetSpec | SheetSpec[], filename: string): void {
  const bytes = buildXlsx(Array.isArray(sheets) ? sheets : [sheets]);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: MIME }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
