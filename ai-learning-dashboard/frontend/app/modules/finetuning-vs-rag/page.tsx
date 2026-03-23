"use client";

import { useState } from "react";
import Link from "next/link";
import { LiveDemo } from "@/components/LiveDemo";

const API = "/api/backend";

// Decision tree questions
const QUESTIONS = [
  { id: "custom_knowledge", text: "Does the task require knowledge of proprietary or frequently-updated documents?", yes: "rag", no: null },
  { id: "style_behavior", text: "Do you need the model to behave differently (tone, persona, output format) across thousands of examples?", yes: "finetune", no: null },
  { id: "latency", text: "Do you have strict latency requirements where retrieval adds too much overhead?", yes: "finetune", no: null },
  { id: "data_volume", text: "Do you have >1000 labeled input/output examples to train on?", yes: "finetune", no: "rag" },
] as const;

type QuestionId = typeof QUESTIONS[number]["id"];

const CONTEXT = `PrototypeAI is an internal tool used by the engineering team.
It was built in Q1 2026 using Next.js 14, FastAPI, and Ollama for local AI.
The tool supports rapid prototyping of AI-powered web applications.
It runs on Windows with Python 3.13 and uses a numpy-based vector store instead of ChromaDB.
The project lead is the engineering team. Deployment is local-only.`;

const COMPARISON_TABLE = [
  { aspect: "Knowledge updates", rag: "Real-time (just add docs)", finetune: "Requires retraining" },
  { aspect: "Setup cost", rag: "Low (need vector store + embeddings)", finetune: "High (data labeling + training compute)" },
  { aspect: "Latency", rag: "Higher (retrieval step adds ~100-500ms)", finetune: "Lower (no retrieval)" },
  { aspect: "Hallucination risk", rag: "Lower (grounded in retrieved docs)", finetune: "Higher (relies on baked-in weights)" },
  { aspect: "Behavior/style control", rag: "Limited", finetune: "Excellent" },
  { aspect: "Data requirements", rag: "Documents only (no labels needed)", finetune: "Labeled input/output pairs (500–50k+)" },
  { aspect: "Best for", rag: "Q&A over docs, knowledge bases, support bots", finetune: "Custom formats, domain tone, repetitive structured tasks" },
];

