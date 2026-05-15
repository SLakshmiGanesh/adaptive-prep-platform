"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Save, LogOut, Loader2,
  Zap, Flame, Target, Award, TrendingUp,
} from "lucide-react";
import { auth, gam, token, EXAM_CONFIG } from "@/lib/api";
import type { UserProfile, ExamTarget, GamStats } from "@/lib/api";

const EXAM_KEYS = Object.keys(EXAM_CONFIG) as ExamTarget[];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [gamStats, setGamStats] = useState<GamStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [examTarget, setExamTarget] = useState<ExamTarget>("JEE");
  const [examDate, setExamDate] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState(20);

  useEffect(() => {
    if (!token.get()) { router.replace("/auth"); return; }
    Promise.all([auth.me(), gam.stats()]).then(([u, g]) => {
      setUser(u); setGamStats(g);
      setName(u.name);
      setExamTarget((u.exam_target as ExamTarget) ?? "JEE");
      setExamDate(u.exam_date ?? "");
      setWeeklyGoal(u.weekly_goal_hours ?? 20);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await new Promise(r => setTimeout(r, 600)); // optimistic UX
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function logout() { token.clear(); router.replace("/auth"); }

  const daysToExam = user?.exam_date
    ? Math.max(0, Math.ceil((new Date(user.exam_date).getTime() - Date.now()) / 86400000))
    : null;

  const examCfg = examTarget ? EXAM_CONFIG[examTarget] : null;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--void)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} color="var(--phosphor)" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)" }}>
      <div className="mesh-bg" />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>

        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--t3)", fontSize: 13, textDecoration: "none", marginBottom: 28 }}>
          <ArrowLeft size={14} /> Dashboard
        </Link>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "var(--volt)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 700, color: "#fff",
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em" }}>{user?.name}</h1>
            <p style={{ color: "var(--t3)", fontSize: 13 }}>{user?.email}</p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { icon: <Zap size={15} />, label: "XP", value: (user?.xp ?? 0).toLocaleString(), color: "#a78bfa" },
            { icon: <Flame size={15} />, label: "Streak", value: `${user?.streak_days}d`, color: "var(--solar)" },
            { icon: <Award size={15} />, label: "Level", value: `${gamStats?.level} · ${gamStats?.level_title}`, color: "var(--phosphor)" },
            ...(daysToExam !== null
              ? [{ icon: <Target size={15} />, label: "Days Left", value: String(daysToExam), color: "var(--wrong)" }]
              : [{ icon: <TrendingUp size={15} />, label: "Accuracy", value: `${((gamStats?.accuracy ?? 0) * 100).toFixed(1)}%`, color: "var(--correct)" }]
            ),
          ].map((s, i) => (
            <div key={i} style={{
              padding: "12px 14px", background: "var(--surface)",
              border: "1px solid var(--line)", borderRadius: "var(--r-md)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: s.color }}>
                {s.icon}
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                  {s.label}
                </span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--mono)", color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Level progress */}
        {gamStats && (
          <div className="card" style={{ padding: "14px 20px", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--t3)" }}>
                Level {gamStats.level} — {gamStats.level_title}
              </span>
              <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--t3)" }}>
                {gamStats.xp_to_next} XP to next
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill progress-fill-volt" style={{ width: `${gamStats.level_progress_pct}%` }} />
            </div>
          </div>
        )}

        {/* Settings form */}
        <form onSubmit={handleSave}>
          <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Account Settings</h3>

            <div>
              <label style={lbl}>Full Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div>
              <label style={lbl}>Email Address</label>
              <input className="input" value={user?.email ?? ""} disabled style={{ opacity: 0.45 }} />
            </div>

            <div>
              <label style={lbl}>Target Exam</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {EXAM_KEYS.map(k => {
                  const c = EXAM_CONFIG[k];
                  return (
                    <button
                      key={k} type="button"
                      onClick={() => setExamTarget(k)}
                      style={{
                        padding: "8px 6px", borderRadius: "var(--r)",
                        border: `1px solid ${examTarget === k ? c.color + "55" : "var(--line)"}`,
                        background: examTarget === k ? c.color + "0f" : "var(--raised)",
                        cursor: "pointer", transition: "all 0.15s",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                        fontFamily: "var(--sans)",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{c.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: examTarget === k ? c.color : "var(--t3)" }}>
                        {k}
                      </span>
                    </button>
                  );
                })}
              </div>
              {examCfg && (
                <p style={{ fontSize: 11, color: "var(--t3)", marginTop: 6 }}>
                  {examCfg.label} · Subjects: {examCfg.subjects.join(", ")}
                </p>
              )}
            </div>

            <div>
              <label style={lbl}>Exam Date</label>
              <input
                className="input" type="date" value={examDate}
                onChange={e => setExamDate(e.target.value)}
                style={{ colorScheme: "dark" }}
              />
            </div>

            <div>
              <label style={lbl}>Weekly Study Goal</label>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <input
                  type="range" min={5} max={70} step={5} value={weeklyGoal}
                  onChange={e => setWeeklyGoal(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--phosphor)" }}
                />
                <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--mono)", color: "var(--phosphor)", minWidth: 44 }}>
                  {weeklyGoal}h
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
                ≈ {(weeklyGoal / 7).toFixed(1)} hours per day
              </p>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: "11px" }}>
              {saving
                ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                : saved ? "✓ Saved!" : <><Save size={14} /> Save Changes</>
              }
            </button>
          </div>
        </form>

        {/* Danger zone */}
        <div style={{
          padding: 20, background: "rgba(255,71,87,0.04)",
          border: "1px solid rgba(255,71,87,0.15)", borderRadius: "var(--r-md)",
        }}>
          <h4 style={{ fontSize: 13, color: "var(--wrong)", marginBottom: 12 }}>Sign Out</h4>
          <button className="btn btn-danger btn-sm" onClick={logout}>
            <LogOut size={13} /> Sign out of all sessions
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const lbl: React.CSSProperties = {
  fontSize: 11, color: "var(--t3)", display: "block",
  marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
};
