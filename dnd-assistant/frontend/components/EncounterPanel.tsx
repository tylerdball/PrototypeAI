"use client";

import { useEffect, useState } from "react";
import { Swords, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";

interface Encounter {
  id: number;
  name: string;
  difficulty: string;
  monsters: string;
  tactics: string;
  notes: string;
}

interface Campaign {
  party_size: number;
  avg_level: number;
}

const DIFF_STYLES: Record<string, string> = {
  easy: "text-green-400 border-green-800 bg-green-900/30",
  medium: "text-yellow-400 border-yellow-800 bg-yellow-900/30",
  hard: "text-orange-400 border-orange-800 bg-orange-900/30",
  deadly: "text-red-400 border-red-800 bg-red-900/30",
};

export default function EncounterPanel({ campaignId, campaign }: { campaignId: number; campaign: Campaign }) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [difficulty, setDifficulty] = useState("medium");
  const [environment, setEnvironment] = useState("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/backend/campaigns/${campaignId}/encounters`)
      .then((r) => r.json())
      .then(setEncounters);
  }, [campaignId]);

  async function generate() {
    setGenerating(true);
    const res = await fetch(`/api/backend/campaigns/${campaignId}/encounters/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty, environment, notes }),
    });
    const encounter = await res.json();
    setEncounters((prev) => [encounter, ...prev]);
    setEnvironment("");
    setNotes("");
    setGenerating(false);
    setExpanded(encounter.id);
  }

  async function deleteEncounter(id: number) {
    await fetch(`/api/backend/campaigns/${campaignId}/encounters/${id}`, { method: "DELETE" });
    setEncounters((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="font-semibold text-[#f0ead6] mb-3">Generate Encounter</h2>
        <p className="text-xs text-[var(--muted)] mb-3">Party of {campaign.party_size}, level {campaign.avg_level}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#f0ead6] focus:outline-none focus:border-brand-400">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="deadly">Deadly</option>
          </select>
          <input value={environment} onChange={(e) => setEnvironment(e.target.value)}
            placeholder="Environment (e.g. dungeon, forest, tavern)"
            className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#f0ead6] placeholder-[var(--muted)] focus:outline-none focus:border-brand-400" />
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes"
            className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#f0ead6] placeholder-[var(--muted)] focus:outline-none focus:border-brand-400" />
        </div>
        <button onClick={generate} disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          <Swords size={14} />
          {generating ? "Generating…" : "Generate Encounter"}
        </button>
      </div>

      {encounters.length === 0 ? (
        <p className="text-center text-[var(--muted)] py-12">No encounters yet. Generate one above.</p>
      ) : (
        <div className="space-y-2">
          {encounters.map((enc) => (
            <div key={enc.id} className="border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 bg-[var(--surface)]">
                <button onClick={() => setExpanded(expanded === enc.id ? null : enc.id)}
                  className="flex-1 flex items-center gap-3 text-left">
                  <span className={clsx("text-xs px-2 py-0.5 rounded border font-medium shrink-0 capitalize", DIFF_STYLES[enc.difficulty] || DIFF_STYLES.medium)}>
                    {enc.difficulty}
                  </span>
                  <span className="font-semibold text-[#f0ead6] flex-1">{enc.name}</span>
                  {expanded === enc.id ? <ChevronUp size={14} className="text-[var(--muted)]" /> : <ChevronDown size={14} className="text-[var(--muted)]" />}
                </button>
                <button onClick={() => deleteEncounter(enc.id)} className="text-[var(--muted)] hover:text-red-400 transition-colors p-1">
                  <Trash2 size={14} />
                </button>
              </div>
              {expanded === enc.id && (
                <div className="px-5 py-4 border-t border-[var(--border)] grid gap-3 text-sm">
                  {[
                    ["Monsters", enc.monsters],
                    ["Tactics", enc.tactics],
                    ["Notes", enc.notes],
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
