<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\InviteEvent;
use App\Models\InviteGuest;
use App\Models\User;
use App\Services\Invite\InviteService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/** Sebar Undangan (admin): acara, tamu, import, deskripsi AI, gambar, kirim WA, RSVP, chat AI. */
class InviteController extends Controller
{
    protected const CATEGORIES = ['rekanan', 'pelanggan', 'pendaftar'];

    // ───────────── Acara ─────────────

    public function events()
    {
        return InviteEvent::latest()->get()->map(fn ($e) => $this->eventPayload($e))->values();
    }

    public function storeEvent(Request $request)
    {
        $e = InviteEvent::create($this->eventData($request));

        return $this->eventPayload($e->fresh());
    }

    public function updateEvent(Request $request, InviteEvent $event)
    {
        $event->update($this->eventData($request));

        return $this->eventPayload($event->fresh());
    }

    public function destroyEvent(InviteEvent $event)
    {
        foreach ($event->guests()->whereNotNull('image_path')->pluck('image_path') as $p) Storage::disk('public')->delete($p);
        if ($event->default_image_path) Storage::disk('public')->delete($event->default_image_path);
        $event->delete();

        return ['ok' => true];
    }

    /** POST multipart `image` = gambar umum acara (dipakai pendaftar Google Form). */
    public function eventImage(Request $request, InviteEvent $event)
    {
        $request->validate(['image' => 'required|image|mimes:jpg,jpeg,png|max:5120']);
        if ($event->default_image_path) Storage::disk('public')->delete($event->default_image_path);
        $event->update(['default_image_path' => $request->file('image')->store('invites/'.$event->id, 'public')]);

        return $this->eventPayload($event->fresh());
    }

    public function removeEventImage(InviteEvent $event)
    {
        if ($event->default_image_path) Storage::disk('public')->delete($event->default_image_path);
        $event->update(['default_image_path' => null]);

        return $this->eventPayload($event->fresh());
    }

    protected function eventData(Request $request): array
    {
        $d = $request->validate([
            'name' => 'required|string|max:190',
            'event_date' => 'nullable|string|max:40',
            'location' => 'nullable|string|max:190',
            'description_format' => 'nullable|string|max:3000',
            'ai_instructions' => 'nullable|string|max:2000',
            'knowledge' => 'nullable|string|max:8000',
            'wa_template_name' => ['nullable', 'string', 'max:120', 'regex:/^[a-z0-9_]+$/'],
            'wa_template_lang' => 'nullable|string|max:10',
            'template_has_buttons' => 'nullable|boolean',
            'sheet_csv_url' => 'nullable|url|max:1000',
            'sheet_name_column' => 'nullable|string|max:100',
            'sheet_phone_column' => 'nullable|string|max:100',
            'is_active' => 'nullable|boolean',
        ]);
        // Jam yang diketik admin dianggap WIB, disimpan sebagai UTC.
        if (array_key_exists('event_date', $d)) {
            $d['event_date'] = filled($d['event_date']) ? Carbon::parse($d['event_date'], 'Asia/Jakarta')->utc() : null;
        }
        if (array_key_exists('wa_template_lang', $d) && !filled($d['wa_template_lang'])) $d['wa_template_lang'] = 'id';

        return $d;
    }

    protected function eventPayload(InviteEvent $e): array
    {
        $q = fn () => InviteGuest::where('event_id', $e->id);

        return $e->toArray() + ['stats' => [
            'total' => $q()->count(),
            'by_status' => $q()->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status'),
            'by_category' => $q()->selectRaw('category, count(*) as c')->groupBy('category')->pluck('c', 'category'),
            'rsvp' => $q()->whereNotNull('rsvp')->selectRaw('rsvp, count(*) as c')->groupBy('rsvp')->pluck('c', 'rsvp'),
        ], 'wa_ready' => \App\Services\Shop\WaSender::configured(), 'ai_ready' => \App\Services\Shop\LiviLlm::available()];
    }

    // ───────────── Tamu ─────────────

    /** Relasi event hanya dipakai untuk image_url; jangan ikut dikirim ke browser per tamu. */
    protected function slim(InviteGuest $g): InviteGuest
    {
        return $g->makeHidden('event');
    }

    public function guests(InviteEvent $event)
    {
        return InviteGuest::with('event')->where('event_id', $event->id)->orderBy('name')->limit(3000)->get()->each(fn ($g) => $g->makeHidden('event'));
    }

