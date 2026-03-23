"use client";

import { useState } from "react";
import Link from "next/link";
import { LiveDemo } from "@/components/LiveDemo";

const API = "/api/backend";

// Simple n-gram precision for BLEU (client-side, no deps)
function getNgrams(tokens: string[], n: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n).join(" ");
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
}

function bleuScore(reference: string, hypothesis: string): { bleu1: number; bleu2: number; precision: number; recall: number; f1: number } {
  const ref = reference.toLowerCase().split(/\s+/).filter(Boolean);
  const hyp = hypothesis.toLowerCase().split(/\s+/).filter(Boolean);
  if (!ref.length || !hyp.length) return { bleu1: 0, bleu2: 0, precision: 0, recall: 0, f1: 0 };

  // Unigram precision (BLEU-1)
  const refUnigrams = getNgrams(ref, 1);
  const hypUnigrams = getNgrams(hyp, 1);
  let matches1 = 0;
  for (const [gram, cnt] of hypUnigrams) {
    matches1 += Math.min(cnt, refUnigrams.get(gram) ?? 0);
  }
  const bleu1 = matches1 / hyp.length;

  // Bigram precision (BLEU-2)
  const refBigrams = getNgrams(ref, 2);
  const hypBigrams = getNgrams(hyp, 2);
  let matches2 = 0;
  for (const [gram, cnt] of hypBigrams) {
    matches2 += Math.min(cnt, refBigrams.get(gram) ?? 0);
  }
  const bleu2 = hypBigrams.size > 0 ? matches2 / hyp.length : 0;

  // Token-level precision/recall/F1
  const refSet = new Set(ref);
  const hypSet = new Set(hyp);
  const overlap = [...hypSet].filter((t) => refSet.has(t)).length;
  const precision = overlap / hypSet.size;
  const recall = overlap / refSet.size;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    bleu1: Math.round(bleu1 * 100) / 100,
    bleu2: Math.round(bleu2 * 100) / 100,
    precision: Math.round(precision * 100) / 100,
    recall: Math.round(recall * 100) / 100,
    f1: Math.round(f1 * 100) / 100,
  };
}

const JUDGE_CRITERIA = [
  { id: "accuracy", label: "Factual Accuracy" },
  { id: "completeness", label: "Completeness" },
  { id: "conciseness", label: "Conciseness" },
  { id: "clarity", label: "Clarity" },
];

const PRESET_PAIRS = [
  {
    label: "Summarization",
    reference: "Transformers use self-attention to process tokens in parallel, enabling better long-range dependencies than RNNs.",
    hypothesis: "The transformer architecture processes all tokens simultaneously using attention mechanisms, which helps capture relationships between distant words more effectively than recurrent networks.",
  },
  {
    label: "Q&A",
    reference: "RAG reduces hallucination by grounding model responses in retrieved documents.",
    hypothesis: "RAG helps reduce hallucinations.",
  },
];

