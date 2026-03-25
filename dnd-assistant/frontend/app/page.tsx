"use client";

import { useEffect, useState } from "react";
import { PlusCircle, Swords, Trash2 } from "lucide-react";

interface Campaign {
  id: number;
  name: string;
  setting: string;
  party_size: number;
  avg_level: number;
  created_at: string;
  npc_count?: number;
  session_count?: number;
  encounter_count?: number;
}

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", setting: "", party_size: 4, avg_level: 1 });

  useEffect(() => {
    fetch("/api/backend/campaigns")
      .then((r) => r.json())
      .then(setCampaigns)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/backend/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const campaign = await res.json();
    setCreating(false);
    setShowForm(false);
    setCampaigns((prev) => [campaign, ...prev]);
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this campaign and all its data?")) return;
    await fetch(`/api/backend/campaigns/${id}`, { method: "DELETE" });
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#f0ead6]">Your Campaigns</h1>
          <p className="text-[var(--muted)] mt-1">Select a campaign or start a new one</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
        >
          <PlusCircle size={18} />
          New Campaign
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#f0ead6] mb-4">Create New Campaign</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--muted)] mb-1">Campaign Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Curse of Strahd"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[#f0ead6] placeholder-[var(--muted)] focus:outline-none focus:border-brand-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--muted)] mb-1">Setting / Theme</label>
              <input
                value={form.setting}
                onChange={(e) => setForm({ ...form, setting: e.target.value })}
                placeholder="e.g. Gothic horror, Barovia — cursed land ruled by a vampire"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[#f0ead6] placeholder-[var(--muted)] focus:outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Party Size</label>
              <input
                type="number" min={1} max={10} value={form.party_size}
                onChange={(e) => setForm({ ...form, party_size: Number(e.target.value) })}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[#f0ead6] focus:outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Average Party Level</label>
              <input
                type="number" min={1} max={20} value={form.avg_level}
                onChange={(e) => setForm({ ...form, avg_level: Number(e.target.value) })}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[#f0ead6] focus:outline-none focus:border-brand-400"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button type="submit" disabled={creating}
              className="px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
              {creating ? "Creating…" : "Create Campaign"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2 border border-[var(--border)] text-[var(--muted)] hover:text-[#f0ead6] rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-[var(--muted)]">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 text-[var(--muted)]">
          <Swords size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No campaigns yet.</p>
          <p className="text-sm mt-1">Click "New Campaign" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c) => (
            <div key={c.id}
              onClick={() => window.location.href = `/campaign/${c.id}`}
              className="group bg-[var(--surface)] border border-[var(--border)] hover:border-brand-400 rounded-xl p-5 cursor-pointer transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[#f0ead6] font-semibold text-lg group-hover:text-brand-400 transition-colors">{c.name}</h3>
                  <p className="text-[var(--muted)] text-sm mt-1 line-clamp-2">{c.setting || "No setting specified"}</p>
                </div>
                <button onClick={(e) => handleDelete(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all p-1">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex gap-4 mt-4 text-xs text-[var(--muted)]">
                <span>Party of {c.party_size}</span>
                <span>Level {c.avg_level}</span>
                {c.npc_count !== undefined && <span>{c.npc_count} NPCs</span>}
                {c.session_count !== undefined && <span>{c.session_count} sessions</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
