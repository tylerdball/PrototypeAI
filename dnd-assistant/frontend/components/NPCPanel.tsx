"use client";

import { useEffect, useState } from "react";
import { Sparkles, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface NPC {
  id: number;
  name: string;
  role: string;
  personality: string;
  backstory: string;
  secret: string;
  motivation: string;
  speech_pattern: string;
}

export default function NPCPanel({ campaignId }: { campaignId: number }) {
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [role, setRole] = useState("");
  const [hints, setHints] = useState("");
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/backend/campaigns/${campaignId}/npcs`)
      .then((r) => r.json())
      .then(setNpcs);
  }, [campaignId]);

  async function generate() {
    if (!role.trim()) return;
    setGenerating(true);
    const res = await fetch(`/api/backend/campaigns/${campaignId}/npcs/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, hints }),
    });
    const npc = await res.json();
    setNpcs((prev) => [npc, ...prev]);
    setRole("");
    setHints("");
    setGenerating(false);
    setExpanded(npc.id);
  }

  async function deleteNpc(id: number) {
    await fetch(`/api/backend/campaigns/${campaignId}/npcs/${id}`, { method: "DELETE" });
    setNpcs((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="font-semibold text-[#f0ead6] mb-3">Generate NPC</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role / archetype (e.g. shady merchant, elven ranger)"
            className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#f0ead6] placeholder-[var(--muted)] focus:outline-none focus:border-brand-400"
          />
          <input
            value={hints}
            onChange={(e) => setHints(e.target.value)}
            placeholder="Optional hints (e.g. knows about the cult, injured)"
            className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#f0ead6] placeholder-[var(--muted)] focus:outline-none focus:border-brand-400"
          />
        </div>
        <button onClick={generate} disabled={generating || !role.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          <Sparkles size={14} />
          {generating ? "Generating…" : "Generate NPC"}
        </button>
      </div>

      {npcs.length === 0 ? (
        <p className="text-center text-[var(--muted)] py-12">No NPCs yet. Generate one above.</p>
      ) : (
        <div className="space-y-2">
          {npcs.map((npc) => (
            <div key={npc.id} className="border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 bg-[var(--surface)]">
                <button onClick={() => setExpanded(expanded === npc.id ? null : npc.id)}
                  className="flex-1 flex items-center gap-3 text-left">
                  <div className="flex-1">
                    <span className="font-semibold text-[#f0ead6]">{npc.name}</span>
                    <span className="text-[var(--muted)] text-sm ml-2">— {npc.role}</span>
                  </div>
                  {expanded === npc.id ? <ChevronUp size={14} className="text-[var(--muted)]" /> : <ChevronDown size={14} className="text-[var(--muted)]" />}
                </button>
                <button onClick={() => deleteNpc(npc.id)} className="text-[var(--muted)] hover:text-red-400 transition-colors p-1">
                  <Trash2 size={14} />
                </button>
              </div>
              {expanded === npc.id && (
                <div className="px-5 py-4 border-t border-[var(--border)] grid gap-3 text-sm">
                  {[
                    ["Personality", npc.personality],
                    ["Backstory", npc.backstory],
                    ["Secret", npc.secret],
                    ["Motivation", npc.motivation],
                    ["Speech Pattern", npc.speech_pattern],
                  ].map(([label, value]) => value ? (
                    <div key={label}>
                      <p className="text-brand-400 font-medium text-xs uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-[#f0ead6]">{value}</p>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
