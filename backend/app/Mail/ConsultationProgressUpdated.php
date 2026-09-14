<?php

namespace App\Mail;

use App\Models\Consultation;
use App\Models\ConsultationProgressUpdate;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ConsultationProgressUpdated extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Consultation $consultation,
        public ConsultationProgressUpdate $update,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Project progress update: ' . $this->update->percentage . '% — Livora',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.consultation-progress-updated',
            with: ['c' => $this->consultation, 'update' => $this->update],
        );
    }
}