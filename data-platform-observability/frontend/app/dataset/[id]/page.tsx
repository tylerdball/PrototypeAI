"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { clsx } from "clsx";

interface SLO {
  id: number;
  slo_type: string;
  description: string;
  target_value: number;
  current_value: number | null;
  unit: string;
  status: string;
}

interface Pipeline {
  id: number;
  name: string;
  status: string;
  schedule: string;
  owner_team: string;
  last_run_at: string;
  avg_duration_mins: number;
  success_rate_7d: number;
  error_message: string;
}

interface DatasetDetail {
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
  slos: SLO[];
  pipelines: Pipeline[];
  updated_at: string;
}

function SloBar({ target, current, unit }: { target: number; current: number | null; unit: string }) {
  if (current == null) return <span className="text-xs text-[var(--muted)]">No data</span>;
  const pct = unit === "hours" || unit === "minutes"
    ? Math.min(100, (target / Math.max(current, 0.01)) * 100)
    : Math.min(100, (current / target) * 100);
  const ok = pct >= 100;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-[var(--border)] rounded-full h-1.5">
        <div className={clsx("h-1.5 rounded-full", ok ? "bg-emerald-500" : "bg-red-500")} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-[#e2eaf3] w-32 text-right">
        {current} / {target} {unit}
      </span>
    </div>
  );
}

export default function DatasetPage() {
  const { id } = useParams<{ id: string }>();
  const [dataset, setDataset] = useState<DatasetDetail | null>(null);

  useEffect(() => {
    fetch(`/api/backend/datasets/${id}`).then(r => r.json()).then(setDataset);
  }, [id]);

  if (!dataset) return <p className="text-[var(--muted)]">Loading…</p>;

  const tags = dataset.tags ? dataset.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/" className="text-[var(--muted)] hover:text-[#e2eaf3] transition-colors"><ArrowLeft size={20} /></a>
        <div>
          <h1 className="text-xl font-mono font-bold text-brand-400">{dataset.name}</h1>
          <p className="text-sm text-[var(--muted)]">{dataset.description}</p>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {[
            ["Owner Team", dataset.owner_team || "Unowned"],
            ["Owner Person", dataset.owner_person || "—"],
            ["Domain", dataset.domain],
            ["Source", dataset.source_system],
            ["Format", dataset.format],
            ["Update Frequency", dataset.update_frequency],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-[var(--muted)] mb-0.5">{label}</p>
              <p className="text-[#e2eaf3]">{value}</p>
            </div>
          ))}
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1.5 mt-4 flex-wrap">
            {tags.map(t => (
              <span key={t} className="text-xs bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] px-2 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* SLOs */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 mb-5">
        <h2 className="font-semibold text-[#e2eaf3] mb-4">SLOs ({dataset.slos.length})</h2>
        {dataset.slos.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No SLOs defined for this dataset.</p>
        ) : (
          <div className="space-y-4">
            {dataset.slos.map(slo => (
              <div key={slo.id}>
                <div className="flex items-center gap-3 mb-1.5">
                  <StatusBadge status={slo.status} />
                  <span className="text-sm font-medium text-[#e2eaf3] capitalize">{slo.slo_type}</span>
                  <span className="text-xs text-[var(--muted)]">{slo.description}</span>
                </div>
                <SloBar target={slo.target_value} current={slo.current_value} unit={slo.unit} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pipelines */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="font-semibold text-[#e2eaf3] mb-4">Pipelines ({dataset.pipelines.length})</h2>
        {dataset.pipelines.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No pipelines linked to this dataset.</p>
        ) : (
          <div className="space-y-3">
            {dataset.pipelines.map(p => (
              <div key={p.id} className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <StatusBadge status={p.status} />
                  <span className="font-mono text-sm text-[#e2eaf3]">{p.name}</span>
                  <span className="text-xs text-[var(--muted)] ml-auto">{p.schedule}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs text-[var(--muted)]">
                  <div><span className="block">Owner</span><span className="text-[#e2eaf3]">{p.owner_team}</span></div>
                  <div><span className="block">Avg duration</span><span className="text-[#e2eaf3]">{p.avg_duration_mins} min</span></div>
                  <div><span className="block">7d success</span>
                    <span className={clsx("font-mono", (p.success_rate_7d ?? 0) >= 0.95 ? "text-emerald-400" : (p.success_rate_7d ?? 0) >= 0.8 ? "text-yellow-400" : "text-red-400")}>
                      {p.success_rate_7d != null ? `${Math.round(p.success_rate_7d * 100)}%` : "—"}
                    </span>
                  </div>
                </div>
                {p.error_message && (
                  <div className="mt-3 p-2.5 bg-red-950/30 border border-red-800/50 rounded text-xs font-mono text-red-300">
                    {p.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
