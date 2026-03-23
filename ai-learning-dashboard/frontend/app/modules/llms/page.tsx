"use client";

import { useState } from "react";
import Link from "next/link";
import { LiveDemo } from "@/components/LiveDemo";

const API = "/api/backend";

interface TokenizeResult {
  tokens: string[];
  token_ids: number[];
  count: number;
}

interface CompleteResult {
  text: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
}

export default function LLMsPage() {
  const [tokenText, setTokenText] = useState("Hello, how are you doing today?");
  const [tokenResult, setTokenResult] = useState<TokenizeResult | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  const [prompt, setPrompt] = useState("Explain what a transformer architecture is in 2 sentences.");
  const [system, setSystem] = useState("You are a concise ML educator.");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(256);
  const [completeResult, setCompleteResult] = useState<CompleteResult | null>(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [error, setError] = useState("");

  async function runTokenize() {
    setTokenLoading(true);
    try {
      const res = await fetch(`${API}/llm/tokenize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: tokenText }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTokenResult(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTokenLoading(false);
    }
  }

  async function runComplete() {
    setCompleteLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/llm/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, system, temperature, max_tokens: maxTokens }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCompleteResult(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCompleteLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/" className="text-xs text-[var(--muted)] hover:text-white">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mt-2 mb-1">LLM Internals</h1>
        <p className="text-[var(--muted)]">Tokenization, temperature, context windows, and sampling — demystified.</p>
      </div>

      {/* Concepts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { term: "Tokenization", def: "Text is split into sub-word tokens before the model sees it. 'Hello' might be 1 token; 'tokenization' might be 3. Models have fixed context windows measured in tokens, not words." },
          { term: "Temperature", def: "Controls randomness in sampling. Temperature=0 → greedy (most likely token always chosen). Temperature=1 → standard sampling. Temperature>1 → more random/creative outputs." },
          { term: "Context Window", def: "The maximum number of tokens the model can attend to at once — both prompt + output. Modern LLMs range from 4K to 200K+ tokens. Beyond the window, information is lost." },
          { term: "Hallucination", def: "When a model generates plausible-sounding but incorrect information. Occurs because models predict likely next tokens, not 'true' facts. Mitigated by RAG, lower temperature, and grounding." },
        ].map(({ term, def }) => (
          <div key={term} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="text-sm font-semibold text-brand-500 mb-1">{term}</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">{def}</p>
          </div>
        ))}
      </div>

      {/* Tokenizer demo */}
      <LiveDemo title="Tokenizer Visualization" badge="Live">
        <div className="space-y-3">
          <textarea
            value={tokenText}
            onChange={(e) => setTokenText(e.target.value)}
            rows={2}
            placeholder="Enter text to tokenize..."
            className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:border-brand-500 resize-none"
          />
          <button
            onClick={runTokenize}
            disabled={tokenLoading || !tokenText}
            className="px-4 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {tokenLoading ? "Tokenizing..." : "Tokenize"}
          </button>
          {tokenResult && (
            <div>
              <p className="text-xs text-[var(--muted)] mb-2">
                <span className="text-white font-semibold">{tokenResult.count}</span> tokens — each color = one token
              </p>
              <div className="flex flex-wrap gap-1">
                {tokenResult.tokens.map((tok, i) => (
                  <span
                    key={i}
                    title={`ID: ${tokenResult.token_ids[i]}`}
                    className="token-chip text-xs px-1.5 py-0.5 rounded font-mono cursor-help"
                  >
                    {tok.replace(/ /g, "·")}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)] mt-2">Hover tokens to see their integer IDs (cl100k_base encoding)</p>
            </div>
          )}
        </div>
      </LiveDemo>

      {/* Completion playground */}
      <LiveDemo title="Completion Playground" badge="Live AI">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">System Prompt</label>
              <textarea
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">User Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">
                Temperature: <span className="text-white">{temperature}</span>
              </label>
              <input
                type="range" min={0} max={2} step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-xs text-[var(--muted)] mt-0.5">
                <span>0 (deterministic)</span><span>2 (chaotic)</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">
                Max Tokens: <span className="text-white">{maxTokens}</span>
              </label>
              <input
                type="range" min={64} max={1024} step={64}
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</p>}

          <button
            onClick={runComplete}
            disabled={completeLoading || !prompt}
            className="px-4 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {completeLoading ? "Generating..." : "Generate"}
          </button>

          {completeResult && (
            <div className="space-y-2">
              <div className="rounded-lg bg-black/40 border border-[var(--border)] p-4 text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">
                {completeResult.text}
              </div>
              <div className="flex gap-4 text-xs text-[var(--muted)]">
                <span>Provider: <span className="text-white">{completeResult.provider}</span></span>
                <span>Prompt tokens: <span className="text-white">{completeResult.prompt_tokens}</span></span>
                <span>Completion tokens: <span className="text-white">{completeResult.completion_tokens}</span></span>
              </div>
            </div>
          )}
        </div>
      </LiveDemo>
    </div>
  );
}
