"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { MasteryTrend } from "@/lib/api";

export default function ProgressChart({
  data,
  fullHeight = false,
}: {
  data: MasteryTrend[];
  fullHeight?: boolean;
}) {
  const [range, setRange] = useState<7 | 14 | 30>(30);

  const sliced = data.slice(-range);
  const formatted = sliced.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    pct: Math.round(d.avg_mastery * 100),
    mins: d.study_minutes ?? 0,
  }));

  const first = formatted[0]?.pct ?? 0;
  const last  = formatted[formatted.length - 1]?.pct ?? 0;
  const delta = last - first;
  const h = fullHeight ? 260 : 180;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "var(--raised)", border: "1px solid var(--line-hover)",
        borderRadius: "var(--r-md)", padding: "10px 14px",
        fontFamily: "var(--sans)", fontSize: 12,
        boxShadow: "var(--shadow-lg)",
      }}>
        <div style={{ color: "var(--t3)", marginBottom: 6 }}>{label}</div>
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <div style={{ color: "var(--phosphor)", fontWeight: 700, fontSize: 18, fontFamily: "var(--mono)" }}>
              {payload[0].value}%
            </div>
            <div style={{ color: "var(--t3)", fontSize: 10 }}>mastery</div>
          </div>
          {payload[0].payload.mins > 0 && (
            <div>
              <div style={{ color: "var(--solar)", fontWeight: 700, fontSize: 18, fontFamily: "var(--mono)" }}>
                {payload[0].payload.mins}m
              </div>
              <div style={{ color: "var(--t3)", fontSize: 10 }}>studied</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 11, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Mastery Progress
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--mono)", color: "var(--t1)" }}>
              {last}%
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: delta >= 0 ? "var(--correct)" : "var(--wrong)" }}>
              {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {Math.abs(delta)}%
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {([7, 14, 30] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: "3px 9px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "var(--sans)",
                border: `1px solid ${range === r ? "var(--phosphor)" : "var(--line)"}`,
                background: range === r ? "rgba(0,255,136,0.1)" : "transparent",
                color: range === r ? "var(--phosphor)" : "var(--t3)",
              }}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {formatted.length < 2 ? (
        <div style={{ height: h, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t4)", fontSize: 13 }}>
          Study more sessions to see trends
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={h}>
          <AreaChart data={formatted} margin={{ top: 5, right: 0, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="mgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#00ff88" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--t4)", fontFamily: "var(--sans)" }}
              axisLine={false} tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "var(--t4)", fontFamily: "var(--mono)" }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={70} stroke="rgba(0,255,136,0.1)" strokeDasharray="4 4" />
            <Area
              type="monotone" dataKey="pct"
              stroke="var(--phosphor)" strokeWidth={2}
              fill="url(#mgGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--phosphor)", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
