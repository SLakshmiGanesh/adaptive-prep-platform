import Link from "next/link";
import { Brain, ArrowRight, Zap, Target, RefreshCw, BookOpen } from "lucide-react";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-0)", overflow: "hidden" }}>
      {/* Background gradients */}
      <div style={{
        position: "fixed", top: -300, left: "50%", transform: "translateX(-50%)",
        width: 800, height: 800, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(108,99,255,0.1) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Nav */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 60px", borderBottom: "1px solid var(--border)",
        background: "rgba(8,9,12,0.8)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 18 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, var(--accent), var(--accent-bright))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Brain size={18} color="#fff" />
          </div>
          LearnEngine
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/auth"><button className="btn btn-ghost">Sign In</button></Link>
          <Link href="/auth"><button className="btn btn-primary">Get Started <ArrowRight size={14} /></button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "120px 40px 80px", maxWidth: 800, margin: "0 auto" }}>
        <div className="fade-up" style={{ marginBottom: 16 }}>
          <span className="badge badge-accent" style={{ fontSize: 12 }}>
            <Zap size={11} style={{ marginRight: 4 }} />
            Powered by AI · Bayesian Knowledge Tracing · RAG
          </span>
        </div>
        <h1 className="fade-up fade-up-1" style={{ fontSize: 64, lineHeight: 1.08, marginBottom: 24 }}>
          The smartest way<br />
          to <span style={{ color: "var(--accent-bright)" }}>crack your exam</span>
        </h1>
        <p className="fade-up fade-up-2" style={{
          fontSize: 20, color: "var(--text-secondary)", lineHeight: 1.7,
          marginBottom: 48, fontFamily: "var(--font-body)",
        }}>
          LearnEngine tracks your mastery topic by topic, builds your optimal daily
          study plan, and gives you an AI tutor that reads your textbooks.
          Built for JEE · NEET · UPSC · and beyond.
        </p>
        <div className="fade-up fade-up-3" style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <Link href="/auth">
            <button className="btn btn-primary" style={{ padding: "14px 32px", fontSize: 16 }}>
              Start for free <ArrowRight size={16} />
            </button>
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 40px 120px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className={`card fade-up fade-up-${i + 2}`}
              style={{ padding: "28px 32px" }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10, marginBottom: 16,
                background: `${f.color}22`, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <f.icon size={22} color={f.color} />
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const FEATURES = [
  {
    icon: Brain,
    color: "var(--accent-bright)",
    title: "Bayesian Knowledge Tracking",
    desc: "Every answer updates your mastery model using Bayesian Knowledge Tracing — the same algorithm used by top adaptive learning platforms. No more guessing what you know.",
  },
  {
    icon: Target,
    color: "var(--success)",
    title: "Adaptive IRT Quizzes",
    desc: "Questions are selected using Item Response Theory to match your exact ability level — hard enough to challenge you, easy enough to build confidence.",
  },
  {
    icon: RefreshCw,
    color: "var(--warning)",
    title: "Spaced Repetition Engine",
    desc: "SM-2 algorithm schedules your revisions at the perfect moment — just before you would have forgotten. Never let hard-won knowledge decay.",
  },
  {
    icon: BookOpen,
    color: "var(--danger)",
    title: "AI Tutor with Your Textbooks",
    desc: "Ask any concept doubt and get an answer grounded in your NCERT, reference books, and notes — via RAG retrieval, not hallucination.",
  },
];
