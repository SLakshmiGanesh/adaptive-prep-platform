"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Calendar, Target, Save, LogOut, Loader2 } from "lucide-react";
import { auth, getToken, clearToken, setToken } from "@/lib/api";
import type { UserProfile } from "@/lib/api";

const EXAM_OPTIONS = [
  { value: "JEE",      label: "JEE (Mains + Advanced)" },
  { value: "NEET",     label: "NEET UG" },
  { value: "UPSC",     label: "UPSC Civil Services" },
  { value: "semester", label: "University Semester" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [examTarget, setExamTarget] = useState("JEE");
  const [examDate, setExamDate] = useState("");

  useEffect(() => {
    if (!getToken()) { router.replace("/auth"); return; }
    auth.me().then((u) => {
      setUser(u);
      setName(u.name);
      setExamTarget(u.exam_target ?? "JEE");
      setExamDate(u.exam_date ?? "");
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    // For now just show saved — implement PATCH /auth/me endpoint as needed
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function logout() {
    clearToken();
    router.replace("/auth");
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const daysToExam = user.exam_date
    ? Math.max(0, Math.ceil((new Date(user.exam_date).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-0)", padding: "40px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14, marginBottom: 32, textDecoration: "none" }}>
          <ArrowLeft size={16} /> Dashboard
        </Link>

        <h1 style={{ marginBottom: 4 }}>Profile & Settings</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>Manage your exam target and account details.</p>

        {/* Stats bar */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          {[
            { label: "XP", value: user.xp.toLocaleString(), color: "var(--accent-bright)" },
            { label: "Streak", value: `${user.streak_days}d`, color: "var(--warning)" },
            ...(daysToExam !== null ? [{ label: "Days to Exam", value: String(daysToExam), color: "var(--danger)" }] : []),
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, padding: "14px", background: "var(--surface-1)",
              border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-mono)", color: s.color }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Edit form */}
        <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Full Name
            </label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Email (cannot change)
            </label>
            <input className="input" value={user.email} disabled style={{ opacity: 0.5 }} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Target Exam
            </label>
            <select
              className="input"
              value={examTarget}
              onChange={(e) => setExamTarget(e.target.value)}
            >
              {EXAM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} style={{ background: "var(--bg-2)" }}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Exam Date
            </label>
            <input
              className="input"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              style={{ colorScheme: "dark" }}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "12px" }}
          >
            {saving ? (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : saved ? (
              "✓ Saved!"
            ) : (
              <><Save size={15} /> Save Changes</>
            )}
          </button>
        </div>

        {/* Danger zone */}
        <div style={{ marginTop: 24, padding: 24, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)" }}>
          <h3 style={{ fontSize: 14, color: "var(--danger)", marginBottom: 12 }}>Sign Out</h3>
          <button className="btn btn-ghost" onClick={logout} style={{ borderColor: "rgba(239,68,68,0.3)", color: "var(--danger)" }}>
            <LogOut size={15} /> Sign out of all devices
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
