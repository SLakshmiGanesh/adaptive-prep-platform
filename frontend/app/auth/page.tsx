"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Brain, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { auth, setToken, getToken } from "@/lib/api";

type Mode = "login" | "register";

const EXAM_OPTIONS = [
  { value: "JEE",      label: "JEE (Mains + Advanced)" },
  { value: "NEET",     label: "NEET" },
  { value: "UPSC",     label: "UPSC Civil Services" },
  { value: "semester", label: "University Semester" },
];

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [examTarget, setExamTarget] = useState("JEE");
  const [examDate, setExamDate] = useState("");

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let res;
      if (mode === "login") {
        res = await auth.login(email, password);
      } else {
        res = await auth.register({
          email, password, name, exam_target: examTarget,
          exam_date: examDate || undefined,
        });
      }
      setToken(res.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-0)",
      display: "flex",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background gradient blobs */}
      <div style={{
        position: "absolute", top: -200, left: -200,
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -200, right: -100,
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(34,211,165,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "80px 60px",
        borderRight: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 460 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, var(--accent), var(--accent-bright))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Brain size={24} color="#fff" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em" }}>
              LearnEngine
            </span>
          </div>

          <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
            Study smarter.<br />
            <span style={{ color: "var(--accent-bright)" }}>Score higher.</span>
          </h1>

          <p style={{ color: "var(--text-secondary)", fontSize: 16, lineHeight: 1.7, marginBottom: 48 }}>
            An AI-powered platform that learns how you learn — adapting
            every quiz, plan, and revision to maximize your exam score.
          </p>

          {/* Feature bullets */}
          {[
            { icon: "🧠", text: "Bayesian knowledge tracking per topic" },
            { icon: "📅", text: "AI-generated daily study plans" },
            { icon: "🔁", text: "Spaced repetition that never lets you forget" },
            { icon: "🤖", text: "24/7 AI tutor with your textbooks as context" },
          ].map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              marginBottom: 16, padding: "14px 18px",
              background: "var(--surface-1)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
            }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: 480, display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "60px 48px",
      }}>
        {/* Tab switcher */}
        <div style={{
          display: "flex", background: "var(--surface-1)",
          border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
          padding: 4, marginBottom: 36,
        }}>
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1, padding: "10px", borderRadius: "var(--radius-sm)",
                border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
                fontFamily: "var(--font-display)",
                background: mode === m ? "var(--accent)" : "transparent",
                color: mode === m ? "#fff" : "var(--text-muted)",
                transition: "all 0.2s",
              }}
            >
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "register" && (
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Full Name
              </label>
              <input
                className="input"
                type="text"
                placeholder="Arjun Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Email
            </label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute", right: 14, top: "50%",
                  transform: "translateY(-50%)", background: "none",
                  border: "none", cursor: "pointer", color: "var(--text-muted)",
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Target Exam
                </label>
                <select
                  className="input"
                  value={examTarget}
                  onChange={(e) => setExamTarget(e.target.value)}
                >
                  {EXAM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} style={{ background: "var(--bg-2)" }}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Exam Date (optional)
                </label>
                <input
                  className="input"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </>
          )}

          {error && (
            <div style={{
              background: "var(--danger-dim)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "var(--radius-sm)", padding: "12px 16px",
              fontSize: 13, color: "var(--danger)",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: 8, padding: "14px", fontSize: 15 }}
          >
            {loading ? (
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <>
                {mode === "login" ? "Sign In" : "Create Account"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
