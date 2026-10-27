<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\C4Domain;
use App\Models\C4Element;
use App\Models\C4Layout;
use App\Models\C4Relation;
use App\Models\C4SyncRun;
use App\Services\C4\C4AutoSync;
use App\Services\C4\FrontendIngest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * API modul C4 (khusus Owner). SEMUA penulisan hanya ke tabel c4_* —
 * tidak ada endpoint di sini yang menyentuh data operasional website.
 */
class C4Controller extends Controller
{
    // ───────────────────────── graf ─────────────────────────

    public function graph(): JsonResponse
    {
        $elements = C4Element::orderBy('level')->orderBy('name')->get();
        $relations = C4Relation::orderBy('id')->get();
        $domains = C4Domain::orderBy('sort_order')->orderBy('name')->get();
        $last = C4SyncRun::latest('id')->first();

        $counts = $elements->where('auto_state', 'present')->where('is_hidden', false)->groupBy('domain_key')->map->count();

        return response()->json([
            'domains' => $domains->map(fn ($d) => [
                'id' => $d->id, 'key' => $d->key, 'name' => $d->name, 'color' => $d->color,
                'description' => $d->description, 'sort_order' => $d->sort_order, 'source' => $d->source,
                'element_count' => (int) ($counts[$d->key] ?? 0),
            ])->values(),
            'elements' => $elements->map->toGraph()->values(),
            'relations' => $relations->map->toGraph()->values(),
            'last_sync' => $last ? $this->runJson($last, false) : null,
            'isolation' => 'Perubahan di C4 hanya tersimpan di tabel c4_* dan tidak pernah mengubah website.',
        ]);
    }

    // ───────────────────────── elemen ─────────────────────────

    public function storeElement(Request $r): JsonResponse
    {
        $data = $r->validate([
            'name' => 'required|string|max:160',
            'level' => 'required|integer|between:1,4',
            'kind' => ['required', Rule::in(C4Element::KINDS)],
            'technology' => 'nullable|string|max:160',
            'description' => 'nullable|string|max:2000',
            'domain_key' => 'nullable|string|exists:c4_domains,key',
            'parent_key' => 'nullable|string|exists:c4_elements,key',
        ]);

        $el = C4Element::create($data + [
            'key' => 'm:'.Str::uuid(), 'source' => 'manual', 'auto_state' => 'present',
            'first_seen_at' => now(), 'last_seen_at' => now(), 'created_by' => $r->user()->id,
            'domain_key' => $data['domain_key'] ?? 'core',
        ]);

        return response()->json($el->toGraph(), 201);
    }

    public function updateElement(Request $r, C4Element $element): JsonResponse
    {
        if ($element->source === 'manual') {
            $data = $r->validate([
                'name' => 'sometimes|required|string|max:160',
                'level' => 'sometimes|integer|between:1,4',
                'kind' => ['sometimes', Rule::in(C4Element::KINDS)],
                'technology' => 'nullable|string|max:160',
                'description' => 'nullable|string|max:2000',
                'domain_key' => 'nullable|string|exists:c4_domains,key',
                'parent_key' => ['nullable', 'string', 'exists:c4_elements,key', Rule::notIn([$element->key])],
                'is_hidden' => 'sometimes|boolean',
            ]);
            $element->update($data);
        } else {
            // Elemen auto: suntingan disimpan sebagai override agar tidak tertimpa sinkronisasi.
            $data = $r->validate([
                'name' => 'nullable|string|max:160',
                'technology' => 'nullable|string|max:160',
                'description' => 'nullable|string|max:2000',
                'domain_key' => 'nullable|string|exists:c4_domains,key',
                'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
                'note' => 'nullable|string|max:1000',
                'is_hidden' => 'sometimes|boolean',
            ]);
            $o = $element->overrides ?? [];
            foreach (C4Element::OVERRIDABLE as $f) {
                if (array_key_exists($f, $data)) {
                    if ($data[$f] === null || $data[$f] === '') {
                        unset($o[$f]);
                    } else {
                        $o[$f] = $data[$f];
                    }
                }
            }
            $element->overrides = $o ?: null;
            if (array_key_exists('is_hidden', $data)) {
                $element->is_hidden = (bool) $data['is_hidden'];
            }
            $element->save();
        }

        return response()->json($element->fresh()->toGraph());
    }