    public function storeGuest(Request $request, InviteEvent $event)
    {
        $d = $this->guestData($request, $event);
        $g = InviteGuest::create($d + ['event_id' => $event->id, 'source' => 'manual']);

        return $this->slim($g->load('event'));
    }

    public function updateGuest(Request $request, InviteEvent $event, InviteGuest $guest)
    {
        abort_unless($guest->event_id === $event->id, 404);
        $d = $this->guestData($request, $event, $guest);
        if ($request->has('rsvp')) {
            $rsvp = $request->input('rsvp');
            $d['rsvp'] = in_array($rsvp, ['hadir', 'tidak'], true) ? $rsvp : null;
            $d['rsvp_at'] = $d['rsvp'] ? now() : null;
        }
        $guest->update($d);

        return $this->slim($guest->fresh('event'));
    }

    public function destroyGuest(InviteEvent $event, InviteGuest $guest)
    {
        abort_unless($guest->event_id === $event->id, 404);
        if ($guest->image_path) Storage::disk('public')->delete($guest->image_path);
        $guest->delete();

        return ['ok' => true];
    }

    /** POST {ids: []} hapus banyak tamu. */
    public function bulkDelete(Request $request, InviteEvent $event)
    {
        $ids = (array) $request->validate(['ids' => 'required|array|max:500', 'ids.*' => 'integer'])['ids'];
        $guests = InviteGuest::where('event_id', $event->id)->whereIn('id', $ids)->get();
        foreach ($guests as $g) {
            if ($g->image_path) Storage::disk('public')->delete($g->image_path);
            $g->delete();
        }

        return ['deleted' => $guests->count()];
    }

    protected function guestData(Request $request, InviteEvent $event, ?InviteGuest $guest = null): array
    {
        $d = $request->validate([
            'name' => ($guest ? 'sometimes|' : '').'required|string|max:190',
            'phone' => ($guest ? 'sometimes|' : '').'required|string|max:30',
            'category' => ['sometimes', Rule::in(self::CATEGORIES)],
            'description' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ]);
        if (isset($d['phone'])) {
            $phone = InviteService::cleanPhone($d['phone']);
            abort_unless($phone, 422, 'Nomor WhatsApp tidak valid. Contoh: 0812xxxxxxx atau 62812xxxxxxx.');
            $dup = InviteGuest::where('event_id', $event->id)->where('phone', $phone)->when($guest, fn ($q) => $q->where('id', '!=', $guest->id))->exists();
            abort_if($dup, 422, 'Nomor ini sudah ada di daftar tamu.');
            $d['phone'] = $phone;
        }
        // Deskripsi diubah admin → perlu disetujui ulang sebelum dikirim.
        if ($guest && array_key_exists('description', $d) && $d['description'] !== $guest->description && in_array($guest->status, ['siap', 'gagal'], true)) {
            $d['status'] = 'draft';
        }

        return $d;
    }

    /** POST {rows: [{name, phone, category?}]} import dari Excel/CSV (sudah dibaca di browser). */
    public function importGuests(Request $request, InviteEvent $event)
    {
        $data = $request->validate([
            'rows' => 'required|array|min:1|max:1500',
            'rows.*.name' => 'nullable|string|max:190',
            'rows.*.phone' => 'nullable|string|max:40',
            'rows.*.category' => 'nullable|string|max:30',
            'default_category' => ['nullable', Rule::in(self::CATEGORIES)],
        ]);
        $default = $data['default_category'] ?? 'pelanggan';
        $added = $skipped = 0;
        $errors = [];
        $seen = InviteGuest::where('event_id', $event->id)->pluck('phone')->flip()->all();

        foreach ($data['rows'] as $i => $row) {
            $name = trim((string) ($row['name'] ?? ''));
            $phone = InviteService::cleanPhone((string) ($row['phone'] ?? ''));
            if ($name === '' || !$phone) { $errors[] = 'Baris '.($i + 1).': nama/nomor tidak valid'; $skipped++; continue; }
            if (isset($seen[$phone])) { $errors[] = 'Baris '.($i + 1).': nomor '.$phone.' sudah ada'; $skipped++; continue; }
            $cat = mb_strtolower(trim((string) ($row['category'] ?? '')));
            $guest = new InviteGuest(['event_id' => $event->id, 'name' => $name, 'phone' => $phone,
                'category' => in_array($cat, self::CATEGORIES, true) ? $cat : $default, 'source' => 'import']);
            $guest->setRelation('event', $event);
            if (trim((string) $event->description_format) !== '') $guest->description = mb_substr(InviteService::fillFormat($event, $guest), 0, 1000);
            $guest->save();
            $seen[$phone] = true;
            $added++;
        }

        return ['added' => $added, 'skipped' => $skipped, 'errors' => array_slice($errors, 0, 20)];
    }

