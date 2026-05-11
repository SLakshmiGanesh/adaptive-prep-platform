"use client";

import { useState } from "react";
import {
  BookOpen, RefreshCw, CheckCircle2, Clock,
  ChevronRight, AlertTriangle, Zap, Target
} from "lucide-react";
import Link from "next/link";
import { plan } from "@/lib/api";
import type { PlanItem } from "@/lib/api";

interface StudyFeedProps {
  items: PlanItem[];
  onComplete?: () => void;
}

export default function StudyFeed({ items, onComplete }: StudyFeedProps) {
  const [completing, setCompleting] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  async function markComplete(item: PlanItem) {
    setCompleting(item.topic_id);
    try {
      await plan.complete({
        topic_id: item.topic_id,
        duration_min: item.duration_min,
        session_type: item.session_type,
      });
      setCompleted((prev) => new Set([...prev, item.topic_id]));
      onComplete?.();
    } catch (e) {
      console.error(e);
    } finally {
      setCompleting(null);
    }
  }

  const remaining = items.filter((i) => !completed.has(i.topic_id));
  const doneCount  = completed.size;
  const totalMin   = items.reduce((s, i) => s + i.duration_min, 0);
  const doneMin    = items
    .filter((i) => completed.has(i.topic_id))
    .reduce((s, i) => s + i.duration_min, 0);

  return (
    <div className="card" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
            Today's Study Plan
          </h3>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {doneCount}/{items.length} done
          </span>
        </div>

        {/* Overall progress */}
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: totalMin > 0 ? `${(doneMin / totalMin) * 100}%` : "0%" }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
          <span>{doneMin} / {totalMin} min completed</span>
          {doneCount === items.length && items.length > 0 && (
            <span style={{ color: "var(--success)", fontWeight: 600 }}>✓ All done!</span>
          )}
        </div>
      </div>

      {/* Items */}
      {items.length === 0 && (
        <div style={{ padding: "32px 0", textAlign: "center" }}>
          <BookOpen size={32} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            No study plan generated yet.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, i) => {
          const isDone = completed.has(item.topic_id);
          const isLoading = completing === item.topic_id;

          return (
            <div
              key={item.topic_id}
              className="fade-up"
              style={{
                animationDelay: `${i * 0.04}s`,
                padding: "16px 18px",
                background: isDone ? "rgba(34,211,165,0.05)" : "var(--surface-2)",
                border: `1px solid ${isDone ? "rgba(34,211,165,0.25)" : item.revision_due ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
                borderRadius: "var(--radius-sm)",
                opacity: isDone ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {/* Type icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: item.revision_due
                    ? "rgba(245,158,11,0.15)"
                    : "var(--accent-glow)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {item.revision_due
                    ? <RefreshCw size={16} color="var(--warning)" />
                    : item.session_type === "quiz"
                      ? <Target size={16} color="var(--accent-bright)" />
                      : <BookOpen size={16} color="var(--accent-bright)" />
                  }
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: isDone ? "var(--success)" : "var(--text-primary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {isDone && "✓ "}{item.topic_name}
                    </span>
                    {item.revision_due && !isDone && (
                      <AlertTriangle size={12} color="var(--warning)" />
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {item.subject}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
                      <Clock size={11} />
                      {item.duration_min} min
                    </div>
                    {/* Mastery mini-bar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 40, height: 3, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          width: `${item.current_mastery * 100}%`, height: "100%",
                          background: item.current_mastery < 0.4 ? "var(--danger)"
                            : item.current_mastery < 0.7 ? "var(--warning)"
                            : "var(--success)",
                          borderRadius: 2,
                        }} />
                      </div>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        {(item.current_mastery * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {!isDone && (
                    <>
                      <Link href={`/quiz?topic=${item.topic_id}`}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                        >
                          <Zap size={13} /> Quiz
                        </button>
                      </Link>
                      <button
                        className="btn btn-primary"
                        onClick={() => markComplete(item)}
                        disabled={isLoading}
                        style={{ padding: "6px 10px", fontSize: 12 }}
                      >
                        {isLoading
                          ? "…"
                          : <><CheckCircle2 size={13} /> Done</>
                        }
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {remaining.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {remaining.length} topics remaining · {remaining.reduce((s, i) => s + i.duration_min, 0)} min
          </span>
          <Link href="/quiz">
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 14px" }}>
              Start Quizzing <ChevronRight size={13} />
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
