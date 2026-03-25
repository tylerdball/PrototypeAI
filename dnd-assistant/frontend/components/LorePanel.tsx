"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, X } from "lucide-react";
import { clsx } from "clsx";

interface LoreEntry {
  id: number;
  title: string;
  category: string;
  content: string;
}

const CATEGORIES = ["general", "factions", "locations", "history", "religion", "npcs", "rules", "other"];

const CAT_COLORS: Record<string, string> = {
  general: "text-gray-400 border-gray-700 bg-gray-900/30",
  factions: "text-blue-400 border-blue-800 bg-blue-900/30",
  locations: "text-green-400 border-green-800 bg-green-900/30",
  history: "text-yellow-400 border-yellow-800 bg-yellow-900/30",
  religion: "text-purple-400 border-purple-800 bg-purple-900/30",
  npcs: "text-orange-400 border-orange-800 bg-orange-900/30",
  rules: "text-cyan-400 border-cyan-800 bg-cyan-900/30",
  other: "text-gray-400 border-gray-700 bg-gray-900/30",
};

export default function LorePanel({ campaignId }: { campaignId: number }) {
  const [entries, setEntries] = useState<LoreEntry[]>([]);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState({ title: "", category: "general", content: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/backend/campaigns/${campaignId}/lore`)
      .then((r) => r.json())
      .then(setEntries);
  }, [campaignId]);

  function openNew() {
    setForm({ title: "", category: "general", content: "" });
    setEditing("new");
  }

  function openEdit(e: LoreEntry) {
    setForm({ title: e.title, category: e.category, content: e.content });
    setEditing(e.id);
  }

  async function save() {
    setSaving(true);
    const url = editing === "new"
      ? `/api/backend/campaigns/${campaignId}/lore`
      : `/api/backend/campaigns/${campaignId}/lore/${editing}`;
    const res = await fetch(url, {
      method: editing === "new" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const saved = await res.json();
    setEntries((prev) =>
      editing === "new" ? [saved, ...prev] : prev.map((e) => (e.id === saved.id ? saved : e))
    );
    setEditing(null);
    setSaving(false);
  }

  async function deleteEntry(id: number) {
    await fetch(`/api/backend/campaigns/${campaignId}/lore/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (editing === id) setEditing(null);
  }

  const filtered = filter === "all" ? entries : entries.filter((e) => e.category === filter);

  const grouped = CATEGORIES.reduce<Record<string, LoreEntry[]>>((acc, cat) => {
    const items = filtered.filter((e) => e.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilter("all")}
            className={clsx("text-xs px-2 py-1 rounded border transition-colors", filter === "all" ? "border-brand-400 text-brand-400 bg-brand-900/30" : "border-[var(--border)] text-[var(--muted)] hover:text-[#f0ead6]")}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className={clsx("text-xs px-2 py-1 rounded border transition-colors capitalize", filter === c ? "border-brand-400 text-brand-400 bg-brand-900/30" : "border-[var(--border)] text-[var(--muted)] hover:text-[#f0ead6]")}>
              {c}
            </button>
          ))}
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors">
          <Plus size={14} /> Add Entry
        </button>
      </div>

      {/* Edit form */}
      {editing !== null && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#f0ead6]">{editing === "new" ? "New Entry" : "Edit Entry"}</h3>
            <button onClick={() => setEditing(null)} className="text-[var(--muted)] hover:text-[#f0ead6]"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title"
              className="bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[#f0ead6] placeholder-[var(--muted)] focus:outline-none focus:border-brand-400" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[#f0ead6] focus:outline-none focus:border-brand-400 capitalize">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={8} placeholder="Write your lore, notes, history..."
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[#f0ead6] placeholder-[var(--muted)] focus:outline-none focus:border-brand-400 resize-none" />
          <button onClick={save} disabled={saving || !form.title || !form.content}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            <Save size={14} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-center text-[var(--muted)] py-12">No lore entries yet. Add campaign notes, history, factions, and more.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2 capitalize">{cat}</h3>
              <div className="space-y-2">
                {items.map((entry) => (
                  <div key={entry.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-[#f0ead6]">{entry.title}</h4>
                        <span className={clsx("text-xs px-1.5 py-0.5 rounded border capitalize", CAT_COLORS[entry.category] || CAT_COLORS.other)}>
                          {entry.category}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(entry)} className="text-[var(--muted)] hover:text-brand-400 transition-colors p-1 text-xs">Edit</button>
                        <button onClick={() => deleteEntry(entry.id)} className="text-[var(--muted)] hover:text-red-400 transition-colors p-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-[#f0ead6] whitespace-pre-line">{entry.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