    // ───────────── Deskripsi & persetujuan ─────────────

    /** POST {ids: [maks 15], mode: format|ai, overwrite: bool} */
    public function generate(Request $request, InviteEvent $event)
    {
        $d = $request->validate(['ids' => 'required|array|min:1|max:15', 'ids.*' => 'integer', 'mode' => 'nullable|in:format,ai', 'overwrite' => 'nullable|boolean']);
        abort_if(trim((string) $event->description_format) === '', 422, 'Isi "Format deskripsi" di tab Pengaturan acara dulu.');
        set_time_limit(120);
        $mode = $d['mode'] ?? 'ai';
        $done = 0;
        $aiFailed = 0;
        foreach (InviteGuest::with('event')->where('event_id', $event->id)->whereIn('id', $d['ids'])->get() as $g) {
            if (!($d['overwrite'] ?? false) && trim((string) $g->description) !== '') continue;
            $text = $mode === 'ai' ? InviteService::aiDescription($event, $g) : null;
            if ($mode === 'ai' && $text === null) $aiFailed++;
            $g->update(['description' => $text ?? mb_substr(InviteService::fillFormat($event, $g), 0, 1000),
                'status' => in_array($g->status, ['terkirim', 'dibalas'], true) ? $g->status : 'draft']);
            $done++;
        }

        return ['done' => $done, 'ai_failed' => $aiFailed];
    }

    /** POST {ids: []} setujui → status "siap" (deskripsi kosong diisi dari format). */
    public function approve(Request $request, InviteEvent $event)
    {
        $ids = (array) $request->validate(['ids' => 'required|array|max:1500', 'ids.*' => 'integer'])['ids'];
        $n = 0;
        foreach (InviteGuest::with('event')->where('event_id', $event->id)->whereIn('id', $ids)->whereIn('status', ['draft', 'gagal'])->get() as $g) {
            $upd = ['status' => 'siap', 'error_note' => null];
            if (trim((string) $g->description) === '' && trim((string) $event->description_format) !== '') {
                $upd['description'] = mb_substr(InviteService::fillFormat($event, $g), 0, 1000);
            }
            $g->update($upd);
            $n++;
        }

        return ['approved' => $n];
    }

    // ───────────── Gambar ─────────────

    public function guestImage(Request $request, InviteEvent $event, InviteGuest $guest)
    {
        abort_unless($guest->event_id === $event->id, 404);
        $request->validate(['image' => 'required|image|mimes:jpg,jpeg,png|max:5120']);
        if ($guest->image_path) Storage::disk('public')->delete($guest->image_path);
        $guest->update(['image_path' => $request->file('image')->store('invites/'.$event->id, 'public')]);

        return $this->slim($guest->fresh('event'));
    }

    public function removeGuestImage(InviteEvent $event, InviteGuest $guest)
    {
        abort_unless($guest->event_id === $event->id, 404);
        if ($guest->image_path) Storage::disk('public')->delete($guest->image_path);
        $guest->update(['image_path' => null]);

        return $this->slim($guest->fresh('event'));
    }

