"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Brain, BarChart2, Target, BookOpen, RefreshCw, LogOut,
  Flame, Zap, TrendingUp, Clock, Award, ChevronRight,
  Calendar, Users, Star, Activity, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { auth, plan, analytics, gam, token, EXAM_CONFIG } from "@/lib/api";
import type { UserProfile, PlanItem, Prediction, MasteryTrend, GamStats, ExamTarget } from "@/lib/api";
import StudyFeed from "@/components/StudyFeed";
import HeatMap from "@/components/HeatMap";
import ProgressChart from "@/components/ProgressChart";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [todayPlan, setTodayPlan] = useState<PlanItem[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [trend, setTrend] = useState<MasteryTrend[]>([]);
  const [gamStats, setGamStats] = useState<GamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"plan" | "heatmap" | "predict" | "progress">("plan");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!token.get()) { router.replace("/auth"); return; }
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [u, p, t, g] = await Promise.all([
        auth.me(), plan.today(4), analytics.masteryTrend(30), gam.stats(),
      ]);
      setUser(u); setTodayPlan(p); setTrend(t); setGamStats(g);
      analytics.predict().then(setPrediction).catch(() => {});
    } catch { router.replace("/auth"); }
    finally { setLoading(false); setRefreshing(false); }
  }

  async function refresh() {
    setRefreshing(true);
    await loadAll();
  }

  function logout() { token.clear(); router.replace("/auth"); }

  if (loading) return <DashSkeleton />;

  const examCfg = user?.exam_target ? EXAM_CONFIG[user.exam_target as ExamTarget] : null;
  const latestMastery = trend.length > 0 ? trend[trend.length - 1].avg_mastery : 0;
  const masteryDelta = trend.length > 1
    ? trend[trend.length - 1].avg_mastery - trend[trend.length - 2].avg_mastery
    : 0;
  const completedToday = todayPlan.filter(i => i.completed).length;
  const totalMin = todayPlan.reduce((s, i) => s + i.duration_min, 0);
  const doneMin  = todayPlan.filter(i => i.completed).reduce((s, i) => s + i.duration_min, 0);

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--void)", overflow: "hidden" }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <Sidebar user={user} onLogout={logout} />

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", position: "relative" }} className="scroll-area">
        {/* Mesh bg */}
        <div className="mesh-bg" />

        <div style={{ position: "relative", zIndex: 1, padding: "28px 32px", maxWidth: 1200 }}>

          {/* ── HEADER ──────────────────────────────────────────────────── */}
          <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
            <div>
              <p style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {getGreeting()} · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
                {user?.name?.split(" ")[0]}'s Command Center
              </h1>
              {examCfg && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{examCfg.icon}</span>
                  <span style={{ fontSize: 13, color: "var(--t2)" }}>{examCfg.label}</span>
                  {user?.exam_date && (
                    <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--t3)" }}>
                      · {daysUntil(user.exam_date)} days left
                    </span>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={refreshing}>
                <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                Refresh
              </button>
            </div>
          </div>

          {/* ── STATS ROW ───────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
            <StatCard
              label="Avg Mastery" icon={<TrendingUp size={16} />}
              value={`${(latestMastery * 100).toFixed(0)}%`}
              delta={masteryDelta * 100} deltaSuffix="%"
              color="var(--phosphor)" className="fade-up stagger-1"
            />
            <StatCard
              label="Today's Plan" icon={<Clock size={16} />}
              value={`${Math.round(totalMin / 60 * 10) / 10}h`}
              sub={`${completedToday}/${todayPlan.length} topics`}
              color="var(--solar)" className="fade-up stagger-2"
            />
            <StatCard
              label="XP Total" icon={<Zap size={16} />}
              value={(gamStats?.xp ?? 0).toLocaleString()}
              sub={`Level ${gamStats?.level} · ${gamStats?.level_title}`}
              color="#a78bfa" className="fade-up stagger-3"
            />
            {prediction ? (
              <StatCard
                label="Predicted Score" icon={<Target size={16} />}
                value={`${prediction.predicted_score}`}
                sub={`/ ${prediction.max_score} · ${prediction.percentile}%ile`}
                color="var(--info)" className="fade-up stagger-4"
              />
            ) : (
              <div className="card fade-up stagger-4" style={{ padding: 18, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 6, opacity: 0.5 }}>
                <Target size={20} color="var(--t3)" />
                <p style={{ fontSize: 12, color: "var(--t3)", textAlign: "center" }}>Complete quizzes for prediction</p>
              </div>
            )}
          </div>

          {/* ── STREAK + LEVEL BAR ──────────────────────────────────────── */}
          {gamStats && (
            <div className="card fade-up stagger-2" style={{ padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20 }}>
              {gamStats.streak_days > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Flame size={18} color="var(--solar)" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--solar)" }}>
                    {gamStats.streak_days}-day streak
                  </span>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--t3)" }}>Level {gamStats.level} — {gamStats.level_title}</span>
                  <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--t3)" }}>{gamStats.xp_to_next} XP to next</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill progress-fill-volt" style={{ width: `${gamStats.level_progress_pct}%` }} />
                </div>
              </div>
              {gamStats.streak_warning && (
                <span style={{ fontSize: 12, color: "var(--wrong)", background: "var(--wrong-bg)", padding: "4px 10px", borderRadius: "var(--r)", border: "1px solid rgba(255,71,87,0.2)" }}>
                  ⚠ {gamStats.streak_warning}
                </span>
              )}
            </div>
          )}

          {/* ── TABS ─────────────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
            {([
              { id: "plan",     label: "Study Plan",   icon: <Calendar size={14} /> },
              { id: "heatmap",  label: "Mastery Map",  icon: <Activity size={14} /> },
              { id: "progress", label: "Progress",     icon: <TrendingUp size={14} /> },
              { id: "predict",  label: "Prediction",   icon: <Target size={14} /> },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`btn ${tab === t.id ? "btn-primary" : "btn-ghost"} btn-sm`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB CONTENT ──────────────────────────────────────────────── */}
          <div className="fade-in">
            {tab === "plan" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
                <StudyFeed items={todayPlan} onComplete={loadAll} />
                <ProgressChart data={trend} />
              </div>
            )}
            {tab === "heatmap" && <HeatMap />}
            {tab === "progress" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <ProgressChart data={trend} fullHeight />
                <SubjectBreakdown prediction={prediction} />
              </div>
            )}
            {tab === "predict" && prediction && <PredictionView prediction={prediction} user={user} />}
            {tab === "predict" && !prediction && (
              <EmptyPredict />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────────────────── */
function Sidebar({ user, onLogout }: { user: UserProfile | null; onLogout: () => void }) {
  return (
    <aside style={{
      width: 210, flexShrink: 0,
      background: "var(--deep)", borderRight: "1px solid var(--line)",
      display: "flex", flexDirection: "column", padding: "20px 12px",
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, padding: "0 4px" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: "linear-gradient(135deg, var(--phosphor), #00cc6a)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Brain size={15} color="var(--void)" />
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.03em" }}>Adaptive Prep Platform</span>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {[
          { href: "/dashboard",   icon: <BarChart2 size={15} />, label: "Dashboard"    },
          { href: "/quiz",        icon: <Target size={15} />,    label: "Quiz"         },
          { href: "/tutor",       icon: <Brain size={15} />,     label: "AI Tutor"     },
          { href: "/plan",        icon: <Calendar size={15} />,  label: "Study Plan"   },
          { href: "/revisions",   icon: <RefreshCw size={15} />, label: "Revisions"    },
          { href: "/leaderboard", icon: <Users size={15} />,     label: "Leaderboard"  },
        ].map(item => (
          <Link key={item.href} href={item.href} className="nav-link">
            {item.icon} {item.label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
        <Link href="/profile" style={{ textDecoration: "none" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 10px", borderRadius: "var(--r)", cursor: "pointer",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--raised)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--volt)", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 10, color: "var(--t3)" }}>
                {user?.exam_target ?? "No exam set"}
              </div>
            </div>
          </div>
        </Link>
        <button className="nav-link" onClick={onLogout} style={{ width: "100%", marginTop: 4 }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}

/* ── Stat Card ───────────────────────────────────────────────────────────────── */
function StatCard({ label, icon, value, delta, deltaSuffix, sub, color, className }: {
  label: string; icon: React.ReactNode; value: string;
  delta?: number; deltaSuffix?: string; sub?: string;
  color: string; className?: string;
}) {
  return (
    <div className={`card ${className ?? ""}`} style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "var(--t1)", fontFamily: "var(--mono)", letterSpacing: "-0.03em" }}>
        {value}
      </div>
      {delta !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
          {delta >= 0
            ? <ArrowUpRight size={12} color="var(--correct)" />
            : <ArrowDownRight size={12} color="var(--wrong)" />
          }
          <span style={{ fontSize: 11, color: delta >= 0 ? "var(--correct)" : "var(--wrong)", fontFamily: "var(--mono)" }}>
            {Math.abs(delta).toFixed(1)}{deltaSuffix}
          </span>
          <span style={{ fontSize: 11, color: "var(--t3)" }}>vs yesterday</span>
        </div>
      )}
      {sub && <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ── Subject Breakdown ───────────────────────────────────────────────────────── */
function SubjectBreakdown({ prediction }: { prediction: Prediction | null }) {
  if (!prediction?.subject_breakdown?.length) {
    return (
      <div className="card" style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--t3)", fontSize: 13 }}>No subject data yet</p>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 13, color: "var(--t2)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Subject Breakdown
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {prediction.subject_breakdown.map(s => (
          <div key={s.subject}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: "var(--t1)" }}>{s.subject}</span>
              <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--t2)" }}>
                {(s.mastery * 100).toFixed(0)}%
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{
                width: `${s.mastery * 100}%`,
                background: s.mastery > 0.7 ? "var(--phosphor)" : s.mastery > 0.4 ? "var(--solar)" : "var(--wrong)",
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Prediction View ─────────────────────────────────────────────────────────── */
function PredictionView({ prediction, user }: { prediction: Prediction; user: UserProfile | null }) {
  const pct = prediction.predicted_score / prediction.max_score * 100;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div className="card-phosphor" style={{ padding: 32 }}>
        <p style={{ fontSize: 12, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
          Predicted Score
        </p>
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-0.05em", fontFamily: "var(--mono)", color: "var(--phosphor)", lineHeight: 1, textShadow: "var(--phosphor-text-glow)" }}>
          {prediction.predicted_score}
        </div>
        <p style={{ color: "var(--t3)", fontSize: 14, marginTop: 4 }}>out of {prediction.max_score}</p>

        <div style={{ marginTop: 24 }}>
          <div className="progress-track" style={{ height: 6 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>
            <span>{prediction.confidence_low} – {prediction.confidence_high} (CI)</span>
            <span>{prediction.percentile}th percentile</span>
          </div>
        </div>

        {prediction.days_to_exam !== null && (
          <div style={{ marginTop: 20, padding: "10px 14px", background: "var(--raised)", borderRadius: "var(--r)", display: "flex", gap: 8, alignItems: "center" }}>
            <Clock size={14} color="var(--solar)" />
            <span style={{ fontSize: 13, color: "var(--t2)" }}>
              <strong style={{ color: "var(--solar)", fontFamily: "var(--mono)" }}>{prediction.days_to_exam}</strong> days until exam
            </span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 12, color: "var(--wrong)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            ⚠ Needs Work
          </h4>
          {prediction.weak_topics.slice(0, 5).map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13, color: "var(--t2)" }}>{t.name}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--wrong)" }}>{(t.mastery * 100).toFixed(0)}%</span>
            </div>
          ))}
          {prediction.weak_topics.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--t3)" }}>No critical weaknesses 🎉</p>
          )}
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 12, color: "var(--correct)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            ✓ Strong Areas
          </h4>
          {prediction.strong_topics.slice(0, 5).map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13, color: "var(--t2)" }}>{t.name}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--correct)" }}>{(t.mastery * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyPredict() {
  return (
    <div className="card" style={{ padding: 60, textAlign: "center" }}>
      <Target size={40} color="var(--t3)" style={{ margin: "0 auto 16px" }} />
      <h3 style={{ marginBottom: 8 }}>No prediction yet</h3>
      <p style={{ color: "var(--t3)", fontSize: 14, marginBottom: 24 }}>
        Complete at least 10 quiz questions to unlock score prediction.
      </p>
      <Link href="/quiz"><button className="btn btn-primary">Start Quizzing</button></Link>
    </div>
  );
}

function DashSkeleton() {
  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--void)" }}>
      <div style={{ width: 210, background: "var(--deep)", borderRight: "1px solid var(--line)" }} />
      <div style={{ flex: 1, padding: 32 }}>
        <div className="skeleton" style={{ height: 36, width: 300, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 18, width: 200, marginBottom: 28 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
        </div>
        <div className="skeleton" style={{ height: 50, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Late night focus";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Late night grind";
}

function daysUntil(dateStr: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));
}
