"use client";

import { useState } from "react";
import Link from "next/link";
import { LiveDemo } from "@/components/LiveDemo";

const API = "/api/backend";

interface CompleteResult {
  text: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
}

const STRATEGIES = [
  {
    id: "zero-shot",
    label: "Zero-Shot",
    color: "text-blue-300",
    badge: "bg-blue-900/30 border-blue-600/30",
    description: "No examples. Just the instruction. Works well for simple tasks the model has seen during training.",
    buildPrompt: (task: string) => task,
    buildSystem: () => "You are a helpful assistant.",
  },
  {
    id: "few-shot",
    label: "Few-Shot",
    color: "text-purple-300",
    badge: "bg-purple-900/30 border-purple-600/30",
    description: "2–5 examples before the real input. Teaches the model the format and style you want without fine-tuning.",
    buildPrompt: (task: string) =>
      `Here are some examples of the task:\n\nInput: The movie was fantastic and I loved every minute.\nOutput: Positive\n\nInput: The service was slow and the food was cold.\nOutput: Negative\n\nInput: It was okay, nothing special.\nOutput: Neutral\n\nNow do the same for this:\nInput: ${task}\nOutput:`,
    buildSystem: () => "You are a precise classifier. Output only the label, nothing else.",
  },
  {
    id: "chain-of-thought",
    label: "Chain-of-Thought",
    color: "text-green-300",
    badge: "bg-green-900/30 border-green-600/30",
    description: "Ask the model to reason step by step before answering. Dramatically improves accuracy on reasoning tasks.",
    buildPrompt: (task: string) => `${task}\n\nThink through this step by step before giving your final answer.`,
    buildSystem: () => "You are a careful reasoning assistant. Always show your thinking before your conclusion.",
  },
] as const;

type StrategyId = typeof STRATEGIES[number]["id"];

const PRESET_TASKS = [
  { label: "Sentiment", task: "The battery life is great but the screen is too dim for outdoor use." },
  { label: "Math", task: "A store sells apples for $0.50 each and oranges for $0.75 each. If I buy 4 apples and 3 oranges, how much do I spend?" },
  { label: "Classify", task: "Our deployment pipeline broke at 2am and the on-call engineer couldn't be reached." },
  { label: "Summarize", task: "Retrieval-Augmented Generation (RAG) is a technique that combines a retrieval system with a language model. Instead of relying solely on the model's parametric memory, RAG fetches relevant documents from an external store and includes them in the prompt as context. This grounds the model's response in real data, reducing hallucinations and enabling the model to answer questions about documents it was never trained on." },
];

