<?php

namespace App\Services\Shop;

use App\Models\ShopDocument;
use Illuminate\Support\Facades\Storage;

/**
 * PDF Proforma Invoice / Invoice A4 (FPDF) — desain premium Livora.
 * Disimpan di disk privat 'local' (storage/app/shop-documents), hanya bisa
 * diunduh lewat endpoint yang memeriksa kepemilikan — tidak pernah lewat
 * /storage publik.
 */
class InvoicePdf
{
    // Palet Livora (RGB)
    private const INK = [43, 36, 30];        // cokelat tinta
    private const GOLD = [176, 141, 87];     // aksen emas
    private const CREAM = [250, 247, 241];   // latar kotak
    private const LINE = [214, 202, 188];    // garis halus
    private const MUTE = [128, 116, 103];    // teks redup
    private const GREEN = [46, 125, 50];
    private const RED = [180, 40, 40];

    public static function label(string $title): string
    {
        return ['Tagihan' => 'Proforma Invoice', 'Tagihan Tambahan' => 'Proforma Invoice Tambahan'][$title] ?? $title;
    }

    public function render(ShopDocument $doc): string
    {
        $s = $doc->snapshot;
        $c = config('services.shop');
        $pdf = new \FPDF('P', 'mm', 'A4');
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 22);
        $pdf->AddPage();
        $t = fn ($v) => iconv('UTF-8', 'windows-1252//TRANSLIT', (string) $v);
        $rp = fn ($v) => 'Rp '.number_format((int) $v, 0, ',', '.');

        // ===== Pita atas emas + header =====
        $pdf->SetFillColor(...self::GOLD);
        $pdf->Rect(0, 0, 210, 2.5, 'F');

        $logo = public_path('logo-livora.png');
        if (is_file($logo)) {
            $pdf->Image($logo, 15, 12, 30);
            $pdf->SetY(28);
        } else {
            $pdf->SetY(12);
            $pdf->SetFont('Times', 'B', 22);
            $pdf->SetTextColor(...self::INK);
            $pdf->Cell(90, 9, 'L I V O R A', 0, 2);
        }
        $pdf->SetTextColor(...self::INK);
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->Cell(95, 5, $t($c['company_name']), 0, 2);
        $pdf->SetFont('Helvetica', '', 8);
        $pdf->SetTextColor(...self::MUTE);
        $pdf->MultiCell(95, 4, $t($c['company_address']));
        if (!empty($c['company_npwp'])) $pdf->Cell(95, 4, $t('NPWP: '.$c['company_npwp']), 0, 2);
        $leftBottom = $pdf->GetY();

        // Judul kanan + kartu meta
        $pdf->SetXY(112, 13);
        $pdf->SetFont('Helvetica', 'B', 17);
        $pdf->SetTextColor(...self::INK);
        $pdf->Cell(83, 8, $t(strtoupper(self::label($doc->title))), 0, 2, 'R');
        $pdf->SetFont('Helvetica', '', 7);
        $pdf->SetTextColor(...self::GOLD);
        $pdf->Cell(83, 4, 'LIVORA LIVING - CUSTOM FURNITURE', 0, 2, 'R');

        $metaY = $pdf->GetY() + 3;
        $pdf->SetFillColor(...self::CREAM);
        $pdf->SetDrawColor(...self::LINE);
        $pdf->Rect(112, $metaY, 83, 21, 'DF');
        $meta = [
            ['Tanggal', $doc->issued_at->translatedFormat('d F Y')],
            ['Nomor', $doc->number],
            ['Kode Pesanan', $s['order_code'] ?? ''],
        ];
        foreach ($meta as $i => [$k, $v]) {
            $pdf->SetXY(116, $metaY + 2.5 + $i * 6);
            $pdf->SetFont('Helvetica', '', 7);
            $pdf->SetTextColor(...self::MUTE);
            $pdf->Cell(24, 5, strtoupper($k), 0, 0);
            $pdf->SetFont('Helvetica', 'B', 8);
            $pdf->SetTextColor(...self::INK);
            $pdf->Cell(53, 5, $t($v), 0, 0, 'R');
        }

