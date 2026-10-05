<?php

namespace App\Mail;

use App\Models\ShopOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ShopOrderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ShopOrder $order,
        public string $subjectLine,
        public array $paragraphs,
        public ?string $ctaUrl,
        public string $ctaLabel,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine.' · '.$this->order->code);
    }

    public function content(): Content
    {
        $this->order->loadMissing('items');

        return new Content(view: 'emails.shop-order', with: [
            'o' => $this->order,
            'heading' => $this->subjectLine,
            'paragraphs' => $this->paragraphs,
            'ctaUrl' => $this->ctaUrl,
            'ctaLabel' => $this->ctaLabel,
        ]);
    }
}