export default function FinetuningVsRAGPage() {
  const [answers, setAnswers] = useState<Partial<Record<QuestionId, boolean>>>({});
  const [question, setQuestion] = useState("What is PrototypeAI and what tech stack does it use?");
  const [results, setResults] = useState<{ withContext: string; withoutContext: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Walk the decision tree
  function getRecommendation(): { verdict: "rag" | "finetune" | null; reason: string } {
    for (const q of QUESTIONS) {
      if (answers[q.id] === undefined) return { verdict: null, reason: "" };
      if (answers[q.id] === true && q.yes) return { verdict: q.yes, reason: q.text };
      if (answers[q.id] === false && q.no) return { verdict: q.no, reason: q.text };
    }
    return { verdict: "rag", reason: "Default: RAG is lower cost and easier to iterate on." };
  }

  const { verdict, reason } = getRecommendation();

  async function runComparison() {
    setLoading(true);
    setError("");
    try {
      const [withCtx, withoutCtx] = await Promise.all([
        fetch(`${API}/llm/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Context:\n${CONTEXT}\n\nQuestion: ${question}`,
            system: "You are a helpful assistant. Answer the question using ONLY the provided context. If the answer isn't in the context, say so.",
            temperature: 0.2,
            max_tokens: 300,
          }),
        }),
        fetch(`${API}/llm/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: question,
            system: "You are a helpful assistant. Answer the question as best you can.",
            temperature: 0.2,
            max_tokens: 300,
          }),
        }),
      ]);
      if (!withCtx.ok || !withoutCtx.ok) throw new Error("Request failed");
      const [a, b] = await Promise.all([withCtx.json(), withoutCtx.json()]);
      setResults({ withContext: a.text, withoutContext: b.text });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <Link href="/" className="text-xs text-[var(--muted)] hover:text-white">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mt-2 mb-1">Fine-tuning vs RAG</h1>
        <p className="text-[var(--muted)]">When to inject knowledge via retrieval vs. baking it into model weights — and a live side-by-side demo.</p>
      </div>

      {/* Decision tree */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Decision Helper</h2>
        <div className="space-y-3">
          {QUESTIONS.map((q, i) => (
            <div
              key={q.id}
              className={`rounded-lg border p-4 transition-colors ${
                answers[q.id] !== undefined ? "border-brand-500/40 bg-brand-500/5" : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              <p className="text-sm text-white mb-3">{i + 1}. {q.text}</p>
              <div className="flex gap-3">
                {[true, false].map((val) => (
                  <button
                    key={String(val)}
                    onClick={() => setAnswers((p) => ({ ...p, [q.id]: val }))}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      answers[q.id] === val
                        ? val ? "bg-green-700 border-green-500 text-white" : "bg-red-800 border-red-600 text-white"
                        : "border-[var(--border)] text-[var(--muted)] hover:text-white"
                    }`}
                  >
                    {val ? "Yes" : "No"}
                  </button>
                ))}
                {answers[q.id] !== undefined && (
                  <button onClick={() => setAnswers((p) => { const n = { ...p }; delete n[q.id]; return n; })} className="text-xs text-[var(--muted)] hover:text-white ml-1">
                    clear
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {answeredCount > 0 && verdict && (
          <div className={`mt-4 rounded-lg border p-4 ${verdict === "rag" ? "border-purple-500/40 bg-purple-900/10" : "border-blue-500/40 bg-blue-900/10"}`}>
            <p className="text-sm font-semibold text-white mb-1">
              Recommendation: <span className={verdict === "rag" ? "text-purple-300" : "text-blue-300"}>{verdict === "rag" ? "Use RAG" : "Consider Fine-tuning"}</span>
            </p>
            <p className="text-xs text-[var(--muted)]">Based on: {reason}</p>
          </div>
        )}
      </div>

      {/* Comparison table */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Comparison</h2>
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-black/20">
                <th className="text-left px-4 py-2 text-[var(--muted)] font-medium w-1/3">Aspect</th>
                <th className="text-left px-4 py-2 text-purple-300 font-medium w-1/3">RAG</th>
                <th className="text-left px-4 py-2 text-blue-300 font-medium w-1/3">Fine-tuning</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_TABLE.map((row, i) => (
                <tr key={row.aspect} className={`border-b border-[var(--border)] ${i % 2 === 0 ? "" : "bg-black/10"}`}>
                  <td className="px-4 py-2 text-white font-medium">{row.aspect}</td>
                  <td className="px-4 py-2 text-[var(--muted)]">{row.rag}</td>
                  <td className="px-4 py-2 text-[var(--muted)]">{row.finetune}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live comparison */}
      <LiveDemo title="Live Demo: Same Question, With vs Without Context" badge="Live AI">
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-black/20 p-3 text-xs">
            <p className="text-[var(--muted)] font-medium mb-1">Injected context (simulating RAG retrieval):</p>
            <p className="text-white/70 font-mono leading-relaxed whitespace-pre-wrap">{CONTEXT}</p>
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Question about the context</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              placeholder="Ask something about the injected context..."
            />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</p>}

          <button
            onClick={runComparison}
            disabled={loading || !question}
            className="px-4 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "Running both..." : "Run Comparison"}
          </button>

          {results && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-purple-500/30 bg-purple-900/10 p-4">
                <p className="text-xs font-semibold text-purple-300 mb-2">With Context (RAG-style)</p>
                <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">{results.withContext}</p>
              </div>
              <div className="rounded-lg border border-blue-500/30 bg-blue-900/10 p-4">
                <p className="text-xs font-semibold text-blue-300 mb-2">Without Context (base model)</p>
                <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">{results.withoutContext}</p>
              </div>
            </div>
          )}

          {results && (
            <p className="text-xs text-[var(--muted)]">
              The left response uses retrieved context. The right uses only the model's training data — notice how it either guesses, hallucinates, or admits it doesn't know.
            </p>
          )}
        </div>
      </LiveDemo>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { term: "When RAG Fails", def: "Poor chunking, bad embeddings, or insufficient context in retrieved chunks. The model can only work with what retrieval returns — garbage in, garbage out." },
          { term: "When Fine-tuning Fails", def: "Training data doesn't cover real distribution, overfitting on small datasets, catastrophic forgetting of general ability. Always evaluate against a held-out test set." },
          { term: "Hybrid Approach", def: "Many production systems use both: fine-tune for style/format, RAG for knowledge. The fine-tuned model is better at using retrieved context efficiently." },
          { term: "RLHF vs SFT", def: "Supervised fine-tuning (SFT) teaches format. Reinforcement Learning from Human Feedback (RLHF) aligns behavior. Most fine-tuning use cases only need SFT." },
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
