<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class LivoraCampaignMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param array $content  ['sectionLabel','headline','body','heroImage','heroImageAlt','ctaLabel','ctaUrl','signature']
     * @param array $brand    ['logoText','studioLabel','websiteUrl','instagramUrl','bookingUrl','contactUrl','copyrightYear','unsubscribeUrl']
     * @param string|null $greetingName  recipient's first name only, or null for fallback
     */
    public function __construct(
        public array $content,
        public array $brand,
        public ?string $greetingName,
        public string $subjectLine,
    ) {
    }

    public function build()
    {
        return $this->subject($this->subjectLine)
            ->view('emails.livora.campaign', [
                'sectionLabel'  => $this->content['sectionLabel'],
                'headline'      => $this->content['headline'],
                'body'          => $this->content['body'],
                'heroImage'     => $this->content['heroImage'] ?? null,
                'heroImageAlt'  => $this->content['heroImageAlt'] ?? null,
                'ctaLabel'      => $this->content['ctaLabel'] ?? null,
                'ctaUrl'        => $this->content['ctaUrl'] ?? null,
                'signature'     => $this->content['signature'],
                'greetingName'  => $this->greetingName,
                'brand'         => $this->brand,
            ]);
    }
}