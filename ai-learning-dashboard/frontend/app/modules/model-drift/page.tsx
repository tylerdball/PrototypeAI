"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DriftChart } from "@/components/DriftChart";
import { LiveDemo } from "@/components/LiveDemo";

const API = "/api/backend";

interface DriftPoint {
  timestamp: string;
  mean: number;
  psi: number;
  kl_div: number;
  drift_type: string;
}

interface SimulateResult {
  points: DriftPoint[];
  baseline_mean: number;
  drift_start: number;
  drift_kind: string;
}

export default function ModelDriftPage() {
  const [steps, setSteps] = useState(60);
  const [driftStart, setDriftStart] = useState(30);
  const [driftKind, setDriftKind] = useState<"data" | "concept" | "both">("data");
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function simulate() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/drift/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps, drift_start: driftStart, drift_kind: driftKind }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { simulate(); }, []);

  const driftingPoints = result?.points.filter((p) => p.drift_type !== "none") ?? [];
  const maxPSI = result ? Math.max(...result.points.map((p) => p.psi)) : 0;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/" className="text-xs text-[var(--muted)] hover:text-white">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mt-2 mb-1">Model Drift</h1>
        <p className="text-[var(--muted)]">Understand data drift vs. concept drift with PSI and KL divergence monitoring.</p>
      </div>

      {/* Concepts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            term: "Data Drift (Covariate Shift)",
            color: "text-yellow-400",
            def: "The statistical distribution of input features changes over time. Example: A fraud model trained on 2020 transaction amounts sees 2024 transactions which are larger due to inflation. The labels (fraud/not-fraud) may still be valid for the same feature values, but the feature distribution has shifted.",
          },
          {
            term: "Concept Drift",
            color: "text-orange-400",
            def: "The relationship between features and the target variable changes. Example: A sentiment model trained pre-COVID sees 'I'm dying' as very negative. Post-irony-era, it can be a positive expression. Same feature values, different meaning — model accuracy degrades silently.",
          },
          {
            term: "PSI (Population Stability Index)",
            color: "text-blue-400",
            def: "PSI < 0.1: No significant change. 0.1–0.25: Moderate drift, investigate. PSI > 0.25: Major drift — model likely needs retraining. PSI = Σ (actual% − expected%) × ln(actual% / expected%).",
          },
          {
            term: "KL Divergence",
            color: "text-purple-400",
            def: "Measures how one probability distribution differs from a reference. KL(P||Q) = 0 means identical distributions. Unlike PSI, it's asymmetric — KL(P||Q) ≠ KL(Q||P). Used for continuous distributions, PSI for binned data.",
          },
        ].map(({ term, color, def }) => (
          <div key={term} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className={`text-sm font-semibold ${color} mb-1`}>{term}</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">{def}</p>
          </div>
        ))}
      </div>

      {/* Simulation controls */}
      <LiveDemo title="Drift Simulation" badge="Synthetic Data">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">
                Time Steps: <span className="text-white">{steps}</span>
              </label>
              <input type="range" min={20} max={120} value={steps} onChange={(e) => setSteps(+e.target.value)} className="w-full accent-yellow-500" />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">
                Drift Starts at Step: <span className="text-white">{driftStart}</span>
              </label>
              <input type="range" min={5} max={steps - 5} value={driftStart} onChange={(e) => setDriftStart(+e.target.value)} className="w-full accent-yellow-500" />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">Drift Kind</label>
              <select
                value={driftKind}
                onChange={(e) => setDriftKind(e.target.value as any)}
                className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-500"
              >
                <option value="data">Data Drift</option>
                <option value="concept">Concept Drift</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <button
            onClick={simulate}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg bg-yellow-600 text-white text-sm font-medium hover:bg-yellow-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Simulating..." : "Run Simulation"}
          </button>

          {result && (
            <div>
              {/* Stats */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="rounded bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-xs">
                  <span className="text-[var(--muted)]">Drifting steps: </span>
                  <span className="text-white font-medium">{driftingPoints.length}</span>
                </div>
                <div className="rounded bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-xs">
                  <span className="text-[var(--muted)]">Max PSI: </span>
                  <span className={`font-medium ${maxPSI > 0.25 ? "text-red-400" : maxPSI > 0.1 ? "text-yellow-400" : "text-green-400"}`}>
                    {maxPSI.toFixed(3)}
                  </span>
                </div>
                <div className={`rounded border px-3 py-2 text-xs font-medium ${
                  maxPSI > 0.25 ? "border-red-500/30 bg-red-900/20 text-red-300" :
                  maxPSI > 0.1 ? "border-yellow-500/30 bg-yellow-900/20 text-yellow-300" :
                  "border-green-500/30 bg-green-900/20 text-green-300"
                }`}>
                  {maxPSI > 0.25 ? "ALERT: Retrain model" : maxPSI > 0.1 ? "WARNING: Investigate" : "OK: Stable"}
                </div>
              </div>
              <DriftChart data={result.points} driftStart={result.drift_start} />
            </div>
          )}
        </div>
      </LiveDemo>
    </div>
  );
}
