"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, XCircle, Zap, Clock,
  ChevronRight, Brain, BarChart2, Loader2, Star
} from "lucide-react";
import { quiz, plan, getToken } from "@/lib/api";
import type { Question, SubmitResponse, PlanItem } from "@/lib/api";
import QuizCard from "@/components/QuizCard";

type Phase = "select" | "quiz" | "result";

export default function QuizPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("select");
  const [topics, setTopics] = useState<PlanItem[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<PlanItem | null>(null);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [lastResult, setLastResult] = useState<SubmitResponse | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, streak: 0, xp: 0 });
  const [loadingQ, setLoadingQ] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.replace("/auth"); return; }
    plan.today(8).then(setTopics).catch(() => {});
  }, []);

  async function startQuiz(topic: PlanItem) {
    setSelectedTopic(topic);
    setSessionStats({ correct: 0, wrong: 0, streak: 0, xp: 0 });
    setPhase("quiz");
    await loadNextQuestion(topic.topic_id);
  }

  async function loadNextQuestion(topicId: string) {
    setLoadingQ(true);
    setLastResult(null);
    try {
      const q = await quiz.next(topicId);
      setCurrentQ(q);
    } catch (e: any) {
      alert(e.message ?? "No questions available for this topic");
      setPhase("select");
    } finally {
      setLoadingQ(false);
    }
  }

  async function handleSubmit(answer: string, timeSec: number, confidence: number) {
    if (!currentQ) return;
    const result = await quiz.submit({
      question_id: currentQ.question_id,
      answer,
      time_taken_sec: timeSec,
      confidence,
    });
    setLastResult(result);
    setSessionStats((s) => ({
      correct: s.correct + (result.correct ? 1 : 0),
      wrong: s.wrong + (result.correct ? 0 : 1),
      streak: result.correct ? s.streak + 1 : 0,
      xp: s.xp + result.xp_gained,
    }));
  }

  function handleNext() {
    if (selectedTopic) loadNextQuestion(selectedTopic.topic_id);
  }

  // ── Topic Selection ──────────────────────────────────────────────────────

  if (phase === "select") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-0)", padding: "40px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14, marginBottom: 32, textDecoration: "none" }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>

          <h1 className="fade-up" style={{ marginBottom: 8 }}>Choose a Topic</h1>
          <p className="fade-up fade-up-1" style={{ color: "var(--text-secondary)", marginBottom: 32 }}>
            Questions adapt to your mastery level in real time.
          </p>

          {topics.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <Brain size={36} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-muted)" }}>No topics in your plan yet. Set up your study plan first.</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {topics.map((t, i) => (
              <button
                key={t.topic_id}
                onClick={() => startQuiz(t)}
                className={`fade-up`}
                style={{
                  animationDelay: `${i * 0.04}s`,
                  width: "100%", textAlign: "left",
                  background: "var(--surface-1)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius)", padding: "20px 24px",
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-accent)";
                  (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLElement).style.background = "var(--surface-1)";
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{t.topic_name}</span>
                    {t.revision_due && (
                      <span className="badge badge-warning">Due for Revision</span>
                    )}
                    <span className="badge badge-accent">{t.subject}</span>
                  </div>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <MasteryBar value={t.current_mastery} />
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {t.duration_min} min · Priority {(t.priority * 100).toFixed(0)}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Active Quiz ──────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-0)" }}>
      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(8,9,12,0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <button
          onClick={() => setPhase("select")}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14 }}
        >
          <ArrowLeft size={16} /> {selectedTopic?.topic_name}
        </button>

        {/* Session stats */}
        <div style={{ display: "flex", gap: 24 }}>
          <StatPill icon={<CheckCircle2 size={14} />} value={sessionStats.correct} color="var(--success)" label="Correct" />
          <StatPill icon={<XCircle size={14} />} value={sessionStats.wrong} color="var(--danger)" label="Wrong" />
          {sessionStats.streak >= 3 && (
            <StatPill icon={<Zap size={14} />} value={sessionStats.streak} color="var(--warning)" label="Streak" />
          )}
          <StatPill icon={<Star size={14} />} value={sessionStats.xp} color="var(--accent-bright)" label="XP" />
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
        {loadingQ ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 80 }}>
            <Loader2 size={32} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
            <p style={{ color: "var(--text-muted)" }}>Loading next question…</p>
          </div>
        ) : currentQ ? (
          <QuizCard
            question={currentQ}
            result={lastResult}
            onSubmit={handleSubmit}
            onNext={handleNext}
          />
        ) : null}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function MasteryBar({ value }: { value: number }) {
  const pct = value * 100;
  const color = pct < 30 ? "var(--danger)" : pct < 60 ? "var(--warning)" : "var(--success)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 80, height: 4, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function StatPill({ icon, value, color, label }: { icon: React.ReactNode; value: number; color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color }}>{value}</span>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
