"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, XCircle, Zap, Clock,
  ChevronRight, Brain, Target, Loader2, Star,
  TrendingUp, BarChart2, Hash, AlertCircle
} from "lucide-react";
import { quiz, plan, auth, token } from "@/lib/api";
import type { Question, SubmitRes, PlanItem, UserProfile } from "@/lib/api";

/* ── Session Stats ───────────────────────────────────────────────────────────── */
interface SessionStats {
  correct: number; wrong: number; streak: number;
  maxStreak: number; xp: number; avgTime: number; timesList: number[];
}

export default function QuizPage() {
  return (
    <Suspense fallback={<QuizLoading />}>
      <QuizPageContent />
    </Suspense>
  );
}

function QuizLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--void)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={24} color="var(--phosphor)" style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function QuizPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTopic = searchParams.get("topic");

  const [user, setUser] = useState<UserProfile | null>(null);
  const [topics, setTopics] = useState<PlanItem[]>([]);
  const [phase, setPhase] = useState<"select" | "quiz" | "summary">("select");
  const [selectedTopic, setSelectedTopic] = useState<PlanItem | null>(null);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [lastResult, setLastResult] = useState<SubmitRes | null>(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [qCount, setQCount] = useState(0);
  const [stats, setStats] = useState<SessionStats>({ correct: 0, wrong: 0, streak: 0, maxStreak: 0, xp: 0, avgTime: 0, timesList: [] });

  useEffect(() => {
    if (!token.get()) { router.replace("/auth"); return; }
    Promise.all([auth.me(), plan.today(8)]).then(([u, p]) => {
      setUser(u); setTopics(p);
      if (preselectedTopic) {
        const t = p.find(i => i.topic_id === preselectedTopic);
        if (t) { setSelectedTopic(t); startQuiz(t, p); }
      }
    }).catch(() => router.replace("/auth"));
  }, []);

  async function startQuiz(topic: PlanItem, topicList?: PlanItem[]) {
    setSelectedTopic(topic);
    setStats({ correct: 0, wrong: 0, streak: 0, maxStreak: 0, xp: 0, avgTime: 0, timesList: [] });
    setQCount(0); setPhase("quiz");
    await fetchNextQ(topic.topic_id);
  }

  async function fetchNextQ(topicId: string) {
    setLoadingQ(true); setLastResult(null);
    try {
      const q = await quiz.next(topicId);
      setCurrentQ(q); setQCount(c => c + 1);
    } catch (e: any) {
      alert(e.message ?? "No questions available");
      setPhase("select");
    } finally { setLoadingQ(false); }
  }

  async function handleSubmit(answer: string, timeSec: number, confidence: number) {
    if (!currentQ) return;
    const res = await quiz.submit({
      question_id: currentQ.question_id,
      answer, time_taken_sec: timeSec, confidence,
    });
    setLastResult(res);
    setStats(s => {
      const newStreak = res.correct ? s.streak + 1 : 0;
      const newTimes = [...s.timesList, timeSec];
      return {
        correct: s.correct + (res.correct ? 1 : 0),
        wrong: s.wrong + (res.correct ? 0 : 1),
        streak: newStreak,
        maxStreak: Math.max(s.maxStreak, newStreak),
        xp: s.xp + res.xp_gained,
        avgTime: newTimes.reduce((a, b) => a + b, 0) / newTimes.length,
        timesList: newTimes,
      };
    });
  }

  function handleNext() {
    if (selectedTopic) fetchNextQ(selectedTopic.topic_id);
  }

  function endSession() { setPhase("summary"); }

  /* ── Topic Selection ─────────────────────────────────────────────────────── */
  if (phase === "select") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--void)" }}>
        <div className="mesh-bg" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
          <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--t3)", fontSize: 13, textDecoration: "none", marginBottom: 28 }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <h1 className="fade-up" style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>
            Adaptive Quiz
          </h1>
          <p className="fade-up stagger-1" style={{ color: "var(--t2)", fontSize: 14, marginBottom: 28 }}>
            Questions adapt to your exact mastery level using Item Response Theory.
          </p>

          {topics.length === 0 && (
            <div className="card" style={{ padding: 48, textAlign: "center" }}>
              <Brain size={36} color="var(--t3)" style={{ margin: "0 auto 12px" }} />
              <p style={{ color: "var(--t3)" }}>Set up a study plan first to get topic suggestions.</p>
              <Link href="/plan"><button className="btn btn-primary" style={{ marginTop: 16 }}>Go to Plan</button></Link>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topics.map((t, i) => (
              <TopicSelectCard key={t.topic_id} topic={t} idx={i} onStart={() => startQuiz(t)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Quiz Summary ─────────────────────────────────────────────────────────── */
  if (phase === "summary") {
    const accuracy = (stats.correct + stats.wrong) > 0
      ? stats.correct / (stats.correct + stats.wrong) * 100
      : 0;
    return (
      <div style={{ minHeight: "100vh", background: "var(--void)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="mesh-bg" />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 540, width: "100%", padding: 24 }}>
          <div className="card-phosphor fade-up" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>
              {accuracy >= 80 ? "🏆" : accuracy >= 60 ? "⭐" : "💪"}
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Session Complete!</h2>
            <p style={{ color: "var(--t2)", marginBottom: 28 }}>{selectedTopic?.topic_name}</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 28 }}>
              {[
                { label: "Accuracy", value: `${accuracy.toFixed(0)}%`, color: accuracy >= 70 ? "var(--correct)" : "var(--wrong)" },
                { label: "Questions", value: String(stats.correct + stats.wrong), color: "var(--t1)" },
                { label: "XP Earned", value: `+${stats.xp}`, color: "var(--solar)" },
                { label: "Best Streak", value: String(stats.maxStreak), color: "#a78bfa" },
                { label: "Avg Time", value: `${stats.avgTime.toFixed(0)}s`, color: "var(--info)" },
                { label: "Correct", value: String(stats.correct), color: "var(--correct)" },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--raised)", borderRadius: "var(--r)", padding: 14 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--mono)", color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => selectedTopic && startQuiz(selectedTopic)}>
                <RefreshCw size={14} /> Again
              </button>
              <button className="btn btn-volt" style={{ flex: 1 }} onClick={() => setPhase("select")}>
                New Topic <ChevronRight size={14} />
              </button>
              <Link href="/dashboard" style={{ flex: 1 }}>
                <button className="btn btn-primary" style={{ width: "100%" }}>
                  Dashboard <ArrowRight size={14} />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Active Quiz ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: "var(--void)" }}>
      {/* Sticky top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(5,5,7,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--line)",
        padding: "0 24px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button
          onClick={() => setPhase("select")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--t3)", fontSize: 13 }}
        >
          <ArrowLeft size={14} />
          <span style={{ fontWeight: 600 }}>{selectedTopic?.topic_name}</span>
          <span className="badge badge-neutral" style={{ fontSize: 10 }}>Q{qCount}</span>
        </button>

        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <StatPill icon={<CheckCircle2 size={13} />} val={stats.correct} color="var(--correct)" />
          <StatPill icon={<XCircle size={13} />} val={stats.wrong} color="var(--wrong)" />
          {stats.streak >= 3 && <StatPill icon={<Zap size={13} />} val={stats.streak} color="var(--solar)" label="streak" />}
          <StatPill icon={<Star size={13} />} val={stats.xp} color="#a78bfa" label="XP" />
          <button className="btn btn-ghost btn-sm" onClick={endSession}>End Session</button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        {loadingQ ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 80 }}>
            <Loader2 size={32} color="var(--phosphor)" style={{ animation: "spin 1s linear infinite" }} />
            <p style={{ color: "var(--t3)" }}>Loading next question…</p>
          </div>
        ) : currentQ ? (
          <QuizCard question={currentQ} result={lastResult} onSubmit={handleSubmit} onNext={handleNext} />
        ) : null}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Topic Select Card ───────────────────────────────────────────────────────── */
function TopicSelectCard({ topic, idx, onStart }: { topic: PlanItem; idx: number; onStart: () => void }) {
  const mc = topic.current_mastery < 0.3 ? "var(--wrong)" : topic.current_mastery < 0.6 ? "var(--solar)" : "var(--correct)";
  return (
    <button
      onClick={onStart}
      className="card fade-up"
      style={{
        animationDelay: `${idx * 0.04}s`,
        width: "100%", textAlign: "left",
        padding: "18px 22px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 16,
        border: `1px solid ${topic.revision_due ? "rgba(245,158,11,0.25)" : "var(--line)"}`,
        fontFamily: "var(--sans)", transition: "all 0.15s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,255,136,0.3)"; (e.currentTarget as HTMLElement).style.background = "rgba(0,255,136,0.02)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = topic.revision_due ? "rgba(245,158,11,0.25)" : "var(--line)"; (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `${mc}15`, border: `1px solid ${mc}33`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Target size={18} color={mc} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{topic.topic_name}</span>
          {topic.revision_due && <span className="badge badge-solar">Due</span>}
          <span className="badge badge-neutral">{topic.subject}</span>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 60, height: 3, background: "var(--lift)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${topic.current_mastery * 100}%`, height: "100%", background: mc }} />
            </div>
            <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: mc }}>
              {(topic.current_mastery * 100).toFixed(0)}%
            </span>
          </div>
          <span style={{ fontSize: 12, color: "var(--t3)" }}>{topic.duration_min}min</span>
        </div>
      </div>
      <ChevronRight size={16} color="var(--t3)" />
    </button>
  );
}

/* ── Quiz Card Component ──────────────────────────────────────────────────────── */
const CONFIDENCE_LABELS = ["", "Just guessing", "Not sure", "Fairly sure", "Confident", "100% certain"];

function QuizCard({ question, result, onSubmit, onNext }: {
  question: Question; result: SubmitRes | null;
  onSubmit: (answer: string, time: number, confidence: number) => Promise<void>;
  onNext: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [numericalInput, setNumericalInput] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setSelected(null); setNumericalInput(""); setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [question.question_id]);

  useEffect(() => {
    if (result) clearInterval(timerRef.current);
  }, [result]);

  async function handleSubmit() {
    if (submitting) return;
    const answer = question.question_type === "numerical" ? numericalInput : selected;
    if (!answer) return;
    setSubmitting(true);
    try { await onSubmit(answer, elapsed, confidence); }
    finally { setSubmitting(false); }
  }

  const diffColor = question.difficulty < 0.33 ? "var(--correct)" : question.difficulty < 0.67 ? "var(--solar)" : "var(--wrong)";
  const diffLabel = question.difficulty_label ?? (question.difficulty < 0.33 ? "Easy" : question.difficulty < 0.67 ? "Medium" : "Hard");
  const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");
  const isNumerical = question.question_type === "numerical";
  const canSubmit = isNumerical ? numericalInput.trim() !== "" : selected !== null;

  return (
    <div className="fade-up">
      {/* Meta */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="badge badge-neutral">{question.topic_name}</span>
          <span style={{
            padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
            background: `${diffColor}15`, color: diffColor, border: `1px solid ${diffColor}33`,
          }}>
            {diffLabel}
          </span>
          {isNumerical && (
            <span className="badge badge-volt">
              <Hash size={9} /> Numerical
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--mono)", fontSize: 14, color: elapsed > 60 ? "var(--solar)" : elapsed > 120 ? "var(--wrong)" : "var(--t3)" }}>
          <Clock size={13} />
          {mm}:{ss}
        </div>
      </div>

      {/* Question */}
      <div className="card" style={{ padding: 28, marginBottom: 18 }}>
        <p style={{ fontSize: 18, lineHeight: 1.7, fontFamily: "var(--serif)", color: "var(--t1)", margin: 0 }}>
          {question.text}
        </p>
      </div>

      {/* MCQ / MSQ Options */}
      {!isNumerical && question.options.map(opt => {
        let bg = "var(--surface)", border = "var(--line)", color = "var(--t2)";
        if (result) {
          if (opt.id === result.correct_answer) { bg = "var(--correct-bg)"; border = "rgba(0,255,136,0.3)"; color = "var(--correct)"; }
          else if (opt.id === selected && !result.correct) { bg = "var(--wrong-bg)"; border = "rgba(255,71,87,0.3)"; color = "var(--wrong)"; }
          else { bg = "var(--raised)"; color = "var(--t3)"; }
        } else if (selected === opt.id) {
          bg = "rgba(0,255,136,0.06)"; border = "rgba(0,255,136,0.35)"; color = "var(--phosphor)";
        }
        return (
          <button
            key={opt.id}
            onClick={() => !result && !submitting && setSelected(opt.id)}
            style={{
              width: "100%", textAlign: "left", padding: "14px 18px",
              border: `1px solid ${border}`, borderRadius: "var(--r-md)",
              background: bg, cursor: result ? "default" : "pointer",
              fontFamily: "var(--sans)", fontSize: 14, color,
              transition: "all 0.15s", marginBottom: 10,
              display: "flex", alignItems: "flex-start", gap: 12,
            }}
          >
            <span style={{
              width: 26, height: 26, borderRadius: 6, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)",
              background: selected === opt.id && !result ? "var(--phosphor)" : "var(--raised)",
              color: selected === opt.id && !result ? "var(--void)" : "var(--t3)",
            }}>
              {opt.id}
            </span>
            <span style={{ flex: 1, lineHeight: 1.6 }}>{opt.text}</span>
            {result && opt.id === result.correct_answer && <CheckCircle2 size={16} color="var(--correct)" style={{ flexShrink: 0, marginTop: 2 }} />}
            {result && opt.id === selected && !result.correct && opt.id !== result.correct_answer && <XCircle size={16} color="var(--wrong)" style={{ flexShrink: 0, marginTop: 2 }} />}
          </button>
        );
      })}

      {/* Numerical input (GATE-style) */}
      {isNumerical && !result && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Your Answer
          </label>
          <input
            className="input"
            type="number"
            placeholder="Enter numerical value..."
            value={numericalInput}
            onChange={e => setNumericalInput(e.target.value)}
            style={{ fontSize: 18, fontFamily: "var(--mono)", textAlign: "center", padding: "14px" }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
          <p style={{ fontSize: 11, color: "var(--t3)", marginTop: 6, textAlign: "center" }}>
            For GATE: Enter exact value. Use decimal point for fractions.
          </p>
        </div>
      )}
      {isNumerical && result && (
        <div style={{ marginBottom: 16, padding: "14px 18px", borderRadius: "var(--r-md)", background: result.correct ? "var(--correct-bg)" : "var(--wrong-bg)", border: `1px solid ${result.correct ? "rgba(0,255,136,0.3)" : "rgba(255,71,87,0.3)"}` }}>
          <p style={{ fontSize: 14, color: result.correct ? "var(--correct)" : "var(--wrong)" }}>
            Your answer: <strong style={{ fontFamily: "var(--mono)" }}>{numericalInput}</strong>
            {" · "}Correct: <strong style={{ fontFamily: "var(--mono)" }}>{result.correct_answer}</strong>
          </p>
        </div>
      )}

      {/* Confidence (shown after selection, before submit) */}
      {canSubmit && !result && (
        <div className="fade-up" style={{ padding: "14px 18px", background: "var(--raised)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: "var(--t3)", marginBottom: 10 }}>How confident are you?</p>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setConfidence(n)}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: "var(--r)",
                  border: `1px solid ${confidence === n ? "var(--phosphor)" : "var(--line)"}`,
                  background: confidence === n ? "rgba(0,255,136,0.1)" : "var(--surface)",
                  color: confidence === n ? "var(--phosphor)" : "var(--t3)",
                  cursor: "pointer", fontSize: 13, fontWeight: 700,
                  fontFamily: "var(--mono)", transition: "all 0.1s",
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "var(--phosphor)", marginTop: 8, textAlign: "center" }}>
            {CONFIDENCE_LABELS[confidence]}
          </p>
        </div>
      )}

      {/* Result feedback */}
      {result && (
        <div className="fade-up" style={{
          padding: "18px 22px",
          borderRadius: "var(--r-md)",
          background: result.correct ? "var(--correct-bg)" : "var(--wrong-bg)",
          border: `1px solid ${result.correct ? "rgba(0,255,136,0.25)" : "rgba(255,71,87,0.25)"}`,
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: result.explanation ? 10 : 0 }}>
            {result.correct
              ? <CheckCircle2 size={18} color="var(--correct)" />
              : <XCircle size={18} color="var(--wrong)" />
            }
            <span style={{ fontWeight: 700, color: result.correct ? "var(--correct)" : "var(--wrong)", fontSize: 15 }}>
              {result.correct ? "Correct!" : "Incorrect"}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--solar)", fontFamily: "var(--mono)", fontWeight: 700 }}>
              +{result.xp_gained} XP
            </span>
            <span style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)" }}>
              Mastery {(result.new_mastery * 100).toFixed(1)}%
              <span style={{ color: result.mastery_delta >= 0 ? "var(--correct)" : "var(--wrong)", marginLeft: 4 }}>
                {result.mastery_delta >= 0 ? "↑" : "↓"}{(Math.abs(result.mastery_delta) * 100).toFixed(1)}%
              </span>
            </span>
          </div>
          {result.explanation && (
            <p style={{ fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.7, color: "var(--t2)", margin: 0 }}>
              {result.explanation}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        {!result && canSubmit && (
          <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting} style={{ flex: 1 }}>
            {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "Submit Answer"}
          </button>
        )}
        {result && (
          <button className="btn btn-primary btn-lg" onClick={onNext} style={{ flex: 1 }}>
            Next Question <ChevronRight size={16} />
          </button>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StatPill({ icon, val, color, label }: { icon: React.ReactNode; val: number; color: string; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700, color }}>{val}</span>
      {label && <span style={{ fontSize: 11, color: "var(--t3)" }}>{label}</span>}
    </div>
  );
}

// Needed for summary
function RefreshCw({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
}
function ArrowRight({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
}
