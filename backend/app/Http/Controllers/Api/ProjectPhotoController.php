<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectPhoto;
use Illuminate\Http\Request;

class ProjectPhotoController extends Controller
{
    public function index(Project $project)
    {
        return $project->photos()->with('items')->get();
    }

    public function store(Request $r, Project $project)
    {
        $data = $r->validate([
            'title' => 'nullable|string|max:200',
            'caption' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'image' => 'required|file|image',
            'item_ids' => 'nullable|array',
            'item_ids.*' => 'integer|exists:items,id',
        ]);
        $data['image'] = '/storage/'.$r->file('image')->store('project_photos', 'public');
        $itemIds = $data['item_ids'] ?? [];
        unset($data['item_ids']);
        $photo = $project->photos()->create($data);
        $photo->items()->sync($itemIds);
        return response()->json($photo->load('items'), 201);
    }

    public function update(Request $r, ProjectPhoto $photo)
    {
        $data = $r->validate([
            'title' => 'nullable|string|max:200',
            'caption' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'image' => 'nullable|file|image',
            'item_ids' => 'nullable|array',
            'item_ids.*' => 'integer|exists:items,id',
        ]);
        if ($r->hasFile('image')) {
            $data['image'] = '/storage/'.$r->file('image')->store('project_photos', 'public');
        }
        $itemIds = $data['item_ids'] ?? null;
        unset($data['item_ids']);
        $photo->update($data);
        if ($itemIds !== null) $photo->items()->sync($itemIds);
        return $photo->load('items');
    }

    public function destroy(ProjectPhoto $photo)
    {
        $photo->delete();
        return response()->json(['ok' => true]);
    }
}
