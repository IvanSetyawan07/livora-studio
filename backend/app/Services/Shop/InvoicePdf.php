<?php

namespace App\Services\Shop;

use App\Models\ShopDocument;
use Illuminate\Support\Facades\Storage;

/**
 * PDF Tagihan / Invoice A4 (FPDF). Disimpan di disk privat 'local'
 * (storage/app/shop-documents), hanya bisa diunduh lewat endpoint yang
 * memeriksa kepemilikan — tidak pernah lewat /storage publik.
 */
class InvoicePdf
{
    public function render(ShopDocument $doc): string
    {
        $s = $doc->snapshot;
        $c = config('services.shop');
        $pdf = new \FPDF('P', 'mm', 'A4');
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 20);
        $pdf->AddPage();
        $t = fn ($v) => iconv('UTF-8', 'windows-1252//TRANSLIT', (string) $v);
        $rp = fn ($v) => 'Rp '.number_format((int) $v, 0, ',', '.');

        // Header kiri
        $logo = public_path('logo-livora.png');
        if (is_file($logo)) {
            $pdf->Image($logo, 15, 14, 32);
            $pdf->SetY(30);
        } else {
            $pdf->SetFont('Times', 'B', 20);
            $pdf->Cell(90, 9, 'L I V O R A', 0, 2);
        }
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->Cell(90, 5, $t($c['company_name']), 0, 2);
        $pdf->SetFont('Helvetica', '', 8);
        $pdf->MultiCell(90, 4, $t($c['company_address']));
        if (!empty($c['company_npwp'])) $pdf->Cell(90, 4, $t('NPWP: '.$c['company_npwp']), 0, 2);
        $leftBottom = $pdf->GetY();

        // Header kanan
        $pdf->SetXY(120, 15);
        $pdf->SetFont('Helvetica', 'B', 20);
        $pdf->Cell(75, 10, $t(strtoupper($doc->title)), 0, 2, 'R');
        $pdf->SetFont('Helvetica', '', 8);
        $pdf->SetX(120);
        $pdf->Cell(25, 6, 'Tanggal', 1, 0);
        $pdf->Cell(50, 6, $t($doc->issued_at->translatedFormat('d F Y')), 1, 1);
        $pdf->SetX(120);
        $pdf->Cell(25, 6, 'Nomor', 1, 0);
        $pdf->Cell(50, 6, $t($doc->number), 1, 1);
        $pdf->SetX(120);
        $pdf->Cell(25, 6, 'Kode Pesanan', 1, 0);
        $pdf->Cell(50, 6, $t($s['order_code'] ?? ''), 1, 1);

        $pdf->SetY(max($leftBottom, $pdf->GetY()) + 6);

        // Kepada Yth
        $b = $s['buyer'] ?? [];
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->Cell(0, 5, 'Kepada Yth.', 0, 1);
        $pdf->SetFont('Helvetica', '', 9);
        foreach ([['Nama', $b['name'] ?? '-'], ['Perusahaan', $b['company'] ?? '-'], ['Alamat', $b['address'] ?? '-'], ['No. Telp', $b['phone'] ?? '-']] as [$k, $v]) {
            $pdf->Cell(25, 5, $k, 0, 0);
            $pdf->MultiCell(0, 5, $t(': '.$v));
        }
        if (!empty($b['npwp'])) {
            $pdf->Cell(25, 5, 'NPWP', 0, 0);
            $pdf->Cell(0, 5, $t(': '.$b['npwp']), 0, 1);
        }
        $pdf->Ln(4);

        // Tabel barang
        $w = [9, 62, 25, 12, 14, 29, 29];
        $pdf->SetFont('Helvetica', 'B', 8);
        $pdf->SetFillColor(240, 236, 228);
        foreach (['No', 'Nama Barang', 'Kode Produk', 'Qty', 'Satuan', 'Harga/Unit', 'Harga Total'] as $i => $h) {
            $pdf->Cell($w[$i], 7, $h, 1, 0, $i >= 5 ? 'R' : 'L', true);
        }
        $pdf->Ln();
        $pdf->SetFont('Helvetica', '', 8);
        foreach (($s['items'] ?? []) as $n => $it) {
            $name = $it['title'].(!empty($it['variant_name']) ? ' - '.$it['variant_name'] : '');
            $h = !empty($it['discount_label']) ? 10 : 7;
            $y = $pdf->GetY();
            $pdf->Cell($w[0], $h, (string) ($n + 1), 1);
            $x = $pdf->GetX();
            $pdf->Cell($w[1], $h, '', 1);
            $pdf->SetXY($x + 1, $y + 1);
            $pdf->Cell($w[1] - 2, 4, $t(mb_strimwidth($name, 0, 48, '...')));
            if (!empty($it['discount_label'])) {
                $pdf->SetXY($x + 1, $y + 5);
                $pdf->SetFont('Helvetica', 'I', 7);
                $pdf->Cell($w[1] - 2, 4, $t($it['discount_label']));
                $pdf->SetFont('Helvetica', '', 8);
            }
            $pdf->SetXY($x + $w[1], $y);
            $pdf->Cell($w[2], $h, $t($it['code'] ?? '-'), 1);
            $pdf->Cell($w[3], $h, (string) $it['quantity'], 1, 0, 'C');
            $pdf->Cell($w[4], $h, 'Buah', 1);
            $pdf->Cell($w[5], $h, $rp($it['unit_price']), 1, 0, 'R');
            $pdf->Cell($w[6], $h, $rp($it['unit_price'] * $it['quantity']), 1, 1, 'R');
        }

