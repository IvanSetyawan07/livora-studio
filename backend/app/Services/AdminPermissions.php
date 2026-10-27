<?php

namespace App\Services;

use App\Models\User;
use App\Services\Shop\ShopSettings;
use Illuminate\Http\Request;

/**
 * Hak akses admin per peran: setiap fitur bernilai none | view | edit.
 * Owner selalu edit semua. Matriks disimpan di shop_settings (key role_permissions)
 * sehingga Owner bisa mengubahnya dari panel tanpa deploy.
 */
class AdminPermissions
{
    public const ROLES = ['owner', 'cs', 'finance', 'production'];
    public const LEVELS = ['none', 'view', 'edit'];

    public const FEATURES = [
        'catalog'        => 'Item, katalog & koleksi',
        'projects'       => 'Proyek',
        'landing'        => 'Landing page & banner',
        'users'          => 'Pengguna',
        'consultations'  => 'Konsultasi',
        'wishlists'      => 'Wishlist',
        'support'        => 'Chat support',
        'analytics'      => 'Analitik',
        'marketing'      => 'AI Marketing',
        'shop_orders'    => 'Pesanan toko',
        'shop_payments'  => 'Verifikasi bayar',
        'shop_aftercare' => 'Klaim & refund',
        'shop_inbox'     => 'Inbox WhatsApp',
        'shop_database'  => 'Database toko',
        'invites'        => 'Sebar Undangan',
        'shop_system'    => 'Pengaturan, kesehatan & bot toko',
    ];

    public const DEFAULTS = [
        'cs' => [
            'catalog' => 'view', 'projects' => 'view', 'landing' => 'none', 'users' => 'view',
            'consultations' => 'edit', 'wishlists' => 'view', 'support' => 'edit', 'analytics' => 'none',
            'marketing' => 'none', 'shop_orders' => 'edit', 'shop_payments' => 'view', 'shop_aftercare' => 'view',
            'shop_inbox' => 'edit', 'shop_database' => 'view', 'shop_system' => 'none', 'invites' => 'edit',
        ],
        'finance' => [
            'catalog' => 'view', 'projects' => 'none', 'landing' => 'none', 'users' => 'none',
            'consultations' => 'view', 'wishlists' => 'none', 'support' => 'none', 'analytics' => 'view',
            'marketing' => 'none', 'shop_orders' => 'view', 'shop_payments' => 'edit', 'shop_aftercare' => 'edit',
            'shop_inbox' => 'none', 'shop_database' => 'view', 'shop_system' => 'none',
        ],
        'production' => [
            'catalog' => 'view', 'projects' => 'edit', 'landing' => 'none', 'users' => 'none',
            'consultations' => 'view', 'wishlists' => 'none', 'support' => 'none', 'analytics' => 'none',
            'marketing' => 'none', 'shop_orders' => 'edit', 'shop_payments' => 'none', 'shop_aftercare' => 'edit',
            'shop_inbox' => 'none', 'shop_database' => 'none', 'shop_system' => 'none',
        ],
    ];

    /** Path (setelah /api/) → fitur. Urutan penting: yang lebih spesifik di atas. */
    protected const PATH_MAP = [
        'admin/shop/orders' => 'shop_orders', 'admin/shop/documents' => 'shop_orders',
        'admin/shop/proofs' => 'shop_payments',
        'admin/shop/claims' => 'shop_aftercare', 'admin/shop/refunds' => 'shop_aftercare',
        'admin/shop/inbox' => 'shop_inbox',
        'admin/invites' => 'invites',
        'admin/shop/database' => 'shop_database', 'admin/shop/admins' => 'shop_database',
        'admin/shop' => 'shop_system',
        'admin/projects' => 'projects', 'admin/layouts' => 'projects', 'admin/rooms' => 'projects',
        'admin/landing' => 'landing', 'admin/banners' => 'landing', 'admin/brand-settings' => 'landing',
        'admin/stories' => 'landing', 'admin/story-cards' => 'landing',
        'admin/users' => 'users',
        'admin/consultations' => 'consultations', 'admin/activities' => 'consultations',
        'admin/wishlists' => 'wishlists',
        'admin/support' => 'support',
        'admin/analytics' => 'analytics',
        'admin/marketing' => 'marketing', 'ai' => 'marketing',
    ];

    /** Path yang selalu boleh untuk semua admin (cek hak akses sendiri, notifikasi). */
    protected const ALWAYS = ['admin/my-permissions', 'admin/activities'];

    public static function role(User $u): string
    {
        return $u->admin_role ?: 'owner';
    }

    public static function matrix(): array
    {
        $saved = ShopSettings::get('role_permissions', []) ?: [];
        $out = [];
        foreach (['cs', 'finance', 'production'] as $r) {
            foreach (self::FEATURES as $f => $_) {
                $v = $saved[$r][$f] ?? self::DEFAULTS[$r][$f] ?? 'none';
                $out[$r][$f] = in_array($v, self::LEVELS, true) ? $v : 'none';
            }
        }
        $out['owner'] = array_fill_keys(array_keys(self::FEATURES), 'edit');

        return $out;
    }

    public static function forUser(User $u): array
    {
        return self::matrix()[self::role($u)] ?? array_fill_keys(array_keys(self::FEATURES), 'none');
    }

    public static function featureForPath(string $path): ?string
    {
        $path = trim($path, '/');
        if (str_starts_with($path, 'api/')) $path = substr($path, 4);
        foreach (self::ALWAYS as $p) if ($path === $p || str_starts_with($path, $p.'/')) return null;
        foreach (self::PATH_MAP as $prefix => $f) {
            if ($path === $prefix || str_starts_with($path, $prefix.'/')) return $f;
        }

        return str_starts_with($path, 'admin') ? 'catalog' : null;
    }

    /** null = boleh; string = pesan penolakan. */
    public static function check(Request $request): ?string
    {
        $user = $request->user();
        if (self::role($user) === 'owner') return null;
        $feature = self::featureForPath($request->path());
        if (!$feature) return null;
        $level = self::forUser($user)[$feature] ?? 'none';
        $write = !in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true);
        if ($level === 'edit' || ($level === 'view' && !$write)) return null;

        $name = self::FEATURES[$feature];
        return $level === 'view'
            ? "Peran Anda hanya bisa melihat fitur \"$name\", tidak bisa mengubah."
            : "Peran Anda tidak memiliki akses ke fitur \"$name\".";
    }
}
