<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\LivoraCampaignMail;
use App\Models\Item;
use App\Models\MarketingCampaign;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MarketingController extends Controller
{
    /**
     * Global brand header/footer settings.
     * TODO: move to config/livora.php or a settings table once you tell me
     * where brand/social links currently live in the app.
     */
    private function brand(): array
    {
        return [
            'logoText'       => 'LIVORA',
            'studioLabel'    => 'PT. Langgeng Cipta Ruang',
            'websiteUrl'     => config('app.url'),
            'instagramUrl'   => 'https://instagram.com/livora',
            'bookingUrl'     => config('app.url') . '/consultation',
            'contactUrl'     => config('app.url') . '/contact',
            'copyrightYear'  => now()->year,
            'unsubscribeUrl' => config('app.url') . '/unsubscribe',
        ];
    }

    public function brandSettings()
    {
        return response()->json($this->brand());
    }

    public function audience()
    {
        $users = User::query()
            ->select('id', 'name', 'email', 'role', 'created_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'total' => $users->count(),
            'users' => $users,
        ]);
    }

    private function contentRules(): array
    {
        return [
            'campaign_name'   => 'nullable|string|max:150',
            'subject'         => 'required|string|max:200',
            'section_label'   => 'required|string|max:60',
            'headline'        => 'required|string|max:200',
            'body'            => 'required|string',
            'hero_image'      => 'nullable|url|max:500',
            'hero_image_alt'  => 'nullable|string|max:200',
            'cta_label'       => 'nullable|string|max:60',
            'cta_url'         => 'nullable|url|max:500',
            'signature'       => 'required|string|max:200',
        ];
    }

    private function contentArray(array $data): array
    {
        return [
            'sectionLabel'  => $data['section_label'],
            'headline'      => $data['headline'],
            'body'          => $data['body'],
            'heroImage'     => $data['hero_image'] ?? null,
            'heroImageAlt'  => $data['hero_image_alt'] ?? null,
            'ctaLabel'      => $data['cta_label'] ?? null,
            'ctaUrl'        => $data['cta_url'] ?? null,
            'signature'     => $data['signature'],
        ];
    }

    /**
     * Renders the exact same Blade view the admin preview iframe displays.
     * Called on every edit in the admin composer (debounced client-side).
     */
    public function preview(Request $request)
    {
        $data = $request->validate([
            'section_label'   => 'required|string|max:60',
            'headline'        => 'required|string|max:200',
            'body'            => 'required|string',
            'hero_image'      => 'nullable|url|max:500',
            'hero_image_alt'  => 'nullable|string|max:200',
            'cta_label'       => 'nullable|string|max:60',
            'cta_url'         => 'nullable|url|max:500',
            'signature'       => 'required|string|max:200',
        ]);

        $html = view('emails.livora.campaign', [
            ...$this->contentArray($data),
            'greetingName' => 'Pelanggan Livora',
            'brand' => $this->brand(),
        ])->render();

        return response($html, 200)->header('Content-Type', 'text/html');
    }

    /**
     * Send a single test email to the currently logged-in admin (or optional custom test_email).
     */
    public function sendTest(Request $request)
    {
        $data = $request->validate([
            ...$this->contentRules(),
            'test_email' => 'nullable|email|max:200',
        ]);

        $admin = Auth::user();
        $recipient = trim((string) ($data['test_email'] ?? '')) ?: ($admin->email ?? '');
        if (!$recipient) {
            return response()->json(['message' => 'Masukkan alamat email tujuan uji coba.'], 422);
        }

        try {
            Mail::to($recipient)->send(new LivoraCampaignMail(
                $this->contentArray($data),
                $this->brand(),
                Str::before($admin->name ?? '', ' ') ?: null,
                '[TEST] ' . $data['subject'],
            ));
        } catch (\Throwable $e) {
            Log::error('Livora test email failed: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal mengirim email uji coba: ' . $e->getMessage()], 500);
        }

        return response()->json(['message' => "Email uji coba terkirim ke {$recipient}."]);
    }

    /**
     * Send the campaign to the real audience.
     */
    public function send(Request $request)
    {
        $data = $request->validate([
            ...$this->contentRules(),
            'target'     => 'required|in:all,selected',
            'user_ids'   => 'array',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        $query = User::query()->whereNotNull('email');
        if ($data['target'] === 'selected') {
            $query->whereIn('id', $data['user_ids'] ?? []);
        }
        $users = $query->get();

        $brand = $this->brand();
        $content = $this->contentArray($data);

        $sent = 0;
        $failed = [];
        foreach ($users as $user) {
            try {
                $firstName = $user->name ? Str::before($user->name, ' ') : null;
                Mail::to($user->email)->send(new LivoraCampaignMail(
                    $content,
                    $brand,
                    $firstName,
                    $data['subject'],
                ));
                $sent++;
            } catch (\Throwable $e) {
                Log::error('LivoraCampaignMail failed for ' . $user->email . ': ' . $e->getMessage());
                $failed[] = $user->email;
            }
        }

        MarketingCampaign::create([
            ...$data,
            'status' => 'sent',
            'sent_at' => now(),
            'sent_count' => $sent,
        ]);

        return response()->json([
            'message' => "Terkirim ke {$sent} penerima.",
            'sent'    => $sent,
            'failed'  => $failed,
        ]);
    }

    /**
     * Save (or update) a campaign as a draft. Pass `id` to update an existing draft.
     */
    public function saveDraft(Request $request)
    {
        $data = $request->validate([
            ...$this->contentRules(),
            'target'       => 'nullable|in:all,selected,segment',
            'user_ids'     => 'array',
            'scheduled_at' => 'nullable|date',
            'id'           => 'nullable|integer|exists:marketing_campaigns,id',
        ]);

        $campaign = MarketingCampaign::updateOrCreate(
            ['id' => $data['id'] ?? null],
            [
                ...collect($data)->except(['id'])->toArray(),
                'status' => filled($data['scheduled_at'] ?? null) ? 'scheduled' : 'draft',
            ],
        );

        return response()->json([
            'message' => 'Draft saved.',
            'campaign' => $campaign,
        ]);
    }

    public function campaigns()
    {
        if (!Schema::hasTable('marketing_campaigns')) {
            return response()->json(['campaigns' => []]);
        }

        $rows = MarketingCampaign::query()
            ->orderByDesc('updated_at')
            ->limit(60)
            ->get([
                'id', 'campaign_name', 'subject', 'section_label', 'headline',
                'status', 'target', 'sent_count', 'sent_at', 'scheduled_at',
                'created_at', 'updated_at',
            ]);

        return response()->json(['campaigns' => $rows]);
    }

    public function showCampaign(MarketingCampaign $campaign)
    {
        return response()->json(['campaign' => $campaign]);
    }

    public function destroyCampaign(MarketingCampaign $campaign)
    {
        $campaign->delete();

        return response()->json(['deleted' => true]);
    }

    /**
     * Catalog image browser for the hero image picker.
     * Aggregates real Item, Project/ProjectPhoto, PromoBanner, and uploaded campaign images.
     */
    public function catalogImages(Request $request)
    {
        $search = strtolower(trim((string) $request->query('search', '')));
        $catFilter = strtolower(trim((string) $request->query('category', 'all')));
        $disk = Storage::disk('public');
        $baseUrl = rtrim((string) config('app.url', 'https://api.livoralcr.com'), '/');

        $normalizeUrl = function (?string $path) use ($disk, $baseUrl): ?string {
            if (! $path) {
                return null;
            }
            if (Str::startsWith($path, ['http://', 'https://'])) {
                return $path;
            }
            if (Str::startsWith($path, '/storage/')) {
                return $baseUrl.$path;
            }
            if (Str::startsWith($path, '/seed/')) {
                $frontend = rtrim((string) config('app.frontend_url', 'https://livoralcr.com'), '/');

                return $frontend.$path;
            }

            return $disk->url(ltrim($path, '/'));
        };

        $images = collect();
        $idSeq = 1;

        if (($catFilter === 'all' || $catFilter === 'product') && Schema::hasTable('items')) {
            Item::whereNotNull('image')->orderByDesc('id')->limit(30)->get(['id', 'title', 'image'])->each(function ($item) use (&$images, &$idSeq, $normalizeUrl) {
                $url = $normalizeUrl($item->image);
                if ($url) {
                    $images->push([
                        'id' => $idSeq++,
                        'url' => $url,
                        'thumbnailUrl' => $url,
                        'label' => $item->title,
                        'category' => 'product',
                    ]);
                }
            });
        }

        if (($catFilter === 'all' || $catFilter === 'room') && Schema::hasTable('projects')) {
            Project::whereNotNull('hero_image')->orderByDesc('is_highlighted')->limit(20)->get(['id', 'title', 'hero_image'])->each(function ($proj) use (&$images, &$idSeq, $normalizeUrl) {
                $url = $normalizeUrl($proj->hero_image);
                if ($url) {
                    $images->push([
                        'id' => $idSeq++,
                        'url' => $url,
                        'thumbnailUrl' => $url,
                        'label' => $proj->title,
                        'category' => 'room',
                    ]);
                }
            });
        }

        if (($catFilter === 'all' || $catFilter === 'promo') && Schema::hasTable('promo_banners')) {
            DB::table('promo_banners')->whereNotNull('image_url')->orderByDesc('id')->limit(10)->get(['id', 'title', 'image_url'])->each(function ($b) use (&$images, &$idSeq, $normalizeUrl) {
                $url = $normalizeUrl($b->image_url);
                if ($url) {
                    $images->push([
                        'id' => $idSeq++,
                        'url' => $url,
                        'thumbnailUrl' => $url,
                        'label' => $b->title,
                        'category' => 'promo',
                    ]);
                }
            });
        }

        if ($catFilter === 'all' || $catFilter === 'uploaded') {
            $files = collect($disk->files('campaign-images'));
            $files
                ->filter(fn ($path) => Str::endsWith(strtolower($path), ['.jpg', '.jpeg', '.png', '.webp']))
                ->each(function ($path) use (&$images, &$idSeq, $disk) {
                    $images->push([
                        'id' => $idSeq++,
                        'url' => $disk->url($path),
                        'thumbnailUrl' => $disk->url($path),
                        'label' => (string) Str::of(basename($path))->beforeLast('.')->replace(['-', '_'], ' ')->title(),
                        'category' => 'uploaded',
                    ]);
                });
        }

        $filtered = $images->filter(function ($img) use ($search) {
            return $search === '' || Str::contains(strtolower($img['label'].' '.$img['category']), $search);
        })->values();

        return response()->json(['images' => $filtered]);
    }

    public function uploadImage(Request $request)
    {
        $request->validate([
            'file' => 'required|image|max:8192',
        ]);

        $path = $request->file('file')->store('campaign-images', 'public');

        return response()->json([
            'url' => Storage::disk('public')->url($path),
        ]);
    }
}