        $pdf->SetY(max($leftBottom, $metaY + 21) + 7);

        // ===== Kepada Yth =====
        $b = $s['buyer'] ?? [];
        $pdf->SetFont('Helvetica', 'B', 7);
        $pdf->SetTextColor(...self::GOLD);
        $pdf->Cell(0, 4, 'KEPADA YTH.', 0, 1);
        $pdf->SetDrawColor(...self::GOLD);
        $pdf->Line(15, $pdf->GetY(), 40, $pdf->GetY());
        $pdf->Ln(1.5);
        $pdf->SetTextColor(...self::INK);
        foreach ([['Nama', $b['name'] ?? '-'], ['Perusahaan', $b['company'] ?? '-'], ['Alamat', $b['address'] ?? '-'], ['No. Telp', $b['phone'] ?? '-']] as [$k, $v]) {
            $pdf->SetFont('Helvetica', '', 8);
            $pdf->SetTextColor(...self::MUTE);
            $pdf->Cell(25, 4.5, $k, 0, 0);
            $pdf->SetTextColor(...self::INK);
            $pdf->SetFont('Helvetica', '', 9);
            $pdf->MultiCell(0, 4.5, $t(': '.$v));
        }
        if (!empty($b['npwp'])) {
            $pdf->SetFont('Helvetica', '', 8);
            $pdf->SetTextColor(...self::MUTE);
            $pdf->Cell(25, 4.5, 'NPWP', 0, 0);
            $pdf->SetTextColor(...self::INK);
            $pdf->SetFont('Helvetica', '', 9);
            $pdf->Cell(0, 4.5, $t(': '.$b['npwp']), 0, 1);
        }
        $pdf->Ln(4);

        // ===== Tabel barang =====
        $w = [9, 62, 25, 12, 14, 29, 29];
        $pdf->SetFont('Helvetica', 'B', 8);
        $pdf->SetFillColor(...self::INK);
        $pdf->SetTextColor(255, 255, 255);
        foreach (['No', 'Nama Barang', 'Kode Produk', 'Qty', 'Satuan', 'Harga/Unit', 'Harga Total'] as $i => $h) {
            $pdf->Cell($w[$i], 8, $h, 0, 0, $i >= 5 ? 'R' : 'L', true);
        }
        $pdf->Ln();
        $pdf->SetTextColor(...self::INK);
        $pdf->SetDrawColor(...self::LINE);
        foreach (($s['items'] ?? []) as $n => $it) {
            $name = $it['title'].(!empty($it['variant_name']) ? ' - '.$it['variant_name'] : '');
            $h = !empty($it['discount_label']) ? 11 : 8;
            if ($n % 2 === 1) {
                $pdf->SetFillColor(...self::CREAM);
            } else {
                $pdf->SetFillColor(255, 255, 255);
            }
            $y = $pdf->GetY();
            $pdf->SetFont('Helvetica', '', 8);
            $pdf->Cell($w[0], $h, (string) ($n + 1), 'B', 0, 'L', true);
            $x = $pdf->GetX();
            $pdf->Cell($w[1], $h, '', 'B', 0, 'L', true);
            $pdf->SetXY($x + 1, $y + 1.2);
            $pdf->Cell($w[1] - 2, 4, $t(mb_strimwidth($name, 0, 48, '...')));
            if (!empty($it['discount_label'])) {
                $pdf->SetXY($x + 1, $y + 5.5);
                $pdf->SetFont('Helvetica', 'I', 7);
                $pdf->SetTextColor(...self::GREEN);
                $pdf->Cell($w[1] - 2, 4, $t($it['discount_label']));
                $pdf->SetTextColor(...self::INK);
                $pdf->SetFont('Helvetica', '', 8);
            }
            $pdf->SetXY($x + $w[1], $y);
            $pdf->Cell($w[2], $h, $t($it['code'] ?? '-'), 'B', 0, 'L', true);
            $pdf->Cell($w[3], $h, (string) $it['quantity'], 'B', 0, 'C', true);
            $pdf->Cell($w[4], $h, 'Buah', 'B', 0, 'L', true);
            $pdf->Cell($w[5], $h, $rp($it['unit_price']), 'B', 0, 'R', true);
            $pdf->Cell($w[6], $h, $rp($it['unit_price'] * $it['quantity']), 'B', 1, 'R', true);
        }

