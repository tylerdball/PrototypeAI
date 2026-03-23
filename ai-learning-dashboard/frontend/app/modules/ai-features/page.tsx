"use client";

import { useState } from "react";
import Link from "next/link";
import { LiveDemo } from "@/components/LiveDemo";

const API = "/api/backend";

type PatternKey = "summarize" | "classify" | "extract" | "structured";

const PATTERNS: { key: PatternKey; label: string; icon: string; system: string; placeholder: string; defaultInput: string }[] = [
  {
    key: "summarize",
    label: "Summarization",
    icon: "📝",
    system: "You are a precise summarizer. Summarize the given text in 2-3 concise bullet points. Use • for bullets.",
    placeholder: "Paste any text to summarize...",
    defaultInput: "Transformer models have revolutionized NLP since the 2017 'Attention is All You Need' paper. Unlike RNNs, transformers process all tokens in parallel using self-attention mechanisms that learn which parts of the input to focus on. BERT introduced bidirectional pre-training, while GPT models use unidirectional autoregressive training. Modern LLMs like GPT-4 and Claude scale transformers to hundreds of billions of parameters trained on vast internet corpora, enabling few-shot and zero-shot learning across diverse tasks.",
  },
  {
    key: "classify",
    label: "Classification",
    icon: "🏷️",
    system: 'You are a text classifier. Classify the sentiment as POSITIVE, NEGATIVE, or NEUTRAL, and the topic (1-3 words). Respond in JSON: {"sentiment": "...", "topic": "...", "confidence": 0.0-1.0, "reason": "..."}',
    placeholder: "Enter text to classify...",
    defaultInput: "The new RAG implementation significantly reduced hallucinations in our customer-facing chatbot, but the latency increase of 400ms per query is concerning for real-time use cases.",
  },
  {
    key: "extract",
    label: "Information Extraction",
    icon: "🔎",
    system: 'Extract key entities and facts from the text. Return JSON with arrays: {"people": [], "organizations": [], "dates": [], "metrics": [], "key_facts": []}',
    placeholder: "Enter text to extract from...",
    defaultInput: "On March 15 2024, Anthropic released Claude 3, which achieved 86.8% on MMLU and outperformed GPT-4 on the majority of benchmarks tested. The model was evaluated by independent researchers at MIT and Stanford. The Opus tier scored 90.9% on MMLU.",
  },
  {
    key: "structured",
    label: "Structured Output",
    icon: "📋",
    system: 'Convert the job description into a structured JSON object with fields: {"title": "", "seniority": "Junior|Mid|Senior|Staff", "required_skills": [], "nice_to_have": [], "years_experience": 0, "remote": true|false}',
    placeholder: "Paste a job description...",
    defaultInput: "Senior ML Engineer (Remote) — We're looking for an ML engineer with 5+ years of experience to join our platform team. Must have: Python, PyTorch, MLOps experience (MLflow or Kubeflow), and experience serving models at scale. Nice to have: Rust, CUDA, distributed training. You'll own the model serving infrastructure and work closely with research scientists.",
  },
];

export default function AIFeaturesPage() {
  const [activePattern, setActivePattern] = useState<PatternKey>("summarize");
  const [inputs, setInputs] = useState<Record<PatternKey, string>>(
    Object.fromEntries(PATTERNS.map((p) => [p.key, p.defaultInput])) as Record<PatternKey, string>
  );
  const [results, setResults] = useState<Record<PatternKey, string>>({} as any);
  const [loading, setLoading] = useState<Record<PatternKey, boolean>>({} as any);
  const [error, setError] = useState("");

  const pattern = PATTERNS.find((p) => p.key === activePattern)!;

  async function runPattern() {
    setLoading((prev) => ({ ...prev, [activePattern]: true }));
    setError("");
    try {
      const res = await fetch(`${API}/llm/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: inputs[activePattern],
          system: pattern.system,
          temperature: 0.2,
          max_tokens: 512,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResults((prev) => ({ ...prev, [activePattern]: data.text }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading((prev) => ({ ...prev, [activePattern]: false }));
    }
  }

  const result = results[activePattern];
  const isLoading = loading[activePattern];

  // Try to parse JSON for display
  let parsedJSON: any = null;
  if (result) {
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsedJSON = JSON.parse(jsonMatch[0]);
    } catch {}
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/" className="text-xs text-[var(--muted)] hover:text-white">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mt-2 mb-1">AI Features</h1>
        <p className="text-[var(--muted)]">Battle-tested patterns for adding AI capabilities to existing applications.</p>
      </div>

      {/* Pattern intro cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PATTERNS.map((p) => (
          <button
            key={p.key}
            onClick={() => setActivePattern(p.key)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              activePattern === p.key
                ? "border-cyan-500/60 bg-cyan-900/20"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-white/20"
            }`}
          >
            <div className="text-xl mb-1">{p.icon}</div>
            <div className="text-xs font-semibold text-white">{p.label}</div>
          </button>
        ))}
      </div>

      {/* Architecture note */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted)] leading-relaxed">
        <span className="text-cyan-400 font-semibold">Pattern: </span>
        All four patterns use the same <code className="bg-black/30 px-1 rounded">/llm/complete</code> endpoint — the only thing that changes is the <span className="text-white">system prompt</span>.
        This is the key insight: most AI features are just careful prompt engineering on top of a general-purpose LLM. The system prompt defines the "feature".
      </div>

      {/* System prompt display */}
      <div className="rounded-lg border border-[var(--border)] bg-black/20 p-3">
        <p className="text-xs text-[var(--muted)] font-medium mb-1.5">System Prompt for {pattern.label}:</p>
        <p className="text-xs text-cyan-200/80 font-mono leading-relaxed">{pattern.system}</p>
      </div>

      {/* Live demo */}
      <LiveDemo title={`${pattern.icon} ${pattern.label} — Live Demo`} badge="Live AI">
        <div className="space-y-3">
          <textarea
            value={inputs[activePattern]}
            onChange={(e) => setInputs((prev) => ({ ...prev, [activePattern]: e.target.value }))}
            rows={5}
            placeholder={pattern.placeholder}
            className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:border-cyan-500 resize-none"
          />

          {error && <p className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</p>}

          <button
            onClick={runPattern}
            disabled={isLoading || !inputs[activePattern]}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Running..." : `Run ${pattern.label}`}
          </button>

          {result && (
            <div>
              <p className="text-xs text-[var(--muted)] mb-2 font-medium">Output:</p>
              {parsedJSON ? (
                <pre className="rounded-lg bg-black/40 border border-[var(--border)] p-4 text-xs text-cyan-200 overflow-x-auto">
                  {JSON.stringify(parsedJSON, null, 2)}
                </pre>
              ) : (
                <div className="rounded-lg bg-black/40 border border-[var(--border)] p-4 text-sm text-white whitespace-pre-wrap leading-relaxed">
                  {result}
                </div>
              )}
            </div>
          )}
        </div>
      </LiveDemo>

      {/* When to use */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { title: "When to use AI features", items: ["Unstructured text processing at scale", "Tasks where rules/regex are too brittle", "Handling linguistic variation and context", "One-shot extraction without custom models"] },
          { title: "When NOT to use AI features", items: ["Latency < 100ms required (LLMs are slow)", "Extreme accuracy needed (use fine-tuned models)", "Simple structured data (use a database query)", "When cost per call doesn't justify the value"] },
        ].map(({ title, items }) => (
          <div key={title} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="text-xs font-semibold text-white mb-2">{title}</h3>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item} className="text-xs text-[var(--muted)] flex items-start gap-1.5">
                  <span className="mt-0.5 text-cyan-500">•</span>{item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
