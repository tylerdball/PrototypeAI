"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Project {
  id: number;
  name: string;
  description: string;
  task_count?: number;
  people_count?: number;
}

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/backend/projects");
    setProjects(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/backend/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const created = await res.json();
    setCreating(false);
    router.push(`/project/${created.id}`);
  }

  async function deleteProject(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this project and all tasks/assignments?")) return;
    await fetch(`/api/backend/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-[var(--muted)]">Create and manage RACI workspaces</p>
        </div>
      </div>

      <form onSubmit={createProject} className="card space-y-3">
        <h2 className="font-semibold">New Project</h2>
        <input
          className="input"
          placeholder="Project name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <textarea
          className="input"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
        />
        <button className="btn btn-primary" disabled={creating}>
          {creating ? "Creating..." : "Create Project"}
        </button>
      </form>

      <div className="card">
        <h2 className="mb-3 font-semibold">Existing Projects</h2>
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Loading...</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No projects yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-4 cursor-pointer"
                onClick={() => router.push(`/project/${project.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-white">{project.name}</h3>
                    <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">{project.description || "No description"}</p>
                  </div>
                  <button className="btn btn-secondary" onClick={(e) => deleteProject(project.id, e)}>
                    Delete
                  </button>
                </div>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {project.task_count ?? 0} tasks | {project.people_count ?? 0} people
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