export default function EvalsPage() {
  // BLEU section
  const [reference, setReference] = useState(PRESET_PAIRS[0].reference);
  const [hypothesis, setHypothesis] = useState(PRESET_PAIRS[0].hypothesis);
  const bleu = bleuScore(reference, hypothesis);

  // LLM-as-judge section
  const [responseA, setResponseA] = useState("Transformers use self-attention mechanisms to process sequences in parallel. Unlike RNNs, they don't process tokens sequentially, which allows for much faster training and better handling of long-range dependencies.");
  const [responseB, setResponseB] = useState("Transformers are a type of neural network. They are used in language models.");
  const [judgeQuestion, setJudgeQuestion] = useState("Explain how transformers differ from RNNs.");
  const [judgeResult, setJudgeResult] = useState("");
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [judgeError, setJudgeError] = useState("");

  async function runJudge() {
    setJudgeLoading(true);
    setJudgeError("");
    try {
      const res = await fetch(`${API}/llm/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `You are evaluating two AI responses to the same question.

Question: "${judgeQuestion}"

Response A:
"${responseA}"

Response B:
"${responseB}"

Evaluate both responses on: accuracy, completeness, conciseness, and clarity.
Return JSON: {
  "winner": "A" | "B" | "TIE",
  "scores": {
    "A": {"accuracy": 1-5, "completeness": 1-5, "conciseness": 1-5, "clarity": 1-5},
    "B": {"accuracy": 1-5, "completeness": 1-5, "conciseness": 1-5, "clarity": 1-5}
  },
  "reasoning": "...",
  "strengths_A": "...",
  "strengths_B": "...",
  "weaknesses_A": "...",
  "weaknesses_B": "..."
}`,
          system: "You are an expert AI evaluator. Be objective and critical. Always return valid JSON.",
          temperature: 0.1,
          max_tokens: 600,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setJudgeResult(data.text);
    } catch (e: any) {
      setJudgeError(e.message);
    } finally {
      setJudgeLoading(false);
    }
  }

  let judgeData: any = null;
  if (judgeResult) {
    try {
      const m = judgeResult.match(/\{[\s\S]*\}/);
      if (m) judgeData = JSON.parse(m[0]);
    } catch {}
  }

  function scoreColor(score: number): string {
    if (score >= 4) return "text-green-300";
    if (score >= 3) return "text-yellow-300";
    return "text-red-300";
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <Link href="/" className="text-xs text-[var(--muted)] hover:text-white">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mt-2 mb-1">AI Evaluation (Evals)</h1>
        <p className="text-[var(--muted)]">How to measure whether your LLM app is actually good — reference-based metrics and LLM-as-judge.</p>
      </div>

      {/* Concept overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { term: "Reference-based", icon: "📐", def: "Compare model output to a human-written gold standard. BLEU, ROUGE, METEOR. Fast and cheap, but requires labeled data and punishes valid paraphrases." },
          { term: "LLM-as-Judge", icon: "⚖️", def: "Use a capable LLM to score or rank model outputs. No labeled data needed. Flexible criteria. Risk: judge model can share the same biases as the model being evaluated." },
          { term: "Human Eval", icon: "👤", def: "The gold standard. Humans rate outputs on criteria like helpfulness, accuracy, harmlessness. Expensive and slow but necessary for high-stakes deployments." },
        ].map(({ term, icon, def }) => (
          <div key={term} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="text-xl mb-1">{icon}</div>
            <h3 className="text-xs font-semibold text-brand-500 mb-1">{term}</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">{def}</p>
          </div>
        ))}
      </div>

      {/* BLEU / reference-based */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Reference-Based Metrics (BLEU / Token Overlap)</h2>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-sm font-medium text-white">BLEU Score Calculator</span>
            <div className="flex gap-2">
              {PRESET_PAIRS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setReference(p.reference); setHypothesis(p.hypothesis); }}
                  className="text-xs px-2 py-0.5 rounded border border-[var(--border)] text-[var(--muted)] hover:text-white transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--muted)] block mb-1">Reference (human gold standard)</label>
                <textarea
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] block mb-1">Hypothesis (model output)</label>
                <textarea
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "BLEU-1", value: bleu.bleu1, desc: "Unigram precision" },
                { label: "BLEU-2", value: bleu.bleu2, desc: "Bigram precision" },
                { label: "Precision", value: bleu.precision, desc: "Unique token overlap" },
                { label: "Recall", value: bleu.recall, desc: "Reference coverage" },
                { label: "F1", value: bleu.f1, desc: "Harmonic mean" },
              ].map(({ label, value, desc }) => (
                <div key={label} className="rounded-lg border border-[var(--border)] bg-black/20 p-3 text-center">
                  <p className={`text-xl font-bold ${value >= 0.6 ? "text-green-300" : value >= 0.3 ? "text-yellow-300" : "text-red-300"}`}>
                    {value.toFixed(2)}
                  </p>
                  <p className="text-xs font-semibold text-white mt-0.5">{label}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{desc}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-[var(--muted)]">
              Scores update live as you type. BLEU &gt; 0.6 = good overlap. These metrics penalize valid paraphrases — a response can be excellent but score low if worded differently than the reference.
            </p>
          </div>
        </div>
      </div>

      {/* LLM-as-judge */}
      <LiveDemo title="⚖️ LLM-as-Judge" badge="Live AI">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Question being evaluated</label>
            <input
              value={judgeQuestion}
              onChange={(e) => setJudgeQuestion(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-blue-300 block mb-1">Response A</label>
              <textarea
                value={responseA}
                onChange={(e) => setResponseA(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-blue-500/30 bg-blue-900/10 px-3 py-2 text-sm text-white focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-purple-300 block mb-1">Response B</label>
              <textarea
                value={responseB}
                onChange={(e) => setResponseB(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-purple-500/30 bg-purple-900/10 px-3 py-2 text-sm text-white focus:outline-none resize-none"
              />
            </div>
          </div>

          {judgeError && <p className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{judgeError}</p>}

          <button
            onClick={runJudge}
            disabled={judgeLoading}
            className="px-4 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {judgeLoading ? "Judging..." : "Run Evaluation"}
          </button>

          {judgeData && (
            <div className="space-y-3">
              {/* Winner banner */}
              <div className={`rounded-lg border p-3 text-center ${
                judgeData.winner === "A" ? "border-blue-500/40 bg-blue-900/10" :
                judgeData.winner === "B" ? "border-purple-500/40 bg-purple-900/10" :
                "border-yellow-500/40 bg-yellow-900/10"
              }`}>
                <p className="text-sm font-semibold text-white">
                  Winner: <span className={judgeData.winner === "A" ? "text-blue-300" : judgeData.winner === "B" ? "text-purple-300" : "text-yellow-300"}>
                    {judgeData.winner === "TIE" ? "Tie" : `Response ${judgeData.winner}`}
                  </span>
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">{judgeData.reasoning}</p>
              </div>

              {/* Score table */}
              {judgeData.scores && (
                <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-black/20">
                        <th className="text-left px-3 py-2 text-[var(--muted)]">Criterion</th>
                        <th className="text-center px-3 py-2 text-blue-300">Response A</th>
                        <th className="text-center px-3 py-2 text-purple-300">Response B</th>
                      </tr>
                    </thead>
                    <tbody>
                      {JUDGE_CRITERIA.map(({ id, label }) => (
                        <tr key={id} className="border-b border-[var(--border)]">
                          <td className="px-3 py-2 text-white">{label}</td>
                          <td className={`px-3 py-2 text-center font-bold ${scoreColor(judgeData.scores.A?.[id])}`}>
                            {judgeData.scores.A?.[id] ?? "—"}/5
                          </td>
                          <td className={`px-3 py-2 text-center font-bold ${scoreColor(judgeData.scores.B?.[id])}`}>
                            {judgeData.scores.B?.[id] ?? "—"}/5
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-blue-500/20 p-3">
                  <p className="text-blue-300 font-medium mb-1">A strengths</p>
                  <p className="text-[var(--muted)]">{judgeData.strengths_A}</p>
                  {judgeData.weaknesses_A && <p className="text-[var(--muted)] mt-1 italic">{judgeData.weaknesses_A}</p>}
                </div>
                <div className="rounded-lg border border-purple-500/20 p-3">
                  <p className="text-purple-300 font-medium mb-1">B strengths</p>
                  <p className="text-[var(--muted)]">{judgeData.strengths_B}</p>
                  {judgeData.weaknesses_B && <p className="text-[var(--muted)] mt-1 italic">{judgeData.weaknesses_B}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </LiveDemo>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { term: "Eval-Driven Development", def: "Build your eval suite before optimizing. Define what 'good' means first — pick 20–50 representative inputs, write expected outputs, then iterate on prompts/models until scores improve." },
          { term: "LLM-Judge Bias", def: "LLMs tend to prefer verbose, confident-sounding answers. They can also be biased toward responses that look like their own training data. Always validate judge scores against human ratings on a sample." },
          { term: "When BLEU Breaks Down", def: "BLEU was designed for translation. For open-ended generation, a response can be perfect but score near zero if worded differently. Use semantic similarity (embedding cosine) as a complement." },
          { term: "Regression Testing", def: "Every prompt change is a potential regression. Keep a fixed eval set and run it on every change. Flag if any metric drops > 5%. Treat evals like unit tests for your AI system." },
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