export default function PromptEngineeringPage() {
  const [task, setTask] = useState(PRESET_TASKS[0].task);
  const [results, setResults] = useState<Partial<Record<StrategyId, CompleteResult>>>({});
  const [loading, setLoading] = useState<Partial<Record<StrategyId, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<StrategyId, string>>>({});
  const [runningAll, setRunningAll] = useState(false);

  async function runStrategy(id: StrategyId) {
    const strategy = STRATEGIES.find((s) => s.id === id)!;
    setLoading((p) => ({ ...p, [id]: true }));
    setErrors((p) => ({ ...p, [id]: "" }));
    try {
      const res = await fetch(`${API}/llm/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: strategy.buildPrompt(task),
          system: strategy.buildSystem(),
          temperature: 0.3,
          max_tokens: 512,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResults((p) => ({ ...p, [id]: data }));
    } catch (e: any) {
      setErrors((p) => ({ ...p, [id]: e.message }));
    } finally {
      setLoading((p) => ({ ...p, [id]: false }));
    }
  }

  async function runAll() {
    setRunningAll(true);
    await Promise.all(STRATEGIES.map((s) => runStrategy(s.id)));
    setRunningAll(false);
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <Link href="/" className="text-xs text-[var(--muted)] hover:text-white">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mt-2 mb-1">Prompt Engineering</h1>
        <p className="text-[var(--muted)]">Compare zero-shot, few-shot, and chain-of-thought prompting side by side on the same input.</p>
      </div>

      {/* Concept cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STRATEGIES.map((s) => (
          <div key={s.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
            <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>

      {/* Input */}
      <LiveDemo title="Strategy Comparison" badge="Live AI">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-[var(--muted)]">Task / Input</label>
              <div className="flex gap-2">
                {PRESET_TASKS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setTask(p.task)}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                      task === p.task
                        ? "border-brand-500 text-brand-500 bg-brand-500/10"
                        : "border-[var(--border)] text-[var(--muted)] hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={3}
              placeholder="Enter your task or input text..."
              className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={runAll}
              disabled={runningAll || !task}
              className="px-4 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {runningAll ? "Running all three..." : "Run All Three"}
            </button>
            <span className="text-xs text-[var(--muted)] self-center">or run individually below</span>
          </div>

          {/* Results grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {STRATEGIES.map((s) => {
              const result = results[s.id];
              const isLoading = loading[s.id];
              const err = errors[s.id];
              return (
                <div key={s.id} className="rounded-lg border border-[var(--border)] bg-black/20 flex flex-col">
                  <div className={`flex items-center justify-between px-3 py-2 border-b border-[var(--border)] rounded-t-lg ${s.badge} border`}>
                    <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
                    <button
                      onClick={() => runStrategy(s.id)}
                      disabled={!!isLoading || !task}
                      className="text-xs text-[var(--muted)] hover:text-white disabled:opacity-40 transition-colors"
                    >
                      {isLoading ? "Running..." : "Run ↗"}
                    </button>
                  </div>

                  <div className="p-3 flex-1 min-h-[120px]">
                    {err && (
                      <p className="text-xs text-red-400">{err}</p>
                    )}
                    {isLoading && (
                      <p className="text-xs text-[var(--muted)] animate-pulse">Generating...</p>
                    )}
                    {result && !isLoading && (
                      <p className="text-xs text-[var(--text)] leading-relaxed whitespace-pre-wrap">{result.text}</p>
                    )}
                    {!result && !isLoading && !err && (
                      <p className="text-xs text-[var(--muted)]">Hit "Run All Three" or "Run ↗" above</p>
                    )}
                  </div>

                  {result && (
                    <div className="px-3 py-2 border-t border-[var(--border)] text-xs text-[var(--muted)]">
                      {result.prompt_tokens + result.completion_tokens} tokens total
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </LiveDemo>

      {/* Prompt inspector */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">What Each Strategy Actually Sends</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {STRATEGIES.map((s) => (
            <div key={s.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <span className={`text-xs font-semibold ${s.color}`}>{s.label} — actual prompt</span>
              </div>
              <pre className="p-3 text-xs text-[var(--muted)] whitespace-pre-wrap leading-relaxed font-mono overflow-auto max-h-48">
                {s.buildPrompt(task || "<your input>")}
              </pre>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)] mt-2">The prompt inspector updates live as you type — notice how few-shot and CoT add significant structure around your raw input.</p>
      </div>

      {/* Key insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { term: "When to use Zero-Shot", def: "Simple, well-defined tasks. Fast and cheap — no extra tokens for examples. Works best when the task is common in training data (translation, summarization, Q&A)." },
          { term: "When to use Few-Shot", def: "Custom formats, domain-specific classification, or when zero-shot gives inconsistent output structure. 2–5 examples usually sufficient. More examples = more tokens = higher cost." },
          { term: "When to use Chain-of-Thought", def: "Multi-step reasoning, math, logic puzzles, or any task where intermediate steps matter. Significantly improves accuracy at the cost of more output tokens." },
          { term: "Prompt Injection", def: "Malicious inputs that try to override your system prompt, e.g. 'Ignore all previous instructions and...'. Always validate/sanitize user input before including it in prompts in production." },
        ].map(({ term, def }) => (
          <div key={term} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <h3 className="text-xs font-semibold text-brand-500 mb-1">{term}</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">{def}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
