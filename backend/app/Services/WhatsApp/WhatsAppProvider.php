<?php

namespace App\Services\WhatsApp;

interface WhatsAppProvider
{
    /**
     * Send a WhatsApp text message to a phone number.
     *
     * Implementations must NEVER report "sent" unless a real provider
     * transaction actually succeeded.
     *
     * @return array{status: string, error: ?string}
     */
    public function send(string $phone, string $message): array;
}