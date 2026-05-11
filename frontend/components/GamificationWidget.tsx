"use client";

import { useEffect, useState } from "react";
import { Zap, Flame, Award, Trophy, Star, TrendingUp } from "lucide-react";
import { getToken } from "@/lib/api";

interface GamStats {
  xp: number;
  level: number;
  level_title: string;
  level_progress_pct: number;
  xp_to_next_level: number;
  streak_days: number;
  streak_warning: string | null;
  total_attempts: number;
  accuracy: number;
  leaderboard_score: number;
}

interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string;
  earned: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export default function GamificationWidget() {
  const [stats, setStats] = useState<GamStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [tab, setTab] = useState<"stats" | "badges">("stats");

  useEffect(() => {
    Promise.all([
      apiFetch<GamStats>("/gamification/stats"),
      apiFetch<Badge[]>("/gamification/badges"),
    ]).then(([s, b]) => {
      setStats(s);
      setBadges(b);
    }).catch(() => {});
  }, []);

  if (!stats) {
    return <div className="skeleton" style={{ height: 200 }} />;
  }

  const earnedBadges = badges.filter((b) => b.earned);

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["stats", "badges"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "5px 14px", borderRadius: 100, fontSize: 12,
              fontWeight: 600, cursor: "pointer",
              border: `1px solid ${tab === t ? "var(--accent)" : "var(--border)"}`,
              background: tab === t ? "var(--accent-glow)" : "transparent",
              color: tab === t ? "var(--accent-bright)" : "var(--text-muted)",
              fontFamily: "var(--font-display)",
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "badges" && earnedBadges.length > 0 && (
              <span style={{
                marginLeft: 6, background: "var(--accent)", color: "#fff",
                borderRadius: 100, padding: "1px 6px", fontSize: 10,
              }}>
                {earnedBadges.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "stats" && (
        <>
          {/* Level header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                Level {stats.level}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-bright)" }}>
                {stats.level_title}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                {stats.xp.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>XP total</div>
            </div>
          </div>

          {/* XP progress bar */}
          <div className="progress-bar" style={{ marginBottom: 4 }}>
            <div className="progress-fill" style={{ width: `${stats.level_progress_pct}%` }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>
            {stats.xp_to_next_level > 0
              ? `${stats.xp_to_next_level - (stats.xp % stats.xp_to_next_level)} XP to next level`
              : "Max level reached! 🏆"
            }
          </div>

          {/* Streak warning */}
          {stats.streak_warning && (
            <div style={{
              background: "var(--warning-dim)", border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: "var(--radius-sm)", padding: "8px 12px",
              fontSize: 12, color: "var(--warning)", marginBottom: 12,
            }}>
              {stats.streak_warning}
            </div>
          )}

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <MiniStat icon={<Flame size={14} />} label="Streak" value={`${stats.streak_days} days`} color="var(--warning)" />
            <MiniStat icon={<TrendingUp size={14} />} label="Accuracy" value={`${(stats.accuracy * 100).toFixed(1)}%`} color="var(--success)" />
            <MiniStat icon={<Star size={14} />} label="Attempts" value={String(stats.total_attempts)} color="var(--accent-bright)" />
            <MiniStat icon={<Trophy size={14} />} label="Score" value={stats.leaderboard_score.toFixed(0)} color="var(--text-secondary)" />
          </div>
        </>
      )}

      {tab === "badges" && (
        <div>
          {earnedBadges.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              Complete quizzes and study sessions to earn badges!
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {badges.map((badge) => (
              <div
                key={badge.id}
                style={{
                  padding: "12px", borderRadius: "var(--radius-sm)",
                  background: badge.earned ? "var(--accent-glow)" : "var(--surface-2)",
                  border: `1px solid ${badge.earned ? "var(--border-accent)" : "var(--border)"}`,
                  opacity: badge.earned ? 1 : 0.4,
                  transition: "all 0.15s",
                }}
                title={badge.desc}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{badge.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: badge.earned ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {badge.name}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4 }}>
                  {badge.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: "10px 12px",
      background: "var(--surface-2)",
      borderRadius: "var(--radius-sm)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color }}>
        {icon}
        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color }}>
        {value}
      </div>
    </div>
  );
}
