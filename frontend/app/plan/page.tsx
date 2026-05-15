"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Sliders, RefreshCw, Clock, CheckCircle2,
  AlertTriangle, BookOpen, Zap, Plus, Minus, Save,
  ChevronDown, ChevronUp, Grip, Target, Brain
} from "lucide-react";
import { plan, topics as topicsApi, token } from "@/lib/api";
import type { PlanItem } from "@/lib/api";

interface TopicOption {
  id: string; name: string; subject: string; mastery: number;
}

export default function PlanPage() {
  const router = useRouter();
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [allTopics, setAllTopics] = useState<TopicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [saved, setSaved] = useState(false);

  // Customization state
  const [hours, setHours] = useState(4);
  const [focusWeak, setFocusWeak] = useState(true);
  const [includeRevisions, setIncludeRevisions] = useState(true);
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, number>>({});
  const [addedTopics, setAddedTopics] = useState<string[]>([]);
  const [removedTopics, setRemovedTopics] = useState<string[]>([]);
  const [topicSearch, setTopicSearch] = useState("");
  const [showAddTopic, setShowAddTopic] = useState(false);

  useEffect(() => {
    if (!token.get()) { router.replace("/auth"); return; }
    loadPlan();
    topicsApi.mastery().then(setAllTopics).catch(() => {});
  }, []);

  async function loadPlan() {
    setLoading(true);
    try {
      const p = await plan.today(hours);
      setPlanItems(p);
    } finally { setLoading(false); }
  }

  async function regeneratePlan() {
    setSaving(true);
    try {
      const customTopicIds = [
        ...planItems.filter(i => !removedTopics.includes(i.topic_id)).map(i => i.topic_id),
        ...addedTopics,
      ];
      const p = await plan.customize({
        topic_ids: customTopicIds,
        hours,
        focus_weak: focusWeak,
        include_revisions: includeRevisions,
      });
      setPlanItems(p);
      setManualAdjustments({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      // fallback: just reload
      await loadPlan();
    } finally { setSaving(false); }
  }

  function adjustTime(topicId: string, delta: number) {
    setManualAdjustments(prev => ({
      ...prev,
      [topicId]: Math.max(15, Math.min(90, (prev[topicId] ?? planItems.find(i => i.topic_id === topicId)!.duration_min) + delta)),
    }));
  }

  function removeTopic(topicId: string) {
    setRemovedTopics(prev => [...prev, topicId]);
    setPlanItems(prev => prev.filter(i => i.topic_id !== topicId));
  }

  function addTopic(topic: TopicOption) {
    if (planItems.find(i => i.topic_id === topic.id)) return;
    setAddedTopics(prev => [...prev, topic.id]);
    setPlanItems(prev => [...prev, {
      topic_id: topic.id, topic_name: topic.name, subject: topic.subject,
      duration_min: 30, session_type: "study",
      priority: 0.5, current_mastery: topic.mastery,
      revision_due: false, reason: "manually added", completed: false,
    }]);
    setShowAddTopic(false);
    setTopicSearch("");
  }

  async function markComplete(topicId: string, durationMin: number) {
    await plan.complete({ topic_id: topicId, duration_min: durationMin, session_type: "study" });
    setPlanItems(prev => prev.map(i => i.topic_id === topicId ? { ...i, completed: true } : i));
  }

  const totalMin = planItems.reduce((s, i) => s + (manualAdjustments[i.topic_id] ?? i.duration_min), 0);
  const completedMin = planItems.filter(i => i.completed).reduce((s, i) => s + i.duration_min, 0);
  const progressPct = totalMin > 0 ? (completedMin / totalMin) * 100 : 0;

  const filteredTopics = allTopics.filter(t =>
    t.name.toLowerCase().includes(topicSearch.toLowerCase()) ||
    t.subject.toLowerCase().includes(topicSearch.toLowerCase())
  ).slice(0, 8);

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)" }}>
      <div className="mesh-bg" />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--t3)", fontSize: 13, textDecoration: "none", marginBottom: 12 }}>
              <ArrowLeft size={14} /> Dashboard
            </Link>
            <h1 className="fade-up" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
              Today's Study Plan
            </h1>
            <p style={{ color: "var(--t2)", fontSize: 14 }}>
              Customize your plan, adjust time allocations, and add any topic.
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setCustomizing(!customizing)}
          >
            <Sliders size={14} /> {customizing ? "Hide Controls" : "Customize"}
          </button>
        </div>

        {/* ── CUSTOMIZATION PANEL ──────────────────────────────────────── */}
        {customizing && (
          <div className="card fade-up" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>Plan Settings</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
              {/* Hours slider */}
              <div>
                <label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Study Hours
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="range" min={1} max={10} step={0.5} value={hours}
                    onChange={e => setHours(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "var(--phosphor)" }}
                  />
                  <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--phosphor)", minWidth: 36 }}>
                    {hours}h
                  </span>
                </div>
              </div>

              {/* Focus weak */}
              <div>
                <label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Strategy
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Toggle active={focusWeak} onChange={setFocusWeak} label="Prioritize weak topics" />
                  <Toggle active={includeRevisions} onChange={setIncludeRevisions} label="Include due revisions" />
                </div>
              </div>

              {/* Regenerate */}
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  className="btn btn-primary"
                  onClick={regeneratePlan}
                  disabled={saving}
                  style={{ width: "100%" }}
                >
                  {saving ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={14} />}
                  {saved ? "Saved!" : "Regenerate Plan"}
                </button>
              </div>
            </div>

            {/* Add topic */}
            <div>
              <label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Add a Topic Manually
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  placeholder="Search topics to add…"
                  value={topicSearch}
                  onChange={e => { setTopicSearch(e.target.value); setShowAddTopic(true); }}
                  onFocus={() => setShowAddTopic(true)}
                />
                {showAddTopic && topicSearch && filteredTopics.length > 0 && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                    background: "var(--raised)", border: "1px solid var(--line-hover)",
                    borderRadius: "var(--r-md)", zIndex: 50, overflow: "hidden",
                    boxShadow: "var(--shadow-xl)",
                  }}>
                    {filteredTopics.map(t => (
                      <button
                        key={t.id}
                        onClick={() => addTopic(t)}
                        style={{
                          width: "100%", textAlign: "left", padding: "10px 14px",
                          background: "none", border: "none", cursor: "pointer",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          fontFamily: "var(--sans)", borderBottom: "1px solid var(--line)",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--float)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        <div>
                          <div style={{ fontSize: 13, color: "var(--t1)", fontWeight: 500 }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: "var(--t3)" }}>{t.subject}</div>
                        </div>
                        <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: masteryColor(t.mastery) }}>
                          {(t.mastery * 100).toFixed(0)}%
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PROGRESS BAR ─────────────────────────────────────────────── */}
        <div className="card" style={{ padding: "14px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--t2)", fontWeight: 600 }}>
              Daily Progress — {Math.round(progressPct)}%
            </span>
            <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--t3)" }}>
              {completedMin}/{totalMin} min · {(totalMin / 60).toFixed(1)}h total
            </span>
          </div>
          <div className="progress-track" style={{ height: 5 }}>
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* ── PLAN ITEMS ───────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 88 }} />)}
          </div>
        ) : planItems.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: "center" }}>
            <Calendar size={40} color="var(--t3)" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ marginBottom: 8 }}>No plan yet</h3>
            <p style={{ color: "var(--t3)", fontSize: 14, marginBottom: 20 }}>
              Generate a plan by clicking Customize → Regenerate
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {planItems.map((item, idx) => {
              const dur = manualAdjustments[item.topic_id] ?? item.duration_min;
              return (
                <PlanCard
                  key={item.topic_id}
                  item={item}
                  duration={dur}
                  onAdjust={(delta) => adjustTime(item.topic_id, delta)}
                  onRemove={() => removeTopic(item.topic_id)}
                  onComplete={() => markComplete(item.topic_id, dur)}
                  idx={idx}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Plan Card with drag-to-adjust time ───────────────────────────────────────── */
function PlanCard({ item, duration, onAdjust, onRemove, onComplete, idx }: {
  item: PlanItem; duration: number;
  onAdjust: (delta: number) => void;
  onRemove: () => void;
  onComplete: () => void;
  idx: number;
}) {
  const mc = masteryColor(item.current_mastery);

  return (
    <div
      className={`card fade-up`}
      style={{
        padding: "16px 20px", animationDelay: `${idx * 0.04}s`,
        opacity: item.completed ? 0.55 : 1,
        background: item.completed ? "rgba(0,255,136,0.03)" : "var(--surface)",
        borderColor: item.completed ? "rgba(0,255,136,0.2)" : item.revision_due ? "rgba(245,158,11,0.2)" : "var(--line)",
        transition: "all 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Type icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: item.revision_due ? "var(--solar-dim)" : "rgba(0,255,136,0.08)",
          border: `1px solid ${item.revision_due ? "rgba(245,158,11,0.25)" : "rgba(0,255,136,0.15)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {item.revision_due
            ? <RefreshCw size={16} color="var(--solar)" />
            : <BookOpen size={16} color="var(--phosphor)" />
          }
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            {item.completed && <CheckCircle2 size={14} color="var(--correct)" />}
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>
              {item.topic_name}
            </span>
            {item.revision_due && (
              <span className="badge badge-solar">
                <AlertTriangle size={8} /> Due
              </span>
            )}
            {item.reason && (
              <span className="badge badge-neutral">{item.reason}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--t3)" }}>{item.subject}</span>
            {/* Mastery bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 50, height: 3, background: "var(--lift)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${item.current_mastery * 100}%`, height: "100%", background: mc, borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: mc }}>
                {(item.current_mastery * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Time adjuster */}
        {!item.completed && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => onAdjust(-5)}
              style={{ width: 24, height: 24, borderRadius: 6, background: "var(--raised)", border: "1px solid var(--line)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t3)" }}
            >
              <Minus size={11} />
            </button>
            <div style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
              background: "var(--raised)", border: "1px solid var(--line)", borderRadius: "var(--r)",
              minWidth: 64, justifyContent: "center",
            }}>
              <Clock size={11} color="var(--t3)" />
              <span style={{ fontSize: 13, fontFamily: "var(--mono)", color: "var(--t1)", fontWeight: 600 }}>
                {duration}m
              </span>
            </div>
            <button
              onClick={() => onAdjust(5)}
              style={{ width: 24, height: 24, borderRadius: 6, background: "var(--raised)", border: "1px solid var(--line)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t3)" }}
            >
              <Plus size={11} />
            </button>
          </div>
        )}

        {/* Actions */}
        {!item.completed ? (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <Link href={`/quiz?topic=${item.topic_id}`}>
              <button className="btn btn-ghost btn-sm">
                <Zap size={12} /> Quiz
              </button>
            </Link>
            <button className="btn btn-primary btn-sm" onClick={onComplete}>
              <CheckCircle2 size={12} /> Done
            </button>
            <button
              onClick={onRemove}
              style={{
                width: 28, height: 28, borderRadius: "var(--r)", background: "none",
                border: "1px solid var(--line)", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", color: "var(--t3)",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--wrong-bg)"; (e.currentTarget as HTMLElement).style.color = "var(--wrong)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,71,87,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; }}
            >
              ×
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: "var(--correct)", fontWeight: 600 }}>✓ Done</span>
        )}
      </div>
    </div>
  );
}

function Toggle({ active, onChange, label }: { active: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!active)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "none", border: "none", cursor: "pointer",
        color: "var(--t2)", fontSize: 13, fontFamily: "var(--sans)",
        padding: "3px 0",
      }}
    >
      <div style={{
        width: 32, height: 18, borderRadius: 9,
        background: active ? "var(--phosphor)" : "var(--lift)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
        boxShadow: active ? "0 0 8px rgba(0,255,136,0.4)" : "none",
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: 7, background: "#fff",
          position: "absolute", top: 2, left: active ? 16 : 2,
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </div>
      {label}
    </button>
  );
}

function masteryColor(m: number) {
  if (m < 0.25) return "var(--wrong)";
  if (m < 0.5)  return "var(--warn)";
  if (m < 0.75) return "var(--solar)";
  return "var(--correct)";
}

// Declare Calendar for the empty state
const Calendar = ({ size, color, style }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={style}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