    public function destroyElement(C4Element $element): JsonResponse
    {
        if ($element->source === 'auto') {
            // Elemen hasil scan tidak dihapus (akan muncul lagi saat sync) — cukup disembunyikan.
            $element->update(['is_hidden' => true]);

            return response()->json(['hidden' => true, 'message' => 'Elemen otomatis disembunyikan. Pulihkan lewat tab Elemen.']);
        }
        C4Relation::where('from_key', $element->key)->orWhere('to_key', $element->key)->delete();
        C4Layout::where('element_key', $element->key)->delete();
        C4Element::where('parent_key', $element->key)->update(['parent_key' => null]);
        $element->delete();

        return response()->json(['deleted' => true]);
    }

    public function resetElement(C4Element $element): JsonResponse
    {
        if ($element->source !== 'auto') {
            return response()->json(['message' => 'Hanya elemen otomatis yang bisa direset.'], 422);
        }
        $element->update(['overrides' => null, 'is_hidden' => false]);

        return response()->json($element->fresh()->toGraph());
    }

    // ───────────────────────── relasi ─────────────────────────

    public function storeRelation(Request $r): JsonResponse
    {
        $data = $r->validate([
            'from_key' => 'required|string|exists:c4_elements,key',
            'to_key' => 'required|string|exists:c4_elements,key|different:from_key',
            'kind' => ['required', Rule::in(C4Relation::KINDS)],
            'label' => 'nullable|string|max:200',
            'technology' => 'nullable|string|max:120',
            'domain_key' => 'nullable|string|exists:c4_domains,key',
        ]);
        $rel = C4Relation::create($data + [
            'key' => 'm:'.Str::uuid(), 'source' => 'manual', 'auto_state' => 'present', 'weight' => 1,
            'first_seen_at' => now(), 'last_seen_at' => now(), 'created_by' => $r->user()->id,
        ]);

        return response()->json($rel->toGraph(), 201);
    }

    public function updateRelation(Request $r, C4Relation $relation): JsonResponse
    {
        if ($relation->source === 'manual') {
            $data = $r->validate([
                'from_key' => 'sometimes|string|exists:c4_elements,key',
                'to_key' => 'sometimes|string|exists:c4_elements,key',
                'kind' => ['sometimes', Rule::in(C4Relation::KINDS)],
                'label' => 'nullable|string|max:200',
                'technology' => 'nullable|string|max:120',
                'domain_key' => 'nullable|string|exists:c4_domains,key',
                'is_hidden' => 'sometimes|boolean',
            ]);
            $relation->update($data);
        } else {
            $data = $r->validate([
                'label' => 'nullable|string|max:200',
                'technology' => 'nullable|string|max:120',
                'domain_key' => 'nullable|string|exists:c4_domains,key',
                'note' => 'nullable|string|max:1000',
                'is_hidden' => 'sometimes|boolean',
            ]);
            $o = $relation->overrides ?? [];
            foreach (C4Relation::OVERRIDABLE as $f) {
                if (array_key_exists($f, $data)) {
                    if ($data[$f] === null || $data[$f] === '') {
                        unset($o[$f]);
                    } else {
                        $o[$f] = $data[$f];
                    }
                }
            }
            $relation->overrides = $o ?: null;
            if (array_key_exists('is_hidden', $data)) {
                $relation->is_hidden = (bool) $data['is_hidden'];
            }
            $relation->save();
        }

        return response()->json($relation->fresh()->toGraph());
    }

    public function destroyRelation(C4Relation $relation): JsonResponse
    {
        if ($relation->source === 'auto') {
            $relation->update(['is_hidden' => true]);

            return response()->json(['hidden' => true, 'message' => 'Relasi otomatis disembunyikan.']);
        }
        $relation->delete();

        return response()->json(['deleted' => true]);
    }

    public function resetRelation(C4Relation $relation): JsonResponse
    {
        if ($relation->source !== 'auto') {
            return response()->json(['message' => 'Hanya relasi otomatis yang bisa direset.'], 422);
        }
        $relation->update(['overrides' => null, 'is_hidden' => false]);

        return response()->json($relation->fresh()->toGraph());
    }

    // ───────────────────────── domain ─────────────────────────

    public function storeDomain(Request $r): JsonResponse
    {
        $data = $r->validate([
            'key' => ['required', 'string', 'max:40', 'regex:/^[a-z0-9_-]+$/', 'unique:c4_domains,key'],
            'name' => 'required|string|max:120',
            'color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'description' => 'nullable|string|max:500',
            'sort_order' => 'nullable|integer|min:0|max:9999',
        ]);
        $dom = C4Domain::create($data + ['source' => 'manual', 'sort_order' => $data['sort_order'] ?? (C4Domain::max('sort_order') + 1)]);

        return response()->json($dom, 201);
    }

