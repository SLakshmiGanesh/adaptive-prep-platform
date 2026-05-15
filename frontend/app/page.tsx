import Link from "next/link";
import { EXAM_CONFIG } from "@/lib/api";

export default function LandingPage() {
  const examKeys = Object.keys(EXAM_CONFIG) as (keyof typeof EXAM_CONFIG)[];

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)", position: "relative", overflow: "hidden" }}>
      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage:
          "linear-gradient(rgba(0,255,136,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.025) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }} />

      {/* Glow orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "5%", left: "10%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,136,0.05) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 65%)" }} />
      </div>

      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 56px", borderBottom: "1px solid var(--line)",
        background: "rgba(5,5,7,0.85)", backdropFilter: "blur(16px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, var(--phosphor), #00cc6a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 900, color: "#050507",
          }}>L</div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em" }}>Adaptive Prep Platform</span>
          <span style={{
            fontSize: 9, fontWeight: 700, color: "var(--phosphor)",
            background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)",
            padding: "2px 6px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.08em",
          }}>v2</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/auth">
            <button className="btn btn-ghost">Sign in</button>
          </Link>
          <Link href="/auth">
            <button className="btn btn-primary">Get Started</button>
          </Link>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "100px 40px 80px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div className="fade-up" style={{ marginBottom: 20 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
            color: "var(--phosphor)", background: "rgba(0,255,136,0.08)",
            border: "1px solid rgba(0,255,136,0.2)", padding: "5px 14px", borderRadius: 100,
          }}>
            ✦ AI-Powered Adaptive Learning
          </span>
        </div>

        <h1 className="fade-up stagger-1" style={{
          fontSize: 68, fontWeight: 900, lineHeight: 1.04,
          letterSpacing: "-0.045em", marginBottom: 24,
        }}>
          Study less.<br />
          <span style={{
            color: "var(--phosphor)",
            textShadow: "0 0 60px rgba(0,255,136,0.25)",
          }}>Score more.</span>
        </h1>

        <p className="fade-up stagger-2" style={{
          fontFamily: "var(--serif)", fontSize: 20, lineHeight: 1.7,
          color: "var(--t2)", marginBottom: 44, maxWidth: 620, margin: "0 auto 44px",
        }}>
          Adaptive Prep Platform uses Bayesian Knowledge Tracing and Item Response Theory
          to build the perfect study plan — then adapts it in real time to your performance.
        </p>

        <div className="fade-up stagger-3" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/auth">
            <button className="btn btn-primary btn-xl" style={{ gap: 10 }}>
              Start Free — No Credit Card
              <span style={{ fontSize: 18 }}>→</span>
            </button>
          </Link>
        </div>
      </section>

      {/* ── EXAM BADGES ───────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px 80px", position: "relative", zIndex: 1 }}>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--t4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>
          Optimized for every major exam
        </p>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
          {examKeys.map(k => {
            const c = EXAM_CONFIG[k];
            return (
              <div key={k} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 18px", borderRadius: 100,
                background: "var(--surface)", border: "1px solid var(--line)",
                fontSize: 13, color: "var(--t2)", fontWeight: 600,
              }}>
                <span style={{ fontSize: 18 }}>{c.icon}</span>
                <span>{c.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 40px 100px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="card fade-up"
              style={{ padding: "28px 28px", animationDelay: `${i * 0.07}s` }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, marginBottom: 18,
                background: `${f.color}12`, border: `1px solid ${f.color}25`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.02em" }}>
                {f.title}
              </h3>
              <p style={{
                fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.75,
                color: "var(--t2)", margin: 0,
              }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 680, margin: "0 auto 100px",
        padding: "56px 40px", textAlign: "center",
        background: "var(--surface)", border: "1px solid rgba(0,255,136,0.15)",
        borderRadius: "var(--r-xl)", position: "relative", zIndex: 1,
        boxShadow: "0 0 80px rgba(0,255,136,0.06)",
      }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 14 }}>
          Ready to crack your exam?
        </h2>
        <p style={{ fontFamily: "var(--serif)", fontSize: 16, color: "var(--t2)", lineHeight: 1.7, marginBottom: 32 }}>
          Join thousands of students using AI-powered adaptive learning to
          maximize scores while minimizing study hours.
        </p>
        <Link href="/auth">
          <button className="btn btn-primary btn-xl">
            Create Free Account →
          </button>
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--line)", padding: "24px 56px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "relative", zIndex: 1,
      }}>
        <span style={{ fontSize: 13, color: "var(--t4)" }}>© 2025 Adaptive Prep Platform</span>
        <span style={{ fontSize: 12, color: "var(--t4)" }}>Built for the top 1%</span>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: "🧠", color: "#00ff88",
    title: "Bayesian Knowledge Tracing",
    desc: "Every quiz answer updates your hidden knowledge state using Bayesian inference — the gold standard in adaptive learning science.",
  },
  {
    icon: "🎯", color: "#7c3aed",
    title: "IRT-Adaptive Questions",
    desc: "Item Response Theory selects each question at maximum information density — always at the edge of your current ability.",
  },
  {
    icon: "🔁", color: "#f59e0b",
    title: "SM-2 Spaced Repetition",
    desc: "The SuperMemo-2 algorithm schedules reviews at precisely the right moment — just before forgetting. Never lose hard-won mastery.",
  },
  {
    icon: "🤖", color: "#2196f3",
    title: "RAG-Powered AI Tutor",
    desc: "Ask anything and get answers grounded in your actual study materials. Your textbooks live in a vector database for instant retrieval.",
  },
  {
    icon: "📊", color: "#ff4757",
    title: "Exam Score Prediction",
    desc: "Weighted mastery vectors + exam-specific scoring models forecast your score with confidence intervals — days before the real thing.",
  },
  {
    icon: "⚡", color: "#ffd32a",
    title: "Self-Customizable Plans",
    desc: "AI generates your daily plan, but you control every minute. Add topics, adjust time, and regenerate — your plan, your way.",
  },
  {
    icon: "🏆", color: "#9b59b6",
    title: "Gamification Engine",
    desc: "XP, streaks, badges, and leaderboards built on a composite score that rewards accuracy and consistency — not just volume.",
  },
  {
    icon: "📈", color: "#00b4d8",
    title: "Deep Analytics",
    desc: "Mastery heatmaps, trend charts, subject breakdowns, and weakness clustering give you a complete cognitive picture.",
  },
  {
    icon: "⚙️", color: "#00ff88",
    title: "GATE Numerical Support",
    desc: "Full support for GATE's numerical answer type questions — enter exact decimal values, get instant feedback with explanations.",
  },
];
