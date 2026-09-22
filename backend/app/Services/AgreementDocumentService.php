<?php

namespace App\Services;

use App\Models\Consultation;

use Illuminate\Support\Facades\Storage;

/**
 * Builds the Livora project agreement from editable text content.
 *
 * - The default content is auto-generated from the consultation data and can
 *   be edited by an admin before the document is issued to the customer.
 * - The rendered PDF always ends with a signature block: signature image on
 *   top, name underneath, customer on the left and Livora on the right.
 * - A meterai (Indonesian stamp duty) placeholder can be drawn above the
 *   customer signature. Until a real e-meterai API is connected, the block is
 *   clearly labelled as a manually affixed stamp — nothing is faked.
 */
class AgreementDocumentService
{
    public function defaultContent(Consultation $c): string
    {
        $name = trim(($c->first_name ?? '') . ' ' . ($c->last_name ?? '')) ?: 'Pelanggan';
        $date = now()->locale('id')->translatedFormat('d F Y');
        $service = $c->service_type ?: '-';
        $project = $c->project_type ?: '-';
        $area = $c->estimated_area ?: '-';
        $style = $c->preferred_style ?: '-';
        $location = $c->location ?: '-';
        $dp = $c->dp_amount ? 'Rp ' . number_format((float) $c->dp_amount, 0, ',', '.') : 'akan ditentukan';

        return <<<TXT
PERJANJIAN KERJA SAMA PROYEK INTERIOR

Nomor: LVR/AGR/{$c->id}
Tanggal: {$date}

PARA PIHAK
1. Livora Interior (selanjutnya disebut "Pihak Pertama").
2. {$name} (selanjutnya disebut "Pihak Kedua"), dengan kontak {$c->email} / {$c->phone}.

PASAL 1 - RUANG LINGKUP
Pihak Pertama akan melaksanakan pekerjaan dengan rincian berikut:
- Jenis layanan: {$service}
- Jenis proyek: {$project}
- Perkiraan luas area: {$area}
- Gaya yang dipilih: {$style}
- Lokasi proyek: {$location}

PASAL 2 - PEMBAYARAN
Uang muka (DP) sebesar {$dp} dibayarkan sebelum pekerjaan dimulai. Pelunasan
dibayarkan sesuai tagihan yang diterbitkan Pihak Pertama sebelum pekerjaan
mencapai tahap penyelesaian akhir.

PASAL 3 - JANGKA WAKTU
Jadwal pelaksanaan disepakati kedua belah pihak dan dikomunikasikan melalui
halaman My Consultation. Keterlambatan akibat kondisi di luar kendali para
pihak akan dibicarakan secara musyawarah.

PASAL 4 - PERUBAHAN PEKERJAAN
Setiap perubahan lingkup pekerjaan harus disepakati tertulis dan dapat
mempengaruhi biaya serta jadwal penyelesaian.

PASAL 5 - SERAH TERIMA
Pekerjaan dinyatakan selesai setelah berita acara serah terima ditandatangani
oleh kedua belah pihak.

PASAL 6 - PENUTUP
Perjanjian ini dibuat dengan itikad baik dan ditandatangani secara elektronik
oleh kedua belah pihak pada tanggal yang tertera pada tanda tangan di bawah.
TXT;
    }

    public function contentFor(Consultation $c): string
    {
        return $c->agreement_content ?: $this->defaultContent($c);
    }

    /**
     * Render the agreement to a PDF on the public disk.
     * Returns the public "/storage/..." path.
     */
    public function render(Consultation $c, bool $withSignatures = false, bool $withMeterai = false): string
    {
        $pdf = new \FPDF();
        $pdf->SetMargins(20, 20, 20);
        $pdf->SetAutoPageBreak(true, 28);
        $pdf->AddPage();

        $pdf->SetFont('Helvetica', 'B', 11);
        $pdf->Cell(0, 7, $this->t('LIVORA INTERIOR'), 0, 1, 'L');
        $pdf->SetFont('Helvetica', '', 8);
        $pdf->SetTextColor(110);
        $pdf->Cell(0, 5, $this->t('Dokumen perjanjian proyek - dibuat melalui My Consultation'), 0, 1, 'L');
        $pdf->SetTextColor(0);
        $pdf->Ln(4);

        foreach (preg_split("/\r\n|\r|\n/", $this->contentFor($c)) as $line) {
            $line = rtrim($line);
            if ($line === '') {
                $pdf->Ln(3.5);
                continue;
            }
            $isHeading = $line === mb_strtoupper($line, 'UTF-8') && mb_strlen($line) < 90;
            $pdf->SetFont('Helvetica', $isHeading ? 'B' : '', $isHeading ? 10 : 10);
            $pdf->MultiCell(0, 5.5, $this->t($line), 0, 'L');
        }

        if ($withSignatures) {
            $this->signatureBlock($pdf, $c, $withMeterai);
        }

        $suffix = $withSignatures ? ($withMeterai ? 'final-meterai' : 'final') : 'draft';
        $relative = 'consultations/agreements/agreement-' . $c->id . '-' . $suffix . '-' . now()->timestamp . '.pdf';
        Storage::disk('public')->put($relative, $pdf->Output('S'));

        return '/storage/' . $relative;
    }