        // Ringkasan kanan & pembayaran kiri
        $tot = $s['totals'] ?? [];
        $startY = $pdf->GetY() + 4;
        $rows = [
            ['Sub Total', $tot['subtotal'] ?? 0], ['Diskon Produk', -($tot['product_discount'] ?? 0)],
            ['Diskon', -($tot['extra_discount'] ?? 0)], ['PPN '.round(($c['ppn_rate'] ?? 0.11) * 100).'%', $tot['ppn'] ?? 0],
            ['Ongkos Kirim', $tot['shipping_fee'] ?? 0], ['Biaya Pasang', $tot['installation_fee'] ?? 0], ['Lainnya', $tot['other_fee'] ?? 0],
        ];
        $pdf->SetXY(120, $startY);
        foreach ($rows as [$k, $v]) {
            $pdf->SetX(120);
            $pdf->Cell(40, 6, $t($k), 0, 0);
            $pdf->Cell(35, 6, ($v < 0 ? '-' : '').$rp(abs($v)), 0, 1, 'R');
        }
        $pdf->SetX(120);
        $pdf->SetFont('Helvetica', 'B', 10);
        $pdf->Cell(40, 8, 'Grand Total', 'T', 0);
        $pdf->Cell(35, 8, $rp($tot['grand_total'] ?? 0), 'T', 1, 'R');
        $endRight = $pdf->GetY();

        $pdf->SetXY(15, $startY);
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->Cell(95, 5, 'Pembayaran', 0, 2);
        $pdf->SetFont('Helvetica', '', 8);
        $bank = trim(($c['bank_name'] ?? 'BCA').' '.($c['bank_account'] ?? '(nomor rekening belum diatur)'));
        $pdf->MultiCell(95, 4, $t("Transfer $bank\na.n. ".($c['bank_holder'] ?? '-')."\nCantumkan nomor tagihan pada berita transfer.\nAtau bayar dengan QRIS dari halaman Pesanan Saya."));
        if (!empty($s['due_at'])) $pdf->Cell(95, 5, $t('Batas waktu bayar: '.$s['due_at']), 0, 2);

        // Status
        $pdf->SetY(max($endRight, $pdf->GetY()) + 8);
        if ($doc->title === 'Invoice') {
            $pdf->SetDrawColor(46, 125, 50);
            $pdf->SetTextColor(46, 125, 50);
            $pdf->SetFont('Helvetica', 'B', 22);
            $pdf->Cell(60, 14, 'LUNAS', 1, 2, 'C');
            $pdf->SetFont('Helvetica', '', 8);
            $pdf->Cell(60, 5, $t(($s['paid_at'] ?? '').' - '.($s['paid_method'] ?? '')), 0, 1, 'C');
        } else {
            $pdf->SetTextColor(180, 40, 40);
            $pdf->SetFont('Helvetica', 'B', 14);
            $pdf->Cell(60, 10, $doc->status === 'batal' ? 'DIBATALKAN' : 'BELUM DIBAYAR', 0, 1);
        }
        $pdf->SetTextColor(0, 0, 0);

        // QR berisi nomor dokumen → dipindai di Admin › Scan dokumen
        try {
            $qr = \Illuminate\Support\Facades\Http::timeout(8)->get('https://api.qrserver.com/v1/create-qr-code/', ['size' => '240x240', 'format' => 'png', 'data' => $doc->number]);
            if ($qr->successful()) {
                $tmp = tempnam(sys_get_temp_dir(), 'qr').'.png';
                file_put_contents($tmp, $qr->body());
                $pdf->Image($tmp, 172, 255, 24, 24, 'PNG');
                @unlink($tmp);
            }
        } catch (\Throwable $e) {
            // QR opsional; dokumen tetap terbit
        }

        $pdf->SetY(-18);
        $pdf->SetFont('Helvetica', 'I', 7);
        $pdf->SetTextColor(130, 120, 110);
        $pdf->Cell(0, 5, 'Dokumen ini diterbitkan otomatis oleh sistem Livora.', 0, 0, 'C');

        $path = 'shop-documents/'.str_replace('/', '-', $doc->number).'-v'.$doc->version.'.pdf';
        Storage::disk('local')->put($path, $pdf->Output('S'));

        return $path;
    }
}
