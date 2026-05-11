"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Star, Flame, Crown } from "lucide-react";
import { getToken } from "@/lib/api";

interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  streak_days: number;
  level: number;
  level_title: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.replace("/auth"); return; }
    fetch(`${API}/gamification/leaderboard?limit=20`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-0)", padding: "40px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14, marginBottom: 32, textDecoration: "none" }}>
          <ArrowLeft size={16} /> Back
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <Trophy size={28} color="var(--warning)" />
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 2 }}>Leaderboard</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Top learners ranked by XP, streak, and accuracy</p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 70 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {entries.map((entry) => (
              <div
                key={entry.rank}
                className={entry.rank <= 3 ? "card-glow" : "card"}
                style={{
                  padding: "18px 24px",
                  display: "flex", alignItems: "center", gap: 20,
                  background: entry.rank <= 3 ? "var(--surface-1)" : "var(--surface-1)",
                }}
              >
                {/* Rank */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: entry.rank <= 3 ? `${RANK_COLORS[entry.rank - 1]}22` : "var(--surface-3)",
                  border: entry.rank <= 3 ? `1px solid ${RANK_COLORS[entry.rank - 1]}55` : "1px solid var(--border)",
                }}>
                  {entry.rank <= 3 ? (
                    <Crown size={18} color={RANK_COLORS[entry.rank - 1]} />
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                      #{entry.rank}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{entry.name}</span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 100,
                      background: "var(--accent-glow)", color: "var(--accent-bright)",
                      border: "1px solid var(--border-accent)", fontWeight: 600,
                    }}>
                      Lv.{entry.level} {entry.level_title}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Flame size={12} color="var(--warning)" /> {entry.streak_days}d streak
                    </span>
                  </div>
                </div>

                {/* XP */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-mono)", color: entry.rank <= 3 ? RANK_COLORS[entry.rank - 1] : "var(--text-primary)" }}>
                    {entry.xp.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>XP</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
