"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { plan, getToken } from "@/lib/api";

interface RevisionItem {
  topic_id: string;
  topic_name: string;
  subject: string;
  due_date: string;
  days_overdue: number;
  interval_days: number;
  current_mastery: number;
}

export default function RevisionsPage() {
  const router = useRouter();
  const [items, setItems] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.replace("/auth"); return; }
    (plan.revisions() as Promise<RevisionItem[]>)
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const overdue  = items.filter((i) => i.days_overdue > 0);
  const dueToday = items.filter((i) => i.days_overdue === 0);
  const upcoming = items.filter((i) => i.days_overdue < 0);

  function masteryColor(m: number) {
    if (m < 0.3) return "var(--danger)";
    if (m < 0.6) return "var(--warning)";
    return "var(--success)";
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-0)", padding: "40px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14, marginBottom: 32, textDecoration: "none" }}>
          <ArrowLeft size={16} /> Dashboard
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <RefreshCw size={24} color="var(--accent-bright)" />
          <h1 style={{ fontSize: 28 }}>Spaced Repetition</h1>
        </div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>
          SM-2 revision schedule. Review these topics to lock in your knowledge.
        </p>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
          </div>
        ) : (
          <>
            {/* Overdue */}
            {overdue.length > 0 && (
              <Section title={`⚠ Overdue (${overdue.length})`} color="var(--danger)">
                {overdue.map((item) => <RevisionCard key={item.topic_id} item={item} masteryColor={masteryColor} />)}
              </Section>
            )}

            {/* Due today */}
            {dueToday.length > 0 && (
              <Section title={`Today (${dueToday.length})`} color="var(--warning)">
                {dueToday.map((item) => <RevisionCard key={item.topic_id} item={item} masteryColor={masteryColor} />)}
              </Section>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <Section title="Upcoming" color="var(--text-muted)">
                {upcoming.map((item) => <RevisionCard key={item.topic_id} item={item} masteryColor={masteryColor} />)}
              </Section>
            )}

            {items.length === 0 && (
              <div className="card" style={{ padding: 60, textAlign: "center" }}>
                <CheckCircle2 size={40} color="var(--success)" style={{ margin: "0 auto 16px" }} />
                <h3 style={{ marginBottom: 8 }}>All caught up!</h3>
                <p style={{ color: "var(--text-muted)" }}>No revisions due. Keep quizzing to build your schedule.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function RevisionCard({ item, masteryColor }: { item: RevisionItem; masteryColor: (m: number) => string }) {
  return (
    <div className="card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{item.topic_name}</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.subject}</span>
          {item.days_overdue > 0 && (
            <span style={{ fontSize: 11, color: "var(--danger)", display: "flex", alignItems: "center", gap: 3 }}>
              <AlertTriangle size={11} /> {item.days_overdue}d overdue
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} /> Every {item.interval_days} days
          </span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: masteryColor(item.current_mastery) }}>
            {(item.current_mastery * 100).toFixed(0)}% mastery
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Due: {new Date(item.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        </div>
      </div>
      <Link href={`/quiz?topic=${item.topic_id}`}>
        <button className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>
          <RefreshCw size={13} /> Revise
        </button>
      </Link>
    </div>
  );
}
