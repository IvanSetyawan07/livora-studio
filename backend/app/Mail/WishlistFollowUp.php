<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WishlistFollowUp extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $recipientName,
        public string $bodyMessage,
        public array $savedItems = [],
        public ?string $customSubject = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->customSubject ?: 'A note from the Livora team about your saved items',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.wishlist-followup',
            with: [
                'name'    => $this->recipientName,
                'bodyMessage' => $this->bodyMessage, 
                'items'   => $this->savedItems,
            ],
        );
    }
}
