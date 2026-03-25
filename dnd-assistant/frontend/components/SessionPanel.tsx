"use client";

import { useEffect, useState } from "react";
import { BookOpen, MessageCircle, ChevronDown, ChevronUp, Upload } from "lucide-react";

interface SessionNote {
  id: number;
  session_number: number;
  summary: string;
  plot_threads: string;
  npc_interactions: string;
  key_events: string;
}

export default function SessionPanel({ campaignId }: { campaignId: number }) {
  const [sessions, setSessions] = useState<SessionNote[]>([]);
  const [sessionNum, setSessionNum] = useState(1);
  const [rawNotes, setRawNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/backend/campaigns/${campaignId}/sessions`)
      .then((r) => r.json())
      .then((data) => {
        setSessions(data);
        if (data.length > 0) setSessionNum(data[0].session_number + 1);
      });
  }, [campaignId]);

  async function handleBulkImport(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setBulkImporting(true);
    const fd = new FormData();
    for (const file of Array.from(files)) fd.append("files", file);
    const res = await fetch(`/api/backend/campaigns/${campaignId}/sessions/bulk-import`, {
      method: "POST",
      body: fd,
    });
    const imported: SessionNote[] = await res.json();
    setSessions((prev) => {
      const merged = [...prev];
      for (const s of imported) {
        const idx = merged.findIndex((x) => x.session_number === s.session_number);
        if (idx >= 0) merged[idx] = s; else merged.push(s);
      }
      return merged.sort((a, b) => b.session_number - a.session_number);
    });
    e.target.value = "";
    setBulkImporting(false);
  }

  async function processNotes() {
    if (!rawNotes.trim()) return;
    setProcessing(true);
    const res = await fetch(`/api/backend/campaigns/${campaignId}/sessions/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_number: sessionNum, raw_notes: rawNotes }),
    });
    const session = await res.json();
    setSessions((prev) => {
      const existing = prev.findIndex((s) => s.session_number === session.session_number);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = session;
        return updated;
      }
      return [session, ...prev].sort((a, b) => b.session_number - a.session_number);
    });
    setRawNotes("");
    setProcessing(false);
    setExpanded(session.id);
  }

  async function askQuestion() {
    if (!question.trim()) return;
    setAsking(true);
    const res = await fetch(`/api/backend/campaigns/${campaignId}/sessions/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setAnswer(data.answer);
    setAsking(false);
  }

  return (
    <div className="space-y-4">
      {/* Process notes */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="font-semibold text-[#f0ead6] mb-3">Process Session Notes</h2>
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm text-[var(--muted)] shrink-0">Session #</label>
          <input type="number" min={1} value={sessionNum}
            onChange={(e) => setSessionNum(Number(e.target.value))}
            className="w-20 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#f0ead6] focus:outline-none focus:border-brand-400" />
        </div>
        <textarea value={rawNotes} onChange={(e) => setRawNotes(e.target.value)} rows={6}
          placeholder="Paste your raw session notes here — bullet points, sentences, whatever format you took them in..."
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#f0ead6] placeholder-[var(--muted)] focus:outline-none focus:border-brand-400 resize-none mb-3" />
        <div className="flex gap-3 flex-wrap">
          <button onClick={processNotes} disabled={processing || !rawNotes.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            <BookOpen size={14} />
            {processing ? "Processing…" : "Process Notes"}
          </button>
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border border-[var(--border)] ${bulkImporting ? "opacity-50 text-[var(--muted)]" : "text-[var(--muted)] hover:text-[#f0ead6]"}`}>
            <Upload size={14} />
            {bulkImporting ? "Importing…" : "Bulk Import (.txt files)"}
            <input type="file" accept=".txt" multiple className="hidden" onChange={handleBulkImport} disabled={bulkImporting} />
          </label>
        </div>
      </div>

      {/* Q&A */}
      {sessions.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <h2 className="font-semibold text-[#f0ead6] mb-3">Ask About the Campaign</h2>
          <div className="flex gap-2">
            <input value={question} onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askQuestion()}
              placeholder="e.g. What did the party promise the blacksmith?"
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#f0ead6] placeholder-[var(--muted)] focus:outline-none focus:border-brand-400" />
            <button onClick={askQuestion} disabled={asking || !question.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              <MessageCircle size={14} />
              {asking ? "Asking…" : "Ask"}
            </button>
          </div>
          {answer && (
            <div className="mt-3 p-4 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[#f0ead6]">
              {answer}
            </div>
          )}
        </div>
      )}

      {/* Session list */}
      {sessions.length === 0 ? (
        <p className="text-center text-[var(--muted)] py-12">No sessions yet. Process some notes above.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="border border-[var(--border)] rounded-xl overflow-hidden">
              <button onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                className="w-full flex items-center gap-3 px-5 py-3 bg-[var(--surface)] hover:bg-white/5 transition-colors text-left">
                <span className="font-semibold text-[#f0ead6] flex-1">Session {s.session_number}</span>
                <span className="text-sm text-[var(--muted)] flex-1 truncate">{s.summary}</span>
                {expanded === s.id ? <ChevronUp size={14} className="text-[var(--muted)] shrink-0" /> : <ChevronDown size={14} className="text-[var(--muted)] shrink-0" />}
              </button>
              {expanded === s.id && (
                <div className="px-5 py-4 border-t border-[var(--border)] grid gap-3 text-sm">
                  {[
                    ["Summary", s.summary],
                    ["Plot Threads", s.plot_threads],
                    ["NPC Interactions", s.npc_interactions],
                    ["Key Events", s.key_events],
                  ].map(([label, value]) => value ? (
                    <div key={label}>
                      <p className="text-brand-400 font-medium text-xs uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-[#f0ead6] whitespace-pre-line">{value}</p>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
