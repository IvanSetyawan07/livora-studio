<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\LivoraCampaignMail;
use App\Models\MarketingCampaign;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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
            'greetingName' => 'Ivan Setyawan',
            'brand' => $this->brand(),
        ])->render();

        return response($html, 200)->header('Content-Type', 'text/html');
    }

    /**
     * Send a single test email to the currently logged-in admin.
     */
    public function sendTest(Request $request)
    {
        $data = $request->validate($this->contentRules());

        $admin = Auth::user();
        if (!$admin || !$admin->email) {
            return response()->json(['message' => 'Admin account has no email on file.'], 422);
        }

        try {
            Mail::to($admin->email)->send(new LivoraCampaignMail(
                $this->contentArray($data),
                $this->brand(),
                Str::before($admin->name ?? '', ' ') ?: null,
                '[TEST] ' . $data['subject'],
            ));
        } catch (\Throwable $e) {
            Log::error('Livora test email failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to send test email: ' . $e->getMessage()], 500);
        }

        return response()->json(['message' => "Test email sent to {$admin->email}."]);
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

    /**
     * Catalog image browser for the hero image picker.
     *
     * TODO — this is a placeholder. Tell me the real model (e.g. Room, Product,
     * ProjectImage) and its image column(s)/relation so I can wire this up to
     * actual catalog data instead of the campaign-uploads disk.
     */
    public function catalogImages(Request $request)
    {
        $search = strtolower($request->query('search', ''));
        $disk = Storage::disk('public');
        $files = collect($disk->files('campaign-images'));

        $images = $files
            ->filter(fn ($path) => Str::endsWith(strtolower($path), ['.jpg', '.jpeg', '.png', '.webp']))
            ->filter(fn ($path) => $search === '' || Str::contains(strtolower($path), $search))
            ->values()
            ->map(fn ($path, $i) => [
                'id' => $i + 1,
                'url' => $disk->url($path),
                'thumbnailUrl' => $disk->url($path),
                'label' => Str::of(basename($path))->beforeLast('.')->replace(['-', '_'], ' ')->title(),
                'category' => 'uploaded',
            ]);

        return response()->json(['images' => $images->values()]);
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