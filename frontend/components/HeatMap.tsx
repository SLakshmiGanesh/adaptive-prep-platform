"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, AlertCircle, Filter } from "lucide-react";
import { analytics } from "@/lib/api";
import type { HeatCell } from "@/lib/api";

function mColor(m: number) {
  if (m < 0.2) return "#ff4757";
  if (m < 0.4) return "#ffd32a";
  if (m < 0.6) return "#f59e0b";
  if (m < 0.8) return "#00cc6a";
  return "#00ff88";
}
function mLabel(m: number) {
  if (m < 0.2) return "Critical";
  if (m < 0.4) return "Weak";
  if (m < 0.6) return "Developing";
  if (m < 0.8) return "Proficient";
  return "Mastered";
}

export default function HeatMap() {
  const [cells, setCells] = useState<HeatCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<HeatCell | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [filterSubject, setFilterSubject] = useState("All");
  const [sortBy, setSortBy] = useState<"mastery" | "trend" | "attempts">("mastery");

  useEffect(() => {
    analytics.heatmap().then(setCells).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const subjects = ["All", ...Array.from(new Set(cells.map(c => c.subject)))];

  const filtered = [...cells]
    .filter(c => filterSubject === "All" || c.subject === filterSubject)
    .sort((a, b) => {
      if (sortBy === "mastery")  return a.mastery - b.mastery;
      if (sortBy === "trend")    return b.trend - a.trend;
      return b.total_attempts - a.total_attempts;
    });

  const summary = {
    mastered: cells.filter(c => c.mastery >= 0.8).length,
    proficient: cells.filter(c => c.mastery >= 0.6 && c.mastery < 0.8).length,
    developing: cells.filter(c => c.mastery >= 0.4 && c.mastery < 0.6).length,
    weak: cells.filter(c => c.mastery < 0.4).length,
  };

  if (loading) {
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 70 }} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 8 }}>
          {[...Array(12)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
        </div>
      </div>
    );
  }

  if (!cells.length) {
    return (
      <div className="card" style={{ padding: 60, textAlign: "center" }}>
        <AlertCircle size={36} color="var(--t3)" style={{ margin: "0 auto 12px" }} />
        <p style={{ color: "var(--t3)" }}>No mastery data yet. Complete quizzes to see your heatmap.</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Mastered",   count: summary.mastered,   color: "#00ff88" },
          { label: "Proficient", count: summary.proficient, color: "#00cc6a" },
          { label: "Developing", count: summary.developing, color: "#f59e0b" },
          { label: "Needs Work", count: summary.weak,       color: "#ff4757" },
        ].map(s => (
          <div key={s.label} style={{ padding: "12px 16px", background: `${s.color}0d`, border: `1px solid ${s.color}2a`, borderRadius: "var(--r-md)" }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", color: s.color }}>
              {s.count}
            </div>
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setFilterSubject(s)}
              style={{
                padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                border: `1px solid ${filterSubject === s ? "var(--phosphor)" : "var(--line)"}`,
                background: filterSubject === s ? "rgba(0,255,136,0.1)" : "transparent",
                color: filterSubject === s ? "var(--phosphor)" : "var(--t3)",
                cursor: "pointer", fontFamily: "var(--sans)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="input"
          style={{ marginLeft: "auto", width: "auto", padding: "4px 10px", fontSize: 12 }}
        >
          <option value="mastery">Weakest first</option>
          <option value="trend">Most improved</option>
          <option value="attempts">Most practiced</option>
        </select>
      </div>

      {/* Heatmap grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 8 }}>
        {filtered.map(cell => {
          const c = mColor(cell.mastery);
          return (
            <div
              key={cell.topic_id}
              onMouseEnter={e => { setHover(cell); setHoverPos({ x: e.clientX, y: e.clientY }); }}
              onMouseLeave={() => setHover(null)}
              style={{
                position: "relative",
                padding: "14px 16px",
                background: `${c}0d`,
                border: `1px solid ${c}2a`,
                borderRadius: "var(--r-md)",
                cursor: "default",
                transition: "all 0.15s",
                transform: hover?.topic_id === cell.topic_id ? "scale(1.04)" : "scale(1)",
                boxShadow: hover?.topic_id === cell.topic_id ? `0 8px 24px ${c}20` : "none",
              }}
            >
              {/* Bottom fill */}
              <div style={{
                position: "absolute", bottom: 0, left: 0,
                height: 3, width: `${cell.mastery * 100}%`,
                background: c, borderRadius: "0 0 0 var(--r-md)",
              }} />

              <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800, color: c, lineHeight: 1, marginBottom: 5 }}>
                {(cell.mastery * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", lineHeight: 1.3, marginBottom: 6 }}>
                {cell.topic_name}
              </div>
              <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 6 }}>{cell.subject}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "var(--t4)", fontFamily: "var(--mono)" }}>
                  {cell.total_attempts}q
                </span>
                <TrendIcon trend={cell.trend} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {hover && (
        <div style={{
          position: "fixed",
          left: Math.min(hoverPos.x + 12, window.innerWidth - 220),
          top: Math.min(hoverPos.y - 10, window.innerHeight - 200),
          zIndex: 1000, pointerEvents: "none",
          background: "var(--raised)", border: "1px solid var(--line-hover)",
          borderRadius: "var(--r-md)", padding: "14px 16px", width: 210,
          boxShadow: "var(--shadow-xl)",
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)", marginBottom: 10 }}>
            {hover.topic_name}
          </div>
          {[
            ["Subject",  hover.subject],
            ["Mastery",  `${(hover.mastery * 100).toFixed(1)}%`],
            ["Level",    mLabel(hover.mastery)],
            ["Accuracy", `${(hover.accuracy * 100).toFixed(1)}%`],
            ["Attempts", String(hover.total_attempts)],
            ["Correct",  String(hover.correct_attempts)],
            ["7d Trend", `${hover.trend >= 0 ? "+" : ""}${(hover.trend * 100).toFixed(1)}%`],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "var(--t3)" }}>{label}</span>
              <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: label === "7d Trend" ? (hover.trend > 0 ? "var(--correct)" : hover.trend < 0 ? "var(--wrong)" : "var(--t3)") : "var(--t2)" }}>
                {val}
              </span>
            </div>
          ))}
          <div style={{
            marginTop: 10, padding: "4px 8px", borderRadius: 100,
            background: `${mColor(hover.mastery)}1a`, textAlign: "center",
            fontSize: 11, fontWeight: 700, color: mColor(hover.mastery),
          }}>
            {mLabel(hover.mastery)}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendIcon({ trend }: { trend: number }) {
  if (trend > 0.01) return <TrendingUp size={11} color="var(--correct)" />;
  if (trend < -0.01) return <TrendingDown size={11} color="var(--wrong)" />;
  return <Minus size={11} color="var(--t4)" />;
}
