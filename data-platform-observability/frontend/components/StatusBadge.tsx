import { clsx } from "clsx";

const STYLES: Record<string, string> = {
  passing:  "bg-emerald-900/40 text-emerald-300 border-emerald-700",
  healthy:  "bg-emerald-900/40 text-emerald-300 border-emerald-700",
  failing:  "bg-red-900/40 text-red-300 border-red-700",
  failed:   "bg-red-900/40 text-red-300 border-red-700",
  warning:  "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  degraded: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  unknown:  "bg-slate-800 text-slate-400 border-slate-600",
  none:     "bg-slate-800 text-slate-500 border-slate-700",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={clsx("text-xs px-2 py-0.5 rounded border font-medium capitalize", STYLES[status] ?? STYLES.unknown)}>
      {label ?? status}
    </span>
  );
}

export function SloSummaryBadges({ summary }: { summary: Record<string, number> }) {
  if (!summary || Object.keys(summary).length === 0) {
    return <StatusBadge status="none" label="No SLOs" />;
  }
  return (
    <div className="flex gap-1 flex-wrap">
      {Object.entries(summary).map(([status, count]) => (
        <StatusBadge key={status} status={status} label={`${count} ${status}`} />
      ))}
    </div>
  );
}
