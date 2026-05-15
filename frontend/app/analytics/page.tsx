"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BarChart2, TrendingUp, Target,
  AlertCircle, CheckCircle2, Clock, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, RadarChart,
  Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { analytics, token } from "@/lib/api";
import type { Prediction, MasteryTrend, HeatCell } from "@/lib/api";

export default function AnalyticsPage() {
  const router = useRouter();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [trend, setTrend] = useState<MasteryTrend[]>([]);
  const [heatmap, setHeatmap] = useState<HeatCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState<7 | 14 | 30>(30);

  useEffect(() => {
    if (!token.get()) { router.replace("/auth"); return; }
    Promise.all([
      analytics.masteryTrend(30),
      analytics.heatmap(),
    ]).then(([t, h]) => {
      setTrend(t); setHeatmap(h);
      analytics.predict().then(setPrediction).catch(() => {});
    }).finally(() => setLoading(false));
  }, []);

  const slicedTrend = trend.slice(-activeRange).map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    pct: Math.round(d.avg_mastery * 100),
  }));

  // Group by subject for radar
  const subjectMap: Record<string, { sum: number; count: number }> = {};
  heatmap.forEach(c => {
    if (!subjectMap[c.subject]) subjectMap[c.subject] = { sum: 0, count: 0 };
    subjectMap[c.subject].sum += c.mastery;
    subjectMap[c.subject].count += 1;
  });
  const radarData = Object.entries(subjectMap).map(([subject, { sum, count }]) => ({
    subject: subject.length > 14 ? subject.slice(0, 13) + "…" : subject,
    mastery: Math.round((sum / count) * 100),
  }));

  // Top weakest topics
  const weakest = [...heatmap].sort((a, b) => a.mastery - b.mastery).slice(0, 6);
  const strongest = [...heatmap].sort((a, b) => b.mastery - a.mastery).slice(0, 6);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "var(--raised)", border: "1px solid var(--line-hover)",
        borderRadius: "var(--r-md)", padding: "10px 14px",
        fontFamily: "var(--sans)", fontSize: 12, boxShadow: "var(--shadow-lg)",
      }}>
        <div style={{ color: "var(--t3)", marginBottom: 4 }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color, fontFamily: "var(--mono)", fontWeight: 700, fontSize: 16 }}>
            {p.value}{p.dataKey === "pct" || p.dataKey === "mastery" ? "%" : "m"}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)" }}>
      <div className="mesh-bg" />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--t3)", fontSize: 13, textDecoration: "none", marginBottom: 28 }}>
          <ArrowLeft size={14} /> Dashboard
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <BarChart2 size={24} color="var(--phosphor)" />
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>Analytics</h1>
            <p style={{ color: "var(--t3)", fontSize: 13 }}>Deep insight into your learning patterns</p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 260 }} />)}
          </div>
        ) : (
          <>
            {/* Row 1: Trend + Radar */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, marginBottom: 16 }}>
              {/* Mastery trend */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Mastery Over Time
                    </p>
                    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--mono)", color: "var(--t1)" }}>
                      {slicedTrend[slicedTrend.length - 1]?.pct ?? 0}%
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {([7, 14, 30] as const).map(r => (
                      <button key={r} onClick={() => setActiveRange(r)} style={{
                        padding: "3px 9px", borderRadius: 100, fontSize: 11,
                        border: `1px solid ${activeRange === r ? "var(--phosphor)" : "var(--line)"}`,
                        background: activeRange === r ? "rgba(0,255,136,0.1)" : "transparent",
                        color: activeRange === r ? "var(--phosphor)" : "var(--t3)",
                        cursor: "pointer", fontFamily: "var(--sans)", fontWeight: 600,
                      }}>{r}d</button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={slicedTrend} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00ff88" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--t4)", fontFamily: "var(--sans)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--t4)", fontFamily: "var(--mono)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="pct" stroke="var(--phosphor)" strokeWidth={2} fill="url(#g1)" dot={false} activeDot={{ r: 4, fill: "var(--phosphor)", strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Subject radar */}
              <div className="card" style={{ padding: 24 }}>
                <p style={{ fontSize: 11, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
                  Subject Mastery Radar
                </p>
                {radarData.length >= 3 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--t3)", fontFamily: "var(--sans)" }} />
                      <Radar name="Mastery" dataKey="mastery" stroke="var(--phosphor)" fill="var(--phosphor)" fillOpacity={0.15} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ color: "var(--t4)", fontSize: 13 }}>Need 3+ subjects for radar</p>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Study minutes + Prediction */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Study minutes bar chart */}
              <div className="card" style={{ padding: 24 }}>
                <p style={{ fontSize: 11, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
                  Daily Study Minutes
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={slicedTrend} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--t4)", fontFamily: "var(--sans)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "var(--t4)", fontFamily: "var(--mono)" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="study_minutes" fill="rgba(124,58,237,0.5)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Prediction summary */}
              <div className={prediction ? "card-phosphor" : "card"} style={{ padding: 24 }}>
                <p style={{ fontSize: 11, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
                  Score Prediction
                </p>
                {prediction ? (
                  <>
                    <div style={{ fontSize: 48, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--phosphor)", textShadow: "0 0 30px rgba(0,255,136,0.3)", lineHeight: 1, marginBottom: 6 }}>
                      {prediction.predicted_score}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--t3)", marginBottom: 16 }}>
                      / {prediction.max_score} · {prediction.percentile}th percentile
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ padding: "8px 10px", background: "rgba(0,255,136,0.06)", borderRadius: "var(--r)", border: "1px solid rgba(0,255,136,0.15)" }}>
                        <div style={{ fontSize: 10, color: "var(--t4)", marginBottom: 2 }}>CI Low</div>
                        <div style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--t2)" }}>{prediction.confidence_low}</div>
                      </div>
                      <div style={{ padding: "8px 10px", background: "rgba(0,255,136,0.06)", borderRadius: "var(--r)", border: "1px solid rgba(0,255,136,0.15)" }}>
                        <div style={{ fontSize: 10, color: "var(--t4)", marginBottom: 2 }}>CI High</div>
                        <div style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--t2)" }}>{prediction.confidence_high}</div>
                      </div>
                    </div>
                    {prediction.days_to_exam !== null && (
                      <div style={{ marginTop: 12, padding: "8px 12px", background: "var(--raised)", borderRadius: "var(--r)", fontSize: 13, color: "var(--t2)", display: "flex", gap: 8, alignItems: "center" }}>
                        <Clock size={13} color="var(--solar)" />
                        <strong style={{ color: "var(--solar)", fontFamily: "var(--mono)" }}>{prediction.days_to_exam}</strong> days to exam
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 20 }}>
                    <Target size={32} color="var(--t4)" />
                    <p style={{ color: "var(--t4)", fontSize: 13, textAlign: "center" }}>
                      Complete more quizzes to unlock score prediction
                    </p>
                    <Link href="/quiz">
                      <button className="btn btn-primary btn-sm">Start Quiz</button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Weakest / Strongest */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <TopicList title="⚠ Weakest Topics" topics={weakest} colorFn={m => m < 0.3 ? "var(--wrong)" : "var(--solar)"} />
              <TopicList title="✓ Strongest Topics" topics={strongest} colorFn={_ => "var(--correct)"} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TopicList({ title, topics, colorFn }: {
  title: string; topics: HeatCell[]; colorFn: (m: number) => string;
}) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t3)", marginBottom: 14 }}>
        {title}
      </h3>
      {topics.length === 0 ? (
        <p style={{ color: "var(--t4)", fontSize: 13 }}>No data yet</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {topics.map(t => {
            const c = colorFn(t.mastery);
            return (
              <div key={t.topic_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
                    {t.topic_name}
                  </div>
                  <div style={{ height: 3, background: "var(--lift)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${t.mastery * 100}%`, height: "100%", background: c }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 700, color: c, minWidth: 36, textAlign: "right" }}>
                  {(t.mastery * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
