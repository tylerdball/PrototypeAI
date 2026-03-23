"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface DriftPoint {
  timestamp: string;
  mean: number;
  psi: number;
  kl_div: number;
  drift_type: string;
}

interface DriftChartProps {
  data: DriftPoint[];
  driftStart?: number;
}

const PSI_WARN = 0.1;
const PSI_ALERT = 0.25;

export function DriftChart({ data, driftStart }: DriftChartProps) {
  const driftTimestamp = driftStart !== undefined ? data[driftStart]?.timestamp : undefined;

  return (
    <div className="space-y-6">
      {/* Mean shift chart */}
      <div>
        <p className="text-xs text-[var(--muted)] mb-2 font-medium uppercase tracking-wider">Feature Mean Over Time</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
            <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: "#94a3b8" }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "#1a1d27", border: "1px solid #2a2d3e", borderRadius: 8 }}
              labelStyle={{ color: "#e2e8f0" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {driftTimestamp && (
              <ReferenceLine x={driftTimestamp} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Drift Start", fill: "#f59e0b", fontSize: 10 }} />
            )}
            <Line type="monotone" dataKey="mean" stroke="#4f6ef7" strokeWidth={2} dot={false} name="Feature Mean" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* PSI / KL chart */}
      <div>
        <p className="text-xs text-[var(--muted)] mb-2 font-medium uppercase tracking-wider">PSI & KL Divergence</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
            <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: "#94a3b8" }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} domain={[0, "auto"]} />
            <Tooltip
              contentStyle={{ background: "#1a1d27", border: "1px solid #2a2d3e", borderRadius: 8 }}
              labelStyle={{ color: "#e2e8f0" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={PSI_WARN} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "PSI warn (0.1)", fill: "#f59e0b", fontSize: 9 }} />
            <ReferenceLine y={PSI_ALERT} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "PSI alert (0.25)", fill: "#ef4444", fontSize: 9 }} />
            <Line type="monotone" dataKey="psi" stroke="#f59e0b" strokeWidth={2} dot={false} name="PSI" />
            <Line type="monotone" dataKey="kl_div" stroke="#e879f9" strokeWidth={2} dot={false} name="KL Divergence" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
