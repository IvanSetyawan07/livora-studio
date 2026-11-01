<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\InviteEvent;
use App\Models\InviteGuest;
use App\Services\Invite\InviteService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/** Admin: Sebar Undangan (acara, tamu, deskripsi AI, kirim WA, tarik Sheet, chat AI). */
class InvitationController extends Controller
{
    // ---------- Acara ----------
    public function events()
    {
        return InviteEvent::withCount([
            'guests',
            'guests as sent_count' => fn ($q) => $q->whereNotNull('sent_at'),
            'guests as hadir_count' => fn ($q) => $q->where('rsvp', 'hadir'),
            'guests as tidak_count' => fn ($q) => $q->where('rsvp', 'tidak'),
        ])->latest()->get();
    }

    public function saveEvent(Request $r, ?InviteEvent $event = null)
    {
        $data = $r->validate([
            'name' => 'required|string|max:190',
            'event_date' => 'nullable|date',
            'location' => 'nullable|string|max:255',
            'description_format' => 'nullable|string|max:3000',
            'ai_instructions' => 'nullable|string|max:1500',
            'knowledge' => 'nullable|string|max:8000',
            'wa_template_name' => 'nullable|string|max:120',
            'wa_template_lang' => 'nullable|string|max:10',
            'template_has_buttons' => 'nullable|boolean',
            'sheet_csv_url' => 'nullable|url|max:1000',
            'sheet_name_column' => 'nullable|string|max:120',
            'sheet_phone_column' => 'nullable|string|max:120',
            'is_active' => 'nullable|boolean',
            'default_image' => 'nullable|image|max:10240',
        ]);
        unset($data['default_image']);
        $event ??= new InviteEvent();
        if ($r->hasFile('default_image')) {
            if ($event->default_image_path) Storage::disk('public')->delete($event->default_image_path);
            $data['default_image_path'] = $r->file('default_image')->store('invitations', 'public');
        }
        foreach (['template_has_buttons', 'is_active'] as $b) if ($r->has($b)) $data[$b] = $r->boolean($b);
        $event->fill($data)->save();

        return $event->fresh();
    }

    public function deleteEvent(InviteEvent $event)
    {
        $event->guests()->whereNotNull('image_path')->pluck('image_path')->each(fn ($p) => Storage::disk('public')->delete($p));
        if ($event->default_image_path) Storage::disk('public')->delete($event->default_image_path);
        $event->delete();

        return response()->json(['ok' => true]);
    }

