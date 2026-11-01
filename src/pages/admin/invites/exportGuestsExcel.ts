import type { InviteGuest } from "@/lib/invites";
import { colName, downloadXlsx, type Cell, type CellStyle, type SheetSpec } from "@/lib/xlsx";

// Label sama dengan AdminInvites.tsx (CAT / STATUS / RSVP).
const CAT: Record<string, string> = { rekanan: "Rekanan", pelanggan: "Pelanggan", pendaftar: "Pendaftar Form" };
const STATUS: Record<string, { l: string; color: string }> = {
  draft: { l: "Draf", color: "6B7280" },
  siap: { l: "Siap kirim", color: "0369A1" },
  terkirim: { l: "Terkirim", color: "047857" },
  gagal: { l: "Gagal", color: "B91C1C" },
  dibalas: { l: "Dibalas", color: "6D28D9" },
};
const SOURCE: Record<string, string> = { manual: "Manual", import: "Impor", sheet: "Google Sheet" };
const CHANNEL: Record<string, string> = { otomatis: "Otomatis (Livi)", manual: "Manual (wa.me)", massal: "Massal (Fonnte)" };
const RSVP: Record<string, string> = { hadir: "Hadir", tidak: "Tidak hadir" };

const HEADERS = [
  "No", "Nama", "Nomor WhatsApp", "Kategori", "Sumber", "Status", "Cara kirim",
  "Waktu terkirim", "Kehadiran", "Waktu jawab", "Waktu check-in", "Gambar",
  "Deskripsi pesan", "Catatan internal", "Catatan error",
];
const WIDTHS = [6, 26, 18, 16, 13, 14, 17, 17, 15, 17, 17, 11, 60, 28, 36];
const HEAD_ROW = 4; // baris judul (1), keterangan (2), kosong (3), header (4)

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const stamp = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Timestamp dari API (ISO, atau "YYYY-MM-DD HH:mm:ss") → Date; kosong/tidak valid → null. */
function toDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

/** Menyusun lembar Excel dari daftar tamu (urutannya mengikuti tabel di layar). */
export function buildGuestsSheet(guests: InviteGuest[], eventName: string, now = new Date()): SheetSpec {
  const rows: Cell[][] = [
    [{ v: `Daftar tamu · ${eventName}`, s: { bold: true, size: 14, color: "111827" } }],
    [{ v: `Diekspor ${stamp(now)} · ${guests.length} tamu`, s: { italic: true, size: 10, color: "6B7280" } }],
    [],
    HEADERS.map((h): Cell => ({
      v: h,
      s: { bold: true, color: "FFFFFF", fill: "1F2937", border: true, h: "center", v: "center", wrap: true },
    })),
  ];

  guests.forEach((g, i) => {
    const st = (extra: CellStyle = {}): CellStyle => ({ border: true, ...(i % 2 ? { fill: "F9FAFB" } : {}), ...extra });
    const status = STATUS[g.status];
    const phone = g.phone.startsWith("+") ? g.phone : `+${g.phone}`;
    rows.push([
      { v: i + 1, s: st({ h: "center" }) },
      { v: g.name, s: st({ bold: true }) },
      { v: phone, s: st({ text: true }) },
      { v: CAT[g.category] ?? g.category, s: st() },
      { v: SOURCE[g.source] ?? "", s: st() },
      { v: status?.l ?? g.status, s: st({ bold: true, color: status?.color ?? "374151" }) },
      { v: g.send_channel ? CHANNEL[g.send_channel] ?? g.send_channel : "", s: st() },
      { v: toDate(g.sent_at), s: st({ h: "center" }) },
      { v: g.rsvp ? RSVP[g.rsvp] ?? g.rsvp : "Belum menjawab", s: st() },
      { v: toDate(g.rsvp_at), s: st({ h: "center" }) },
      { v: toDate(g.checked_in_at), s: st({ h: "center" }) },
      { v: g.image_path ? "Pribadi" : g.image_url ? "Umum" : "-", s: st({ h: "center" }) },
      { v: g.description ?? "", s: st({ wrap: true }) },
      { v: g.notes ?? "", s: st({ wrap: true }) },
      { v: g.error_note ?? "", s: st({ wrap: true, color: "B91C1C" }) },
    ]);
  });

  return {
    name: "Daftar tamu",
    rows,
    widths: WIDTHS,
    heights: { 1: 24, [HEAD_ROW]: 30 },
    freezeRows: HEAD_ROW,
    autoFilterRef: `A${HEAD_ROW}:${colName(HEADERS.length - 1)}${HEAD_ROW + guests.length}`,
    repeatRows: HEAD_ROW,
  };
}

/** Mengunduh daftar tamu sebagai file .xlsx. */
export function exportGuestsExcel(guests: InviteGuest[], eventName: string): void {
  const now = new Date();
  const safe = eventName.replace(/[\\/:*?"<>|]+/g, "-").trim() || "acara";
  downloadXlsx(buildGuestsSheet(guests, eventName, now), `Daftar tamu - ${safe} - ${ymd(now)}.xlsx`);
}
