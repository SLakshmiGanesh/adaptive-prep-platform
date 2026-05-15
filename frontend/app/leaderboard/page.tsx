"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Flame, Crown, Star, Zap } from "lucide-react";
import { gam, auth, token } from "@/lib/api";
import type { UserProfile } from "@/lib/api";

interface LBEntry {
  rank: number; name: string; xp: number;
  streak_days: number; level: number; level_title: string;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LBEntry[]>([]);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token.get()) { router.replace("/auth"); return; }
    Promise.all([
      gam.leaderboard(20),
      auth.me(),
    ]).then(([lb, u]) => { setEntries(lb); setMe(u); }).finally(() => setLoading(false));
  }, []);

  const myRank = entries.findIndex(e => e.name === me?.name) + 1;
  const CROWN_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)" }}>
      <div className="mesh-bg" />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>

        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--t3)", fontSize: 13, textDecoration: "none", marginBottom: 28 }}>
          <ArrowLeft size={14} /> Dashboard
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Trophy size={22} color="var(--solar)" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>Leaderboard</h1>
            <p style={{ color: "var(--t3)", fontSize: 13 }}>
              {myRank > 0 ? `Your rank: #${myRank}` : "Ranked by XP · streak · accuracy"}
            </p>
          </div>
        </div>

        {/* My rank banner */}
        {myRank > 0 && me && (
          <div className="card-phosphor fade-up" style={{ padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <Star size={18} color="var(--phosphor)" />
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>Your position</span>
              <span style={{ fontSize: 13, color: "var(--t2)", marginLeft: 10 }}>
                #{myRank} · {me.xp.toLocaleString()} XP · Lv.{me.level} {me.level_title}
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(10)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72 }} />)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {entries.map((entry, i) => {
              const isMe = entry.name === me?.name;
              const isTop3 = entry.rank <= 3;
              return (
                <div
                  key={i}
                  className={isTop3 ? "card-phosphor" : "card"}
                  style={{
                    padding: "16px 20px",
                    display: "flex", alignItems: "center", gap: 16,
                    background: isMe
                      ? "rgba(124,58,237,0.08)"
                      : isTop3 ? undefined : "var(--surface)",
                    borderColor: isMe ? "rgba(124,58,237,0.3)" : undefined,
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isTop3 ? `${CROWN_COLORS[entry.rank - 1]}15` : "var(--raised)",
                    border: `1px solid ${isTop3 ? CROWN_COLORS[entry.rank - 1] + "35" : "var(--line)"}`,
                  }}>
                    {isTop3 ? (
                      <Crown size={18} color={CROWN_COLORS[entry.rank - 1]} />
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--t3)" }}>
                        #{entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: isMe ? "var(--volt)" : "var(--float)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: "#fff",
                  }}>
                    {entry.name[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: isMe ? "#a78bfa" : "var(--t1)" }}>
                        {entry.name} {isMe && "(you)"}
                      </span>
                      <span style={{
                        fontSize: 10, padding: "2px 7px", borderRadius: 100, fontWeight: 700,
                        background: "rgba(0,255,136,0.08)", color: "var(--phosphor)",
                        border: "1px solid rgba(0,255,136,0.2)",
                      }}>
                        Lv.{entry.level} {entry.level_title}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      {entry.streak_days > 0 && (
                        <span style={{ fontSize: 11, color: "var(--solar)", display: "flex", alignItems: "center", gap: 3 }}>
                          <Flame size={11} /> {entry.streak_days}d
                        </span>
                      )}
                    </div>
                  </div>

                  {/* XP */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{
                      fontSize: 18, fontWeight: 800, fontFamily: "var(--mono)",
                      color: isTop3 ? CROWN_COLORS[entry.rank - 1] : "var(--t1)",
                    }}>
                      {entry.xp.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--t4)" }}>XP</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
