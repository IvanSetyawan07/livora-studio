<?php

namespace App\Mail;

use App\Models\Consultation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ConsultationConfirmed extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Consultation $consultation,
        public ?string $customSubject = null,
        public ?string $customMessage = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->customSubject ?: 'Your Livora consultation is confirmed',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.consultation-confirmed',
            with: [
                'c'       => $this->consultation,
                'message' => $this->customMessage,
            ],
        );
    }
}