    // ---------- Tamu ----------
    public function guests(Request $r, InviteEvent $event)
    {
        $q = $event->guests()->with('event')->orderByDesc('id');
        if ($s = trim((string) $r->query('q'))) $q->where(fn ($w) => $w->where('name', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%"));
        foreach (['category', 'status', 'rsvp'] as $f) if ($v = $r->query($f)) $q->where($f, $v);

        return $q->get();
    }

    public function saveGuest(Request $r, InviteEvent $event, ?InviteGuest $guest = null)
    {
        $data = $r->validate([
            'name' => 'required|string|max:190',
            'phone' => 'required|string|max:30',
            'category' => 'nullable|in:rekanan,pelanggan,pendaftar',
            'description' => 'nullable|string|max:3000',
            'notes' => 'nullable|string|max:1000',
            'status' => 'nullable|in:draft,siap,terkirim,gagal,dibalas',
            'rsvp' => 'nullable|in:hadir,tidak',
            'image' => 'nullable|image|max:10240',
        ]);
        $phone = InviteService::cleanPhone($data['phone']);
        if (!$phone) return response()->json(['message' => 'Nomor WhatsApp tidak valid.'], 422);
        $dup = InviteGuest::where('event_id', $event->id)->where('phone', $phone)->when($guest, fn ($q) => $q->where('id', '!=', $guest->id))->exists();
        if ($dup) return response()->json(['message' => 'Nomor ini sudah ada di daftar tamu acara ini.'], 422);

        unset($data['image']);
        $data['phone'] = $phone;
        if (array_key_exists('rsvp', $data) && $data['rsvp'] !== ($guest?->rsvp)) $data['rsvp_at'] = $data['rsvp'] ? now() : null;
        $guest ??= new InviteGuest(['event_id' => $event->id, 'source' => 'manual']);
        if ($r->hasFile('image')) {
            if ($guest->image_path) Storage::disk('public')->delete($guest->image_path);
            $data['image_path'] = $r->file('image')->store('invitations/guests', 'public');
        }
        $guest->fill($data)->save();

        return $guest->load('event');
    }

    public function removeGuestImage(InviteEvent $event, InviteGuest $guest)
    {
        if ($guest->image_path) Storage::disk('public')->delete($guest->image_path);
        $guest->update(['image_path' => null]);

        return $guest->load('event');
    }

    /** Tambah banyak tamu sekaligus: [{name, phone, category}] */
    public function bulkGuests(Request $r, InviteEvent $event)
    {
        $rows = $r->validate(['rows' => 'required|array|max:3000', 'rows.*.name' => 'required|string|max:190', 'rows.*.phone' => 'required|string|max:30',
            'rows.*.category' => 'nullable|in:rekanan,pelanggan,pendaftar'])['rows'];
        $added = $skipped = 0;
        $invalid = [];
        foreach ($rows as $row) {
            $phone = InviteService::cleanPhone($row['phone']);
            if (!$phone) { $invalid[] = $row['name'].' ('.$row['phone'].')'; continue; }
            $created = InviteGuest::firstOrCreate(['event_id' => $event->id, 'phone' => $phone],
                ['name' => trim($row['name']), 'category' => $row['category'] ?? 'pelanggan', 'source' => 'import']);
            $created->wasRecentlyCreated ? $added++ : $skipped++;
        }

        return compact('added', 'skipped', 'invalid');
    }

    public function deleteGuests(Request $r, InviteEvent $event)
    {
        $ids = $r->validate(['ids' => 'required|array', 'ids.*' => 'integer'])['ids'];
        $q = $event->guests()->whereIn('id', $ids);
        (clone $q)->whereNotNull('image_path')->pluck('image_path')->each(fn ($p) => Storage::disk('public')->delete($p));
        $n = $q->delete();

        return ['deleted' => $n];
    }

    public function pullSheet(InviteEvent $event)
    {
        try {
            return InviteService::pullSheet($event);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** Isi deskripsi untuk tamu terpilih. mode=format (ganti {nama}) | ai (ditulis AI). */
    public function generate(Request $r, InviteEvent $event)
    {
        $data = $r->validate(['ids' => 'required|array|max:60', 'ids.*' => 'integer', 'mode' => 'required|in:format,ai', 'overwrite' => 'nullable|boolean']);
        if (!trim((string) $event->description_format)) return response()->json(['message' => 'Isi dulu format deskripsi di pengaturan acara.'], 422);
        $done = $failed = $skipped = 0;
        foreach ($event->guests()->whereIn('id', $data['ids'])->get() as $g) {
            if (!$r->boolean('overwrite') && trim((string) $g->description) !== '') { $skipped++; continue; }
            $g->setRelation('event', $event);
            $text = $data['mode'] === 'ai' ? InviteService::aiDescription($event, $g) : InviteService::fillFormat($event, $g);
            if (!$text) { $failed++; continue; }
            $g->update(['description' => $text, 'status' => in_array($g->status, ['draft', 'gagal'], true) ? 'siap' : $g->status]);
            $done++;
        }
        $msg = $failed && $data['mode'] === 'ai' && !\App\Services\Shop\LiviLlm::available() ? 'AI belum aktif: isi GEMINI_API_KEY di server.' : null;

        return compact('done', 'failed', 'skipped') + ['message' => $msg];
    }

    /** Kirim otomatis lewat nomor Livi (maks 25 per klik agar tidak timeout). */
    public function send(Request $r, InviteEvent $event)
    {
        $ids = $r->validate(['ids' => 'required|array|max:25', 'ids.*' => 'integer'])['ids'];
        $results = [];
        foreach ($event->guests()->whereIn('id', $ids)->get() as $g) {
            $g->setRelation('event', $event);
            $results[] = ['id' => $g->id, 'name' => $g->name] + InviteService::sendAuto($g);
            usleep(300000);
        }

        return ['results' => $results, 'sent' => collect($results)->where('ok', true)->count()];
    }

    /** Kirim manual: tautan wa.me + teks; ditandai terkirim saat admin menekan tombolnya. */
    public function manualLink(InviteEvent $event, InviteGuest $guest)
    {
        $guest->setRelation('event', $event);

        return ['url' => InviteService::manualLink($guest), 'text' => InviteService::messageFor($guest), 'image_url' => $guest->image_url];
    }

    public function markManualSent(InviteEvent $event, InviteGuest $guest)
    {
        $guest->update(['status' => $guest->status === 'dibalas' ? 'dibalas' : 'terkirim', 'send_channel' => 'manual', 'sent_at' => $guest->sent_at ?? now(), 'error_note' => null]);

        return $guest->load('event');
    }

    // ---------- Chat AI ----------
    public function chatHistory(InviteEvent $event)
    {
        return DB::table('invite_ai_messages')->where('event_id', $event->id)->orderBy('id')->limit(200)->get(['id', 'role', 'content', 'created_at']);
    }

    public function chat(Request $r, InviteEvent $event)
    {
        $q = $r->validate(['message' => 'required|string|max:2000'])['message'];
        $history = DB::table('invite_ai_messages')->where('event_id', $event->id)->orderByDesc('id')->limit(10)->get(['role', 'content'])
            ->reverse()->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])->values()->all();
        try {
            $reply = InviteService::adminChat($event, $q, $history);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 503);
        }
        $now = now();
        DB::table('invite_ai_messages')->insert([
            ['event_id' => $event->id, 'user_id' => $r->user()?->id, 'role' => 'user', 'content' => $q, 'created_at' => $now, 'updated_at' => $now],
            ['event_id' => $event->id, 'user_id' => null, 'role' => 'assistant', 'content' => $reply, 'created_at' => $now, 'updated_at' => $now],
        ]);

        return ['reply' => $reply];
    }

    public function clearChat(InviteEvent $event)
    {
        DB::table('invite_ai_messages')->where('event_id', $event->id)->delete();

        return ['ok' => true];
    }
}
