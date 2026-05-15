"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Clock, AlertTriangle,
  CheckCircle2, Calendar, TrendingUp, Zap,
} from "lucide-react";
import { plan, token } from "@/lib/api";
import type { RevisionItem } from "@/lib/api";

export default function RevisionsPage() {
  const router = useRouter();
  const [items, setItems] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token.get()) { router.replace("/auth"); return; }
    plan.revisions().then(setItems).finally(() => setLoading(false));
  }, []);

  const overdue  = items.filter(i => i.days_overdue > 0);
  const today    = items.filter(i => i.days_overdue === 0);
  const upcoming = items.filter(i => i.days_overdue < 0);

  function mColor(m: number) {
    if (m < 0.3) return "var(--wrong)";
    if (m < 0.6) return "var(--solar)";
    return "var(--correct)";
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)" }}>
      <div className="mesh-bg" />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>

        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--t3)", fontSize: 13, textDecoration: "none", marginBottom: 28 }}>
          <ArrowLeft size={14} /> Dashboard
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <RefreshCw size={20} color="var(--solar)" />
          </div>
          <div>
            <h1 className="fade-up" style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>
              Spaced Repetition
            </h1>
            <p style={{ color: "var(--t3)", fontSize: 13 }}>SM-2 algorithm · Review before you forget</p>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: "24px 0" }}>
            {[
              { label: "Overdue", count: overdue.length, color: "var(--wrong)", bg: "rgba(255,71,87,0.08)", border: "rgba(255,71,87,0.2)" },
              { label: "Due Today", count: today.length, color: "var(--solar)", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
              { label: "Upcoming", count: upcoming.length, color: "var(--correct)", bg: "rgba(0,255,136,0.06)", border: "rgba(0,255,136,0.15)" },
            ].map(s => (
              <div key={s.label} style={{
                padding: "16px 20px", background: s.bg,
                border: `1px solid ${s.border}`, borderRadius: "var(--r-md)",
              }}>
                <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--mono)", color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 82 }} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: "center" }}>
            <CheckCircle2 size={40} color="var(--correct)" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ marginBottom: 8 }}>All caught up!</h3>
            <p style={{ color: "var(--t3)", fontSize: 14 }}>No revisions due. Keep quizzing to build your schedule.</p>
          </div>
        ) : (
          <>
            {overdue.length > 0 && <RevSection title="⚠ Overdue" color="var(--wrong)" items={overdue} mColor={mColor} />}
            {today.length > 0  && <RevSection title="📅 Due Today" color="var(--solar)" items={today} mColor={mColor} />}
            {upcoming.length > 0 && <RevSection title="🗓 Upcoming" color="var(--t3)" items={upcoming} mColor={mColor} />}
          </>
        )}
      </div>
    </div>
  );
}

function RevSection({ title, color, items, mColor }: {
  title: string; color: string; items: RevisionItem[];
  mColor: (m: number) => string;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        {title} ({items.length})
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div key={item.topic_id} className="card fade-up" style={{
            padding: "16px 20px", animationDelay: `${i * 0.04}s`,
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <RefreshCw size={15} color="var(--solar)" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{item.topic_name}</span>
                <span style={{ fontSize: 11, color: "var(--t3)" }}>{item.subject}</span>
                {item.days_overdue > 0 && (
                  <span style={{
                    fontSize: 10, padding: "2px 7px", borderRadius: 100,
                    background: "rgba(255,71,87,0.1)", color: "var(--wrong)",
                    border: "1px solid rgba(255,71,87,0.2)", fontWeight: 700,
                  }}>
                    {item.days_overdue}d overdue
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--t3)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={10} /> Every {item.interval_days} days
                </span>
                <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: mColor(item.current_mastery) }}>
                  {(item.current_mastery * 100).toFixed(0)}% mastery
                </span>
                <span style={{ fontSize: 11, color: "var(--t4)" }}>
                  Due: {new Date(item.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            </div>

            <Link href={`/quiz?topic=${item.topic_id}`}>
              <button className="btn btn-primary btn-sm">
                <Zap size={12} /> Revise
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
