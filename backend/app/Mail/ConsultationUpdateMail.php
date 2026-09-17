<?php

namespace App\Mail;

use App\Models\Consultation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * One branded Livora mailable used for every consultation milestone
 * (approval, meeting, agreement, DP, progress, final payment, completion).
 *
 * @param array<int,string>       $paragraphs
 * @param array<string,string>    $rows        label => value detail block
 */
class ConsultationUpdateMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Consultation $consultation,
        public string $subjectLine,
        public string $heading,
        public array $paragraphs = [],
        public array $rows = [],
        public ?string $ctaUrl = null,
        public string $ctaLabel = 'Buka My Consultation',
        public ?string $footnote = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.consultation-update',
            with: [
                'c'          => $this->consultation,
                'heading'    => $this->heading,
                'paragraphs' => $this->paragraphs,
                'rows'       => $this->rows,
                'ctaUrl'     => $this->ctaUrl,
                'ctaLabel'   => $this->ctaLabel,
                'footnote'   => $this->footnote,
            ],
        );
    }
}
