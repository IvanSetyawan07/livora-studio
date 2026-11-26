<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserActivity;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $q = User::query()->orderByDesc('created_at');

        if ($search = $request->query('search')) {
            $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%")
                  ->orWhere('phone', 'like', "%$search%");
            });
        }

        $users = $q->get()->map(function (User $u) {
            return [
                'id'            => $u->id,
                'name'          => $u->name,
                'email'         => $u->email,
                'phone'         => $u->phone,
                'address'       => $u->address,
                'role'          => $u->role,
                'admin_role'    => $u->admin_role,
                'provider'      => $u->provider,
                'avatar_url'    => $u->avatar_url,
                'login_count'   => (int) ($u->login_count ?? 0),
                'last_login_at' => $u->last_login_at,
                'last_seen_at'  => $u->last_seen_at,
                'last_ip'       => $u->last_ip,
                'created_at'    => $u->created_at,
            ];
        });

        return response()->json($users);
    }

    public function show(User $user)
    {
        return response()->json([
            'user' => $user,
            'stats' => [
                'login_count'  => (int) ($user->login_count ?? 0),
                'activities'   => UserActivity::where('user_id', $user->id)->count(),
                'last_login_at'=> $user->last_login_at,
                'last_seen_at' => $user->last_seen_at,
            ],
        ]);
    }

    public function activities(User $user, Request $request)
    {
        $limit = min(200, max(1, (int) $request->query('limit', 100)));
        $activities = UserActivity::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
        return response()->json($activities);
    }

    /** PATCH /api/admin/users/{user}/role — khusus Owner untuk mengangkat/mencabut akses admin. */
    public function updateRole(Request $request, User $user)
    {
        $actor = $request->user();
        if (\App\Services\AdminPermissions::role($actor) !== 'owner') {
            return response()->json(['message' => 'Hanya Owner yang dapat mengubah akses admin.'], 403);
        }

        $data = $request->validate([
            'role'       => 'required|in:user,admin',
            'admin_role' => 'nullable|in:owner,cs,finance,production',
        ]);

        if ($actor->id === $user->id && ($data['role'] !== 'admin' || ($data['admin_role'] ?? 'owner') !== 'owner')) {
            return response()->json(['message' => 'Anda tidak dapat mencabut akses Owner dari akun sendiri.'], 422);
        }

        $user->role = $data['role'];
        $user->admin_role = $data['role'] === 'admin' ? ($data['admin_role'] ?? $user->admin_role ?? 'cs') : null;
        $user->save();

        return response()->json([
            'id'         => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'role'       => $user->role,
            'admin_role' => $user->admin_role,
        ]);
    }
}
