<?php

namespace App\Mail;

use App\Models\Consultation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewConsultationAdminAlert extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Consultation $consultation) {}

    public function envelope(): Envelope
    {
        $name = trim($this->consultation->first_name . ' ' . ($this->consultation->last_name ?? ''));
        return new Envelope(
            subject: 'New consultation request from ' . $name,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.new-consultation-admin',
            with: ['c' => $this->consultation],
        );
    }
}
