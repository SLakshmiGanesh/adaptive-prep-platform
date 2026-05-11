"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap, Brain, BookOpen, Target, TrendingUp,
  Calendar, Award, ChevronRight, Clock, BarChart2,
  RefreshCw, LogOut, Flame
} from "lucide-react";
import { auth, plan, analytics, getToken, clearToken } from "@/lib/api";
import type { UserProfile, PlanItem, Prediction, MasteryTrend } from "@/lib/api";
import HeatMap from "@/components/HeatMap";
import ProgressChart from "@/components/ProgressChart";
import StudyFeed from "@/components/StudyFeed";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [todayPlan, setTodayPlan] = useState<PlanItem[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [trend, setTrend] = useState<MasteryTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"plan" | "heatmap" | "predict">("plan");

  useEffect(() => {
    if (!getToken()) { router.replace("/auth"); return; }
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [u, p, t] = await Promise.all([
        auth.me(),
        plan.today(4),
        analytics.masteryTrend(30),
      ]);
      setUser(u);
      setTodayPlan(p);
      setTrend(t);
      // Load prediction separately (may fail if no data yet)
      analytics.predict().then(setPrediction).catch(() => {});
    } catch {
      router.replace("/auth");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearToken();
    router.replace("/auth");
  }

  const masteryAvg = trend.length > 0
    ? trend[trend.length - 1].avg_mastery
    : 0;

  const totalMinutesToday = todayPlan.reduce((s, i) => s + i.duration_min, 0);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="noise-overlay" style={{ minHeight: "100vh", background: "var(--bg-0)" }}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 220,
        background: "var(--bg-1)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", padding: "24px 16px", zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: 18, color: "var(--text-primary)",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent), var(--accent-bright))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Brain size={18} color="#fff" />
            </div>
            LearnEngine
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <Link href="/dashboard" className="nav-item active">
            <BarChart2 size={16} /> Dashboard
          </Link>
          <Link href="/quiz" className="nav-item">
            <Target size={16} /> Quiz
          </Link>
          <Link href="/tutor" className="nav-item">
            <BookOpen size={16} /> AI Tutor
          </Link>
        </nav>

        {/* User info */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {user?.exam_target ?? "No exam set"}
            </div>
          </div>
          {/* XP bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>XP</span>
              <span style={{ fontSize: 11, color: "var(--accent-bright)", fontFamily: "var(--font-mono)" }}>
                {user?.xp ?? 0}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(100, ((user?.xp ?? 0) % 500) / 5)}%` }} />
            </div>
          </div>
          <button className="btn btn-ghost" style={{ width: "100%", fontSize: 13 }} onClick={logout}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main style={{ marginLeft: 220, padding: "32px 40px", maxWidth: 1200 }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 4 }}>
              Good {getGreeting()}, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              {todayPlan.length > 0
                ? `${todayPlan.length} topics · ${totalMinutesToday} min planned today`
                : "Set up your study plan to get started"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {user?.streak_days! > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "var(--warning-dim)", border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: "var(--radius-sm)", padding: "6px 14px",
              }}>
                <Flame size={14} color="var(--warning)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--warning)" }}>
                  {user?.streak_days} day streak
                </span>
              </div>
            )}
            <button className="btn btn-ghost" onClick={loadAll} style={{ padding: "8px 12px" }}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────── */}
        <div className="fade-up fade-up-1" style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32,
        }}>
          <StatCard
            icon={<TrendingUp size={18} />}
            label="Avg Mastery"
            value={`${(masteryAvg * 100).toFixed(0)}%`}
            sub="across all topics"
            color="var(--accent)"
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Today's Plan"
            value={`${Math.round(totalMinutesToday / 60 * 10) / 10}h`}
            sub={`${todayPlan.length} topics`}
            color="var(--success)"
          />
          <StatCard
            icon={<Award size={18} />}
            label="XP Earned"
            value={String(user?.xp ?? 0)}
            sub="lifetime points"
            color="var(--warning)"
          />
          {prediction && (
            <StatCard
              icon={<Target size={18} />}
              label="Predicted Score"
              value={`${prediction.predicted_score}`}
              sub={`/ ${prediction.max_score} · ${prediction.percentile}%ile`}
              color="var(--accent-bright)"
            />
          )}
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div className="fade-up fade-up-2" style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["plan", "heatmap", "predict"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`btn ${activeTab === tab ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: 13 }}
            >
              {tab === "plan" && <Calendar size={14} />}
              {tab === "heatmap" && <Zap size={14} />}
              {tab === "predict" && <TrendingUp size={14} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Tab Content ──────────────────────────────────────── */}
        <div className="fade-up fade-up-3">
          {activeTab === "plan" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
              <StudyFeed items={todayPlan} onComplete={loadAll} />
              <ProgressChart data={trend} />
            </div>
          )}
          {activeTab === "heatmap" && <HeatMap />}
          {activeTab === "predict" && prediction && (
            <PredictionPanel prediction={prediction} />
          )}
          {activeTab === "predict" && !prediction && (
            <EmptyState message="Complete some quizzes to unlock score prediction" />
          )}
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function PredictionPanel({ prediction }: { prediction: Prediction }) {
  const pct = (prediction.predicted_score / prediction.max_score) * 100;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <div className="card-glow" style={{ padding: 32 }}>
        <h3 style={{ marginBottom: 24, fontSize: 16, color: "var(--text-secondary)" }}>Predicted Score</h3>
        <div style={{ fontSize: 64, fontWeight: 800, color: "var(--accent-bright)", lineHeight: 1, fontFamily: "var(--font-mono)" }}>
          {prediction.predicted_score}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          out of {prediction.max_score}
        </div>
        <div style={{ marginTop: 24 }}>
          <div className="progress-bar" style={{ height: 8 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
            <span>CI: {prediction.confidence_low} – {prediction.confidence_high}</span>
            <span>{prediction.percentile}th percentile</span>
          </div>
        </div>
        {prediction.days_to_exam !== null && (
          <div style={{ marginTop: 24, padding: "12px 16px", background: "var(--bg-3)", borderRadius: "var(--radius-sm)" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              ⏳ {prediction.days_to_exam} days to exam
            </span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 13, color: "var(--danger)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            ⚠ Weak Topics
          </h4>
          {prediction.weak_topics.map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t.name}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--danger)" }}>
                {(t.mastery * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 13, color: "var(--success)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            ✓ Strong Topics
          </h4>
          {prediction.strong_topics.map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t.name}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--success)" }}>
                {(t.mastery * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card" style={{ padding: 60, textAlign: "center" }}>
      <Brain size={40} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
      <p style={{ color: "var(--text-muted)", fontSize: 15 }}>{message}</p>
      <Link href="/quiz"><button className="btn btn-primary" style={{ marginTop: 20 }}>Start Quiz</button></Link>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ marginLeft: 220, padding: "32px 40px" }}>
      <div className="skeleton" style={{ height: 36, width: 280, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 18, width: 200, marginBottom: 32 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 100 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 400 }} />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
