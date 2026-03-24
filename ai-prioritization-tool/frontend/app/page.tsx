"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Download, Plus, Trash2 } from "lucide-react";
import { clsx } from "clsx";

// ── Types ────────────────────────────────────────────────────────────────────

type Weight = "low" | "med" | "high";

interface Criterion {
  id: string;
  name: string;
  description: string;
  weight: Weight;
}

interface CriterionScore {
  criterion: string;
  score: number;
  reasoning: string;
}

interface ScoredItem {
  title: string;
  description: string;
  criterion_scores: CriterionScore[];
  weighted_score: number;
  recommendation: "HIGH" | "MEDIUM" | "LOW" | "DEFER";
}

// ── Default criteria ─────────────────────────────────────────────────────────

const DEFAULT_CRITERIA: Criterion[] = [
  { id: "1", name: "Platform Leverage", description: "Improves reusable infrastructure across teams", weight: "high" },
  { id: "2", name: "Customer / User Value", description: "Directly benefits end users or customers", weight: "high" },
  { id: "3", name: "Strategic Alignment", description: "Maps to OKRs and architectural direction", weight: "med" },
  { id: "4", name: "Technical Debt Relief", description: "Reduces debt and improves system health", weight: "med" },
  { id: "5", name: "Reduces Duplication", description: "Eliminates redundant implementations", weight: "med" },
  { id: "6", name: "Dependency Unblocking", description: "Unblocks other teams or initiatives", weight: "med" },
  { id: "7", name: "Risk / Reversibility", description: "Low score = high risk or hard to reverse", weight: "med" },
  { id: "8", name: "Developer Experience", description: "Makes it easier to build on the platform", weight: "low" },
  { id: "9", name: "Delivery Confidence", description: "Team can scope and deliver this well", weight: "low" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const WEIGHT_LABELS: Record<Weight, string> = { low: "Low", med: "Med", high: "High" };

const REC_STYLES: Record<string, string> = {
  HIGH: "bg-green-900/50 text-green-300 border-green-700",
  MEDIUM: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  LOW: "bg-orange-900/50 text-orange-300 border-orange-700",
  DEFER: "bg-red-900/50 text-red-300 border-red-700",
};

function uid() {
  return Math.random().toString(36).slice(2);
}

function exportCsv(results: ScoredItem[]) {
  if (!results.length) return;
  const criteriaNames = results[0].criterion_scores.map((cs) => cs.criterion);
  const headers = ["Title", "Description", "Weighted Score", "Recommendation", ...criteriaNames.flatMap((n) => [`${n} Score`, `${n} Reasoning`])];
  const rows = results.map((r) => [
    r.title,
    r.description,
    r.weighted_score,
    r.recommendation,
    ...r.criterion_scores.flatMap((cs) => [cs.score, cs.reasoning.replace(/,/g, ";")]),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "prioritization-results.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Components ───────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[var(--border)] rounded-full h-2">
        <div
          className="h-2 rounded-full bg-brand-500 transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-mono text-white w-10 text-right">{score}</span>
    </div>
  );
}

function ResultRow({ item }: { item: ScoredItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--surface)] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white truncate">{item.title}</span>
            <span className={clsx("text-xs px-2 py-0.5 rounded border font-medium shrink-0", REC_STYLES[item.recommendation])}>
              {item.recommendation}
            </span>
          </div>
          <p className="text-sm text-[var(--muted)] mt-0.5 truncate">{item.description}</p>
        </div>
        <div className="w-40 shrink-0">
          <ScoreBar score={item.weighted_score} />
        </div>
        {expanded ? <ChevronUp size={16} className="shrink-0 text-[var(--muted)]" /> : <ChevronDown size={16} className="shrink-0 text-[var(--muted)]" />}
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] px-5 py-4 bg-[var(--surface)] grid gap-3">
          {item.criterion_scores.map((cs) => (
            <div key={cs.criterion}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{cs.criterion}</span>
                <span className="text-sm font-mono text-brand-400">{cs.score}/5</span>
              </div>
              <p className="text-xs text-[var(--muted)]">{cs.reasoning}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [criteria, setCriteria] = useState<Criterion[]>(DEFAULT_CRITERIA);
  const [context, setContext] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const [itemsText, setItemsText] = useState("");
  const [results, setResults] = useState<ScoredItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  function updateCriterion(id: string, field: keyof Criterion, value: string) {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function addCriterion() {
    setCriteria((prev) => [...prev, { id: uid(), name: "New Criterion", description: "", weight: "med" }]);
  }

  function removeCriterion(id: string) {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  }

  function parseItems() {
    return itemsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf("|");
        if (idx === -1) return { title: line, description: "" };
        return { title: line.slice(0, idx).trim(), description: line.slice(idx + 1).trim() };
      });
  }

  async function handleScore() {
    const items = parseItems();
    if (!items.length) { setError("Add at least one backlog item."); return; }
    if (!criteria.length) { setError("Add at least one criterion."); return; }

    setError("");
    setLoading(true);
    setResults([]);
    setProgress(0);

    // Simulate progress while waiting
    const interval = setInterval(() => setProgress((p) => Math.min(p + 2, 90)), 500);

    try {
      const res = await fetch("/api/backend/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteria: criteria.map(({ name, description, weight }) => ({ name, description, weight })),
          context,
          items,
        }),
      });
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      const data: ScoredItem[] = await res.json();
      setResults(data);
      setProgress(100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Scoring failed. Is the backend running?");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  const itemCount = parseItems().length;

  return (
    <div className="space-y-6">
      {/* Organisational context */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <button
          onClick={() => setContextOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
        >
          <span className="font-semibold text-white">Organisational Context</span>
          {contextOpen ? <ChevronUp size={16} className="text-[var(--muted)]" /> : <ChevronDown size={16} className="text-[var(--muted)]" />}
        </button>
        {contextOpen && (
          <div className="px-5 pb-5 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--muted)] mt-3 mb-2">
              Paste OKRs, strategic priorities, or team goals. This frames all scoring without being a scored criterion.
            </p>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={5}
              placeholder="e.g. Q2 OKR: Reduce infrastructure cost by 20%. North star: developer self-service platform..."
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>
        )}
      </section>

      {/* Criteria */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Scoring Criteria</h2>
          <button onClick={addCriterion} className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors">
            <Plus size={14} /> Add criterion
          </button>
        </div>

        <div className="space-y-2">
          {criteria.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_1.5fr_auto_auto] gap-2 items-center">
              <input
                value={c.name}
                onChange={(e) => updateCriterion(c.id, "name", e.target.value)}
                className="bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
              <input
                value={c.description}
                onChange={(e) => updateCriterion(c.id, "description", e.target.value)}
                placeholder="description"
                className="bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:border-brand-500"
              />
              <select
                value={c.weight}
                onChange={(e) => updateCriterion(c.id, "weight", e.target.value)}
                className="bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                {(Object.keys(WEIGHT_LABELS) as Weight[]).map((w) => (
                  <option key={w} value={w}>{WEIGHT_LABELS[w]}</option>
                ))}
              </select>
              <button onClick={() => removeCriterion(c.id)} className="text-[var(--muted)] hover:text-red-400 transition-colors p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Items input */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="font-semibold text-white mb-2">Backlog Items</h2>
        <p className="text-xs text-[var(--muted)] mb-3">One item per line: <code className="text-brand-400">Title | Description</code></p>
        <textarea
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
          rows={8}
          placeholder={"Migrate auth service to OAuth2 | Replace legacy session tokens with OAuth2/PKCE for compliance\nAdd dark mode | User-requested theme toggle for the dashboard\nRefactor billing module | Split monolithic billing into separate service"}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:border-brand-500 resize-none font-mono"
        />
      </section>

      {/* Action */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleScore}
          disabled={loading || !itemCount}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? "Scoring…" : `Score ${itemCount > 0 ? itemCount : ""} Item${itemCount !== 1 ? "s" : ""}`}
        </button>
        {results.length > 0 && (
          <button
            onClick={() => exportCsv(results)}
            className="flex items-center gap-2 px-4 py-2.5 border border-[var(--border)] text-[var(--muted)] hover:text-white rounded-lg transition-colors text-sm"
          >
            <Download size={14} /> Export CSV
          </button>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* Progress bar */}
      {loading && (
        <div className="w-full bg-[var(--border)] rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-brand-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <section>
          <h2 className="font-semibold text-white mb-3">Results — {results.length} items ranked</h2>
          <div className="space-y-2">
            {results.map((item, i) => (
              <ResultRow key={i} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