        // ===== Ringkasan kanan & kotak pembayaran kiri =====
        $tot = $s['totals'] ?? [];
        $startY = $pdf->GetY() + 5;
        $rows = [
            ['Sub Total', $tot['subtotal'] ?? 0], ['Diskon Produk', -($tot['product_discount'] ?? 0)],
            ['Diskon', -($tot['extra_discount'] ?? 0)], ['PPN '.round(($c['ppn_rate'] ?? 0.11) * 100).'%', $tot['ppn'] ?? 0],
            ['Ongkos Kirim', $tot['shipping_fee'] ?? 0], ['Biaya Pasang', $tot['installation_fee'] ?? 0], ['Lainnya', $tot['other_fee'] ?? 0],
        ];
        $pdf->SetXY(118, $startY);
        foreach ($rows as [$k, $v]) {
            $pdf->SetX(118);
            $pdf->SetFont('Helvetica', '', 8);
            $pdf->SetTextColor(...self::MUTE);
            $pdf->Cell(40, 5.5, $t($k), 0, 0);
            $pdf->SetTextColor(...self::INK);
            $pdf->Cell(37, 5.5, ($v < 0 ? '-' : '').$rp(abs($v)), 0, 1, 'R');
        }
        // Grand total dengan pita emas
        $gtY = $pdf->GetY() + 1;
        $pdf->SetFillColor(...self::GOLD);
        $pdf->Rect(118, $gtY, 77, 9, 'F');
        $pdf->SetXY(121, $gtY + 1);
        $pdf->SetFont('Helvetica', 'B', 10);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->Cell(30, 7, 'Grand Total', 0, 0);
        $pdf->Cell(41, 7, $rp($tot['grand_total'] ?? 0), 0, 1, 'R');
        $endRight = $gtY + 9;

        // Kotak pembayaran: rekening + total yang harus ditransfer
        $pdf->SetDrawColor(...self::LINE);
        $pdf->SetFillColor(...self::CREAM);
        $pdf->Rect(15, $startY, 95, 54, 'DF');
        $pdf->SetFillColor(...self::GOLD);
        $pdf->Rect(15, $startY, 95, 1.6, 'F');
        $pdf->SetXY(19, $startY + 4);
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->SetTextColor(...self::INK);
        $pdf->Cell(87, 5, $t('Pembayaran - Transfer '.($c['bank_name'] ?? 'BCA')), 0, 2);
        $pdf->SetFont('Helvetica', '', 7);
        $pdf->SetTextColor(...self::MUTE);
        $pdf->Cell(87, 4, 'NOMOR REKENING', 0, 2);
        $pdf->SetTextColor(...self::INK);
        $pdf->SetFont('Helvetica', 'B', 14);
        $pdf->Cell(87, 7, $t($c['bank_account'] ?: '(belum diatur)'), 0, 2);
        $pdf->SetFont('Helvetica', '', 7);
        $pdf->SetTextColor(...self::MUTE);
        $pdf->Cell(87, 4, 'ATAS NAMA', 0, 2);
        $pdf->SetTextColor(...self::INK);
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->Cell(87, 5, $t($c['bank_holder'] ?? '-'), 0, 2);
        $pdf->SetFont('Helvetica', '', 7);
        $pdf->SetTextColor(...self::MUTE);
        $pdf->Cell(87, 5, 'TOTAL TAGIHAN (NOMINAL TRANSFER)', 0, 2);
        $pdf->SetTextColor(...self::INK);
        $pdf->SetFont('Helvetica', 'B', 15);
        $pdf->Cell(87, 7, $rp($tot['grand_total'] ?? 0), 0, 2);
        $pdf->SetFont('Helvetica', '', 7);
        $pdf->SetTextColor(...self::MUTE);
        $pdf->MultiCell(87, 3.5, $t('Cantumkan nomor dokumen pada berita transfer. Atau bayar QRIS di halaman Pesanan Saya.'.(!empty($s['due_at']) ? ' Batas bayar: '.$s['due_at'] : '')));
        $pdf->SetY(max($pdf->GetY(), $startY + 54));

