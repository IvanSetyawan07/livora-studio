<?php

namespace App\Services;

use App\Models\Consultation;
use Illuminate\Support\Facades\Storage;
use setasign\Fpdi\Fpdi;

/**
 * Stamps the customer's and Livora's drawn signatures onto the last page
 * of the uploaded agreement PDF, producing the actual final, signed
 * document. Never merely copies the unsigned source file.
 */
class AgreementPdfService
{
    /**
     * Build the final signed agreement PDF for a consultation and store it
     * on the public disk. Returns the public "/storage/..." path.
     *
     * @throws \RuntimeException if the source document is missing or not a PDF.
     */
    public function composeFinalAgreement(Consultation $consultation): string
    {
        $sourceRelative = $this->toRelative($consultation->agreement_document_path);
        if (!$sourceRelative || !Storage::disk('public')->exists($sourceRelative)) {
            throw new \RuntimeException('Signed agreement source document is missing.');
        }

        $sourceAbsolute = Storage::disk('public')->path($sourceRelative);
        if (strtolower((string) pathinfo($sourceAbsolute, PATHINFO_EXTENSION)) !== 'pdf') {
            throw new \RuntimeException('Agreement document must be a PDF to stamp signatures onto it.');
        }

        $pdf = new Fpdi();
        $pageCount = $pdf->setSourceFile($sourceAbsolute);

        for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
            $templateId = $pdf->importPage($pageNo);
            $size = $pdf->getTemplateSize($templateId);
            $orientation = ($size['orientation'] ?? 'P') === 'L' ? 'L' : 'P';

            $pdf->AddPage($orientation, [$size['width'], $size['height']]);
            $pdf->useTemplate($templateId);

            if ($pageNo === $pageCount) {
                $this->stampSignatures($pdf, $consultation, (float) $size['width'], (float) $size['height']);
            }
        }

        $relativeOut = 'consultations/final/agreement-' . $consultation->id . '-' . now()->timestamp . '.pdf';
        Storage::disk('public')->put($relativeOut, $pdf->Output('S'));

        return '/storage/' . $relativeOut;
    }

    private function stampSignatures(Fpdi $pdf, Consultation $consultation, float $pageWidth, float $pageHeight): void
    {
        $sigWidth = 55.0;
        $bottomMargin = 22.0;

        if ($consultation->agreement_signature_path) {
            $path = $this->absoluteFromPublicPath($consultation->agreement_signature_path);
            if ($path && is_file($path)) {
                $x = 20.0;
                $pdf->Image($path, $x, $pageHeight - $bottomMargin - 22, $sigWidth);
                $pdf->SetFont('Helvetica', '', 8);
                $pdf->SetXY($x, $pageHeight - $bottomMargin);
                $pdf->Cell($sigWidth, 4, (string) ($consultation->agreement_signature_name ?? 'Customer'), 0, 0, 'C');
            }
        }

        if ($consultation->livora_signature_path) {
            $path = $this->absoluteFromPublicPath($consultation->livora_signature_path);
            if ($path && is_file($path)) {
                $x = $pageWidth - $sigWidth - 20.0;
                $pdf->Image($path, $x, $pageHeight - $bottomMargin - 22, $sigWidth);
                $pdf->SetFont('Helvetica', '', 8);
                $pdf->SetXY($x, $pageHeight - $bottomMargin);
                $pdf->Cell($sigWidth, 4, (string) ($consultation->livora_countersigner_name ?? 'Livora'), 0, 0, 'C');
            }
        }
    }

    private function toRelative(?string $publicPath): ?string
    {
        if (!$publicPath) {
            return null;
        }
        return ltrim(str_replace('/storage/', '', $publicPath), '/');
    }

    private function absoluteFromPublicPath(?string $publicPath): ?string
    {
        $relative = $this->toRelative($publicPath);
        if (!$relative) {
            return null;
        }
        return Storage::disk('public')->path($relative);
    }
}