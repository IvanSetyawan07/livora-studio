<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\User;
use Illuminate\Http\Request;

class ConsultationClaimController extends Controller
{
    public function claim(Request $request, Consultation $consultation)
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', 'https://livoralcr.com'), '/');
        $hasAccount = User::where('email', $consultation->email)->exists();

        $target = $hasAccount ? '/login' : '/register';
        $query = http_build_query([
            'email'        => $consultation->email,
            'consultation' => $consultation->id,
        ]);

        return redirect()->away("{$frontendUrl}{$target}?{$query}");
    }
}