    public function updateDomain(Request $r, C4Domain $domain): JsonResponse
    {
        $domain->update($r->validate([
            'name' => 'sometimes|required|string|max:120',
            'color' => ['sometimes', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'description' => 'nullable|string|max:500',
            'sort_order' => 'nullable|integer|min:0|max:9999',
        ]));

        return response()->json($domain->fresh());
    }

    public function destroyDomain(C4Domain $domain): JsonResponse
    {
        if ($domain->key === 'core') {
            return response()->json(['message' => 'Domain "core" tidak bisa dihapus.'], 422);
        }
        $used = C4Element::where('domain_key', $domain->key)->count() + C4Relation::where('domain_key', $domain->key)->count();
        if ($used > 0) {
            return response()->json(['message' => "Domain masih dipakai {$used} elemen/relasi. Pindahkan dulu."], 422);
        }
        $domain->delete();

        return response()->json(['deleted' => true]);
    }

    // ───────────────────────── layout (posisi node) ─────────────────────────

    public function saveLayout(Request $r): JsonResponse
    {
        $data = $r->validate([
            'view_key' => 'required|string|max:160',
            'positions' => 'required|array|min:1|max:1500',
            'positions.*.key' => 'required|string|max:191',
            'positions.*.x' => 'required|numeric|between:-100000,100000',
            'positions.*.y' => 'required|numeric|between:-100000,100000',
        ]);
        $now = now();
        foreach ($data['positions'] as $p) {
            C4Layout::updateOrCreate(
                ['view_key' => $data['view_key'], 'element_key' => $p['key']],
                ['x' => $p['x'], 'y' => $p['y']],
            );
        }

        return response()->json(['saved' => count($data['positions']), 'at' => $now->toIso8601String()]);
    }

    public function layouts(Request $r): JsonResponse
    {
        $view = $r->validate(['view_key' => 'required|string|max:160'])['view_key'];

        return response()->json(
            C4Layout::where('view_key', $view)->get(['element_key', 'x', 'y'])
                ->map(fn ($l) => ['key' => $l->element_key, 'x' => $l->x, 'y' => $l->y])->values()
        );
    }

    public function resetLayout(Request $r): JsonResponse
    {
        $view = $r->validate(['view_key' => 'required|string|max:160'])['view_key'];
        $n = C4Layout::where('view_key', $view)->delete();

        return response()->json(['reset' => $n]);
    }

    // ───────────────────────── sinkronisasi ─────────────────────────

    public function sync(Request $r, C4AutoSync $sync): JsonResponse
    {
        try {
            $run = $sync->run('manual', $r->boolean('dry_run'), $r->user()->id);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json($this->runJson($run, true));
    }

    public function syncRuns(Request $r): JsonResponse
    {
        $limit = min(50, max(1, (int) $r->query('limit', 15)));

        return response()->json(C4SyncRun::latest('id')->limit($limit)->get()->map(fn ($x) => $this->runJson($x, true))->values());
    }

    public function purgeStale(): JsonResponse
    {
        $keys = C4Element::where('source', 'auto')->where('auto_state', 'stale')->pluck('key');
        $rels = C4Relation::where('source', 'auto')->where('auto_state', 'stale')->delete();
        C4Layout::whereIn('element_key', $keys)->delete();
        $els = C4Element::whereIn('key', $keys)->delete();

        return response()->json(['elements' => $els, 'relations' => $rels]);
    }

    public function ingestFrontend(Request $r, FrontendIngest $ingest): JsonResponse
    {
        $payload = $r->input('payload');
        if (!is_array($payload) && $r->hasFile('file')) {
            $r->validate(['file' => 'file|max:4096']);
            $payload = json_decode((string) file_get_contents($r->file('file')->getRealPath()), true);
        }
        if (!is_array($payload) || !isset($payload['pages']) || !is_array($payload['pages'])) {
            return response()->json(['message' => 'Format tidak valid. Harus berisi {"pages":[...]} dari scripts/c4-scan-frontend.mjs'], 422);
        }

        return response()->json($this->runJson($ingest->ingest($payload, 'ingest', $r->user()->id), true));
    }

    private function runJson(C4SyncRun $run, bool $withChanges): array
    {
        return [
            'id' => $run->id, 'trigger' => $run->trigger, 'status' => $run->status,
            'stats' => $run->stats, 'warnings' => $run->warnings, 'error' => $run->error,
            'started_at' => $run->started_at?->toIso8601String(), 'finished_at' => $run->finished_at?->toIso8601String(),
            'duration_ms' => $run->duration_ms,
            'changes' => $withChanges ? $run->changes : null,
        ];
    }
}
