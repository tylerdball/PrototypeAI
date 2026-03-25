"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Save } from "lucide-react";

interface Character {
  id: number;
  name: string;
  player_name: string;
  class: string;
  race: string;
  level: number;
  str: number | null; dex: number | null; con: number | null;
  int: number | null; wis: number | null; cha: number | null;
  hp: number | null; ac: number | null;
  background: string;
  traits: string;
  equipment: string;
  spells: string;
  notes: string;
}

const BLANK: Omit<Character, "id"> = {
  name: "", player_name: "", class: "", race: "", level: 1,
  str: null, dex: null, con: null, int: null, wis: null, cha: null,
  hp: null, ac: null, background: "", traits: "", equipment: "", spells: "", notes: "",
};

const STATS = ["str", "dex", "con", "int", "wis", "cha"] as const;

function modifier(score: number | null) {
  if (score == null) return "—";
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function StatBox({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2 w-16">
      <span className="text-xs text-[var(--muted)] uppercase">{label}</span>
      <input
        type="number" min={1} max={30} value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-10 text-center bg-transparent text-[#f0ead6] text-sm font-bold focus:outline-none"
      />
      <span className="text-xs text-brand-400">{modifier(value)}</span>
    </div>
  );
}

export default function CharacterPanel({ campaignId }: { campaignId: number }) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [expanded, setExpanded] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<Omit<Character, "id">>(BLANK);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/backend/campaigns/${campaignId}/characters`)
      .then((r) => r.json())
      .then(setCharacters);
  }, [campaignId]);

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openNew() {
    setForm(BLANK);
    setEditId(null);
    setExpanded("new");
  }

  function openEdit(c: Character) {
    setForm({ ...c });
    setEditId(c.id);
    setExpanded(c.id);
  }

  async function save() {
    setSaving(true);
    const payload = { ...form, class_: form.class };
    const url = editId
      ? `/api/backend/campaigns/${campaignId}/characters/${editId}`
      : `/api/backend/campaigns/${campaignId}/characters`;
    const res = await fetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const saved = await res.json();
    setCharacters((prev) =>
      editId ? prev.map((c) => (c.id === editId ? saved : c)) : [saved, ...prev]
    );
    setExpanded(saved.id);
    setEditId(saved.id);
    setSaving(false);
  }

  async function deleteChar(id: number) {
    await fetch(`/api/backend/campaigns/${campaignId}/characters/${id}`, { method: "DELETE" });
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    if (expanded === id) setExpanded(null);
  }

  const FormFields = (
    <div className="space-y-4 pt-4 border-t border-[var(--border)]">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["name", "player_name", "class", "race"] as const).map((f) => (
          <div key={f}>
            <label className="text-xs text-[var(--muted)] capitalize mb-1 block">{f.replace("_", " ")}</label>
            <input value={(form as Record<string, unknown>)[f] as string ?? ""}
              onChange={(e) => set(f, e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[#f0ead6] focus:outline-none focus:border-brand-400" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs text-[var(--muted)] mb-1 block">Level</label>
          <input type="number" min={1} max={20} value={form.level ?? 1}
            onChange={(e) => set("level", Number(e.target.value))}
            className="w-16 bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[#f0ead6] focus:outline-none focus:border-brand-400" />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] mb-1 block">HP</label>
          <input type="number" value={form.hp ?? ""}
            onChange={(e) => set("hp", e.target.value ? Number(e.target.value) : null)}
            className="w-16 bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[#f0ead6] focus:outline-none focus:border-brand-400" />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] mb-1 block">AC</label>
          <input type="number" value={form.ac ?? ""}
            onChange={(e) => set("ac", e.target.value ? Number(e.target.value) : null)}
            className="w-16 bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[#f0ead6] focus:outline-none focus:border-brand-400" />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {STATS.map((s) => (
          <StatBox key={s} label={s} value={(form as Record<string, number | null>)[s]}
            onChange={(v) => set(s, v)} />
        ))}
      </div>
      {(["background", "traits", "equipment", "spells", "notes"] as const).map((f) => (
        <div key={f}>
          <label className="text-xs text-[var(--muted)] capitalize mb-1 block">{f}</label>
          <textarea value={(form as Record<string, unknown>)[f] as string ?? ""} rows={2}
            onChange={(e) => set(f, e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[#f0ead6] focus:outline-none focus:border-brand-400 resize-none" />
        </div>
      ))}
      <button onClick={save} disabled={saving || !form.name}
        className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
        <Save size={14} /> {saving ? "Saving…" : "Save Character"}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{characters.length} character{characters.length !== 1 ? "s" : ""}</p>
        <button onClick={openNew}
          className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors">
          <Plus size={14} /> Add Character
        </button>
      </div>

      {expanded === "new" && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="font-semibold text-[#f0ead6]">New Character</h3>
          {FormFields}
        </div>
      )}

      {characters.length === 0 && expanded !== "new" ? (
        <p className="text-center text-[var(--muted)] py-12">No characters yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {characters.map((c) => (
            <div key={c.id} className="border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 bg-[var(--surface)]">
                <button onClick={() => expanded === c.id ? setExpanded(null) : openEdit(c)}
                  className="flex-1 flex items-center gap-3 text-left">
                  <div className="flex-1">
                    <span className="font-semibold text-[#f0ead6]">{c.name}</span>
                    <span className="text-[var(--muted)] text-sm ml-2">
                      {[c.race, c.class, c.level ? `Level ${c.level}` : null].filter(Boolean).join(" · ")}
                    </span>
                    {c.player_name && <span className="text-xs text-[var(--muted)] ml-2">({c.player_name})</span>}
                  </div>
                  <div className="flex gap-3 text-xs text-[var(--muted)] shrink-0">
                    {c.hp != null && <span>HP {c.hp}</span>}
                    {c.ac != null && <span>AC {c.ac}</span>}
                  </div>
                  {expanded === c.id ? <ChevronUp size={14} className="text-[var(--muted)]" /> : <ChevronDown size={14} className="text-[var(--muted)]" />}
                </button>
                <button onClick={() => deleteChar(c.id)} className="text-[var(--muted)] hover:text-red-400 transition-colors p-1">
                  <Trash2 size={14} />
                </button>
              </div>
              {expanded === c.id && editId === c.id && (
                <div className="px-5 pb-5">{FormFields}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
