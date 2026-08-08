<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Scope;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProjectController extends Controller
{
    public function index(Request $r)
    {
        $q = Project::with(['scope','photos.items.type']);
        if ($scope = $r->query('scope')) {
            $q->whereHas('scope', fn($s) => $s->where('slug', $scope));
        }
        return $q->orderBy('sort_order')->orderByDesc('id')->get();
    }

    public function show($slug)
    {
        return Project::with(['scope','photos.items.type'])->where('slug', $slug)->firstOrFail();
    }

    public function highlights()
    {
        return Project::with('scope')->where('is_highlighted', true)
            ->orderBy('sort_order')->limit(3)->get();
    }

    public function store(Request $r)
    {
        $data = $this->validateData($r);
        $data['slug'] = $this->uniqueSlug($data['title']);
        $data['hero_image'] = $this->handleImage($r, 'hero_image', 'projects');
        $p = Project::create($data);
        return response()->json($p->load('scope'), 201);
    }

    public function update(Request $r, Project $project)
    {
        $data = $this->validateData($r, $project->id);
        if ($r->hasFile('hero_image')) {
            $data['hero_image'] = $this->handleImage($r, 'hero_image', 'projects');
        }
        $project->update($data);
        return $project->load('scope');
    }

    public function destroy(Project $project)
    {
        $project->delete();
        return response()->json(['ok' => true]);
    }

    public function updateHighlights(Request $r)
    {
        $ids = $r->validate(['ids' => 'array', 'ids.*' => 'integer|exists:projects,id'])['ids'] ?? [];
        Project::query()->update(['is_highlighted' => false]);
        foreach ($ids as $i => $id) {
            Project::where('id', $id)->update(['is_highlighted' => true, 'sort_order' => $i]);
        }
        return Project::where('is_highlighted', true)->orderBy('sort_order')->get();
    }

    private function validateData(Request $r, $ignoreId = null)
    {
        return $r->validate([
            'title' => 'required|string|max:200',
            'subtitle' => 'nullable|string|max:200',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:200',
            'year' => 'nullable|string|max:20',
            'scope_id' => 'nullable|exists:scopes,id',
            'sort_order' => 'nullable|integer',
        ]);
    }

    private function uniqueSlug($title)
    {
        $base = Str::slug($title); $slug = $base; $i = 1;
        while (Project::where('slug',$slug)->exists()) $slug = $base.'-'.$i++;
        return $slug;
    }

    private function handleImage(Request $r, $field, $folder)
    {
        if (!$r->hasFile($field)) return null;
        $path = $r->file($field)->store($folder, 'public');
        return '/storage/'.$path;
    }
}
