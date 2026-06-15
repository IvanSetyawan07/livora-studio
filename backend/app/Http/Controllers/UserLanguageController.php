<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class UserLanguageController extends Controller
{
    public function update(Request $request)
    {
        $request->validate([
            'language' => ['required', 'in:id,en'],
        ]);

        $request->user()->update([
            'language' => $request->language,
        ]);

        return response()->json(['message' => 'Bahasa berhasil diperbarui']);
    }
}