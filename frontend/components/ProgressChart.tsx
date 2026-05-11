"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { analytics } from "@/lib/api";
import type { MasteryTrend } from "@/lib/api";

export default function ProgressChart({ data: initialData }: { data?: MasteryTrend[] }) {
  const [data, setData] = useState<MasteryTrend[]>(initialData ?? []);
  const [range, setRange] = useState<7 | 14 | 30>(30);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (!initialData) {
      setLoading(true);
      analytics.masteryTrend(range)
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [range]);

  const formattedData = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    pct: Math.round(d.avg_mastery * 100),
  }));

  const first = formattedData[0]?.pct ?? 0;
  const last  = formattedData[formattedData.length - 1]?.pct ?? 0;
  const delta = last - first;
  const trend = delta >= 0 ? "up" : "down";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "var(--bg-2)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)", padding: "10px 14px",
        fontSize: 12, fontFamily: "var(--font-display)",
      }}>
        <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
        <div style={{ color: "var(--accent-bright)", fontWeight: 700, fontSize: 16, fontFamily: "var(--font-mono)" }}>
          {payload[0].value}%
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
          {payload[0].payload.topics_covered} topics studied
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Mastery Progress
          </h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
              {last}%
            </span>
            <span style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 13, fontWeight: 600,
              color: trend === "up" ? "var(--success)" : "var(--danger)",
            }}>
              {trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(delta)}% vs start
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {([7, 14, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: "4px 10px", borderRadius: 100,
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--font-display)",
                border: `1px solid ${range === r ? "var(--accent)" : "var(--border)"}`,
                background: range === r ? "var(--accent-glow)" : "transparent",
                color: range === r ? "var(--accent-bright)" : "var(--text-muted)",
              }}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="skeleton" style={{ height: 180 }} />
      ) : formattedData.length < 2 ? (
        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Complete more sessions to see trends
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={formattedData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="masteryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#5c6080", fontFamily: "var(--font-display)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#5c6080", fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="pct"
              stroke="#6c63ff"
              strokeWidth={2}
              fill="url(#masteryGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#6c63ff", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
