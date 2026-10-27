<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InviteGuest;
use App\Services\Invite\InviteService;
use Illuminate\Http\Request;

/** Halaman RSVP publik: tamu membuka tautan pribadinya dan menjawab Hadir / Tidak hadir (tanpa login). */
class InviteRsvpController extends Controller
{
    protected function guest(string $token): InviteGuest
    {
        abort_if(strlen($token) < 20, 404);

        return InviteGuest::with('event')->where('rsvp_token', $token)->firstOrFail();
    }

    public function show(string $token)
    {
        $g = $this->guest($token);
        $e = $g->event;

        return [
            'name' => InviteService::greetName((string) $g->name),
            'event' => $e->name,
            'date_text' => InviteService::dateText($e),
            'location' => $e->location,
            'image_url' => $g->image_url,
            'rsvp' => $g->rsvp,
            'checked_in' => (bool) $g->checked_in_at,
        ];
    }

    public function store(Request $request, string $token)
    {
        $value = $request->validate(['rsvp' => 'required|in:hadir,tidak'])['rsvp'];
        $g = $this->guest($token);
        InviteService::recordRsvp($g, $value);

        return ['ok' => true, 'rsvp' => $g->rsvp];
    }
}