    private function signatureBlock(\FPDF $pdf, Consultation $c, bool $withMeterai): void
    {
        $blockHeight = 82.0;
        $pageBottom = 297 - 20;
        if ($pdf->GetY() + $blockHeight > $pageBottom) {
            $pdf->AddPage();
        } else {
            $pdf->Ln(10);
        }

        $top = $pdf->GetY();
        $colWidth = 75.0;
        $leftX = 20.0;
        $rightX = 210 - 20 - $colWidth;

        $pdf->SetFont('Helvetica', '', 9);
        $pdf->SetXY($leftX, $top);
        $pdf->Cell($colWidth, 5, $this->t('Pihak Kedua (Pelanggan)'), 0, 0, 'C');
        $pdf->SetXY($rightX, $top);
        $pdf->Cell($colWidth, 5, $this->t('Pihak Pertama (Livora)'), 0, 1, 'C');

        $areaTop = $top + 7;

        // Customer column: meterai above the signature, signature above the name.
        $signTop = $areaTop;
        if ($withMeterai) {
            $this->meteraiBox($pdf, $leftX + ($colWidth - 40) / 2, $areaTop, $c);
            $signTop = $areaTop + 24;
        }
        $this->signatureImage($pdf, $c->agreement_signature_path, $leftX, $signTop, $colWidth);
        $this->signatureImage($pdf, $c->livora_signature_path, $rightX, $areaTop, $colWidth);

        $nameY = max($signTop + 26, $areaTop + 26);
        $pdf->SetLineWidth(0.2);
        $pdf->Line($leftX + 6, $nameY, $leftX + $colWidth - 6, $nameY);
        $pdf->Line($rightX + 6, $nameY, $rightX + $colWidth - 6, $nameY);

        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->SetXY($leftX, $nameY + 1.5);
        $pdf->Cell($colWidth, 5, $this->t($c->agreement_signature_name ?: trim(($c->first_name ?? '') . ' ' . ($c->last_name ?? ''))), 0, 0, 'C');
        $pdf->SetXY($rightX, $nameY + 1.5);
        $pdf->Cell($colWidth, 5, $this->t($c->livora_countersigner_name ?: 'Livora Interior'), 0, 1, 'C');

        $pdf->SetFont('Helvetica', '', 7.5);
        $pdf->SetTextColor(110);
        $pdf->SetXY($leftX, $nameY + 6.5);
        $pdf->Cell($colWidth, 4, $this->t($c->agreement_signed_at ? $c->agreement_signed_at->format('d/m/Y H:i') : ''), 0, 0, 'C');
        $pdf->SetXY($rightX, $nameY + 6.5);
        $pdf->Cell($colWidth, 4, $this->t($c->livora_countersigned_at ? $c->livora_countersigned_at->format('d/m/Y H:i') : ''), 0, 1, 'C');
        $pdf->SetTextColor(0);
    }

    private function meteraiBox(\FPDF $pdf, float $x, float $y, Consultation $c): void
    {
        $w = 40.0;
        $h = 21.0;
        $pdf->SetDrawColor(150, 40, 60);
        $pdf->SetLineWidth(0.4);
        $pdf->Rect($x, $y, $w, $h);
        $pdf->SetTextColor(150, 40, 60);
        $pdf->SetFont('Helvetica', 'B', 8);
        $pdf->SetXY($x, $y + 3);
        $pdf->Cell($w, 4, $this->t('E-METERAI Rp10.000'), 0, 2, 'C');
        $pdf->SetFont('Helvetica', '', 6.5);
        $pdf->SetXY($x, $y + 9);
        $pdf->Cell($w, 3.5, $this->t($c->meterai_serial ? 'No. ' . $c->meterai_serial : 'Nomor seri belum diisi'), 0, 2, 'C');
        $pdf->SetXY($x, $y + 13);
        $pdf->Cell($w, 3.5, $this->t('Dibubuhkan oleh admin Livora'), 0, 2, 'C');
        $pdf->SetXY($x, $y + 16.5);
        $pdf->Cell($w, 3.5, $this->t($c->meterai_applied_at ? $c->meterai_applied_at->format('d/m/Y H:i') : ''), 0, 2, 'C');
        $pdf->SetTextColor(0);
        $pdf->SetDrawColor(0);
    }

    private function signatureImage(\FPDF $pdf, ?string $publicPath, float $colX, float $y, float $colWidth): void
    {
        if (!$publicPath) {
            return;
        }
        $relative = ltrim(str_replace('/storage/', '', $publicPath), '/');
        $absolute = Storage::disk('public')->path($relative);
        if (!is_file($absolute)) {
            return;
        }
        $width = 46.0;
        $pdf->Image($absolute, $colX + ($colWidth - $width) / 2, $y, $width, 0, 'PNG');
    }

    /** FPDF core fonts are latin-1 only. */
    private function t(string $text): string
    {
        $converted = @iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $text);
        return $converted === false ? $text : $converted;
    }
}
