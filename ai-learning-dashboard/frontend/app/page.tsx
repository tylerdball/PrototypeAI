"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const MODULES = [
  {
    title: "LLM Internals",
    description: "Explore tokenization, temperature effects, context windows, and hallucination. Live completion playground with adjustable parameters.",
    href: "/modules/llms",
    icon: "🧠",
    tags: ["Tokenization", "Temperature", "Context Window", "Sampling"],
    color: "from-blue-600/30 to-indigo-600/20",
    category: "fundamentals",
    liveAI: true,
  },
  {
    title: "RAG Pipeline",
    description: "Ingest documents, embed them into a vector store, retrieve relevant chunks, and generate grounded answers. Full end-to-end demo.",
    href: "/modules/rag",
    icon: "🔍",
    tags: ["Embeddings", "Vector Store", "Retrieval", "Grounding"],
    color: "from-purple-600/30 to-violet-600/20",
    category: "fundamentals",
    liveAI: true,
  },
  {
    title: "MLOps",
    description: "CI/CD for ML models, experiment tracking, deployment stages, and observability patterns for production ML systems.",
    href: "/modules/mlops",
    icon: "⚙️",
    tags: ["Pipelines", "Experiment Tracking", "Deployment", "Observability"],
    color: "from-green-600/30 to-emerald-600/20",
    category: "production",
    liveAI: false,
  },
  {
    title: "Model Drift",
    description: "Visualize data drift vs. concept drift with PSI and KL divergence metrics. Interactive simulation of distribution shift over time.",
    href: "/modules/model-drift",
    icon: "📉",
    tags: ["Data Drift", "Concept Drift", "PSI", "KL Divergence"],
    color: "from-yellow-600/30 to-amber-600/20",
    category: "production",
    liveAI: true,
  },
  {
    title: "Model Registry",
    description: "Versioning, staging, and production promotion workflows. Manage model lineage, metadata, and deployment state.",
    href: "/modules/model-registry",
    icon: "📦",
    tags: ["Versioning", "Staging", "Promotion", "Lineage"],
    color: "from-rose-600/30 to-pink-600/20",
    category: "production",
    liveAI: false,
  },
  {
    title: "AI Features",
    description: "Patterns for adding AI to existing apps: summarization, classification, extraction, and structured output. Live examples with your own text.",
    href: "/modules/ai-features",
    icon: "✨",
    tags: ["Summarization", "Classification", "Extraction", "Structured Output"],
    color: "from-cyan-600/30 to-sky-600/20",
    category: "patterns",
    liveAI: true,
  },
  {
    title: "Prompt Engineering",
    description: "Compare zero-shot, few-shot, and chain-of-thought prompting side by side. See how prompt structure changes model output on the same input.",
    href: "/modules/prompt-engineering",
    icon: "🎯",
    tags: ["Zero-Shot", "Few-Shot", "Chain-of-Thought", "Prompt Injection"],
    color: "from-orange-600/30 to-red-600/20",
    category: "patterns",
    liveAI: true,
  },
  {
    title: "Guardrails & Safety",
    description: "PII detection, content safety classification, prompt injection defense, and output sanitization. Four live demos of production AI safety patterns.",
    href: "/modules/guardrails",
    icon: "🛡️",
    tags: ["PII Detection", "Content Safety", "Prompt Injection", "Output Filtering"],
    color: "from-red-600/30 to-rose-600/20",
    category: "safety",
    liveAI: true,
  },
  {
    title: "Fine-tuning vs RAG",
    description: "When to inject knowledge via retrieval vs. baking it into model weights. Interactive decision helper and a live side-by-side comparison.",
    href: "/modules/finetuning-vs-rag",
    icon: "⚖️",
    tags: ["Fine-tuning", "RAG", "Knowledge Injection", "SFT"],
    color: "from-violet-600/30 to-purple-600/20",
    category: "patterns",
    liveAI: true,
  },
  {
    title: "AI Evaluation (Evals)",
    description: "BLEU scores, LLM-as-judge, and human eval patterns. Live BLEU calculator and an LLM judge that scores two responses head-to-head.",
    href: "/modules/evals",
    icon: "📊",
    tags: ["BLEU", "LLM-as-Judge", "Human Eval", "Regression Testing"],
    color: "from-teal-600/30 to-cyan-600/20",
    category: "production",
    liveAI: true,
  },
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "fundamentals", label: "Fundamentals" },
  { id: "patterns", label: "Patterns" },
  { id: "production", label: "Production" },
  { id: "safety", label: "Safety" },
  { id: "liveAI", label: "Live AI" },
];

