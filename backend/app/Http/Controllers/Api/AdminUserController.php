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
}
