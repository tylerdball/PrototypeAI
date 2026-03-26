"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/backend/share/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.detail || "Not found");
        }
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-[var(--muted)]">Loading shared project...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-bold text-white">{data.project.name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Read-only shared view</p>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">RACI Matrix</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-2 py-2 text-left">Task</th>
              {data.people.map((p: any) => (
                <th key={`ph-${p.id}`} className="px-2 py-2 text-left text-xs">{p.name}</th>
              ))}
              {(data.teams || []).map((t: any) => (
                <th key={`th-${t.id}`} className="px-2 py-2 text-left text-xs text-[var(--muted)] italic">{t.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              let lastGroupId: number | null = undefined as any;
              const rows: React.ReactNode[] = [];
              const colCount = 1 + data.people.length + (data.teams || []).length;
              for (const task of data.tasks) {
                if (task.group_id !== lastGroupId) {
                  lastGroupId = task.group_id;
                  if (task.group_name) {
                    rows.push(
                      <tr key={`gh-${task.group_id}`}>
                        <td
                          colSpan={colCount}
                          className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-brand-500 bg-brand-500/5"
                        >
                          {task.group_name}
                        </td>
                      </tr>
                    );
                  }
                }
                rows.push(
                  <tr key={task.id} className="border-t border-[var(--border)]">
                    <td className="px-2 py-2">
                      <div className="font-medium">{task.title}</div>
                      <div className="text-xs text-[var(--muted)]">{task.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} | due {task.due_date || "-"}</div>
                    </td>
                    {data.people.map((person: any) => (
                      <td key={`p-${person.id}`} className="px-2 py-2 text-center font-medium">
                        {task.role_by_person?.[String(person.id)] || <span className="text-[var(--muted)]">-</span>}
                      </td>
                    ))}
                    {(data.teams || []).map((team: any) => (
                      <td key={`t-${team.id}`} className="px-2 py-2 text-center font-medium text-[var(--muted)]">
                        {task.role_by_team?.[String(team.id)] || "-"}
                      </td>
                    ))}
                  </tr>
                );
              }
              return rows;
            })()}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">Due This Week</h2>
          {(data.digest?.due_tasks || []).length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No tasks due this week.</p>
          ) : (
            <div className="space-y-2">
              {data.digest.due_tasks.map((task: any) => (
                <div key={task.id} className="rounded border border-[var(--border)] bg-[var(--surface2)] p-3 text-sm">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-[var(--muted)]">Due: {task.due_date}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-2 font-semibold">Alerts</h2>
          <p className="text-sm text-[var(--muted)]">Missing A: {(data.alerts?.missing_accountability || []).length}</p>
          <p className="text-sm text-[var(--muted)]">Overloaded owners: {(data.alerts?.overloaded_owners || []).length}</p>
        </div>
      </div>
    </div>
  );
}