        // ===== Status =====
        $pdf->SetY(max($endRight, $pdf->GetY()) + 9);
        if ($doc->title === 'Invoice') {
            $pdf->SetDrawColor(...self::GREEN);
            $pdf->SetTextColor(...self::GREEN);
            $pdf->SetLineWidth(0.6);
            $pdf->SetFont('Helvetica', 'B', 22);
            $pdf->Cell(62, 14, 'LUNAS', 1, 2, 'C');
            $pdf->SetLineWidth(0.2);
            $pdf->SetFont('Helvetica', '', 8);
            $pdf->Cell(62, 5, $t(($s['paid_at'] ?? '').' - '.($s['paid_method'] ?? '')), 0, 1, 'C');
        } else {
            $pdf->SetTextColor(...self::RED);
            $pdf->SetFont('Helvetica', 'B', 14);
            $pdf->Cell(62, 10, $doc->status === 'batal' ? 'DIBATALKAN' : 'BELUM DIBAYAR', 0, 1);
        }
        $pdf->SetTextColor(...self::INK);

        // ===== Blok tanda tangan =====
        $sigY = max($pdf->GetY(), $endRight + 24) + 4;
        if ($sigY < 250) {
            $pdf->SetFont('Helvetica', '', 8);
            $pdf->SetTextColor(...self::MUTE);
            $pdf->SetXY(130, $sigY);
            $pdf->Cell(60, 4, 'Hormat kami,', 0, 2, 'C');
            $pdf->Ln(16);
            $pdf->SetX(130);
            $pdf->SetDrawColor(...self::INK);
            $pdf->Line(135, $pdf->GetY(), 185, $pdf->GetY());
            $pdf->SetFont('Helvetica', 'B', 8);
            $pdf->SetTextColor(...self::INK);
            $pdf->SetX(130);
            $pdf->Cell(60, 4, $t($c['company_name']), 0, 1, 'C');
        }

        // ===== QR berisi nomor dokumen → dipindai di Admin › Scan dokumen =====
        try {
            $qr = \Illuminate\Support\Facades\Http::timeout(8)->get('https://api.qrserver.com/v1/create-qr-code/', ['size' => '240x240', 'format' => 'png', 'data' => $doc->number]);
            if ($qr->successful()) {
                $tmp = tempnam(sys_get_temp_dir(), 'qr').'.png';
                file_put_contents($tmp, $qr->body());
                $pdf->Image($tmp, 172, 258, 22, 22, 'PNG');
                @unlink($tmp);
            }
        } catch (\Throwable $e) {
            // QR opsional; dokumen tetap terbit
        }

        // ===== Footer =====
        $pdf->SetY(-18);
        $pdf->SetDrawColor(...self::LINE);
        $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
        $pdf->Ln(2);
        $pdf->SetFont('Helvetica', 'I', 7);
        $pdf->SetTextColor(...self::MUTE);
        $pdf->Cell(0, 4, 'Dokumen ini diterbitkan otomatis oleh sistem Livora dan sah tanpa tanda tangan basah.', 0, 0, 'C');

        $path = 'shop-documents/'.str_replace('/', '-', $doc->number).'-v'.$doc->version.'.pdf';
        Storage::disk('local')->put($path, $pdf->Output('S'));

        return $path;
    }
}
