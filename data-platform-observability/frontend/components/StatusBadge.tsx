import { clsx } from "clsx";

const STYLES: Record<string, string> = {
  passing:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  healthy:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  failing:  "bg-red-50 text-red-700 border-red-200",
  failed:   "bg-red-50 text-red-700 border-red-200",
  warning:  "bg-amber-50 text-amber-700 border-amber-200",
  degraded: "bg-amber-50 text-amber-700 border-amber-200",
  unknown:  "bg-slate-100 text-slate-500 border-slate-200",
  none:     "bg-slate-50 text-slate-400 border-slate-200",
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