    /** POST multipart images[] — nama file dicocokkan ke nama tamu (atau memuat nomornya). Maks 15 file per request. */
    public function bulkImages(Request $request, InviteEvent $event)
    {
        $request->validate(['images' => 'required|array|max:15', 'images.*' => 'image|mimes:jpg,jpeg,png|max:5120']);
        $norm = fn (string $s) => preg_replace('/[^a-z0-9]/', '', mb_strtolower($s));
        $guests = InviteGuest::where('event_id', $event->id)->get();
        $matched = 0;
        $unmatched = [];

        foreach ($request->file('images') as $file) {
            $base = $norm(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
            $hit = $guests->first(fn ($g) => $base !== '' && $norm($g->name) === $base)
                ?? $guests->first(fn ($g) => $base !== '' && str_contains($base, preg_replace('/\D/', '', $g->phone) ?: '#'))
                ?? $guests->first(fn ($g) => $base !== '' && strlen($norm($g->name)) >= 4 && str_contains($base, $norm($g->name)));
            if (!$hit) { $unmatched[] = $file->getClientOriginalName(); continue; }
            if ($hit->image_path) Storage::disk('public')->delete($hit->image_path);
            $hit->update(['image_path' => $file->store('invites/'.$event->id, 'public')]);
            $matched++;
        }

        return ['matched' => $matched, 'unmatched' => $unmatched];
    }

    // ───────────── Kirim ─────────────

    /** POST {ids: [maks 10], force: bool} kirim otomatis lewat nomor Livi. */
    public function send(Request $request, InviteEvent $event)
    {
        $d = $request->validate(['ids' => 'required|array|min:1|max:10', 'ids.*' => 'integer', 'force' => 'nullable|boolean']);
        set_time_limit(180);
        $results = [];
        foreach (InviteGuest::with('event')->where('event_id', $event->id)->whereIn('id', $d['ids'])->get() as $g) {
            $r = ['id' => $g->id, 'name' => $g->name];
            if (!($d['force'] ?? false) && in_array($g->status, ['terkirim', 'dibalas'], true)) {
                $results[] = $r + ['ok' => false, 'error' => 'Sudah pernah dikirim.']; continue;
            }
            if (!($d['force'] ?? false) && $g->status === 'draft') {
                $results[] = $r + ['ok' => false, 'error' => 'Belum disetujui. Setujui dulu deskripsinya.']; continue;
            }
            if (User::where('phone', $g->phone)->whereNotNull('wa_opt_out_at')->exists()) {
                $g->update(['status' => 'gagal', 'error_note' => 'Nomor ini sudah berhenti menerima pesan promosi (STOP).']);
                $results[] = $r + ['ok' => false, 'error' => 'Sudah berhenti menerima pesan promosi.']; continue;
            }
            $out = InviteService::sendAuto($g);
            $results[] = $r + ['ok' => $out['ok'], 'error' => $out['error'], 'mode' => $out['mode']];
            usleep(400000); // jeda ringan antar pesan
        }

        return ['results' => $results];
    }

    /** GET tautan wa.me + teks untuk kirim manual dari HP admin. */
    public function manualLink(InviteEvent $event, InviteGuest $guest)
    {
        abort_unless($guest->event_id === $event->id, 404);

        return ['url' => InviteService::manualLink($guest), 'message' => InviteService::messageFor($guest->load('event'))];
    }

    public function markSent(InviteEvent $event, InviteGuest $guest)
    {
        abort_unless($guest->event_id === $event->id, 404);
        $guest->update(['status' => 'terkirim', 'send_channel' => 'manual', 'sent_at' => now(), 'error_note' => null]);

        return $this->slim($guest->fresh('event'));
    }

    // ───────────── Google Sheet ─────────────

    public function pullSheet(InviteEvent $event)
    {
        try {
            $r = InviteService::pullSheet($event);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
        $r['filled'] = InviteService::autoFillSheetGuests($event);

        return $r;
    }

    // ───────────── Cek template Meta ─────────────

    /** POST {name?, lang?, has_buttons?} cek template langsung ke Meta (tidak mengirim pesan). */
    public function checkTemplate(Request $request, InviteEvent $event)
    {
        $d = $request->validate([
            'name' => ['nullable', 'string', 'max:120', 'regex:/^[a-z0-9_]+$/'],
            'lang' => 'nullable|string|max:10',
            'has_buttons' => 'nullable|boolean',
        ]);

        return app(\App\Services\Invite\TemplateChecker::class)->check(
            $d['name'] ?? (string) $event->wa_template_name,
            $d['lang'] ?? ($event->wa_template_lang ?: 'id'),
            (bool) ($d['has_buttons'] ?? $event->template_has_buttons),
        );
    }
    // ───────────── Chat AI admin ─────────────

    public function chatHistory(InviteEvent $event)
    {
        return DB::table('invite_ai_messages')->where('event_id', $event->id)->orderByDesc('id')->limit(60)->get(['id', 'role', 'content', 'created_at'])->reverse()->values();
    }

    public function chat(Request $request, InviteEvent $event)
    {
        $q = trim($request->validate(['message' => 'required|string|max:2000'])['message']);
        $history = DB::table('invite_ai_messages')->where('event_id', $event->id)->orderByDesc('id')->limit(10)->get(['role', 'content'])
            ->reverse()->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])->values()->all();
        try {
            $reply = InviteService::adminChat($event, $q, $history);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
        $now = now();
        DB::table('invite_ai_messages')->insert([
            ['event_id' => $event->id, 'user_id' => $request->user()->id, 'role' => 'user', 'content' => $q, 'created_at' => $now, 'updated_at' => $now],
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