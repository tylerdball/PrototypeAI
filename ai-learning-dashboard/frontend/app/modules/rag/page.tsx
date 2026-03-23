"use client";

import { useState } from "react";
import Link from "next/link";
import { LiveDemo } from "@/components/LiveDemo";

const API = "/api/backend";

interface IngestResult {
  chunks_created: number;
  total_stored: number;
}

interface Chunk {
  text: string;
  score: number;
  metadata: { source?: string; chunk_index?: number };
}

interface QueryResult {
  answer: string;
  retrieved_chunks: Chunk[];
  provider: string;
}

const SAMPLE_DOC = `Retrieval-Augmented Generation (RAG) is a technique that enhances large language models by retrieving relevant documents from an external knowledge base before generating a response.

The RAG pipeline has three main stages: indexing, retrieval, and generation. During indexing, documents are split into chunks, converted to vector embeddings using an embedding model, and stored in a vector database. Common vector databases include Pinecone, Weaviate, ChromaDB, and FAISS.

During retrieval, the user query is also converted to an embedding, and the vector database finds the most semantically similar document chunks using cosine similarity or dot product. These top-k chunks become the context for the LLM.

In the generation stage, the original question plus the retrieved chunks are combined into a prompt and sent to the LLM. This grounds the response in factual content, reducing hallucinations and allowing the model to answer questions about private or recent data not in its training set.

Key metrics for evaluating RAG systems include retrieval precision, recall, and faithfulness — whether the generated answer is actually supported by the retrieved context.`;

export default function RAGPage() {
  const [docText, setDocText] = useState(SAMPLE_DOC);
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);

  const [question, setQuestion] = useState("What are the three stages of a RAG pipeline?");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const [error, setError] = useState("");

  async function runIngest() {
    setIngestLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/rag/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: docText, source: "user_doc" }),
      });
      if (!res.ok) throw new Error(await res.text());
      setIngestResult(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIngestLoading(false);
    }
  }

  async function runQuery() {
    setQueryLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/rag/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, n_results: 3 }),
      });
      if (!res.ok) throw new Error(await res.text());
      setQueryResult(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setQueryLoading(false);
    }
  }

  async function clearStore() {
    await fetch(`${API}/rag/clear`, { method: "DELETE" });
    setIngestResult(null);
    setQueryResult(null);
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/" className="text-xs text-[var(--muted)] hover:text-white">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mt-2 mb-1">RAG Pipeline</h1>
        <p className="text-[var(--muted)]">Embed → Chunk → Retrieve → Augment → Generate. Full end-to-end interactive demo.</p>
      </div>

      {/* Pipeline diagram */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {["1. Ingest Doc", "→", "2. Chunk Text", "→", "3. Embed Chunks", "→", "4. Store in ChromaDB", "→", "5. Query", "→", "6. Retrieve Top-K", "→", "7. LLM + Context"].map((step, i) => (
          <span key={i} className={step === "→" ? "text-[var(--muted)]" : "px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-xs text-white"}>
            {step}
          </span>
        ))}
      </div>

      {/* Concepts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { term: "Chunking", def: "Documents are split into overlapping windows (e.g., 300 words, 50 word overlap) to preserve context at boundaries." },
          { term: "Embeddings", def: "Dense vector representations (e.g., 1536-dim) where semantic similarity maps to cosine distance. Same meaning → nearby vectors." },
          { term: "Retrieval", def: "Vector nearest-neighbor search finds the top-k most relevant chunks. Similarity score indicates relevance — not always 100% accurate." },
        ].map(({ term, def }) => (
          <div key={term} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <h3 className="text-xs font-semibold text-purple-400 mb-1">{term}</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">{def}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</p>}

      {/* Step 1: Ingest */}
      <LiveDemo title="Step 1 — Ingest Document" badge="ChromaDB">
        <div className="space-y-3">
          <textarea
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:border-purple-500 resize-none font-mono"
          />
          <div className="flex gap-2 items-center">
            <button
              onClick={runIngest}
              disabled={ingestLoading || !docText}
              className="px-4 py-1.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {ingestLoading ? "Ingesting..." : "Ingest Document"}
            </button>
            <button
              onClick={clearStore}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] text-sm hover:text-white hover:border-white/30 transition-colors"
            >
              Clear Store
            </button>
          </div>
          {ingestResult && (
            <div className="text-xs text-[var(--muted)] space-x-4">
              <span>Chunks created: <span className="text-white font-medium">{ingestResult.chunks_created}</span></span>
              <span>Total in store: <span className="text-white font-medium">{ingestResult.total_stored}</span></span>
            </div>
          )}
        </div>
      </LiveDemo>

      {/* Step 2: Query */}
      <LiveDemo title="Step 2 — Ask a Question" badge="Live AI">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about the document..."
              className="flex-1 rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={runQuery}
              disabled={queryLoading || !question}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {queryLoading ? "Querying..." : "Ask"}
            </button>
          </div>

          {queryResult && (
            <div className="space-y-4">
              {/* Retrieved chunks */}
              <div>
                <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Retrieved Chunks (top-3)</p>
                <div className="space-y-2">
                  {queryResult.retrieved_chunks.map((c, i) => (
                    <div key={i} className="rounded border border-purple-500/20 bg-purple-900/10 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-purple-400 font-medium">Chunk #{c.metadata.chunk_index ?? i}</span>
                        <span className="text-xs text-[var(--muted)]">score: <span className="text-white">{c.score}</span></span>
                      </div>
                      <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-3">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Answer */}
              <div>
                <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Generated Answer ({queryResult.provider})</p>
                <div className="rounded-lg bg-black/40 border border-[var(--border)] p-4 text-sm text-white leading-relaxed whitespace-pre-wrap">
                  {queryResult.answer}
                </div>
              </div>
            </div>
          )}
        </div>
      </LiveDemo>
    </div>
  );
}
