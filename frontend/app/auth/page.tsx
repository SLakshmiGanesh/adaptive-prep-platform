"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Brain, Eye, EyeOff, ArrowRight, Loader2, ChevronRight, Zap } from "lucide-react";
import { auth, token, EXAM_CONFIG } from "@/lib/api";
import type { ExamTarget } from "@/lib/api";

type Mode = "login" | "register";

const EXAM_KEYS = Object.keys(EXAM_CONFIG) as ExamTarget[];

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2>(1); // register step

  // Form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [examTarget, setExamTarget] = useState<ExamTarget>("JEE");
  const [examDate, setExamDate] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState(20);

  useEffect(() => { if (token.get()) router.replace("/dashboard"); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      let res;
      if (mode === "login") {
        res = await auth.login(email, password);
      } else {
        res = await auth.register({
          email, password, name, exam_target: examTarget,
          exam_date: examDate || undefined,
          weekly_goal_hours: weeklyGoal,
        });
      }
      token.set(res.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally { setLoading(false); }
  }

  const selectedExam = EXAM_CONFIG[examTarget];

  return (
    <div style={{
      minHeight: "100vh", background: "var(--void)",
      display: "flex", position: "relative", overflow: "hidden",
    }}>
      {/* Animated background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "10%", left: "5%",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,136,0.04) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", right: "10%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)",
        }} />
        {/* Grid lines */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(0,255,136,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "60px 56px",
        borderRight: "1px solid var(--line)", position: "relative", zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 56 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, var(--phosphor), #00cc6a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 24px rgba(0,255,136,0.3)",
          }}>
            <Brain size={20} color="#050507" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }}>Adaptive Prep Platform</span>
          <span className="badge badge-phosphor" style={{ fontSize: 9 }}>v2.0</span>
        </div>

        <h1 style={{ fontSize: 48, fontWeight: 900, lineHeight: 1.06, letterSpacing: "-0.04em", marginBottom: 20 }}>
          Crack any exam<br />
          <span style={{ color: "var(--phosphor)", textShadow: "0 0 40px rgba(0,255,136,0.3)" }}>
            with AI precision.
          </span>
        </h1>

        <p style={{
          fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.75,
          color: "var(--t2)", marginBottom: 40, maxWidth: 440,
        }}>
          Adaptive quizzes. Bayesian knowledge tracking. An AI tutor that
          reads your textbooks. Spaced repetition that never lets you forget.
          Built for the top 1%.
        </p>

        {/* Exam badges */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Supported Exams
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EXAM_KEYS.map(k => {
              const c = EXAM_CONFIG[k];
              return (
                <div key={k} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 100,
                  background: "var(--raised)", border: "1px solid var(--line)",
                  fontSize: 12, color: "var(--t2)",
                }}>
                  <span style={{ fontSize: 14 }}>{c.icon}</span> {k}
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            ["🧠", "Bayesian Knowledge Tracing per topic"],
            ["🎯", "IRT-adaptive quizzes tuned to your level"],
            ["🔁", "SM-2 spaced repetition that fights forgetting"],
            ["🤖", "AI tutor grounded in your study materials"],
            ["📊", "Live score prediction with confidence intervals"],
            ["⚡", "Smart daily plans you can customize yourself"],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 13, color: "var(--t2)" }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
      <div style={{
        width: 460, display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "48px 40px",
        position: "relative", zIndex: 1,
      }}>
        {/* Mode switcher */}
        <div style={{
          display: "flex", background: "var(--raised)",
          border: "1px solid var(--line)", borderRadius: "var(--r-md)",
          padding: 3, marginBottom: 32,
        }}>
          {(["login", "register"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); setStep(1); }}
              style={{
                flex: 1, padding: "9px", borderRadius: "var(--r)",
                border: "none", cursor: "pointer",
                fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600,
                background: mode === m ? "var(--volt)" : "transparent",
                color: mode === m ? "#fff" : "var(--t3)",
                transition: "all 0.2s",
                boxShadow: mode === m ? "0 0 16px rgba(124,58,237,0.3)" : "none",
              }}
            >
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── LOGIN FORM ───────────────────────────────────────────────── */}
          {mode === "login" && (
            <>
              <Field label="Email" type="email" placeholder="you@example.com" value={email} onChange={setEmail} />
              <PasswordField value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(!showPass)} />
            </>
          )}

          {/* ── REGISTER: STEP 1 (account) ────────────────────────────── */}
          {mode === "register" && step === 1 && (
            <>
              <Field label="Full Name" placeholder="Arjun Sharma" value={name} onChange={setName} />
              <Field label="Email" type="email" placeholder="you@example.com" value={email} onChange={setEmail} />
              <PasswordField value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(!showPass)} />

              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ marginTop: 4 }}
                onClick={() => {
                  if (!name || !email || !password) { setError("Fill all fields"); return; }
                  setError(""); setStep(2);
                }}
              >
                Next — Exam Setup <ChevronRight size={16} />
              </button>

              {error && <ErrorBox msg={error} />}
              <div style={{ fontSize: 11, color: "var(--t3)", textAlign: "center" }}>
                Step 1 of 2 — Account details
              </div>
            </>
          )}

          {/* ── REGISTER: STEP 2 (exam config) ────────────────────────── */}
          {mode === "register" && step === 2 && (
            <>
              <div>
                <label style={labelStyle}>Target Exam</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {EXAM_KEYS.map(k => {
                    const c = EXAM_CONFIG[k];
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setExamTarget(k)}
                        style={{
                          padding: "8px 6px", borderRadius: "var(--r)",
                          border: `1px solid ${examTarget === k ? c.color + "55" : "var(--line)"}`,
                          background: examTarget === k ? c.color + "11" : "var(--raised)",
                          cursor: "pointer", transition: "all 0.15s",
                          display: "flex", flexDirection: "column",
                          alignItems: "center", gap: 3,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{c.icon}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, fontFamily: "var(--sans)",
                          color: examTarget === k ? c.color : "var(--t2)",
                        }}>
                          {k}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedExam && (
                  <p style={{ fontSize: 11, color: "var(--t3)", marginTop: 6 }}>
                    {selectedExam.label} · Max score: {selectedExam.maxScore}
                  </p>
                )}
              </div>

              <Field label="Exam Date (optional)" type="date" value={examDate} onChange={setExamDate} />

              <div>
                <label style={labelStyle}>Weekly Study Goal</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input
                    type="range" min={5} max={60} step={5} value={weeklyGoal}
                    onChange={e => setWeeklyGoal(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "var(--phosphor)" }}
                  />
                  <span style={{
                    fontSize: 16, fontWeight: 700, fontFamily: "var(--mono)",
                    color: "var(--phosphor)", minWidth: 44,
                  }}>
                    {weeklyGoal}h
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
                  Recommended: {weeklyGoal < 15 ? "Light prep" : weeklyGoal < 30 ? "Moderate prep" : "Intense prep"}
                </p>
              </div>

              {error && <ErrorBox msg={error} />}

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>
                  ← Back
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2, padding: "12px" }}>
                  {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <>
                    Launch Dashboard <Zap size={14} />
                  </>}
                </button>
              </div>
              <div style={{ fontSize: 11, color: "var(--t3)", textAlign: "center" }}>
                Step 2 of 2 — Exam configuration
              </div>
            </>
          )}

          {/* ── LOGIN SUBMIT ─────────────────────────────────────────────── */}
          {mode === "login" && (
            <>
              {error && <ErrorBox msg={error} />}
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 4 }}>
                {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <>
                  Sign In <ArrowRight size={16} />
                </>}
              </button>
            </>
          )}
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: "var(--t3)", display: "block",
  marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
};

function Field({ label, type = "text", placeholder, value, onChange }: {
  label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        className="input" type={type} placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)}
        style={{ colorScheme: type === "date" ? "dark" : undefined }}
        required
      />
    </div>
  );
}

function PasswordField({ value, onChange, show, onToggle }: {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) {
  return (
    <div>
      <label style={labelStyle}>Password</label>
      <div style={{ position: "relative" }}>
        <input
          className="input" type={show ? "text" : "password"}
          placeholder="••••••••••" value={value}
          onChange={e => onChange(e.target.value)}
          style={{ paddingRight: 42 }} required
        />
        <button
          type="button" onClick={onToggle}
          style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "var(--t3)",
            display: "flex",
          }}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "var(--wrong-bg)", border: "1px solid rgba(255,71,87,0.3)",
      borderRadius: "var(--r)", padding: "10px 14px",
      fontSize: 13, color: "var(--wrong)",
    }}>
      {msg}
    </div>
  );
}
