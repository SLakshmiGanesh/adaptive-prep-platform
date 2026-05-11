"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, XCircle, Clock, ChevronRight,
  Lightbulb, Zap, AlertCircle
} from "lucide-react";
import type { Question, SubmitResponse } from "@/lib/api";

interface QuizCardProps {
  question: Question;
  result: SubmitResponse | null;
  onSubmit: (answer: string, timeSec: number, confidence: number) => Promise<void>;
  onNext: () => void;
}

const CONFIDENCE_LABELS = ["", "Just guessing", "Unsure", "Fairly sure", "Confident", "100% certain"];

export default function QuizCard({ question, result, onSubmit, onNext }: QuizCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showConfidence, setShowConfidence] = useState(false);

  // Timer
  useEffect(() => {
    setElapsed(0);
    setSelected(null);
    setShowConfidence(false);
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [question.question_id]);

  function handleOptionClick(optionId: string) {
    if (result || submitting) return;
    setSelected(optionId);
    setShowConfidence(true);
  }

  async function handleSubmit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(selected, elapsed, confidence);
    } finally {
      setSubmitting(false);
    }
  }

  function getOptionStyle(optionId: string): React.CSSProperties {
    const base: React.CSSProperties = {
      width: "100%", textAlign: "left", padding: "16px 20px",
      border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
      cursor: result ? "default" : "pointer",
      fontFamily: "var(--font-display)", fontSize: 14,
      transition: "all 0.15s", marginBottom: 10,
      display: "flex", alignItems: "flex-start", gap: 12,
    };

    if (result) {
      if (optionId === result.correct_answer) {
        return {
          ...base,
          background: "rgba(34,211,165,0.12)",
          border: "1px solid rgba(34,211,165,0.4)",
          color: "var(--success)",
        };
      }
      if (optionId === selected && !result.correct) {
        return {
          ...base,
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.35)",
          color: "var(--danger)",
        };
      }
      return { ...base, background: "var(--surface-1)", color: "var(--text-muted)", opacity: 0.5 };
    }

    if (selected === optionId) {
      return {
        ...base,
        background: "var(--accent-glow)",
        border: "1px solid var(--border-accent)",
        color: "var(--accent-bright)",
      };
    }
    return {
      ...base,
      background: "var(--surface-1)",
      color: "var(--text-secondary)",
    };
  }

  const difficultyLabel = question.difficulty < 0.33 ? "Easy" :
    question.difficulty < 0.67 ? "Medium" : "Hard";
  const difficultyColor = question.difficulty < 0.33 ? "var(--success)" :
    question.difficulty < 0.67 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="fade-up">
      {/* Meta bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <span className="badge badge-accent">{question.topic_name}</span>
          <span style={{
            padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.05em",
            color: difficultyColor, background: `${difficultyColor}22`,
          }}>
            {difficultyLabel}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 13 }}>
          <Clock size={14} />
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {Math.floor(elapsed / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Question */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <p style={{
          fontSize: 18, lineHeight: 1.7,
          fontFamily: "var(--font-body)", color: "var(--text-primary)",
          margin: 0,
        }}>
          {question.text}
        </p>
      </div>

      {/* Options */}
      <div style={{ marginBottom: 20 }}>
        {question.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleOptionClick(opt.id)}
            style={getOptionStyle(opt.id)}
            onMouseEnter={(e) => {
              if (!result && selected !== opt.id) {
                (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
              }
            }}
            onMouseLeave={(e) => {
              if (!result && selected !== opt.id) {
                (e.currentTarget as HTMLElement).style.background = "var(--surface-1)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              }
            }}
          >
            <span style={{
              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
              background: selected === opt.id && !result ? "var(--accent)" : "var(--surface-3)",
              color: selected === opt.id && !result ? "#fff" : "var(--text-muted)",
            }}>
              {opt.id}
            </span>
            <span style={{ flex: 1 }}>{opt.text}</span>
            {result && opt.id === result.correct_answer && (
              <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0 }} />
            )}
            {result && opt.id === selected && !result.correct && opt.id !== result.correct_answer && (
              <XCircle size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
            )}
          </button>
        ))}
      </div>

      {/* Confidence selector (shown after selecting) */}
      {showConfidence && !result && (
        <div className="fade-up" style={{
          background: "var(--surface-1)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)", padding: "16px 20px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            How confident are you?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setConfidence(n)}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: "var(--radius-sm)",
                  border: `1px solid ${confidence === n ? "var(--accent)" : "var(--border)"}`,
                  background: confidence === n ? "var(--accent-glow)" : "var(--surface-2)",
                  color: confidence === n ? "var(--accent-bright)" : "var(--text-muted)",
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                  fontFamily: "var(--font-display)", transition: "all 0.1s",
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--accent-bright)", marginTop: 8 }}>
            {CONFIDENCE_LABELS[confidence]}
          </div>
        </div>
      )}

      {/* Result feedback */}
      {result && (
        <div className="fade-up" style={{
          background: result.correct ? "rgba(34,211,165,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${result.correct ? "rgba(34,211,165,0.3)" : "rgba(239,68,68,0.25)"}`,
          borderRadius: "var(--radius-sm)", padding: "20px 24px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: result.explanation ? 12 : 0 }}>
            {result.correct
              ? <CheckCircle2 size={20} color="var(--success)" />
              : <XCircle size={20} color="var(--danger)" />
            }
            <span style={{
              fontSize: 15, fontWeight: 700,
              color: result.correct ? "var(--success)" : "var(--danger)",
            }}>
              {result.correct ? "Correct!" : "Incorrect"}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <Zap size={12} color="var(--warning)" />
              +{result.xp_gained} XP
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              Mastery: {(result.new_mastery * 100).toFixed(1)}%
              {result.mastery_delta >= 0
                ? <span style={{ color: "var(--success)" }}> ↑{(result.mastery_delta * 100).toFixed(1)}%</span>
                : <span style={{ color: "var(--danger)" }}> ↓{(Math.abs(result.mastery_delta) * 100).toFixed(1)}%</span>
              }
            </span>
          </div>

          {result.explanation && (
            <div style={{ display: "flex", gap: 10 }}>
              <Lightbulb size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{
                fontSize: 14, color: "var(--text-secondary)",
                fontFamily: "var(--font-body)", lineHeight: 1.7, margin: 0,
              }}>
                {result.explanation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 12 }}>
        {!result && selected && (
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ flex: 1, padding: "14px" }}
          >
            {submitting ? "Submitting…" : "Submit Answer"}
          </button>
        )}
        {result && (
          <button
            className="btn btn-primary"
            onClick={onNext}
            style={{ flex: 1, padding: "14px" }}
          >
            Next Question <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
