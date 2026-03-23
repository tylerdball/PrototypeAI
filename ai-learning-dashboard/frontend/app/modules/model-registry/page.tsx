"use client";

import { useState } from "react";
import Link from "next/link";

type Stage = "Staging" | "Production" | "Archived" | "Experimental";

interface ModelVersion {
  id: string;
  name: string;
  version: string;
  stage: Stage;
  accuracy: number;
  f1: number;
  params: string;
  created: string;
  framework: string;
  description: string;
}

const INITIAL_MODELS: ModelVersion[] = [
  { id: "1", name: "fraud-detector", version: "v3.2.1", stage: "Production", accuracy: 0.961, f1: 0.943, params: "125M", created: "2024-11-15", framework: "PyTorch", description: "XGBoost ensemble + BERT embeddings for transaction features." },
  { id: "2", name: "fraud-detector", version: "v3.3.0-beta", stage: "Staging", accuracy: 0.968, f1: 0.951, params: "340M", created: "2024-12-01", framework: "PyTorch", description: "Larger transformer backbone, improved recall on micro-transactions." },
  { id: "3", name: "churn-predictor", version: "v2.1.0", stage: "Production", accuracy: 0.884, f1: 0.871, params: "45M", created: "2024-10-20", framework: "scikit-learn", description: "Gradient boosted trees on 90-day behavioral features." },
  { id: "4", name: "churn-predictor", version: "v2.2.0", stage: "Experimental", accuracy: 0.891, f1: 0.879, params: "80M", created: "2024-12-10", framework: "PyTorch", description: "Neural net with attention over session sequences." },
  { id: "5", name: "sentiment-api", version: "v1.4.2", stage: "Production", accuracy: 0.923, f1: 0.918, params: "110M", created: "2024-09-05", framework: "Hugging Face", description: "Fine-tuned DistilBERT on customer reviews." },
  { id: "6", name: "sentiment-api", version: "v1.5.0", stage: "Archived", accuracy: 0.901, f1: 0.895, params: "110M", created: "2024-08-01", framework: "Hugging Face", description: "Previous iteration — deprecated after v1.4.2 A/B test." },
];

const STAGE_COLORS: Record<Stage, string> = {
  Production:   "bg-green-900/30 text-green-300 border-green-600/30",
  Staging:      "bg-blue-900/30 text-blue-300 border-blue-600/30",
  Experimental: "bg-purple-900/30 text-purple-300 border-purple-600/30",
  Archived:     "bg-gray-800/50 text-gray-400 border-gray-600/30",
};

const TRANSITIONS: Record<Stage, Stage[]> = {
  Experimental: ["Staging"],
  Staging:      ["Production", "Archived"],
  Production:   ["Archived"],
  Archived:     [],
};

export default function ModelRegistryPage() {
  const [models, setModels] = useState(INITIAL_MODELS);
  const [filter, setFilter] = useState<Stage | "All">("All");

  function promote(id: string, to: Stage) {
    setModels((prev) => prev.map((m) => m.id === id ? { ...m, stage: to } : m));
  }

  const filtered = filter === "All" ? models : models.filter((m) => m.stage === filter);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <Link href="/" className="text-xs text-[var(--muted)] hover:text-white">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mt-2 mb-1">Model Registry</h1>
        <p className="text-[var(--muted)]">Versioning, staging, and promotion workflows for production ML models.</p>
      </div>

      {/* Concepts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { term: "Model Versioning", color: "text-green-400", def: "Semantic versioning (major.minor.patch) for models. Major = architecture change. Minor = retraining on new data. Patch = bug fix or threshold tuning." },
          { term: "Staging Pipeline", color: "text-blue-400", def: "Experimental → Staging → Production → Archived. Each transition requires validation: offline eval, shadow traffic, A/B testing, then cutover. Archived versions are kept for rollback." },
          { term: "Model Lineage", color: "text-purple-400", def: "Tracking what data, code, and hyperparameters produced a model version. Essential for debugging regressions and audit/compliance requirements." },
          { term: "Shadow Mode", color: "text-yellow-400", def: "Run a candidate model in production alongside the current one, logging its predictions without serving them to users. Validates real-world performance before promoting." },
        ].map(({ term, color, def }) => (
          <div key={term} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className={`text-sm font-semibold ${color} mb-1`}>{term}</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">{def}</p>
          </div>
        ))}
      </div>

      {/* Filter + model table */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--muted)]">Filter by stage:</span>
          {(["All", "Production", "Staging", "Experimental", "Archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filter === s
                  ? "bg-brand-500 border-brand-500 text-white"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((m) => (
            <div key={m.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{m.name}</span>
                    <span className="text-xs text-[var(--muted)] font-mono">{m.version}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STAGE_COLORS[m.stage]}`}>{m.stage}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">{m.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-[var(--muted)]">
                    <span>Acc: <span className="text-white">{(m.accuracy * 100).toFixed(1)}%</span></span>
                    <span>F1: <span className="text-white">{(m.f1 * 100).toFixed(1)}%</span></span>
                    <span>Params: <span className="text-white">{m.params}</span></span>
                    <span>Framework: <span className="text-white">{m.framework}</span></span>
                    <span>Created: <span className="text-white">{m.created}</span></span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {TRANSITIONS[m.stage].map((target) => (
                    <button
                      key={target}
                      onClick={() => promote(m.id, target)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                        target === "Production" ? "border-green-500/40 text-green-300 hover:bg-green-900/30" :
                        target === "Archived" ? "border-gray-500/40 text-gray-400 hover:bg-gray-800/50" :
                        "border-blue-500/40 text-blue-300 hover:bg-blue-900/30"
                      }`}
                    >
                      → {target}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
