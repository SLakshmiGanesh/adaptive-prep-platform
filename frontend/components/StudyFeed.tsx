"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, RefreshCw, CheckCircle2, Clock, Zap, AlertTriangle, ChevronRight } from "lucide-react";
import { plan } from "@/lib/api";
import type { PlanItem } from "@/lib/api";

export default function StudyFeed({ items, onComplete }: { items: PlanItem[]; onComplete?: () => void }) {
  const [completing, setCompleting] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  async function markDone(item: PlanItem) {
    setCompleting(item.topic_id);
    try {
      await plan.complete({ topic_id: item.topic_id, duration_min: item.duration_min });
      setCompleted(prev => new Set([...prev, item.topic_id]));
      onComplete?.();
    } finally { setCompleting(null); }
  }

  const totalMin  = items.reduce((s, i) => s + i.duration_min, 0);
  const doneMin   = items.filter(i => completed.has(i.topic_id)).reduce((s, i) => s + i.duration_min, 0);
  const doneCount = completed.size;
  const pct       = totalMin > 0 ? (doneMin / totalMin) * 100 : 0;

  return (
    <div className="card" style={{ padding: 22 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            Today's Study Plan
          </p>
          <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--t3)" }}>
            {doneCount}/{items.length} done
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--t4)" }}>
          <span>{doneMin}/{totalMin} min</span>
          {doneCount === items.length && items.length > 0 && (
            <span style={{ color: "var(--correct)", fontWeight: 600 }}>All done! 🎉</span>
          )}
        </div>
      </div>

      {items.length === 0 && (
        <div style={{ padding: "32px 0", textAlign: "center" }}>
          <BookOpen size={28} color="var(--t4)" style={{ margin: "0 auto 10px" }} />
          <p style={{ color: "var(--t4)", fontSize: 13 }}>No plan yet.</p>
          <Link href="/plan">
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>
              Create Plan
            </button>
          </Link>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => {
          const done = completed.has(item.topic_id);
          const loading = completing === item.topic_id;
          const mc = item.current_mastery < 0.3 ? "var(--wrong)" : item.current_mastery < 0.6 ? "var(--solar)" : "var(--correct)";
          return (
            <div
              key={item.topic_id}
              style={{
                padding: "13px 16px",
                background: done ? "rgba(0,255,136,0.04)" : "var(--raised)",
                border: `1px solid ${done ? "rgba(0,255,136,0.15)" : item.revision_due ? "rgba(245,158,11,0.15)" : "var(--line)"}`,
                borderRadius: "var(--r-md)", opacity: done ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: item.revision_due ? "rgba(245,158,11,0.1)" : "rgba(0,255,136,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {item.revision_due ? <RefreshCw size={14} color="var(--solar)" /> : <BookOpen size={14} color="var(--phosphor)" />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                    {done && <CheckCircle2 size={12} color="var(--correct)" />}
                    <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.topic_name}
                    </span>
                    {item.revision_due && !done && <AlertTriangle size={11} color="var(--solar)" />}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--t3)" }}>{item.subject}</span>
                    <Clock size={10} color="var(--t4)" />
                    <span style={{ fontSize: 11, color: "var(--t4)" }}>{item.duration_min}m</span>
                    <div style={{ width: 36, height: 2, background: "var(--lift)", borderRadius: 1, overflow: "hidden" }}>
                      <div style={{ width: `${item.current_mastery * 100}%`, height: "100%", background: mc }} />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: mc }}>
                      {(item.current_mastery * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {!done && (
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <Link href={`/quiz?topic=${item.topic_id}`}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: "4px 10px" }}>
                        <Zap size={12} />
                      </button>
                    </Link>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => markDone(item)}
                      disabled={!!loading}
                      style={{ padding: "4px 10px" }}
                    >
                      {loading ? "…" : <CheckCircle2 size={12} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "flex-end" }}>
          <Link href="/plan">
            <button className="btn btn-ghost btn-sm">
              Customize Plan <ChevronRight size={12} />
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
