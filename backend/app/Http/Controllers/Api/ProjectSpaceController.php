<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectLayout;
use App\Models\ProjectRoom;
use App\Models\ProjectRoomHotspot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectSpaceController extends Controller
{
    // ── Layouts ────────────────────────────────────────────────
    public function index(Project $project)
    {
        return $project->layouts()->with('rooms.hotspots')->get();
    }

    public function storeLayout(Request $r, Project $project)
    {
        $data = $this->layoutData($r);
        $data['image'] = $this->upload($r, 'image', 'project_layouts');
        $layout = $project->layouts()->create(array_filter($data, fn($v) => $v !== null));
        return response()->json($layout->load('rooms.hotspots'), 201);
    }

    public function updateLayout(Request $r, ProjectLayout $layout)
    {
        $data = $this->layoutData($r);
        if ($r->hasFile('image')) $data['image'] = $this->upload($r, 'image', 'project_layouts');
        else unset($data['image']);
        $layout->update($data);
        return $layout->load('rooms.hotspots');
    }

    public function destroyLayout(ProjectLayout $layout)
    {
        $layout->delete();
        return response()->json(['ok' => true]);
    }

    // ── Rooms ──────────────────────────────────────────────────
    public function storeRoom(Request $r, ProjectLayout $layout)
    {
        $data = $this->roomData($r);
        $data['image'] = $this->upload($r, 'image', 'project_rooms');
        $room = $layout->rooms()->create(array_filter($data, fn($v) => $v !== null));
        return response()->json($room->load('hotspots'), 201);
    }

    public function updateRoom(Request $r, ProjectRoom $room)
    {
        $data = $this->roomData($r);
        if ($r->hasFile('image')) $data['image'] = $this->upload($r, 'image', 'project_rooms');
        else unset($data['image']);
        $room->update($data);
        return $room->load('hotspots');
    }

    public function destroyRoom(ProjectRoom $room)
    {
        $room->delete();
        return response()->json(['ok' => true]);
    }

    // ── Hotspots (batch save per room) ─────────────────────────
    public function saveHotspots(Request $r, ProjectRoom $room)
    {
        $v = $r->validate([
            'hotspots' => 'present|array',
            'hotspots.*.label' => 'required|string|max:200',
            'hotspots.*.x' => 'required|numeric|min:0|max:100',
            'hotspots.*.y' => 'required|numeric|min:0|max:100',
            'hotspots.*.item_slug' => 'nullable|string|max:200',
            'hotspots.*.description' => 'nullable|string',
            'hotspots.*.image' => 'nullable|string',
        ]);

        DB::transaction(function () use ($room, $v) {
            $room->hotspots()->delete();
            foreach ($v['hotspots'] as $i => $h) {
                $room->hotspots()->create([
                    'label' => $h['label'],
                    'x' => (float) $h['x'],
                    'y' => (float) $h['y'],
                    'item_slug' => $h['item_slug'] ?? null,
                    'description' => $h['description'] ?? null,
                    'image' => $h['image'] ?? null,
                    'sort_order' => $i,
                ]);
            }
        });

        return $room->load('hotspots');
    }

    // ── helpers ────────────────────────────────────────────────
    private function layoutData(Request $r): array
    {
        return $r->validate([
            'title' => 'required|string|max:200',
            'subtitle' => 'nullable|string|max:200',
            'description' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'image' => 'nullable|file|image',
        ]) + ['image' => null];
    }

    private function roomData(Request $r): array
    {
        $data = $r->validate([
            'title' => 'required|string|max:200',
            'area' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'specs' => 'nullable|string',
            'image' => 'nullable|file|image',
        ]);
        $data['specs'] = isset($data['specs']) ? json_decode($data['specs'], true) : null;
        $data['image'] = null;
        return $data;
    }

    private function upload(Request $r, string $field, string $folder): ?string
    {
        if (!$r->hasFile($field)) return null;
        return '/storage/'.$r->file($field)->store($folder, 'public');
    }
}
