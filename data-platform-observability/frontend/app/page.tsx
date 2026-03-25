"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Database, Activity, AlertTriangle, CheckCircle, XCircle, HelpCircle, Zap } from "lucide-react";
import { clsx } from "clsx";
import { StatusBadge, SloSummaryBadges } from "@/components/StatusBadge";

// ── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  total_datasets: number;
  datasets_with_slos: number;
  datasets_no_slo: number;
  failing_slos: number;
  warning_slos: number;
  pipelines_healthy: number;
  pipelines_degraded: number;
  pipelines_failed: number;
  datasets_no_owner: number;
}

interface Dataset {
  id: number;
  name: string;
  description: string;
  owner_team: string;
  owner_person: string;
  domain: string;
  source_system: string;
  format: string;
  update_frequency: string;
  tags: string;
  slo_summary: Record<string, number>;
  slo_count: number;
  pipeline_summary: Record<string, number>;
  pipeline_count: number;
}

interface Pipeline {
  id: number;
  name: string;
  dataset_name: string;
  owner_team: string;
  schedule: string;
  status: string;
  last_run_at: string;
  avg_duration_mins: number;
  success_rate_7d: number;
  error_message: string;
}

interface Meta {
  domains: string[];
  teams: string[];
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, sub, variant = "neutral" }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; variant?: "good" | "warn" | "bad" | "neutral";
}) {
  const border = { good: "border-emerald-200", warn: "border-yellow-200", bad: "border-red-200", neutral: "border-[var(--border)]" }[variant];
  const text = { good: "text-emerald-600", warn: "text-amber-600", bad: "text-red-600", neutral: "text-brand-500" }[variant];
  return (
    <div className={clsx("bg-[var(--surface)] border rounded-xl p-4", border)}>
      <div className="flex items-center gap-2 mb-2 text-[var(--muted)]">{icon}<span className="text-xs uppercase tracking-wide">{label}</span></div>
      <div className={clsx("text-2xl font-bold", text)}>{value}</div>
      {sub && <div className="text-xs text-[var(--muted)] mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Pipeline row ──────────────────────────────────────────────────────────────

function PipelineRow({ p }: { p: Pipeline }) {
  const [open, setOpen] = useState(false);
  const successPct = p.success_rate_7d != null ? Math.round(p.success_rate_7d * 100) : null;
  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 px-4 py-3 bg-[var(--surface)] hover:bg-[var(--surface2)] transition-colors text-left">
        <StatusBadge status={p.status} />
        <span className="font-mono text-sm text-[var(--text)] flex-1">{p.name}</span>
        <span className="text-xs text-[var(--muted)] hidden md:block">{p.dataset_name}</span>
        <span className="text-xs text-[var(--muted)] hidden lg:block">{p.schedule}</span>
        {successPct != null && (
          <span className={clsx("text-xs font-mono", successPct >= 95 ? "text-emerald-400" : successPct >= 80 ? "text-yellow-400" : "text-red-400")}>
            {successPct}% (7d)
          </span>
        )}
        <span className="text-xs text-[var(--muted)]">{p.owner_team}</span>
      </button>
      {open && p.error_message && (
        <div className="px-4 py-3 border-t border-[var(--border)] bg-red-50">
          <p className="text-xs font-mono text-red-300">{p.error_message}</p>
        </div>
      )}
    </div>
  );
}

// ── NL Query bar ──────────────────────────────────────────────────────────────

function NLQueryBar({ onResults }: { onResults: (r: { results: Dataset[]; explanation: string; entity: string; count: number } | null) => void }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const EXAMPLES = [
    "Which datasets owned by Data Engineering have failing SLOs?",
    "Show me all pipelines with failed status",
    "Datasets with no SLO defined",
    "Show marketing domain datasets",
  ];

  async function run(question: string) {
    if (!question.trim()) return;
    setLoading(true);
    const res = await fetch("/api/backend/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    onResults(data);
    setLoading(false);
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={16} className="text-brand-400" />
        <span className="font-semibold text-[var(--text)]">Natural Language Query</span>
      </div>
      <div className="flex gap-2">
        <input value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && run(q)}
          placeholder="e.g. Which datasets owned by team X have no SLO defined?"
          className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-brand-400" />
        <button onClick={() => run(q)} disabled={loading || !q.trim()}
          className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          {loading ? "Querying…" : "Ask"}
        </button>
        {q && <button onClick={() => { setQ(""); onResults(null); }} className="px-3 text-[var(--muted)] hover:text-[var(--text)] transition-colors text-sm">Clear</button>}
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        {EXAMPLES.map(ex => (
          <button key={ex} onClick={() => { setQ(ex); run(ex); }}
            className="text-xs text-[var(--muted)] hover:text-brand-400 transition-colors border border-[var(--border)] hover:border-brand-400 rounded px-2 py-1">
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "catalog" | "pipelines";

export default function Home() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [meta, setMeta] = useState<Meta>({ domains: [], teams: [] });
  const [tab, setTab] = useState<Tab>("catalog");
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [sloFilter, setSloFilter] = useState("");
  const [pipelineFilter, setPipelineFilter] = useState("");
  const [nlResults, setNlResults] = useState<{ results: Dataset[]; explanation: string; entity: string; count: number } | null>(null);

  useEffect(() => {
    fetch("/api/backend/datasets/summary").then(r => r.json()).then(setSummary);
    fetch("/api/backend/datasets/meta").then(r => r.json()).then(setMeta);
    fetch("/api/backend/pipelines").then(r => r.json()).then(setPipelines);
  }, []);

  const fetchDatasets = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (domainFilter) params.set("domain", domainFilter);
    if (teamFilter) params.set("owner_team", teamFilter);
    if (sloFilter) params.set("slo_status", sloFilter);
    if (pipelineFilter) params.set("pipeline_status", pipelineFilter);
    fetch(`/api/backend/datasets?${params}`).then(r => r.json()).then(setDatasets);
  }, [search, domainFilter, teamFilter, sloFilter, pipelineFilter]);

  useEffect(() => { fetchDatasets(); }, [fetchDatasets]);

  const displayedDatasets = nlResults?.entity === "datasets" ? (nlResults.results as unknown as Dataset[]) : datasets;
  const displayedPipelines = nlResults?.entity === "pipelines" ? (nlResults.results as unknown as Pipeline[]) : pipelines;

  const pipelineFailed = pipelines.filter(p => p.status === "failed").length;
  const pipelineDegraded = pipelines.filter(p => p.status === "degraded").length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="col-span-2">
            <SummaryCard icon={<Database size={14} />} label="Total Datasets" value={summary.total_datasets} sub={`${summary.datasets_with_slos} with SLOs`} />
          </div>
          <div className="col-span-2">
            <SummaryCard icon={<AlertTriangle size={14} />} label="No SLO Defined" value={summary.datasets_no_slo}
              sub="datasets need SLO coverage" variant={summary.datasets_no_slo > 0 ? "warn" : "good"} />
          </div>
          <div className="col-span-2">
            <SummaryCard icon={<XCircle size={14} />} label="Failing SLOs" value={summary.failing_slos}
              sub={`${summary.warning_slos} warnings`} variant={summary.failing_slos > 0 ? "bad" : "good"} />
          </div>
          <div className="col-span-2">
            <SummaryCard icon={<Activity size={14} />} label="Pipeline Health"
              value={`${summary.pipelines_healthy} / ${summary.pipelines_healthy + summary.pipelines_degraded + summary.pipelines_failed}`}
              sub={`${pipelineFailed} failed · ${pipelineDegraded} degraded`}
              variant={pipelineFailed > 0 ? "bad" : pipelineDegraded > 0 ? "warn" : "good"} />
          </div>
        </div>
      )}

      {/* NL Query */}
      <NLQueryBar onResults={setNlResults} />

      {nlResults && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-brand-600">{nlResults.explanation}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{nlResults.count} result{nlResults.count !== 1 ? "s" : ""} — showing in {nlResults.entity} tab</p>
          </div>
          <button onClick={() => { setNlResults(null); setTab(nlResults.entity === "pipelines" ? "pipelines" : "catalog"); }}
            className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            Clear ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-[var(--border)] mb-4">
          {([["catalog", "Dataset Catalog"], ["pipelines", "Pipeline Health"]] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={clsx("px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                tab === key ? "border-brand-400 text-brand-400" : "border-transparent text-[var(--muted)] hover:text-[var(--text)]")}>
              {label}
            </button>
          ))}
        </div>

        {tab === "catalog" && (
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search datasets…"
                  className="w-full pl-8 pr-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-brand-400" />
              </div>
              <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-brand-400">
                <option value="">All domains</option>
                {meta.domains.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-brand-400">
                <option value="">All teams</option>
                {meta.teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={sloFilter} onChange={e => setSloFilter(e.target.value)}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-brand-400">
                <option value="">All SLO states</option>
                <option value="failing">Has failing SLOs</option>
                <option value="warning">Has warnings</option>
                <option value="passing">All SLOs passing</option>
                <option value="none">No SLOs defined</option>
              </select>
              <select value={pipelineFilter} onChange={e => setPipelineFilter(e.target.value)}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-brand-400">
                <option value="">All pipeline states</option>
                <option value="failed">Has failed pipeline</option>
                <option value="degraded">Has degraded pipeline</option>
                <option value="healthy">All pipelines healthy</option>
              </select>
            </div>

            {/* Dataset table */}
            <div className="border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface2)] border-b border-[var(--border)]">
                  <tr>
                    {["Dataset", "Domain", "Owner", "Source", "Frequency", "SLOs", "Pipelines"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {displayedDatasets.map(d => (
                    <tr key={d.id} onClick={() => window.location.href = `/dataset/${d.id}`}
                      className="hover:bg-[var(--surface2)] transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="font-mono text-brand-400 text-sm font-medium">{d.name}</div>
                        <div className="text-xs text-[var(--muted)] mt-0.5 max-w-xs truncate">{d.description}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted)] capitalize">{d.domain}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-[var(--text)]">{d.owner_team || <span className="text-red-400">Unowned</span>}</div>
                        {d.owner_person && <div className="text-xs text-[var(--muted)]">{d.owner_person}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted)]">{d.source_system}</td>
                      <td className="px-4 py-3 text-xs text-[var(--muted)] capitalize">{d.update_frequency}</td>
                      <td className="px-4 py-3"><SloSummaryBadges summary={d.slo_summary} /></td>
                      <td className="px-4 py-3"><SloSummaryBadges summary={d.pipeline_summary} /></td>
                    </tr>
                  ))}
                  {displayedDatasets.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--muted)]">No datasets match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "pipelines" && (
          <div className="space-y-2">
            {displayedPipelines.length === 0 ? (
              <p className="text-center text-[var(--muted)] py-12">No pipelines found.</p>
            ) : (
              displayedPipelines.map(p => <PipelineRow key={p.id} p={p} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
