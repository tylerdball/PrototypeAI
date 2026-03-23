"use client";

import { useState } from "react";
import Link from "next/link";

interface Experiment {
  id: string;
  name: string;
  model: string;
  lr: number;
  batch: number;
  epochs: number;
  accuracy: number;
  loss: number;
  duration: string;
  status: "completed" | "running" | "failed";
}

const EXPERIMENTS: Experiment[] = [
  { id: "exp-001", name: "baseline-xgb", model: "XGBoost", lr: 0.1, batch: 256, epochs: 100, accuracy: 0.882, loss: 0.312, duration: "4m 12s", status: "completed" },
  { id: "exp-002", name: "lr-sweep-0.01", model: "XGBoost", lr: 0.01, batch: 256, epochs: 100, accuracy: 0.871, loss: 0.334, duration: "4m 09s", status: "completed" },
  { id: "exp-003", name: "bert-embed-v1", model: "BERT+XGB", lr: 2e-5, batch: 32, epochs: 5, accuracy: 0.921, loss: 0.241, duration: "22m 38s", status: "completed" },
  { id: "exp-004", name: "bert-large-v1", model: "BERT-Large", lr: 1e-5, batch: 16, epochs: 5, accuracy: 0.934, loss: 0.218, duration: "1h 14m", status: "completed" },
  { id: "exp-005", name: "bert-large-bs8", model: "BERT-Large", lr: 1e-5, batch: 8, epochs: 10, accuracy: 0.0, loss: 0.0, duration: "—", status: "running" },
  { id: "exp-006", name: "distilbert-quick", model: "DistilBERT", lr: 3e-5, batch: 32, epochs: 3, accuracy: 0.0, loss: 0.0, duration: "—", status: "failed" },
];

const PIPELINE_STAGES = [
  { name: "Data Validation", desc: "Schema checks, null rates, distribution stats. Fail fast on bad data.", icon: "✅" },
  { name: "Feature Engineering", desc: "Transforms, encodings, embeddings. Tracked in a feature store for reproducibility.", icon: "⚙️" },
  { name: "Model Training", desc: "Distributed training with experiment tracking (MLflow/W&B). Hyperparameter sweeps.", icon: "🏋️" },
  { name: "Evaluation Gate", desc: "Automated eval vs. champion model. Must beat baseline + pass statistical significance test.", icon: "📊" },
  { name: "Model Registry", desc: "Push artifact + metadata to registry. Tag with lineage: data version, code SHA.", icon: "📦" },
  { name: "Canary Deploy", desc: "Route 5% of traffic to new model. Monitor latency, error rate, business metrics.", icon: "🐦" },
  { name: "Full Rollout", desc: "Graduate to 100% traffic after canary health check. Old model kept for rollback.", icon: "🚀" },
];

export default function MLOpsPage() {
  const [selectedExp, setSelectedExp] = useState<string | null>("exp-004");

  const best = EXPERIMENTS.filter((e) => e.status === "completed").sort((a, b) => b.accuracy - a.accuracy)[0];
  const selected = EXPERIMENTS.find((e) => e.id === selectedExp);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <Link href="/" className="text-xs text-[var(--muted)] hover:text-white">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mt-2 mb-1">MLOps</h1>
        <p className="text-[var(--muted)]">CI/CD for ML: pipelines, experiment tracking, deployment strategies, and monitoring.</p>
      </div>

      {/* ML Pipeline */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">ML Pipeline Stages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {PIPELINE_STAGES.map((s, i) => (
            <div key={s.name} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 relative">
              <div className="flex items-center gap-2 mb-1">
                <span>{s.icon}</span>
                <span className="text-xs font-semibold text-white">{i + 1}. {s.name}</span>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Experiment tracker */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Experiment Tracker</h2>
          {best && (
            <span className="text-xs text-green-300 bg-green-900/20 border border-green-600/30 px-2 py-1 rounded">
              Best: {best.name} ({(best.accuracy * 100).toFixed(1)}%)
            </span>
          )}
        </div>
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-black/20">
                {["Run", "Model", "LR", "Batch", "Epochs", "Accuracy", "Loss", "Duration", "Status"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[var(--muted)] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EXPERIMENTS.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelectedExp(e.id)}
                  className={`border-b border-[var(--border)] cursor-pointer transition-colors ${
                    selectedExp === e.id ? "bg-brand-500/10" : "hover:bg-white/5"
                  } ${e.id === best?.id ? "border-l-2 border-l-green-500" : ""}`}
                >
                  <td className="px-3 py-2 text-white font-mono">{e.name}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">{e.model}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">{e.lr}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">{e.batch}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">{e.epochs}</td>
                  <td className="px-3 py-2">
                    {e.status === "completed" ? (
                      <span className={e.id === best?.id ? "text-green-300 font-semibold" : "text-white"}>
                        {(e.accuracy * 100).toFixed(1)}%
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--muted)]">{e.status === "completed" ? e.loss.toFixed(3) : "—"}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">{e.duration}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      e.status === "completed" ? "bg-green-900/30 text-green-300" :
                      e.status === "running" ? "bg-blue-900/30 text-blue-300" :
                      "bg-red-900/30 text-red-300"
                    }`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected && selected.status === "completed" && (
          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted)]">
            <span className="text-white font-medium">Selected: {selected.name}</span>
            {" — "}Accuracy <span className="text-white">{(selected.accuracy * 100).toFixed(1)}%</span>{" | "}
            Loss <span className="text-white">{selected.loss.toFixed(3)}</span>{" | "}
            {selected.model} with lr={selected.lr}, batch={selected.batch}
          </div>
        )}
      </div>

      {/* Key concepts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { term: "Experiment Tracking", def: "Log every run: code version, data version, hyperparams, metrics. MLflow and Weights & Biases are popular. Never re-run without logging — you'll lose reproducibility." },
          { term: "Feature Store", def: "Central repository for computed features — ensures training/serving consistency (training-serving skew is a top production ML bug). Feast and Tecton are common choices." },
          { term: "Model Monitoring", def: "Watch prediction distributions, latency, error rates, and business metrics in production. Set alerts for PSI > 0.25 or accuracy drops. Monitoring is as important as training." },
          { term: "Canary Deployment", def: "Route a small percentage of traffic (1–5%) to a new model version before full rollout. Compare metrics against the champion model with statistical significance before promoting." },
        ].map(({ term, def }) => (
          <div key={term} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <h3 className="text-xs font-semibold text-green-400 mb-1">{term}</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">{def}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
