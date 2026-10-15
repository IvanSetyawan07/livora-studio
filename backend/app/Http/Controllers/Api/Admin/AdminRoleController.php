<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\AdminPermissions;
use App\Services\Shop\ShopSettings;
use Illuminate\Http\Request;

class AdminRoleController extends Controller
{
    public function mine(Request $request)
    {
        return [
            'role' => AdminPermissions::role($request->user()),
            'permissions' => AdminPermissions::forUser($request->user()),
        ];
    }

    public function index()
    {
        return [
            'features' => AdminPermissions::FEATURES,
            'matrix' => AdminPermissions::matrix(),
            'admins' => User::where('role', 'admin')->orderBy('name')->get(['id', 'name', 'email', 'admin_role']),
        ];
    }

    public function saveMatrix(Request $request)
    {
        $in = $request->validate(['matrix' => 'required|array']);
        $before = AdminPermissions::matrix();
        $clean = [];
        foreach (['cs', 'finance', 'production'] as $r) {
            foreach (AdminPermissions::FEATURES as $f => $_) {
                $v = $in['matrix'][$r][$f] ?? $before[$r][$f];
                $clean[$r][$f] = in_array($v, AdminPermissions::LEVELS, true) ? $v : 'none';
            }
        }
        ShopSettings::set(['role_permissions' => $clean]);
        AuditLog::record('admin.permissions_changed', null, $before, $clean);

        return ['matrix' => AdminPermissions::matrix()];
    }

    public function setRole(Request $request, User $user)
    {
        $data = $request->validate(['admin_role' => 'required|in:'.implode(',', AdminPermissions::ROLES)]);
        abort_unless($user->role === 'admin', 422, 'Pengguna ini bukan admin.');
        if ($user->id === $request->user()->id && $data['admin_role'] !== 'owner') {
            abort(422, 'Anda tidak bisa menurunkan peran Anda sendiri.');
        }
        if (AdminPermissions::role($user) === 'owner' && $data['admin_role'] !== 'owner'
            && User::where('role', 'admin')->where(fn ($q) => $q->where('admin_role', 'owner')->orWhereNull('admin_role'))->count() <= 1) {
            abort(422, 'Harus ada minimal satu Owner.');
        }
        $before = ['admin_role' => $user->admin_role];
        $user->update($data);
        AuditLog::record('admin.role_changed', $user, $before, $data);

        return $user->only(['id', 'name', 'email', 'admin_role']);
    }
}