type ViewMode = "grid" | "list";
type FilterId = typeof FILTERS[number]["id"];

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="3" rx="1" /><rect x="1" y="7" width="14" height="3" rx="1" />
      <rect x="1" y="12" width="14" height="3" rx="1" />
    </svg>
  );
}

export default function Home() {
  const [view, setView] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterId>("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dashboard-view") as ViewMode | null;
    if (saved === "grid" || saved === "list") setView(saved);
    setMounted(true);
  }, []);

  function switchView(v: ViewMode) {
    setView(v);
    localStorage.setItem("dashboard-view", v);
  }

  const filtered = MODULES.filter((m) => {
    if (filter === "all") return true;
    if (filter === "liveAI") return m.liveAI;
    return m.category === filter;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">AI Concepts Dashboard</h1>
        <p className="text-[var(--muted)] max-w-2xl">
          Hands-on, interactive deep-dives into the core concepts behind modern ML systems.
          Each module combines explanations with live AI features so you can see concepts in action.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filter === f.id
                  ? "bg-brand-500 border-brand-500 text-white"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-white/30"
              }`}
            >
              {f.label}
              {f.id !== "all" && (
                <span className="ml-1 opacity-60">
                  {f.id === "liveAI"
                    ? MODULES.filter((m) => m.liveAI).length
                    : MODULES.filter((m) => m.category === f.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* View toggle + count */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-[var(--muted)]">{filtered.length} module{filtered.length !== 1 ? "s" : ""}</span>
          {mounted && (
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
              <button
                onClick={() => switchView("grid")}
                title="Grid view"
                className={`p-2 transition-colors ${view === "grid" ? "bg-brand-500/20 text-brand-500" : "text-[var(--muted)] hover:text-white"}`}
              >
                <GridIcon />
              </button>
              <button
                onClick={() => switchView("list")}
                title="List view"
                className={`p-2 border-l border-[var(--border)] transition-colors ${view === "list" ? "bg-brand-500/20 text-brand-500" : "text-[var(--muted)] hover:text-white"}`}
              >
                <ListIcon />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modules */}
      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--muted)] py-8 text-center">No modules match this filter.</p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-brand-500/60 transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/10"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-xl bg-gradient-to-br ${m.color}`}>
                  {m.icon}
                </div>
                {m.liveAI && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500 border border-brand-500/20">Live AI</span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-brand-500 transition-colors">{m.title}</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed mb-3">{m.description}</p>
              <div className="flex flex-wrap gap-1">
                {m.tags.map((t) => (
                  <span key={t} className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 text-[var(--muted)] border border-white/10">{t}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)]">
          {filtered.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group flex items-center gap-4 px-4 py-3 bg-[var(--surface)] hover:bg-white/5 transition-colors"
            >
              <div className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-lg text-lg bg-gradient-to-br ${m.color}`}>
                {m.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-white group-hover:text-brand-500 transition-colors">{m.title}</span>
                  {m.liveAI && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500 border border-brand-500/20">Live AI</span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)] truncate">{m.description}</p>
              </div>
              <div className="hidden sm:flex shrink-0 flex-wrap gap-1 justify-end max-w-[200px]">
                {m.tags.slice(0, 2).map((t) => (
                  <span key={t} className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 text-[var(--muted)] border border-white/10">{t}</span>
                ))}
              </div>
              <svg className="shrink-0 w-4 h-4 text-[var(--muted)] group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-10 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4">
        <p className="text-sm text-yellow-200/80">
          <span className="font-semibold text-yellow-300">Setup:</span> Start the backend first —{" "}
          <code className="text-xs bg-black/30 px-1.5 py-0.5 rounded">cd backend && uvicorn main:app --reload --port 8000</code>.
          Configure <code className="text-xs bg-black/30 px-1.5 py-0.5 rounded">AI_PROVIDER</code> in <code className="text-xs bg-black/30 px-1.5 py-0.5 rounded">backend/.env</code>.
        </p>
      </div>
    </div>
  );
}
