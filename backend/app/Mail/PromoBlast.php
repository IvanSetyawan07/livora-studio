<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PromoBlast extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $recipientName,
        public string $subjectLine,
        public string $headline,
        public string $bodyMessage,
        public ?string $ctaLabel = null,
        public ?string $ctaUrl = null,
        public ?string $heroImage = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.promo-blast',
            with: [
                'name'        => $this->recipientName,
                'headline'    => $this->headline,
                'bodyMessage' => $this->bodyMessage,
                'ctaLabel'    => $this->ctaLabel,
                'ctaUrl'      => $this->ctaUrl,
                'heroImage'   => $this->heroImage,
            ],
        );
    }
}
