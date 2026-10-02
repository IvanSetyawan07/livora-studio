<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminLoginCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public string $code, public int $minutes) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Kode masuk admin Livora: {$this->code}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.admin-login-code', with: [
            'name'    => $this->user->name,
            'code'    => $this->code,
            'minutes' => $this->minutes,
        ]);
    }
}
