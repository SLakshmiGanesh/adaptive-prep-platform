"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { analytics } from "@/lib/api";
import type { HeatmapCell } from "@/lib/api";

function masteryColor(m: number): string {
  if (m < 0.2) return "#ef4444";
  if (m < 0.4) return "#f59e0b";
  if (m < 0.6) return "#eab308";
  if (m < 0.8) return "#22d3a5";
  return "#6c63ff";
}

function masteryBg(m: number): string {
  const color = masteryColor(m);
  return `${color}22`;
}

function masteryLabel(m: number): string {
  if (m < 0.2) return "Beginner";
  if (m < 0.4) return "Basic";
  if (m < 0.6) return "Developing";
  if (m < 0.8) return "Proficient";
  return "Mastered";
}

export default function HeatMap() {
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filterSubject, setFilterSubject] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"mastery" | "accuracy" | "trend">("mastery");
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  useEffect(() => {
    analytics.heatmap()
      .then(setCells)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const subjects = ["All", ...Array.from(new Set(cells.map((c) => c.subject)))];

  const filtered = cells
    .filter((c) => filterSubject === "All" || c.subject === filterSubject)
    .sort((a, b) => {
      if (sortBy === "mastery") return a.mastery - b.mastery;
      if (sortBy === "accuracy") return a.accuracy - b.accuracy;
      return a.trend - b.trend;
    });

  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        {[...Array(12)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 100, borderRadius: "var(--radius-sm)" }} />
        ))}
      </div>
    );
  }

  if (cells.length === 0) {
    return (
      <div className="card" style={{ padding: 60, textAlign: "center" }}>
        <AlertCircle size={36} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
        <p style={{ color: "var(--text-muted)" }}>No mastery data yet. Complete some quizzes to see your heatmap.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setFilterSubject(s)}
              style={{
                padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                border: `1px solid ${filterSubject === s ? "var(--accent)" : "var(--border)"}`,
                background: filterSubject === s ? "var(--accent-glow)" : "var(--surface-1)",
                color: filterSubject === s ? "var(--accent-bright)" : "var(--text-muted)",
                cursor: "pointer", fontFamily: "var(--font-display)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: "var(--surface-1)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", padding: "6px 12px",
              borderRadius: "var(--radius-sm)", fontSize: 12,
              fontFamily: "var(--font-display)", cursor: "pointer",
            }}
          >
            <option value="mastery">Sort: Weakest first</option>
            <option value="accuracy">Sort: Accuracy</option>
            <option value="trend">Sort: Recent change</option>
          </select>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Mastered", count: cells.filter(c => c.mastery >= 0.8).length, color: "#6c63ff" },
          { label: "Proficient", count: cells.filter(c => c.mastery >= 0.6 && c.mastery < 0.8).length, color: "#22d3a5" },
          { label: "Developing", count: cells.filter(c => c.mastery >= 0.4 && c.mastery < 0.6).length, color: "#eab308" },
          { label: "Needs Work", count: cells.filter(c => c.mastery < 0.4).length, color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} style={{
            flex: 1, padding: "12px 16px",
            background: `${s.color}11`, border: `1px solid ${s.color}33`,
            borderRadius: "var(--radius-sm)",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "var(--font-mono)" }}>
              {s.count}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 10,
      }}>
        {filtered.map((cell) => (
          <div
            key={cell.topic_id}
            onMouseEnter={() => setHoveredCell(cell)}
            onMouseLeave={() => setHoveredCell(null)}
            style={{
              position: "relative", padding: "14px 16px",
              background: masteryBg(cell.mastery),
              border: `1px solid ${masteryColor(cell.mastery)}44`,
              borderRadius: "var(--radius-sm)",
              cursor: "default",
              transition: "all 0.15s",
              transform: hoveredCell?.topic_id === cell.topic_id ? "scale(1.03)" : "scale(1)",
              boxShadow: hoveredCell?.topic_id === cell.topic_id
                ? `0 8px 24px ${masteryColor(cell.mastery)}33`
                : "none",
            }}
          >
            {/* Mastery fill bar (subtle) */}
            <div style={{
              position: "absolute", bottom: 0, left: 0,
              height: 3, width: `${cell.mastery * 100}%`,
              background: masteryColor(cell.mastery),
              borderRadius: "0 0 0 var(--radius-sm)",
            }} />

            <div style={{
              fontSize: 22, fontWeight: 800,
              color: masteryColor(cell.mastery),
              fontFamily: "var(--font-mono)", lineHeight: 1,
              marginBottom: 6,
            }}>
              {(cell.mastery * 100).toFixed(0)}%
            </div>

            <div style={{
              fontSize: 12, fontWeight: 600,
              color: "var(--text-primary)", lineHeight: 1.3,
              marginBottom: 8,
            }}>
              {cell.topic_name}
            </div>

            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              {cell.subject}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {cell.total_attempts} attempts
              </span>
              <TrendIcon trend={cell.trend} />
            </div>

            {/* Tooltip on hover */}
            {hoveredCell?.topic_id === cell.topic_id && (
              <div style={{
                position: "absolute", zIndex: 50,
                bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                background: "var(--bg-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", padding: "10px 14px",
                width: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                pointerEvents: "none",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
                  {cell.topic_name}
                </div>
                <DetailRow label="Mastery" value={`${(cell.mastery * 100).toFixed(1)}%`} />
                <DetailRow label="Accuracy" value={`${(cell.accuracy * 100).toFixed(1)}%`} />
                <DetailRow label="Attempts" value={String(cell.total_attempts)} />
                <DetailRow label="Correct" value={String(cell.correct_attempts)} />
                <DetailRow
                  label="7d trend"
                  value={`${cell.trend >= 0 ? "+" : ""}${(cell.trend * 100).toFixed(1)}%`}
                  color={cell.trend > 0 ? "var(--success)" : cell.trend < 0 ? "var(--danger)" : "var(--text-muted)"}
                />
                <div style={{
                  marginTop: 8, padding: "4px 8px", borderRadius: 100,
                  background: masteryBg(cell.mastery), textAlign: "center",
                  fontSize: 11, fontWeight: 600, color: masteryColor(cell.mastery),
                }}>
                  {masteryLabel(cell.mastery)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: number }) {
  if (trend > 0.01) return <TrendingUp size={12} color="var(--success)" />;
  if (trend < -0.01) return <TrendingDown size={12} color="var(--danger)" />;
  return <Minus size={12} color="var(--text-muted)" />;
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: color ?? "var(--text-secondary)" }}>{value}</span>
    </div>
  );
}
